import type { TrafficPoint, TrafficVehicle } from "./traffic.ts";

/** QA road users on separate, marked lanes of the existing south boulevard.
 * The fleet is an ambient visualization, never a learned action, fare, or
 * server-side assertion that a resident is riding.
 */
export const TWO_WHEEL_CROSSING_X = 1710;
export const TRAFFIC_SIGNAL_PERIOD = 24;
export const TWO_WHEEL_LANES = [
  { id: "ambient-motorbike-01", type: "motorbike" as const,
    z: 1132, width: 6, length: 14, height: 12, speedLimit: 18,
    from: 1280, to: 1840 },
  { id: "ambient-bicycle-01", type: "bicycle" as const,
    z: 1124, width: 4, length: 13, height: 11, speedLimit: 9,
    from: 1280, to: 1840 },
] as const;

export function twoWheelSignal(time: number): "red" | "green" {
  if (!Number.isFinite(time)) return "red";
  return Math.floor(Math.max(0, time) / (TRAFFIC_SIGNAL_PERIOD / 2)) % 2 === 0
    ? "red" : "green";
}

export class TwoWheelTrafficDirector {
  private lastTime: number | undefined;
  private positions = TWO_WHEEL_LANES.map((lane, i) => lane.from + 24 + i * 24);
  private directions = TWO_WHEEL_LANES.map(() => 1);
  private dwell = TWO_WHEEL_LANES.map(() => 0);

  frame(simSeconds: number, pedestrians: TrafficPoint[] = []): TrafficVehicle[] {
    const now = Number.isFinite(simSeconds) ? Math.max(0, simSeconds) : this.lastTime ?? 0;
    if (this.lastTime === undefined) this.lastTime = now;
    const delta = Math.max(0, Math.min(.1, now - this.lastTime));
    this.lastTime = now;
    return TWO_WHEEL_LANES.map((lane, i) => {
      const x = this.positions[i], direction = this.directions[i];
      const target = direction === 1 ? lane.to : lane.from;
      let move = Math.min(delta * lane.speedLimit, Math.max(0, (target - x) * direction));
      if (this.dwell[i] > 0) {
        this.dwell[i] = Math.max(0, this.dwell[i] - delta);
        move = 0;
      } else {
        // Stop at a signal line before entering the marked crossing.
        // Vehicles already inside the crossing may clear it.
        const stopX = TWO_WHEEL_CROSSING_X - direction * (lane.length / 2 + 7);
        const approach = (stopX - x) * direction;
        if (twoWheelSignal(now) === "red" && approach >= -1e-8) {
          move = Math.min(move, Math.max(0, approach));
        }
        // Continuous-step pedestrian yielding, with a conservative buffer.
        for (const pedestrian of pedestrians) {
          if (!pedestrian.every(Number.isFinite)) continue;
          if (Math.abs(pedestrian[1] - lane.z) > lane.width / 2 + 6) continue;
          const frontClearance = (pedestrian[0] - x) * direction - lane.length / 2 - 8;
          if (frontClearance >= -1e-8) move = Math.min(move, Math.max(0, frontClearance));
        }
        this.positions[i] = x + direction * move;
        if (Math.abs(this.positions[i] - target) < 1e-8) {
          // Turn at a terminal layby only after a complete stop.
          this.dwell[i] = 4;
          this.directions[i] = -direction;
          move = 0;
        }
      }
      return { id: lane.id, type: lane.type, position: [this.positions[i], lane.z],
        yaw: this.directions[i] === 1 ? Math.PI / 2 : -Math.PI / 2,
        width: lane.width, height: lane.height, length: lane.length,
        speed: delta > 0 ? move / delta : 0 };
    });
  }
}
