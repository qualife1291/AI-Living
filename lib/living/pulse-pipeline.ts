import { safeErrorType, systemLog } from '../system-log.ts';

type Result = { status: number; data: Record<string, unknown> };
/** Shared sequencing only; admission/CAS, pause and state ownership stay in their stores. */
export async function runPulsePipeline(steps: { learning: () => Promise<Result>; social: () => Promise<Result>; tick: () => Promise<Result> }): Promise<Result> {
  async function stage(name: keyof typeof steps) {
    const started = performance.now();
    try {
      const result = await steps[name]();
      systemLog('pulse_stage', { stage: name, status: result.status, durationMs: performance.now()-started, updated: result.data.updated });
      return result;
    } catch (error) {
      systemLog('pulse_stage', { stage: name, status: 500, durationMs: performance.now()-started, errorType: safeErrorType(error) });
      throw error;
    }
  }
  const learning = await stage('learning'); if (learning.status !== 200) return learning;
  const social = await stage('social'); if (social.status !== 200) return social;
  const tick = await stage('tick');
  return { status: tick.status, data: { ...tick.data, learning: learning.data } };
}
