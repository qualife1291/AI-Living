import { along, distance, simulationTime, type Point } from './life.ts';
import type { World } from './world';

export function signalAt(seconds: number) {
  const p = ((seconds % 48) + 48) % 48;
  return {
    main: p < 16,
    avenue: p >= 24 && p < 40,
    pedestrian: (p >= 16 && p < 24) || p >= 40,
    phase: p,
  };
}

function waitForGreen(arrival: number, lane: 'main' | 'avenue'): number {
  for (let wait = 0; wait <= 48; wait += 0.25) {
    const s = signalAt(arrival + wait);
    const remain = lane === 'main' ? 16 - s.phase : 40 - s.phase;
    if (s[lane] && remain >= 4) return wait;
  }
  return 48;
}

export type Vehicle = {
  id: string;
  position: Point;
  angle: number;
  color: string;
  kind: 'car' | 'bus' | 'van';
  moving: boolean;
  waiting: boolean;
};

const lanes = [
  {
    id: 'main-east',
    path: [
      [-160, 235],
      [512, 361],
      [1360, 521],
    ] as Point[],
    lane: 'main' as const,
    color: '#dba07e',
    kind: 'car' as const,
    offset: 0,
  },
  {
    id: 'main-west',
    path: [
      [1360, 497],
      [665, 366],
      [-160, 211],
    ] as Point[],
    lane: 'main' as const,
    color: '#96b5c8',
    kind: 'bus' as const,
    offset: 37,
  },
  {
    id: 'avenue-south',
    path: [
      [343, -160],
      [564, 301],
      [868, 940],
    ] as Point[],
    lane: 'avenue' as const,
    color: '#a9bd91',
    kind: 'van' as const,
    offset: 17,
  },
  {
    id: 'avenue-north',
    path: [
      [892, 940],
      [638, 405],
      [367, -160],
    ] as Point[],
    lane: 'avenue' as const,
    color: '#c2aece',
    kind: 'car' as const,
    offset: 59,
  },
];

export function vehiclesAt(world: World, now: number): Vehicle[] {
  const seconds = simulationTime(world, now) / 1000;
  return lanes.map((l) => {
    const trip = Math.floor((seconds + l.offset) / 100);
    const elapsed = (seconds + l.offset) % 100;
    const start = trip * 100 - l.offset;
    const first = distance(l.path[0], l.path[1]);
    const second = distance(l.path[1], l.path[2]);
    const speed = 36;
    const arrive = first / speed;
    const wait = waitForGreen(start + arrive, l.lane);
    const waiting = elapsed >= arrive && elapsed < arrive + wait;
    const travel =
      elapsed < arrive
        ? elapsed * speed
        : first + Math.max(0, elapsed - arrive - wait) * speed;
    const position = along(l.path, travel);
    const angle =
      (Math.atan2(l.path[2][1] - l.path[0][1], l.path[2][0] - l.path[0][0]) *
        180) /
      Math.PI;

    return {
      id: l.id,
      position,
      angle,
      color: l.color,
      kind: l.color === '#96b5c8' ? 'bus' : l.kind,
      moving: !waiting && travel < first + second,
      waiting,
    };
  });
}
