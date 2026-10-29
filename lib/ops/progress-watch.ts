import {z} from 'zod';

const counter=z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const progressSchema=z.object({
  schema:z.literal('xom-progress-v1'),environment:z.enum(['qa','local']),observedAt:z.string().datetime(),
  version:z.string().uuid().nullable(),worldBorn:z.string().datetime(),paused:z.boolean(),
  revision:counter,turns:counter,experiences:counter,policies:counter,completedTicks:counter,
  lastTickFinishedAt:z.string().datetime().nullable(),
}).strict();
export type ProgressSnapshot=z.infer<typeof progressSchema>;

// One SELECT gives one consistent database view. No readWorld/bootstrap, policy
// hydration, cache, telemetry writes, history payloads or character identities.
export const PROGRESS_SQL=`SELECT
  json_extract(data,'$.born') AS worldBorn,json_extract(data,'$.paused') AS paused,revision,
  (SELECT COUNT(*) FROM living_turns) AS turns,
  (SELECT COUNT(*) FROM agent_experiences) AS experiences,
  (SELECT COUNT(*) FROM learning_policies) AS policies,
  (SELECT COUNT(*) FROM tick_runs WHERE status='completed') AS completedTicks,
  (SELECT MAX(finished_at) FROM tick_runs WHERE status='completed') AS lastTickFinishedAt
  FROM worlds WHERE id='home'`;

export function progressSnapshot(row: unknown, environment: 'qa'|'local', observedAt: string, version: unknown=null): ProgressSnapshot {
  if (!row || typeof row!=='object' || !('paused' in row) || ![0,1].includes(row.paused as number)) throw Error('Progress unavailable');
  const input=row as Record<string,unknown>;
  // Pick aggregate fields explicitly; do not forward a DB/HTTP object wholesale.
  return progressSchema.parse({schema:'xom-progress-v1',environment,observedAt,
    version:typeof version==='string'?version:null,worldBorn:input.worldBorn,paused:input.paused===1,
    revision:input.revision,turns:input.turns,experiences:input.experiences,policies:input.policies,
    completedTicks:input.completedTicks,lastTickFinishedAt:input.lastTickFinishedAt});
}

export const STALL_WINDOW_MS=15*60_000;
export function compareProgress(beforeValue: unknown, afterValue: unknown) {
  const before=progressSchema.parse(beforeValue),after=progressSchema.parse(afterValue);
  const elapsedMs=Date.parse(after.observedAt)-Date.parse(before.observedAt);
  if(elapsedMs<=0)throw Error('Snapshots must have increasing observation times');
  const deltas={revision:after.revision-before.revision,turns:after.turns-before.turns,
    experiences:after.experiences-before.experiences,policies:after.policies-before.policies,completedTicks:after.completedTicks-before.completedTicks};
  const lastTickMs=after.lastTickFinishedAt?Date.parse(after.lastTickFinishedAt):null;
  const clockMismatch=lastTickMs!==null&&lastTickMs>Date.parse(after.observedAt);
  const stateChanged=before.environment!==after.environment||before.worldBorn!==after.worldBorn||Object.values(deltas).some(x=>x<0);
  const status=stateChanged?'state_changed':clockMismatch?'clock_mismatch':before.version!==after.version?'deployment_changed':
    before.paused!==after.paused?'pause_changed':after.paused?'paused':
    deltas.completedTicks>0&&lastTickMs!==null&&lastTickMs>=Date.parse(before.observedAt)?'ticks_progressing':
    elapsedMs<STALL_WINDOW_MS?'insufficient_window':deltas.revision>0?'activity_without_tick_progress':'stalled';
  return {schema:'xom-progress-comparison-v1',status,elapsedMs,deltas,
    learningRowsIncreased:deltas.experiences>0,modelQualityGainProven:false,cronAttributionProven:false,
    mutationPerformed:false,automaticRecovery:false};
}
