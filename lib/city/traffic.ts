import { boulevards } from "./world.ts";
import { VEHICLES } from "./scale.ts";

export type TrafficPoint = [number, number];
export type TrafficVehicle = {
  id: string;
  position: TrafficPoint;
  yaw: number;
  type: "car" | "bus" | "metro";
  width: number;
  length: number;
  height: number;
  speed: number;
};

/**
 * The one convex closed circuit already present in the street graph. The top
 * right vertex is the actual crossing of the east/west and north/south roads.
 * Dead ends, the acute southwest hairpin, and the unfinished metro line are
 * deliberately excluded. This is ambient traffic, not simulated public transit.
 */
export const trafficRouteVertices: TrafficPoint[] = [
  [boulevards[2][1][0], boulevards[2][1][1]],
  [boulevards[3][0][0], boulevards[1][1][1]],
  [boulevards[3][1][0], boulevards[3][1][1]],
  [boulevards[0][0][0], boulevards[0][0][1]],
];
export const TRAFFIC_LANE_OFFSET = 10;
export const TRAFFIC_SPEED = 24; // world units/s = 2.4 m/s, slow urban traffic
export const TRAFFIC_COUNT = 12;
/** These four paved turning aprons must be drawn by the street renderer. */
export const trafficJunctions = trafficRouteVertices.map(position => ({ position, radius: 42 }));
const CORNER_CUT = 14;
const mod = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;
const distance = (a: TrafficPoint, b: TrafficPoint) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const unit = (from: TrafficPoint, to: TrafficPoint): TrafficPoint => {
  const length = distance(from, to);
  return [(to[0] - from[0]) / length, (to[1] - from[1]) / length];
};
type Line = { kind: "line"; start: TrafficPoint; end: TrafficPoint; length: number; direction: TrafficPoint };
type Arc = { kind: "arc"; start: TrafficPoint; end: TrafficPoint; center: TrafficPoint; radius: number; angle: number; turn: number; length: number };
type Piece = Line | Arc;

// Circular fillets provide continuous position AND tangent through every turn.
// Right-hand offset is the renderer's local +X side: [forward.z, -forward.x].
const corners: Arc[] = trafficRouteVertices.map((at, i, route) => {
  const incoming = unit(route[mod(i - 1, route.length)], at);
  const outgoing = unit(at, route[(i + 1) % route.length]);
  const turn = Math.atan2(incoming[0] * outgoing[1] - incoming[1] * outgoing[0], incoming[0] * outgoing[0] + incoming[1] * outgoing[1]);
  const sign = Math.sign(turn);
  const radius = CORNER_CUT / Math.tan(Math.abs(turn) / 2);
  const tangent: TrafficPoint = [at[0] - incoming[0] * CORNER_CUT, at[1] - incoming[1] * CORNER_CUT];
  const center: TrafficPoint = [tangent[0] - incoming[1] * radius * sign, tangent[1] + incoming[0] * radius * sign];
  const start: TrafficPoint = [tangent[0] + incoming[1] * TRAFFIC_LANE_OFFSET, tangent[1] - incoming[0] * TRAFFIC_LANE_OFFSET];
  const end: TrafficPoint = [at[0] + outgoing[0] * CORNER_CUT + outgoing[1] * TRAFFIC_LANE_OFFSET, at[1] + outgoing[1] * CORNER_CUT - outgoing[0] * TRAFFIC_LANE_OFFSET];
  const laneRadius = radius + sign * TRAFFIC_LANE_OFFSET;
  return { kind: "arc", start, end, center, radius: laneRadius, angle: Math.atan2(start[1] - center[1], start[0] - center[0]), turn, length: laneRadius * Math.abs(turn) };
});
const pieces: Piece[] = corners.flatMap((corner, i) => {
  const next = corners[(i + 1) % corners.length];
  const line: Line = { kind: "line", start: corner.end, end: next.start, length: distance(corner.end, next.start), direction: unit(corner.end, next.start) };
  return [corner, line];
});
export const TRAFFIC_ROUTE_LENGTH = pieces.reduce((sum, piece) => sum + piece.length, 0);
export const TRAFFIC_PERIOD_SECONDS = TRAFFIC_ROUTE_LENGTH / TRAFFIC_SPEED;

function laneAt(along: number): { position: TrafficPoint; yaw: number } {
  let remaining = mod(along, TRAFFIC_ROUTE_LENGTH);
  for (const piece of pieces) {
    if (remaining > piece.length) { remaining -= piece.length; continue; }
    if (piece.kind === "line") {
      return { position: [piece.start[0] + piece.direction[0] * remaining, piece.start[1] + piece.direction[1] * remaining], yaw: Math.atan2(piece.direction[0], piece.direction[1]) };
    }
    const angle = piece.angle + Math.sign(piece.turn) * remaining / piece.radius;
    const sign = Math.sign(piece.turn);
    return {
      position: [piece.center[0] + Math.cos(angle) * piece.radius, piece.center[1] + Math.sin(angle) * piece.radius],
      yaw: Math.atan2(-Math.sin(angle) * sign, Math.cos(angle) * sign),
    };
  }
  // Floating point residue at the final piece wraps onto the identical tangent.
  const first = pieces[0] as Arc;
  return { position: [...first.start], yaw: Math.atan2(-Math.sin(first.angle), Math.cos(first.angle)) };
}

/**
 * A fixed-speed platoon with equal arc-length headway. No different speed can
 * catch a leading car; no endpoint wrap teleports or instantaneous U-turns.
 * Geometry tests cover every bend and wrap, including vehicle body footprints.
 */
export function trafficAt(simSeconds: number): TrafficVehicle[] {
  const seconds = Number.isFinite(simSeconds) ? mod(simSeconds, TRAFFIC_PERIOD_SECONDS) : 0;
  return Array.from({ length: TRAFFIC_COUNT }, (_, index) => ({
    id: `traffic-car-${index}`,
    ...laneAt(seconds * TRAFFIC_SPEED + index * TRAFFIC_ROUTE_LENGTH / TRAFFIC_COUNT),
    type: "car" as const,
    ...VEHICLES.car,
    speed: TRAFFIC_SPEED,
  }));
}

/**
 * Live cooperative traffic. The caller supplies the previous rendered walker
 * positions, then gives the returned car footprints to pedestrian navigation.
 * Integrating bounded distance avoids teleporting after a slow frame/tab sleep.
 */
export class TrafficDirector {
  private previousTime: number | undefined;
  private positions: number[] = [];
  private speeds: number[] = [];
  private readonly pedestrianRadius = 3;
  private readonly frontClearance = 10;
  // Extra arc-length reserve covers the long body cutting across a tight bend.
  private readonly headway = VEHICLES.car.length + VEHICLES.car.width + 10;

  frame(simSeconds: number, pedestrianPoints: TrafficPoint[] = [], bodyRadii: number[] = []): TrafficVehicle[] {
    const now = Number.isFinite(simSeconds) ? simSeconds : this.previousTime ?? 0;
    if (this.previousTime === undefined) {
      const initial = mod(now, TRAFFIC_PERIOD_SECONDS) * TRAFFIC_SPEED;
      this.positions = Array.from({ length: TRAFFIC_COUNT }, (_, index) => initial + index * TRAFFIC_ROUTE_LENGTH / TRAFFIC_COUNT);
      this.speeds = Array.from({ length: TRAFFIC_COUNT }, () => 0);
      this.previousTime = now;
    }
    const elapsed = Math.max(0, Math.min(0.1, now - this.previousTime));
    this.previousTime = now;
    if (elapsed > 0) {
      const finitePedestrians = pedestrianPoints.map((point, i) => ({ point, radius: Number.isFinite(bodyRadii[i]) ? Math.max(this.pedestrianRadius, bodyRadii[i]) : this.pedestrianRadius })).filter(body => body.point.every(Number.isFinite));
      const largestRadius = Math.max(this.pedestrianRadius, ...finitePedestrians.map(body => body.radius));
      const advances = this.positions.map((position, index) => {
        const requested = Math.min(TRAFFIC_SPEED, this.speeds[index] + 12 * elapsed) * elapsed;
        let allowed = requested;
        const current = laneAt(position).position;
        const reach = 40 + requested + Math.hypot(VEHICLES.car.length / 2, VEHICLES.car.width / 2) + this.frontClearance + largestRadius + 2;
        const nearby = finitePedestrians.filter(({ point }) => Math.abs(point[0] - current[0]) <= reach && Math.abs(point[1] - current[1]) <= reach);
        if (!nearby.length) return requested;
        // Sample ahead at two-unit intervals. Inflate by one sample interval so
        // a small pedestrian cannot disappear between the forecast footprints.
        for (let ahead = 0; ahead <= 40 + requested; ahead += 2) {
          const vehicle = { ...laneAt(position + ahead), ...VEHICLES.car };
          const rightX = Math.cos(vehicle.yaw), rightZ = -Math.sin(vehicle.yaw);
          const forwardX = Math.sin(vehicle.yaw), forwardZ = Math.cos(vehicle.yaw);
          const blocked = nearby.some(({ point, radius }) => {
            const dx = point[0] - vehicle.position[0], dz = point[1] - vehicle.position[1];
            const lateral = dx * rightX + dz * rightZ, forward = dx * forwardX + dz * forwardZ;
            return Math.abs(lateral) <= vehicle.width / 2 + radius + 2 && forward >= -vehicle.length / 2 - radius && forward <= vehicle.length / 2 + radius + this.frontClearance + 2;
          });
          if (blocked) {
            const headroom = Math.max(0, ahead - 2);
            allowed = Math.min(allowed, headroom, Math.sqrt(2 * 12 * headroom) * elapsed);
            break;
          }
        }
        return allowed;
      });
      // Propagate a stopped leader backwards through the whole circular queue.
      // All constraints only reduce advances, preserving the lane order.
      for (let pass = 0; pass < TRAFFIC_COUNT; pass++) {
        let changed = false;
        for (let index = TRAFFIC_COUNT - 1; index >= 0; index--) {
          const leader = (index + 1) % TRAFFIC_COUNT;
          const gap = mod(this.positions[leader] - this.positions[index], TRAFFIC_ROUTE_LENGTH);
          const leaderSpeed = advances[leader] / elapsed;
          const approachSpeed = Math.sqrt(leaderSpeed ** 2 + 2 * 12 * Math.max(0, gap - this.headway));
          const limited = Math.max(0, Math.min(advances[index], gap + advances[leader] - this.headway, approachSpeed * elapsed));
          if (limited + 1e-9 < advances[index]) changed = true;
          advances[index] = limited;
        }
        if (!changed) break;
      }
      for (let index = 0; index < TRAFFIC_COUNT; index++) {
        this.positions[index] += advances[index];
        this.speeds[index] = advances[index] / elapsed;
      }
    }
    return this.positions.map((along, index) => ({
      id: `traffic-car-${index}`,
      ...laneAt(along),
      type: "car" as const,
      ...VEHICLES.car,
      speed: elapsed > 0 ? this.speeds[index] : 0,
    }));
  }
}

/** Test a pedestrian disc against the vehicle's oriented footprint. */
export function vehicleContains(vehicle: TrafficVehicle, point: TrafficPoint, radius = 0): boolean {
  const dx = point[0] - vehicle.position[0], dz = point[1] - vehicle.position[1];
  const lateral = dx * Math.cos(vehicle.yaw) - dz * Math.sin(vehicle.yaw);
  const forward = dx * Math.sin(vehicle.yaw) + dz * Math.cos(vehicle.yaw);
  const padding = Math.max(0, radius);
  return Math.abs(lateral) <= vehicle.width / 2 + padding && Math.abs(forward) <= vehicle.length / 2 + padding;
}

/**
 * Navigation calls this BEFORE advancing a walker. True means wait at the curb
 * or choose a safe path. Cars never depend on camera visibility or wall time.
 * The bounded forecast includes a conservative swept-motion safety margin;
 * it does not move pedestrians or silently change their durable schedules.
 */
export function trafficYieldAt(
  simSeconds: number,
  from: TrafficPoint,
  to: TrafficPoint,
  radius = 2.5,
  traversalSeconds = 0.5,
): boolean {
  const duration = Math.max(0, Math.min(3, Number.isFinite(traversalSeconds) ? traversalSeconds : 0.5));
  const subdivisions = Math.max(1, Math.ceil(duration / 0.08));
  // The fastest corner of the vehicle moves faster than its center while turning.
  const minimumRadius = Math.min(...corners.map(corner => corner.radius));
  const cornerSpeed = TRAFFIC_SPEED * (1 + Math.hypot(VEHICLES.car.length / 2, VEHICLES.car.width / 2) / minimumRadius);
  const margin = (cornerSpeed * duration + distance(from, to)) / subdivisions / 2;
  for (let i = 0; i <= subdivisions; i++) {
    const progress = i / subdivisions;
    const point: TrafficPoint = [from[0] + (to[0] - from[0]) * progress, from[1] + (to[1] - from[1]) * progress];
    if (trafficAt(simSeconds + duration * progress).some(vehicle => vehicleContains(vehicle, point, radius + margin))) return true;
  }
  return false;
}

/** Used by geometry diagnostics and local route tests; no renderer dependency. */
export function vehicleCorners(vehicle: TrafficVehicle, padding = 0): TrafficPoint[] {
  const right: TrafficPoint = [Math.cos(vehicle.yaw), -Math.sin(vehicle.yaw)];
  const forward: TrafficPoint = [Math.sin(vehicle.yaw), Math.cos(vehicle.yaw)];
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([side, end]) => [
    vehicle.position[0] + right[0] * side * (vehicle.width / 2 + padding) + forward[0] * end * (vehicle.length / 2 + padding),
    vehicle.position[1] + right[1] * side * (vehicle.width / 2 + padding) + forward[1] * end * (vehicle.length / 2 + padding),
  ]);
}
