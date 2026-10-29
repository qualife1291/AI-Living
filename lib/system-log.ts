import { AsyncLocalStorage } from 'node:async_hooks';

const events = ['http_complete','http_uncaught','chat_storage_failed','chat_throttled','pulse_stage','pulse_result','cron_result','cron_failed','cron_disabled','qa_auth_denied'] as const;
type Event = typeof events[number];
type Context = { requestId: string; trigger: 'http'|'cron'; route: string; method: string; version?: string };
const contexts = new AsyncLocalStorage<Context>();
const routes = new Set(['/api/world','/api/health','/api/diagnostics','/api/visits','/api/living','/api/living/pulse','/api/living/interact','/api/living/learning','/api/living/memories','/api/living/tick','/api/system/progress']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const stages = new Set(['read','write','learning','social','tick']);
const errorNames = new Set(['Error','TypeError','SyntaxError','RangeError','AbortError','TimeoutError']);

/** Explicit allowlist at runtime too: never serialize an Error, URL, body,
 * identity, actor, exchange UUID, cookie, header, SQL or arbitrary caller field. */
export function systemLog(event: Event, fields: Record<string, unknown> = {}) {
  const context = contexts.getStore();
  if (!context || !events.includes(event)) return;
  const safe: Record<string, string|number|boolean> = {};
  for (const key of ['status','durationMs','updated','retryAfter'] as const) {
    const value = fields[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1e12) safe[key] = Math.round(value * 100) / 100;
  }
  for (const key of ['duplicate','coalesced','accessContextPresent','accessAudiencePresent','accessAudienceMatches','configuredAudiencePresent','expectedHostnameMatches','https'] as const) if (typeof fields[key] === 'boolean') safe[key] = fields[key];
  if (typeof fields.stage === 'string' && stages.has(fields.stage)) safe.stage = fields.stage;
  if (typeof fields.errorType === 'string') safe.errorType = errorNames.has(fields.errorType) ? fields.errorType : 'Error';
  const error = event === 'http_uncaught' || event === 'chat_storage_failed' || event === 'cron_failed' || Number(safe.status) >= 500;
  const level = error ? 'error' : Number(safe.status) >= 400 || event === 'cron_disabled' ? 'warn' : 'info';
  const record = { schema: 'xom-system-log-v1', at: new Date().toISOString(), event, level, ...context, ...safe };
  // A logging sink failure must never turn a successful durable write into an error.
  try { console[level](JSON.stringify(record)); } catch { /* telemetry is best effort */ }
}

export function safeErrorType(error: unknown) {
  try { return error instanceof Error && errorNames.has(error.name) ? error.name : 'Error'; }
  catch { return 'Error'; }
}

export function runSystemTask<T>(trigger: 'http'|'cron', enabled: boolean, run: () => T, metadata?: unknown, request?: Request): T {
  if (!enabled) return run();
  const url = request ? new URL(request.url) : undefined;
  const path = url ? url.pathname.replace(/\/+$/, '') || '/' : undefined;
  const id = metadata && typeof metadata === 'object' && 'id' in metadata ? metadata.id : undefined;
  const context: Context = {
    requestId: crypto.randomUUID(), trigger,
    route: path ? routes.has(path) ? path : path.startsWith('/api/') ? '/api/other' : '/page' : '/scheduled',
    method: request ? ['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'].includes(request.method) ? request.method : 'OTHER' : 'SCHEDULED',
    ...(typeof id === 'string' && uuid.test(id) ? { version: id } : {}),
  };
  return contexts.run(context, run);
}

/** No body reads/buffering; retain streaming and original status. */
export async function observeHttp(request: Request, enabled: boolean, run: () => Promise<Response>|Response, metadata?: unknown) {
  return runSystemTask('http', enabled, async () => {
    const started = performance.now();
    try {
      const response = await run();
      if (response.status >= 400 || !['GET','HEAD','OPTIONS'].includes(request.method)) systemLog('http_complete', { status: response.status, durationMs: performance.now()-started });
      const context = contexts.getStore();
      if (!context || !new URL(request.url).pathname.startsWith('/api/')) return response;
      const headers = new Headers(response.headers); headers.set('X-Request-Id', context.requestId);
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    } catch (error) {
      systemLog('http_uncaught', { status: 500, durationMs: performance.now()-started, errorType: safeErrorType(error) });
      throw error;
    }
  }, metadata, request);
}
