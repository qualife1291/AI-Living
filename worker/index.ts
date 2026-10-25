import { adminAllowed } from "../lib/admin";
import { tickLiving, learnCompleted } from "../lib/living/service";
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
      const result = await tickLiving();
      if (result.status >= 400 && result.status !== 409) throw new Error("Scheduled tick failed");
    })());
  },
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const settings = env as unknown as Record<string, string | undefined>;
    const url = new URL(request.url);
    const mutation = url.pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method);
    const archive = url.pathname === "/api/living/learning" && url.searchParams.get("format") === "jsonl";
    if ((mutation || archive) && !adminAllowed(request, { ownerId: settings.XOM_ADMIN_USER_ID, localAdmin: settings.XOM_LOCAL_ADMIN }))
      return Response.json({ error: "Thao tác này cần quyền chủ sở hữu." }, { status: 403 });
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
