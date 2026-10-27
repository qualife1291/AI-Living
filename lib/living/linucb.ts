/** Disjoint ridge LinUCB. Packed symmetric inverse keeps JSON state compact.
 * No model downloads or synthetic outcomes are involved in runtime updates. */
export const CONTEXT_DIM = 6;
export type LinearArm = { version: 1; inverse: number[]; b: number[]; samples: number };
const index = (r: number, c: number) => { if (r > c) [r, c] = [c, r]; return r * CONTEXT_DIM - r * (r + 1) / 2 + c; };
export function newArm(): LinearArm {
  const inverse = Array.from({ length: CONTEXT_DIM * (CONTEXT_DIM + 1) / 2 }, () => 0);
  for (let i = 0; i < CONTEXT_DIM; i++) inverse[index(i, i)] = 1;
  return { version: 1, inverse, b: Array(CONTEXT_DIM).fill(0), samples: 0 };
}
function validVector(x: readonly number[]) { return x.length === CONTEXT_DIM && x.every(v => Number.isFinite(v) && Math.abs(v) <= 1); }
export function validArm(arm: LinearArm) {
  return arm.version === 1 && arm.inverse.length === 21 && arm.inverse.every(Number.isFinite) && arm.b.length === 6 && arm.b.every(Number.isFinite) && Number.isSafeInteger(arm.samples) && arm.samples >= 0;
}
function multiply(arm: LinearArm, x: readonly number[]) {
  return x.map((_, r) => x.reduce((sum, v, c) => sum + arm.inverse[index(r, c)] * v, 0));
}
export function linearScore(arm: LinearArm | undefined, x: readonly number[], alpha = .25) {
  if (!validVector(x)) throw new Error('Invalid LinUCB context');
  const model = arm && validArm(arm) ? arm : newArm(), projected = multiply(model, x);
  const mean = projected.reduce((sum, v, i) => sum + v * model.b[i], 0);
  const variance = Math.max(0, x.reduce((sum, v, i) => sum + v * projected[i], 0));
  return { mean: Math.max(-1, Math.min(1, mean)), uncertainty: alpha * Math.sqrt(variance) };
}
export function fitLinear(arm: LinearArm | undefined, x: readonly number[], reward: number): LinearArm {
  if (!validVector(x) || !Number.isFinite(reward)) throw new Error('Invalid LinUCB observation');
  const old = arm && validArm(arm) ? arm : newArm(), projected = multiply(old, x);
  const denominator = 1 + x.reduce((sum, v, i) => sum + v * projected[i], 0);
  if (!(denominator >= 1 - 1e-8)) throw new Error('LinUCB covariance is not positive definite');
  const inverse = [...old.inverse];
  for (let r = 0; r < CONTEXT_DIM; r++) for (let c = r; c < CONTEXT_DIM; c++) inverse[index(r, c)] -= projected[r] * projected[c] / denominator;
  const bounded = Math.max(-1, Math.min(1, reward));
  return { version: 1, inverse, b: old.b.map((v, i) => v + bounded * x[i]), samples: old.samples + 1 };
}
export function decisionContext(agent: {energy: number; hunger: number; socialNeed?: number; skill: number}, weather: {status: string; precipitation: number | null}) {
  const unit = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n / 100 : 0));
  return [1, unit(agent.energy), unit(agent.hunger), unit(agent.socialNeed ?? 50), weather.status === 'fresh' && (weather.precipitation ?? 0) > 0 ? 1 : 0, unit(agent.skill)];
}
