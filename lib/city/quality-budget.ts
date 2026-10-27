import type { Quality } from './scale.ts';

/** Balanced adapts once per selection; explicit sharp/eco remain user controlled. */
export class QualityBudget {
  private requested: Quality | undefined;
  private samples: number[] = [];
  private limited = false;
  frame(requested: Quality = 'balanced', ms: number): Quality {
    if (requested !== this.requested) { this.requested = requested; this.samples = []; this.limited = false; }
    if (requested !== 'balanced') return requested;
    if (Number.isFinite(ms) && ms > 0 && ms < 2000) { this.samples.push(ms); if (this.samples.length > 12) this.samples.shift(); }
    if (this.samples.length >= 8) {
      const sorted = [...this.samples].sort((a,b)=>a-b);
      if (sorted[Math.floor(sorted.length/2)] > 60) this.limited = true;
    }
    return this.limited ? 'eco' : 'balanced';
  }
}
