import type { World } from "./world";
import { computeSimMs, worldTime } from "./clock.ts";
import { dailyRoutine, routineAfterPlan } from "./daily-routines.ts";

export type Point = [number, number];

export const places: Record<string, Point> = {
  "Sân chung": [380, 286],
  "Phòng An": [207, 228],
  "Phòng Bình": [408, 183],
  "Phòng Chi": [589, 255],
  "Bếp chung": [603, 610],
  "Vườn nhỏ": [876, 613],
  "Công viên": [277, 565],
  "Quán cà phê": [979, 322],
  "Thư viện": [1013, 538],
  "Xưởng sáng tạo": [804, 219],
  "Quảng trường": [633, 407],
  "Phố đi bộ": [465, 432],
  "Lớp học cộng đồng": [1080, 580],
  "Phòng khám": [170, 490],
  "Chợ nhỏ": [735, 515],
  "Trường nghề": [1420, 260],
  "Bệnh viện": [1710, 260],
  "Rạp phim": [2040, 260],
  "Trụ sở công an": [2310, 390],
  "Nhà máy": [2240, 700],
  "Văn phòng": [1940, 610],
  "Trung tâm việc làm": [1630, 610],
  "Bến xe buýt": [1370, 730],
  "Ga metro": [1530, 1040],
  "Sân bay": [2140, 1270],
  "Nhà hàng": [1100, 960],
  "Siêu thị": [800, 1000],
  "Sân thể thao": [440, 1030],
  "Xưởng xe máy": [1830, 890],
  "Nhà văn hóa": [300, 1300],
  "Bưu điện": [720, 1300],
  "Trạm cứu hỏa": [1100, 1300],
  "Khu dân cư": [1450, 1340],
};

// Pedestrian graph: doors connect to lanes; crossings bridge the two street sides.
const nodes: Record<string, Point> = {
  ...places,
  h1: [240, 271],
  h2: [413, 249],
  h3: [594, 283],
  north: [525, 320],
  cross: [545, 356],
  south: [555, 448],
  west: [280, 396],
  east: [877, 400],
  work: [773, 321],
  cafe: [1005, 365],
  park: [322, 483],
  kitchen: [596, 534],
  garden: [826, 569],
  library: [1019, 497],
  civic: [1340, 450],
  learning: [1700, 450],
  eastCity: [2120, 450],
  industry: [2120, 800],
  transit: [1500, 900],
  southCity: [1050, 1140],
  westCity: [450, 1140],
  airportLane: [1950, 1140],
};

const edges: [string, string][] = [
  ["Phòng An", "h1"],
  ["Phòng Bình", "h2"],
  ["Phòng Chi", "h3"],
  ["h1", "Sân chung"],
  ["Sân chung", "h2"],
  ["h2", "h3"],
  ["h3", "north"],
  ["north", "cross"],
  ["cross", "south"],
  ["south", "Phố đi bộ"],
  ["Phố đi bộ", "west"],
  ["west", "park"],
  ["park", "Công viên"],
  ["south", "kitchen"],
  ["kitchen", "Bếp chung"],
  ["kitchen", "garden"],
  ["garden", "Vườn nhỏ"],
  ["garden", "library"],
  ["library", "Thư viện"],
  ["south", "Quảng trường"],
  ["Quảng trường", "east"],
  ["east", "cafe"],
  ["cafe", "Quán cà phê"],
  ["h3", "work"],
  ["work", "Xưởng sáng tạo"],
  ["work", "cafe"],
  ["library", "Lớp học cộng đồng"],
  ["park", "Phòng khám"],
  ["kitchen", "Chợ nhỏ"],
  ["east", "civic"],
  ["civic", "learning"],
  ["learning", "eastCity"],
  ["eastCity", "industry"],
  ["industry", "transit"],
  ["transit", "civic"],
  ["transit", "southCity"],
  ["southCity", "westCity"],
  ["southCity", "airportLane"],
  ["airportLane", "industry"],
  ["kitchen", "southCity"],
  ["civic", "Trường nghề"],
  ["learning", "Bệnh viện"],
  ["eastCity", "Rạp phim"],
  ["eastCity", "Trụ sở công an"],
  ["industry", "Nhà máy"],
  ["industry", "Văn phòng"],
  ["learning", "Trung tâm việc làm"],
  ["civic", "Bến xe buýt"],
  ["transit", "Ga metro"],
  ["airportLane", "Sân bay"],
  ["southCity", "Nhà hàng"],
  ["southCity", "Siêu thị"],
  ["westCity", "Sân thể thao"],
  ["industry", "Xưởng xe máy"],
  ["westCity", "Nhà văn hóa"],
  ["westCity", "Bưu điện"],
  ["southCity", "Trạm cứu hỏa"],
  ["southCity", "Khu dân cư"],
];

export const distance = (a: Point, b: Point): number =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);

const routeCache = new Map<string, Point[]>();

export function route(from: string, to: string): Point[] {
  const key = `${from}→${to}`;
  const cached = routeCache.get(key);
  if (cached) return cached;
  if (!nodes[from] || !nodes[to]) return [places["Sân chung"]];

  const costs: Record<string, number> = { [from]: 0 };
  const previous: Record<string, string> = {};
  const todo = new Set(Object.keys(nodes));

  while (todo.size > 0) {
    const next = [...todo].sort(
      (a, b) => (costs[a] ?? Infinity) - (costs[b] ?? Infinity),
    )[0];
    if (costs[next] === undefined) break;
    todo.delete(next);
    if (next === to) break;

    for (const [a, b] of edges) {
      const other = a === next ? b : b === next ? a : null;
      if (!other || !todo.has(other)) continue;
      const c = costs[next] + distance(nodes[next], nodes[other]);
      if (c < (costs[other] ?? Infinity)) {
        costs[other] = c;
        previous[other] = next;
      }
    }
  }

  const names = [to];
  while (names[0] !== from) {
    if (!previous[names[0]]) return [nodes[from]];
    names.unshift(previous[names[0]]);
  }
  const result = names.map((n) => nodes[n]);
  routeCache.set(key, result);
  return result;
}

export function along(points: Point[], travel: number): Point {
  if (!points.length) return [0, 0];
  let rem = travel;
  for (let i = 1; i < points.length; i++) {
    const len = distance(points[i - 1], points[i]);
    if (rem <= len) {
      const f = len ? Math.max(0, rem) / len : 0;
      return [
        points[i - 1][0] + (points[i][0] - points[i - 1][0]) * f,
        points[i - 1][1] + (points[i][1] - points[i - 1][1]) * f,
      ];
    }
    rem -= len;
  }
  return points[points.length - 1];
}

export type Step = {
  location: string;
  activity: string;
  duration: number;
  kind: "work" | "eat" | "rest" | "social" | "garden" | "read" | "play";
};

const step = (
  location: string,
  activity: string,
  kind: Step["kind"],
  duration = 65,
): Step => ({
  location,
  activity,
  kind,
  duration,
});

export const routines: Record<string, Step[]> = {
  an: [
    step("Bếp chung", "Chuẩn bị bữa sáng cùng bạn", "eat"),
    step("Xưởng sáng tạo", "Thử bản vẽ quầy nước", "work", 95),
    step("Quán cà phê", "Quan sát cách phục vụ", "social"),
    step("Thư viện", "Đọc cách tính chi phí", "read"),
    step("Công viên", "Nghỉ và chơi cùng Cún", "play"),
    step("Vườn nhỏ", "Phụ Chi chăm rau", "garden"),
    step("Bếp chung", "Rửa bát như đã hứa", "work"),
    step("Phòng An", "Sạc pin và nghỉ ngơi", "rest", 85),
  ],
  binh: [
    step("Bếp chung", "Dọn bàn cho bữa sáng", "eat"),
    step("Thư viện", "Kiểm tra sổ chi tiêu", "read", 95),
    step("Quán cà phê", "Hỏi thăm bạn cùng xóm", "social"),
    step("Xưởng sáng tạo", "Sắp xếp vật liệu dùng chung", "work"),
    step("Công viên", "Đi bộ và quan sát chim", "rest"),
    step("Quảng trường", "Kiểm tra bảng tin của xóm", "social"),
    step("Bếp chung", "Ghi chi phí bữa cơm", "work"),
    step("Phòng Bình", "Sạc pin và nghỉ ngơi", "rest", 85),
  ],
  chi: [
    step("Bếp chung", "Chuẩn bị bữa sáng", "eat"),
    step("Vườn nhỏ", "Tưới rau húng quế", "garden", 95),
    step("Quán cà phê", "Trao đổi công thức trà", "social"),
    step("Thư viện", "Tìm công thức mới", "read"),
    step("Công viên", "Ngồi yên để Mướp lại gần", "rest"),
    step("Vườn nhỏ", "Kiểm tra đất và tỉa lá", "garden"),
    step("Bếp chung", "Nấu bữa tối cho cả xóm", "work"),
    step("Phòng Chi", "Sạc pin và nghỉ ngơi", "rest", 85),
  ],
};

export function simulationTime(world: World, now: number): number {
  return computeSimMs(world.born, world.clock, now);
}

export type Actor = {
  id: string;
  name: string;
  position: Point;
  from: string;
  location: string;
  activity: string;
  kind: Step["kind"];
  walking: boolean;
  progress: number;
  source: "plan" | "routine";
  path: Point[];
  transport?: "walk" | "bicycle" | "motorbike" | "bus" | "metro";
};

type Transport = NonNullable<Actor["transport"]>;
const segmentLength = (path: Point[]) =>
  path.slice(1).reduce((sum, p, i) => sum + distance(p, path[i]), 0);
function transportPath(from: string, to: string, mode: Transport) {
  const stops =
    mode === "metro"
      ? ["westCity", "southCity", "Ga metro", "airportLane"]
      : [
          "civic",
          "learning",
          "eastCity",
          "industry",
          "transit",
          "southCity",
          "westCity",
          "airportLane",
        ];
  const nearest = (name: string) =>
    stops
      .slice()
      .sort(
        (a, b) =>
          distance(nodes[a], nodes[name] ?? places["Sân chung"]) -
          distance(nodes[b], nodes[name] ?? places["Sân chung"]),
      )[0];
  if (from === to) return { path: route(from, to), board: 0, ride: 0 };
  const start = nearest(from),
    end = nearest(to),
    first = route(from, start),
    last = route(end, to);
  if (start === end) return { path: route(from, to), board: 0, ride: 0 };
  let middle: Point[];
  if (mode === "metro") {
    const a = stops.indexOf(start),
      b = stops.indexOf(end);
    const sequence = stops.slice(Math.min(a, b), Math.max(a, b) + 1);
    if (a > b) sequence.reverse();
    middle = sequence.map((name) => nodes[name]);
  } else middle = route(start, end);
  return {
    path: [...first, ...middle.slice(1), ...last.slice(1)],
    board: segmentLength(first),
    ride: segmentLength(middle),
  };
}

export function project(
  id: string,
  name: string,
  list: Step[],
  time: number,
  source: Actor["source"],
  initial?: string,
  originPath?: Point[],
  transport: Transport = "walk",
): Actor {
  const total = list.reduce((n, s) => n + s.duration, 0);
  let t = time % total;
  let index = 0;
  while (t >= list[index].duration && index < list.length - 1) {
    t -= list[index].duration;
    index++;
  }
  const current = list[index];
  const from =
    index === 0
      ? ((time < total ? initial : undefined) ?? list[list.length - 1].location)
      : list[index - 1].location;
  const trip =
    transport === "walk"
      ? { path: route(from, current.location), board: 0, ride: 0 }
      : transportPath(from, current.location, transport);
  const basePath = trip.path;
  const prefix =
    index === 0 && time < total && originPath?.length ? originPath : null;
  const path = prefix ? [...prefix, ...basePath.slice(1)] : basePath;
  const length = segmentLength(path),
    board = trip.board + (prefix ? segmentLength(prefix) : 0),
    ride = trip.ride;
  const nominal = (length - ride) / 27 + ride / 55;
  const moveSeconds = Math.min(current.duration * 0.62, nominal);
  const walking = moveSeconds > 0 && t < moveSeconds;
  const elapsed = walking ? (t / moveSeconds) * nominal : nominal;
  const beforeTime = board / 27,
    rideTime = ride / 55;
  const travel =
    transport === "walk"
      ? walking
        ? (length * t) / moveSeconds
        : length
      : elapsed < beforeTime
        ? elapsed * 27
        : elapsed < beforeTime + rideTime
          ? board + (elapsed - beforeTime) * 55
          : board + ride + (elapsed - beforeTime - rideTime) * 27;
  const mode: Transport =
    walking &&
    ride > 0 &&
    elapsed >= beforeTime &&
    elapsed < beforeTime + rideTime
      ? transport
      : "walk";

  return {
    id,
    name,
    position: along(path, walking ? travel : length),
    transport: mode,
    from,
    location: current.location,
    activity: walking
      ? `${mode === "walk" ? "Đi đến" : mode === "metro" ? "Đi metro đến" : mode === "bus" ? "Đi xe buýt đến" : mode === "motorbike" ? "Đi xe máy đến" : "Đi xe đạp đến"} ${current.location.toLowerCase()}`
      : current.activity,
    kind: current.kind,
    walking,
    progress: t / current.duration,
    source,
    path,
  };
}

function offset(actor: Actor, index: number): Actor {
  return {
    ...actor,
    position: [
      actor.position[0] + (index - 1) * 25,
      actor.position[1] + index * 7,
    ],
  };
}

export function actorsAt(world: World, now: number): Actor[] {
  const time = simulationTime(world, now) / 1000;
  return world.people.map((p, index) => {
    const plan = p.plan;
    const planElapsed =
      plan?.simStartedAt !== undefined
        ? Math.max(0, time - plan.simStartedAt / 1000)
        : plan
          ? ((world.clock?.pausedAt ?? now) -
              Date.parse(plan.createdAt) -
              ((world.clock?.pausedMs ?? 0) - (plan.pausedMs ?? 0))) /
            1000
          : Infinity;

    if (
      plan &&
      planElapsed >= 0 &&
      planElapsed < plan.steps.reduce((n, s) => n + s.duration, 0)
    ) {
      return offset(
        project(
          p.id,
          p.name,
          plan.steps,
          planElapsed,
          "plan",
          plan.from,
          plan.originPath,
          plan.transport,
        ),
        index,
      );
    }

    const elapsedAfterPlan = plan
      ? Math.max(
          0,
          planElapsed - plan.steps.reduce((n, s) => n + s.duration, 0),
        )
      : time;

    return offset(
      project(
        p.id,
        p.name,
        plan
          ? routineAfterPlan(
              p.id,
              worldTime(world, now).hour * 3600 - elapsedAfterPlan,
            )
          : dailyRoutine(p.id),
        plan ? elapsedAfterPlan : worldTime(world, now).hour * 3600,
        "routine",
        plan?.steps.at(-1)?.location,
      ),
      index,
    );
  });
}

/**
 * Finds the nearest named place to the actor's simulated position at `now`
 * so inserting a new AI plan mid-routine transitions smoothly without teleporting (Fixes L1).
 */
export function resolveTransitionOrigin(
  world: World,
  personId: string,
  now: number,
): string {
  const currentActor = actorsAt(world, now).find((a) => a.id === personId);
  if (!currentActor) {
    return world.people.find((p) => p.id === personId)?.location ?? "Sân chung";
  }
  if (!currentActor.walking) {
    return currentActor.location;
  }
  // If walking mid-route, choose whichever named place is closest to current coordinates
  let bestPlace = currentActor.location;
  let bestDist = Infinity;
  for (const [placeName, coords] of Object.entries(places)) {
    const d = distance(currentActor.position, coords);
    if (d < bestDist) {
      bestDist = d;
      bestPlace = placeName;
    }
  }
  return bestPlace;
}

export const animals = [
  {
    id: "muop",
    name: "Mướp",
    species: "cat",
    description: "Nghỉ ở chỗ yên tĩnh, khám phá và chơi với đồ chơi.",
  },
  {
    id: "cun",
    name: "Cún",
    species: "dog",
    description: "Đánh hơi dọc đường, mời chơi và gần gũi khi thấy an toàn.",
  },
  {
    id: "se",
    name: "Đàn sẻ",
    species: "bird",
    description: "Đi cùng đàn, nhảy và kiếm hạt ở mặt đất.",
  },
] as const;

export function animalsAt(world: World, now: number) {
  const t = simulationTime(world, now) / 1000;
  const lists: Step[][] = [
    [
      step("Công viên", "Nằm nghỉ ở bóng cây", "rest", 110),
      step("Vườn nhỏ", "Khám phá quanh luống rau", "play", 80),
      step("Bếp chung", "Ngồi quan sát từ xa", "rest", 70),
      step("Công viên", "Vờn quả bóng đồ chơi", "play", 90),
    ],
    [
      step("Công viên", "Đánh hơi lối đi", "play", 80),
      step("Phố đi bộ", "Khám phá mùi mới", "play", 80),
      step("Quảng trường", "Mời bạn chơi bằng tư thế cúi đầu", "social", 100),
      step("Công viên", "Uống nước và nằm nghỉ", "rest", 90),
    ],
    [
      step("Công viên", "Cùng đàn tìm hạt trên đất", "eat", 70),
      step("Vườn nhỏ", "Nhảy và mổ hạt rơi", "eat", 70),
      step("Quảng trường", "Đậu quan sát cùng đàn", "rest", 60),
    ],
  ];
  return animals.map((a, i) => {
    const plan = world.living?.animalLearning?.[a.id]?.plan;
    const elapsed =
      plan?.simStartedAt !== undefined
        ? (simulationTime(world, now) - plan.simStartedAt) / 1000
        : Infinity;
    const total = plan?.steps.reduce((sum, s) => sum + s.duration, 0) ?? 0;
    const actor =
      plan && elapsed < total
        ? project(
            a.id,
            a.name,
            plan.steps,
            elapsed,
            "plan",
            plan.from,
            plan.originPath,
          )
        : project(
            a.id,
            a.name,
            lists[i],
            plan ? Math.max(0, elapsed - total) : t + i * 28,
            "routine",
            plan?.steps.at(-1)?.location,
          );
    return { ...a, ...actor };
  });
}

export function nearby(a: Actor, b: Actor): boolean {
  return (
    !a.walking &&
    !b.walking &&
    a.location === b.location &&
    distance(a.position, b.position) < 100
  );
}

export function followView(p: Point): string {
  const width = 570;
  const height = 370;
  return `${Math.max(0, Math.min(1200 - width, p[0] - width / 2))} ${Math.max(0, Math.min(780 - height, p[1] - height / 2))} ${width} ${height}`;
}

export function contextualLine(
  actor: Actor,
  peer: Actor,
  cycle: number,
): string {
  const messages: Record<string, string[]> = {
    "Bếp chung": [
      "Để mình phụ một tay nhé.",
      "Mình dọn bàn, bạn làm nốt nhé?",
      "Ăn xong mình cùng dọn nhé.",
    ],
    "Quán cà phê": [
      "Ngồi nghỉ một chút cùng mình không?",
      "Hôm nay công việc của bạn thế nào?",
      "Mình nghe đây, bạn kể tiếp đi.",
    ],
    "Công viên": [
      "Ở đây yên tĩnh thật.",
      "Mình để Mướp tự lại gần nhé.",
      "Đi một vòng rồi về nhé?",
    ],
    "Vườn nhỏ": [
      "Đất còn ẩm, mình kiểm tra trước nhé.",
      "Bạn giữ giúp mình cái bình nhé.",
      "Làm từng chút thôi, không cần vội.",
    ],
    "Thư viện": [
      "Quyển sổ này ghi rõ ràng thật đó.",
      "Mình đọc thêm mục này rồi bàn tiếp nhé.",
      "Cảm ơn bạn đã tra cứu giúp mình.",
    ],
    "Xưởng sáng tạo": [
      "Giữ giúp mình mối ghép này một chút nhé.",
      "Mình thử lắp khung này xem vừa không.",
      "Dụng cụ mình xếp lại trên kệ rồi đó.",
    ],
  };
  const pool = messages[actor.location] ?? [
    "Bạn cần mình giúp phần nào?",
    "Mình làm xong rồi sẽ qua giúp bạn.",
    "Ừ, mình cùng thử nhé.",
  ];
  return `${peer.name}, ${pool[cycle % pool.length]}`;
}

/** Keep the unfinished pedestrian route when a plan interrupts another activity. */
export function transitionPath(world: World, personId: string, now: number) {
  const index = world.people.findIndex((p) => p.id === personId);
  const actor = actorsAt(world, now)[index];
  const position: Point = [
    actor.position[0] - (index - 1) * 25,
    actor.position[1] - index * 7,
  ];
  return actorTransition(actor, position);
}

export function actorTransition(
  actor: Actor,
  position: Point = actor.position,
) {
  if (!actor.walking) return { from: actor.location, originPath: [position] };
  let nearest = 1;
  let best = Infinity;
  for (let i = 1; i < actor.path.length; i++) {
    const a = actor.path[i - 1],
      b = actor.path[i];
    const dx = b[0] - a[0],
      dy = b[1] - a[1];
    const fraction = Math.max(
      0,
      Math.min(
        1,
        ((position[0] - a[0]) * dx + (position[1] - a[1]) * dy) /
          (dx * dx + dy * dy || 1),
      ),
    );
    const d = distance(position, [a[0] + dx * fraction, a[1] + dy * fraction]);
    if (d < best) {
      best = d;
      nearest = i;
    }
  }
  return {
    from: actor.location,
    originPath: [position, ...actor.path.slice(nearest)],
  };
}
