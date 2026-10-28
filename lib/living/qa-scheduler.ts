/** QA-only Cloudflare Cron guard; must never run on Sites A or staging. */
export const QA_LIVING_CRON = "*/5 * * * *";
export const QA_LIVING_HOSTNAME = "ai-living-qa.hoanglonglea1mtl.workers.dev";
export function qaLivingCronEnabled(settings: Record<string, string | undefined>, cron: string): boolean {
  return cron === QA_LIVING_CRON &&
    settings.XOM_RULE_SCHEDULER === "true" &&
    settings.XOM_QA_HOSTNAME === QA_LIVING_HOSTNAME &&
    Boolean(settings.XOM_QA_ACCESS_AUD) &&
    Boolean(settings.XOM_QA_ACCESS_TEAM_DOMAIN);
}
