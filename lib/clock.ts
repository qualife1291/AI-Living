export type DayPhase =
  | 'dawn'
  | 'morning'
  | 'noon'
  | 'afternoon'
  | 'dusk'
  | 'evening'
  | 'night';

export type Season = 'dry' | 'rainy';

export type WeatherKind = 'clear' | 'cloudy' | 'rain' | 'fog' | 'windy';

export type WeatherState = {
  kind: WeatherKind;
  label: string;
  intensity: number; // 0..1
  tempC: number;
};

export type ClockAnchor = {
  realMs: number;
  simMs: number;
  scale: number;
};

export type WorldClockConfig = {
  pausedAt: number | null;
  pausedMs: number;
  scale?: number;
  anchors?: ClockAnchor[];
  weatherOverride?: WeatherKind | null;
};

export type WorldTime = {
  simMs: number;
  dayIndex: number;
  hour: number; // 0..24 local Asia/Ho_Chi_Minh
  phase: DayPhase;
  phaseLabel: string;
  daylight: number; // 0..1 smooth curve
  season: Season;
  seasonLabel: string;
};

const VN_OFFSET_MS = 7 * 3600 * 1000;
const DAY_MS = 86_400_000;

/**
 * Deterministic 32-bit PRNG (mulberry32) from numeric seed.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Computes elapsed simulated milliseconds since world.born, supporting both
 * legacy { pausedAt, pausedMs } and segmented speed anchors.
 */
export function computeSimMs(
  bornIso: string,
  clock: WorldClockConfig | undefined,
  nowMs: number,
): number {
  const bornMs = Date.parse(bornIso) || nowMs;
  if (clock?.anchors && clock.anchors.length > 0) {
    const last = clock.anchors[clock.anchors.length - 1];
    const effectiveNow = clock.pausedAt ?? nowMs;
    const delta = Math.max(0, effectiveNow - last.realMs);
    return Math.max(0, last.simMs + delta * last.scale);
  }
  const effectiveNow = clock?.pausedAt ?? nowMs;
  const scale = clock?.scale ?? 1;
  const rawElapsed = Math.max(0, effectiveNow - bornMs - (clock?.pausedMs ?? 0));
  return rawElapsed * scale;
}

export function phaseFromHour(hour: number): {
  phase: DayPhase;
  phaseLabel: string;
} {
  if (hour >= 5.5 && hour < 7) return { phase: 'dawn', phaseLabel: 'Bình minh' };
  if (hour >= 7 && hour < 11) return { phase: 'morning', phaseLabel: 'Buổi sáng' };
  if (hour >= 11 && hour < 14) return { phase: 'noon', phaseLabel: 'Buổi trưa' };
  if (hour >= 14 && hour < 17.5) return { phase: 'afternoon', phaseLabel: 'Buổi chiều' };
  if (hour >= 17.5 && hour < 18.5) return { phase: 'dusk', phaseLabel: 'Hoàng hôn' };
  if (hour >= 18.5 && hour < 22) return { phase: 'evening', phaseLabel: 'Buổi tối' };
  return { phase: 'night', phaseLabel: 'Ban đêm' };
}

export function daylightFromHour(hour: number): number {
  if (hour < 5 || hour >= 20) return 0.08;
  if (hour >= 5 && hour < 7) {
    return 0.08 + ((hour - 5) / 2) * 0.82;
  }
  if (hour >= 7 && hour < 17) {
    const peak = Math.sin(((hour - 7) / 10) * Math.PI);
    return Number((0.9 + peak * 0.1).toFixed(3));
  }
  if (hour >= 17 && hour < 20) {
    return Number((0.9 - ((hour - 17) / 3) * 0.82).toFixed(3));
  }
  return 0.08;
}

export function worldTime(
  world: { born: string; clock?: WorldClockConfig },
  nowMs: number,
): WorldTime {
  const simMs = computeSimMs(world.born, world.clock, nowMs);
  const bornMs = Date.parse(world.born) || nowMs;
  const virtualEpochMs = bornMs + simMs;
  const vnMs = virtualEpochMs + VN_OFFSET_MS;
  const dayIndex = Math.max(0, Math.floor(simMs / DAY_MS));
  const msInDay = ((vnMs % DAY_MS) + DAY_MS) % DAY_MS;
  const hour = msInDay / 3_600_000;
  const { phase, phaseLabel } = phaseFromHour(hour);
  const daylight = daylightFromHour(hour);

  const month = new Date(vnMs).getUTCMonth() + 1; // 1..12
  const season: Season = month >= 5 && month <= 11 ? 'rainy' : 'dry';
  const seasonLabel = season === 'rainy' ? 'Mùa mưa TP.HCM' : 'Mùa khô TP.HCM';

  return {
    simMs,
    dayIndex,
    hour,
    phase,
    phaseLabel,
    daylight,
    season,
    seasonLabel,
  };
}

const WEATHER_LABELS: Record<WeatherKind, string> = {
  clear: 'Nắng nhẹ',
  cloudy: 'Trời dịu nhiều mây',
  rain: 'Mưa rào bất chợt',
  fog: 'Sương mỏng đầu ngày',
  windy: 'Gió mát thổi qua xóm',
};

/**
 * Deterministic Markov-inspired weather generator per 2-hour block in Ho Chi Minh City.
 */
export function weatherAt(
  seedKey: string,
  t: WorldTime,
  override?: WeatherKind | null,
): WeatherState {
  if (override && WEATHER_LABELS[override]) {
    return {
      kind: override,
      label: WEATHER_LABELS[override],
      intensity: override === 'rain' ? 0.75 : 0.4,
      tempC: override === 'rain' ? 26 : 30,
    };
  }

  const slot = Math.floor(t.hour / 2);
  const rng = mulberry32(hashSeed(`${seedKey}-day-${t.dayIndex}-slot-${slot}`));
  const roll = rng();

  let kind: WeatherKind = 'clear';
  if (t.phase === 'dawn') {
    kind = roll < 0.28 ? 'fog' : roll < 0.65 ? 'clear' : 'cloudy';
  } else if (t.season === 'rainy' && (t.phase === 'afternoon' || t.phase === 'dusk')) {
    if (roll < 0.42) kind = 'rain';
    else if (roll < 0.72) kind = 'cloudy';
    else if (roll < 0.88) kind = 'windy';
    else kind = 'clear';
  } else if (t.phase === 'noon') {
    kind = roll < 0.7 ? 'clear' : roll < 0.9 ? 'cloudy' : 'windy';
  } else {
    if (roll < 0.55) kind = 'clear';
    else if (roll < 0.8) kind = 'cloudy';
    else if (roll < 0.93) kind = 'windy';
    else kind = 'rain';
  }

  const baseTemp =
    t.phase === 'noon'
      ? 33
      : t.phase === 'morning' || t.phase === 'afternoon'
        ? 31
        : t.phase === 'dawn' || t.phase === 'night'
          ? 25
          : 28;
  const tempOffset = kind === 'rain' ? -3 : kind === 'cloudy' ? -1 : 0;

  return {
    kind,
    label: WEATHER_LABELS[kind],
    intensity: Number((0.3 + rng() * 0.6).toFixed(2)),
    tempC: baseTemp + tempOffset,
  };
}
