declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    XOM_CONTEXT_RELAY?: string;
    BUCKET?: R2Bucket;
  }
}
