import { adminAllowed, cloudflareQaAccessAllowed } from "../lib/admin";
import { verifiedQaAccessRequest } from "../lib/cloudflare-access-jwt";
import { tickLiving, learnCompleted, advanceResidentSocial } from "../lib/living/service";
import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

const worker = {
  async scheduled(_event: ScheduledController, env: Cloudflare.Env, ctx: ExecutionContext) {
    // Opt-in rules only. Deployment must explicitly attach a supported schedule.
    const settings = env as unknown as Record<string, string | undefined>;
    if (settings.XOM_RULE_SCHEDULER !== "true") return;
    ctx.waitUntil((async () => {
      await learnCompleted();
      await advanceResidentSocial();
      const result = await tickLiving();
      if (result.status >= 400 && result.status !== 409) throw new Error("Scheduled tick failed");
    })());
  },
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const settings = env as unknown as Record<string, string | undefined>;
    const url = new URL(request.url);
    const mutation = url.pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method);
    const diagnostic = url.pathname === "/api/diagnostics";
    const privateMemories = url.pathname === "/api/living/memories";
    const archive = url.pathname === "/api/living/learning" && url.searchParams.get("format") === "jsonl";
    // Worker-level Cloudflare Access is the only QA authorization source.
    // ctx.access is provided by Cloudflare after Access verification; request
    // headers like Origin, cf-access-jwt-assertion, and oai-* are NOT evidence.
    const qaAccess = (ctx as typeof ctx & { access?: { aud?: string } }).access;
    const isQaWorker = Boolean(settings.XOM_QA_ACCESS_AUD);
    const qaAuthorized = isQaWorker && (
      cloudflareQaAccessAllowed(request, qaAccess, {
        expectedAud: settings.XOM_QA_ACCESS_AUD,
        hostname: settings.XOM_QA_HOSTNAME,
      }) ||
      await verifiedQaAccessRequest(request, {
        audience: settings.XOM_QA_ACCESS_AUD!,
        hostname: settings.XOM_QA_HOSTNAME ?? "",
        teamDomain: settings.XOM_QA_ACCESS_TEAM_DOMAIN ?? "",
      })
    );
    if ((mutation || archive || diagnostic || privateMemories) &&
        !qaAuthorized &&
        !( !isQaWorker && adminAllowed(request, { ownerId: settings.XOM_ADMIN_USER_ID, localAdmin: settings.XOM_LOCAL_ADMIN, privateOrigin: settings.XOM_OWNER_PRIVATE_ORIGIN }) )) {
      if (url.hostname === "ai-living-qa.hoanglonglea1mtl.workers.dev") {
        console.warn("qa_access_gate_denied", {
          accessContextPresent: Boolean(qaAccess),
          accessAudiencePresent: Boolean(qaAccess?.aud),
          accessAudienceMatches: Boolean(qaAccess?.aud && qaAccess.aud === settings.XOM_QA_ACCESS_AUD),
          configuredAudiencePresent: Boolean(settings.XOM_QA_ACCESS_AUD),
          expectedHostnameMatches: url.hostname === settings.XOM_QA_HOSTNAME,
          https: url.protocol === "https:",
          method: request.method,
          path: url.pathname,
          // Never log JWT, user identity, email, cookies or credentials.
        });
      }
      return Response.json({ error: "Thao tác này cần quyền chủ sở hữu.", code: "QA_AUTH_GATE_DENIED" }, { status: 403 });
    }
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
  },
};

export default worker;
