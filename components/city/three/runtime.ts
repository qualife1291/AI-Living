import { HUMAN_SCALE, VEHICLES, pixelRatio, type Quality } from "@/lib/city/scale";
import { speechAt } from "@/lib/speech";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  actorsAt,
  animalsAt,
  along,
  simulationTime,
  type Actor,
  type Point,
} from "@/lib/life";
import { crowdAt, livingSpeechAt } from "@/lib/living/engine";
import { worldTime } from "@/lib/clock";
import {
  defaultAppearance,
  themes,
  type Appearance,
} from "@/lib/city/appearance";
import { boulevards, metroLine, venues, type Venue } from "@/lib/city/world";
import {
  cityBuildings,
  pedestrianSegments,
  buildingAllowed,
} from "@/lib/city/three-layout";
import type { World, EpisodeEvent } from "@/lib/world";

export type SceneInput = {
  world: World;
  quality?: Quality;
  events?: EpisodeEvent[];
  selected: string;
  clockOffsetMs?: number;
  target?: { x: number; y: number; key: number } | null;
};
export type SceneStatus = {
  name: string;
  activity: string;
  following: boolean;
  speech: string;
  x: number;
  y: number;
  visible: boolean;
  walking: boolean;
  location: string;
};
export type CityRuntime = {
  zoom: (factor: number) => void;
  follow: () => void;
  overview: () => void;
  skyline: () => void;
  dispose: () => void;
};
type Solid = {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: string;
  angle?: number;
};
const up = new THREE.Vector3(0, 1, 0);

export function createCity(
  host: HTMLDivElement,
  input: () => SceneInput,
  callbacks: {
    select: (id: string) => void;
    venue: (v: Venue) => void;
    status: (v: SceneStatus) => void;
    fatal: () => void;
  },
): CityRuntime {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(
    pixelRatio(input().quality, devicePixelRatio),
  );
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.domElement.setAttribute("aria-label", "Thành phố 3D của An");
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.tabIndex = 0;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#d6e4df");
  const fog = new THREE.Fog("#d6e4df", 3200, 8500);
  scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(43, 1, 2, 20000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.minDistance = 100;
  controls.maxDistance = 11000;
  controls.minPolarAngle = 0.22;
  controls.maxPolarAngle = Math.PI / 2 - 0.08;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };
  const ambient = new THREE.HemisphereLight("#e7f6ff", "#b5a18c", 2.6);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight("#fff0ce", 3.2);
  sun.position.set(-400, 1200, 600);
  scene.add(sun);
  const solids: Solid[] = [],
    cylinders: Solid[] = [],
    leaves: Solid[] = [],
    windows: Solid[] = [],
    shadows: Solid[] = [];
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
    angle = 0,
  ) => solids.push({ x, y, z, w, h, d, color, angle });
  const cylinder = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    color: string,
  ) => cylinders.push({ x, y, z, w, h, d: w, color });
  const windowBox = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    i = 0,
  ) => windows.push({ x, y, z, w, h, d, color: i % 5 ? "#6e959e" : "#ffe1a0" });
  const road = (path: number[][], width: number, y: number, color: string) => {
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1],
        b = path[i],
        length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      box(
        (a[0] + b[0]) / 2,
        y,
        (a[1] + b[1]) / 2,
        width,
        0.5,
        length + width * 0.25,
        color,
        Math.atan2(b[0] - a[0], b[1] - a[1]),
      );
    }
  };
  box(1200, -4, 570, 3150, 7, 2300, "#a7cd87");
  // River and a broad promenade at the southern edge of the fictional district.
  road(
    [
      [-400, 1450],
      [600, 1600],
      [1500, 1620],
      [2800, 1450],
    ],
    180,
    0.1,
    "#55b8d1",
  );
  for (const p of boulevards) {
    road(p, 68, 0.5, "#e6dfcc");
    road(p, 43, 1, "#818e8c");
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1],
        b = p[i],
        l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (let t = 18; t < l; t += 30)
        box(
          a[0] + ((b[0] - a[0]) * t) / l,
          1.4,
          a[1] + ((b[1] - a[1]) * t) / l,
          1.6,
          0.3,
          10,
          "#e9ddbd",
          Math.atan2(b[0] - a[0], b[1] - a[1]),
        );
    }
  }
  for (const [a, b] of pedestrianSegments) road([a, b], 8, 1.5, "#eee2c6");
  road(metroLine, 10, 3, "#617878");
  road(metroLine, 5, 3.5, "#bac7bd");
  const buildings = cityBuildings();
  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i],
      { x, z, width: w, depth: d, height: h } = b;
    box(x, 1.2, z, w + 12, 2, d + 12, "#ded9c6");
    box(x, h / 2 + 2, z, w, h, d, b.color);
    box(x, h + 4, z, w + 3, 4, d + 3, "#e3e4d5");
    box(x, h + 8, z - 5, w * 0.38, 7, d * 0.35, "#879a95");
    shadows.push({
      x: x + 8,
      y: 0.15,
      z: z + 8,
      w: w + 22,
      h: 0.2,
      d: d + 22,
      color: "#a4b19d",
    });
    if (b.tower && i % 4 === 0) {
      box(x, h + 14, z, w * 0.76, 22, d * 0.76, b.color);
      box(x, h + 27, z, w * 0.8, 3, d * 0.8, "#e4e5d8");
    }
    if (b.tower) {
      box(x, 10, z, w + 8, 18, d + 8, "#e1d7bc");
      if (i % 3 === 0) cylinder(x + w / 4, h + 19, z, 1.4, 25, "#d8dcd2");
    }
    const levels = Math.floor((h - 18) / 17),
      cols = Math.max(2, Math.floor(w / 14));
    for (let f = 0; f < levels; f++)
      for (let c = 0; c < cols; c++) {
        const wx = x - w / 2 + ((c + 0.5) * w) / cols,
          y = 25 + f * 17;
        windowBox(wx, y, z + d / 2 + 0.6, 7, 9, 1, i + c + f);
        windowBox(wx, y, z - d / 2 - 0.6, 7, 9, 1, i + c + f + 1);
      }
    for (let f = 0; f < levels; f++)
      for (let c = 0; c < 3; c++) {
        const wz = z - d / 2 + ((c + 0.5) * d) / 3;
        windowBox(x + w / 2 + 0.6, 25 + f * 17, wz, 1, 9, 7, i + f);
        windowBox(x - w / 2 - 0.6, 25 + f * 17, wz, 1, 9, 7, i + f + 1);
      }
    box(
      x,
      13,
      z + d / 2 + 5,
      w + 5,
      3,
      10,
      ["#b87762", "#628e82", "#c5a05c"][i % 3],
    );
    for (let c = -1; c <= 1; c++)
      windowBox(x + (c * w) / 3.4, 7, z + d / 2 + 0.8, w / 4, 11, 1, 1);
  }
  const venueLabels: { sprite: THREE.Sprite; width: number }[] = [];
  function label(
    text: string,
    x: number,
    y: number,
    z: number,
    width = 96,
    color = "#375a50",
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#f2eddd";
    ctx.beginPath();
    ctx.roundRect(2, 4, 508, 85, 18);
    ctx.fill();
    ctx.font = "600 33px sans-serif";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 48, 480);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, depthWrite: false }),
    );
    sprite.position.set(x, y, z);
    sprite.scale.set(width, (width * 96) / 512, 1);
    scene.add(sprite);
    return sprite;
  }
  function tree(x: number, z: number, seed = 0) {
    cylinder(x, 12, z, 3, 24, "#9c8769");
    shadows.push({
      x: x + 4,
      y: 1.1,
      z: z + 4,
      w: 25,
      h: 0.15,
      d: 18,
      color: "#a4b69e",
    });
    leaves.push({
      x,
      y: 30 + (seed % 7),
      z,
      w: 25,
      h: 32,
      d: 25,
      color: seed % 2 ? "#89b966" : "#48a481",
    });
  }
  for (const v of venues) {
    const open = ["square", "park", "garden", "sport", "bus", "metro"].includes(
      v.type,
    );
    const height =
      v.type === "office"
        ? 140
        : ["hospital", "school"].includes(v.type)
          ? 78
          : v.type === "airport"
            ? 48
            : 43;
    box(v.x, 1, v.y - 25, 125, 2, 112, open ? "#c8d3b4" : "#e6dec9");
    if (open) {
      tree(v.x - 45, v.y - 47, 1);
      tree(v.x + 45, v.y - 47, 2);
      if (v.type === "square" || v.type === "park") {
        cylinder(v.x, 5, v.y - 44, 25, 8, "#d8d7c2");
        cylinder(v.x, 10, v.y - 44, 20, 3, "#8dbbb4");
      } else if (v.type === "sport") {
        box(v.x, 2.5, v.y - 35, 78, 1, 48, "#88ae89");
        for (const dx of [-40, 40])
          box(v.x + dx, 11, v.y - 35, 1.5, 18, 20, "#edf0df");
      } else if (v.type === "bus" || v.type === "metro") {
        box(v.x, 26, v.y - 22, 100, 4, 30, "#7ba69f");
        for (const dx of [-43, 43])
          cylinder(v.x + dx, 13, v.y - 22, 2, 26, "#6d8583");
      }
    } else {
      const color =
        (
          {
            hospital: "#e1e8de",
            clinic: "#d9e6d8",
            school: "#f2c75c",
            police: "#a4b8c8",
            cinema: "#dc8ba2",
            factory: "#a9b8b4",
            home: "#f0bb89",
          } as Record<string, string>
        )[v.type] ?? "#8fc7b3";
      box(v.x, height / 2 + 2, v.y - 47, 104, height, 72, color);
      box(v.x, height + 4, v.y - 47, 110, 5, 78, "#e9e3cf");
      box(v.x, 6, v.y - 7, 34, 12, 12, "#b0bba5");
      windowBox(v.x, 15, v.y - 10, 17, 26, 2, 1);
      for (let f = 0; f < Math.floor(height / 22); f++)
        for (const dx of [-35, -12, 12, 35])
          windowBox(v.x + dx, 20 + f * 22, v.y - 10, 12, 12, 1, f);
      box(
        v.x,
        31,
        v.y - 5,
        114,
        3,
        18,
        ["#769e8d", "#c69b6a", "#b68372"][Math.floor(v.x) % 3],
      );
      if (["hospital", "clinic"].includes(v.type)) {
        box(v.x, height - 12, v.y - 9, 23, 7, 2, "#ba7868");
        box(v.x, height - 12, v.y - 8, 7, 23, 2, "#ba7868");
      }
      if (v.type === "factory")
        for (const dx of [-32, 30])
          cylinder(v.x + dx, height + 22, v.y - 60, 8, 42, "#7b908d");
      if (v.type === "airport") {
        cylinder(v.x + 35, 67, v.y - 40, 8, 70, "#c6d3cc");
        box(v.x + 35, 103, v.y - 40, 30, 16, 25, "#73969b");
      }
      tree(v.x - 66, v.y - 14, 3);
    }
    const sign = label(v.name, v.x, open ? 43 : height + 22, v.y - 20, 112);
    if (sign) {
      sign.userData.venue = v;
      venueLabels.push({ sprite: sign, width: 112 });
    }
  }
  for (let i = 0; i < 140; i++) {
    const x = (i * 379 + 41) % 2430,
      z = (i * 193 + 110) % 1480;
    if (
      buildingAllowed(x, z, 6) &&
      !buildings.some(
        (b) =>
          Math.abs(x - b.x) < b.width / 2 + 17 &&
          Math.abs(z - b.z) < b.depth / 2 + 17,
      )
    )
      tree(x, z, i);
  }
  for (const p of boulevards)
    for (const point of p) {
      cylinder(point[0] + 30, 26, point[1], 1.4, 52, "#728882");
      box(point[0] + 26, 52, point[1], 11, 2, 5, "#f7dba1");
    }
  const dummy = new THREE.Object3D(),
    color = new THREE.Color();
  function batch(
    geometry: THREE.BufferGeometry,
    list: Solid[],
    material = new THREE.MeshStandardMaterial({ roughness: 0.85 }),
  ) {
    const mesh = new THREE.InstancedMesh(
      geometry,
      material,
      Math.max(1, list.length),
    );
    mesh.count = list.length;
    list.forEach((s, i) => {
      dummy.position.set(s.x, s.y, s.z);
      dummy.rotation.set(0, s.angle ?? 0, 0);
      dummy.scale.set(s.w, s.h, s.d);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, color.set(s.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
    return mesh;
  }
  batch(new THREE.CylinderGeometry(0.5, 0.5, 1, 16), shadows);
  batch(new THREE.BoxGeometry(1, 1, 1), solids);
  batch(new THREE.CylinderGeometry(0.5, 0.5, 1, 8), cylinders);
  batch(new THREE.IcosahedronGeometry(0.5, 1), leaves);
  const windowMaterial = new THREE.MeshStandardMaterial({
    roughness: 0.35,
    metalness: 0.15,
    emissive: "#638082",
    emissiveIntensity: 0.12,
  });
  batch(new THREE.BoxGeometry(1, 1, 1), windows, windowMaterial);
  host.dataset.buildings = String(
    buildings.length +
      venues.filter(
        (v) =>
          !["square", "park", "garden", "sport", "bus", "metro"].includes(
            v.type,
          ),
      ).length,
  );
  host.dataset.towers = String(buildings.filter((b) => b.tower).length);

  // A shared mesh per body part keeps dozens of residents affordable on mobile.
  const capacity = 72,
    bodyParts: Record<string, THREE.InstancedMesh> = {};
  const boxGeo = new THREE.BoxGeometry(1, 1, 1),
    headGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  for (const part of [
    "torso",
    "head",
    "hair",
    "hat",
    "leftArm",
    "rightArm",
    "leftHand",
    "rightHand",
    "leftLeg",
    "rightLeg",
    "leftShoe",
    "rightShoe",
    "eyeL",
    "eyeR",
    "detail",
    "badge",
    "prop",
    "glassesL",
    "glassesR",
  ]) {
    const mesh = new THREE.InstancedMesh(
      part === "head" || part === "hat" ? headGeo : boxGeo,
      new THREE.MeshStandardMaterial({ roughness: 0.8 }),
      capacity,
    );
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.userData.ids = [];
    bodyParts[part] = mesh;
    scene.add(mesh);
  }
  const riderVehicles = new THREE.InstancedMesh(
    boxGeo,
    new THREE.MeshStandardMaterial({ roughness: 0.55 }),
    capacity,
  );
  scene.add(riderVehicles);
  riderVehicles.count = 0;
  riderVehicles.frustumCulled = false;
  const trafficBody = new THREE.InstancedMesh(
      boxGeo,
      new THREE.MeshStandardMaterial({ roughness: 0.55 }),
      26,
    ),
    trafficGlass = new THREE.InstancedMesh(
      boxGeo,
      new THREE.MeshStandardMaterial({ color: "#496d77", roughness: 0.3 }),
      26,
    );
  scene.add(trafficBody, trafficGlass);
  trafficBody.frustumCulled = trafficGlass.frustumCulled = false;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(6, 7, 32),
    new THREE.MeshBasicMaterial({ color: "#ffe0a0", side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);
  const animalGroup = new THREE.Group();
  scene.add(animalGroup);
  const animalMeshes = Array.from({ length: 3 }, (_, i) => {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: ["#cda17a", "#807f73", "#748c94", "#bdac8e"][i],
    });
    const body = new THREE.Mesh(boxGeo, mat);
    body.scale.set(6, 3.5, 3.5);
    body.position.y = 2.5;
    g.add(body);
    const head = new THREE.Mesh(boxGeo, mat);
    head.scale.set(3, 3, 3);
    head.position.set(3, 5, 0);
    g.add(head);
    animalGroup.add(g);
    return g;
  });
  const selectedLabel = label("An", 0, 62, 0, 48)!;
  let lastLabel = "",
    following = true,
    dead = false,
    frame = 0,
    lastDraw = 0,
    lastState = 0,
    targetKey: number | undefined;
  let current: Actor | undefined,
    actors: Actor[] = [],
    lastSelected = "";
  const previousPositions = new Map<string, Point>();
  let lastTime = Date.parse(input().world.born);
  let lastStatus = 0;
  const viewOffset = new THREE.Vector3(125, 140, 190);
  function focus(x: number, z: number, offset = viewOffset) {
    scene.fog = fog;
    controls.target.set(x, 15, z);
    camera.position.copy(controls.target).add(offset);
    controls.update();
  }
  focus(350, 280);
  const onStart = () => {
    following = false;
    host.dataset.view = "orbit";
  };
  controls.addEventListener("start", onStart);
  const raycaster = new THREE.Raycaster(),
    pointer = new THREE.Vector2();
  let down: { x: number; y: number } | null = null;
  const pointerDown = (e: PointerEvent) => {
    down = { x: e.clientX, y: e.clientY };
  };
  const pointerUp = (e: PointerEvent) => {
    if (
      !down ||
      Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5 ||
      e.button !== 0
    ) {
      down = null;
      return;
    }
    down = null;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    // Include buildings so picking never selects a resident through a tower.
    const hit = raycaster
      .intersectObjects(scene.children, false)
      .find((h) => h.object !== ring && h.object !== selectedLabel);
    if (!hit) return;
    if (hit.object.userData.venue) callbacks.venue(hit.object.userData.venue);
    else if (
      hit.instanceId !== undefined &&
      hit.object.userData.ids?.[hit.instanceId]
    ) {
      callbacks.select(hit.object.userData.ids[hit.instanceId]);
      following = true;
    }
  };
  renderer.domElement.addEventListener("pointerdown", pointerDown);
  renderer.domElement.addEventListener("pointerup", pointerUp);
  const lost = (e: Event) => {
    e.preventDefault();
    if (!dead) callbacks.fatal();
  };
  renderer.domElement.addEventListener("webglcontextlost", lost);
  const resize = new ResizeObserver(() => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
  resize.observe(host);
  const position = new THREE.Vector3(),
    scale = new THREE.Vector3(),
    rotation = new THREE.Quaternion(),
    root = new THREE.Matrix4(),
    local = new THREE.Matrix4(),
    result = new THREE.Matrix4();
  function part(
    name: string,
    index: number,
    id: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    tint: string,
    angle = 0,
  ) {
    const mesh = bodyParts[name];
    dummy.position.set(x, y, z);
    dummy.scale.set(w, h, d);
    if (w === 0) dummy.scale.setScalar(0);
    dummy.rotation.set(angle, 0, 0);
    dummy.updateMatrix();
    local.copy(dummy.matrix);
    result.multiplyMatrices(root, local);
    mesh.setMatrixAt(index, result);
    mesh.setColorAt(index, color.set(tint));
    mesh.userData.ids[index] = id;
  }
  const heading = new Map<string, number>();
  const renderedPositions = new Map<string, THREE.Vector2>();
  function drawActors(seconds: number, world: World) {
    for (const mesh of Object.values(bodyParts)) mesh.count = actors.length;
    riderVehicles.count = actors.length;
    actors.forEach((a, i) => {
      const core = world.people.find((p) => p.id === a.id),
        npc = world.living?.residents.find((p) => p.id === a.id);
      const appearance: Appearance =
        world.living?.appearances?.[a.id] ??
        defaultAppearance(
          a.id,
          core?.role ??
            `${npc?.roleId} ${world.living?.catalog.roles.find((r) => r.id === npc?.roleId)?.label}`,
        );
      const old = previousPositions.get(a.id),
        moving =
          old &&
          Math.hypot(a.position[0] - old[0], a.position[1] - old[1]) > 0.05;
      if (moving)
        heading.set(
          a.id,
          Math.atan2(a.position[0] - old[0], a.position[1] - old[1]),
        );
      previousPositions.set(a.id, a.position);
      const riding = a.walking && a.transport && a.transport !== "walk";
      const yaw = heading.get(a.id) ?? 0.35,
        s = HUMAN_SCALE;
      const smooth = renderedPositions.get(a.id) ?? new THREE.Vector2(...a.position);
      if (!world.paused) smooth.lerp(new THREE.Vector2(...a.position), 0.5);
      else smooth.set(...a.position);
      renderedPositions.set(a.id, smooth);
      position.set(smooth.x, riding ? 8 : 2, smooth.y);
      rotation.setFromAxisAngle(up, yaw);
      scale.setScalar(s);
      root.compose(position, rotation, scale);
      const swing = a.walking && !riding ? Math.sin(seconds * 8 + i) * 0.55 : Math.sin(seconds * 1.5 + i) * 0.045;
      const usingProp = !a.walking && ["read", "garden", "eat", "work"].includes(a.kind);
      part("prop", i, a.id, 0, 15.5, 8, usingProp ? 7 : 0, a.kind === "read" ? 1 : 3, 5, a.kind === "read" ? "#e9b549" : a.kind === "garden" ? "#50adba" : "#fff5cf");
      part("torso", i, a.id, 0, 20, 0, 13, 13, 8, appearance.shirt);
      part("head", i, a.id, 0, 32, 0, 9, 10, 9, appearance.skin);
      part(
        "hair",
        i,
        a.id,
        0,
        38,
        -1,
        appearance.hair === "bald" ? 0 : 10,
        4,
        9,
        {
          black: "#4a4e48",
          brown: "#7a5d48",
          gray: "#aeb4aa",
          bald: "#ead2a2",
        }[appearance.hair],
      );
      const gear =
        themes.find((t) => t.id === appearance.theme)?.headgear ?? "none";
      part(
        "hat",
        i,
        a.id,
        0,
        gear === "chef" ? 42 : 39,
        0,
        gear === "none" ? 0 : 12,
        gear === "chef" ? 10 : 5,
        12,
        gear === "hardhat"
          ? "#edbc62"
          : gear === "chef"
            ? "#f1eadd"
            : appearance.shirt,
      );
      for (const [side, sign] of [
        ["left", -1],
        ["right", 1],
      ] as const) {
        part(
          `${side}Arm`,
          i,
          a.id,
          sign * 9,
          21,
          0,
          4,
          12,
          5,
          appearance.shirt,
          usingProp ? -0.55 : sign * swing,
        );
        part(
          `${side}Hand`,
          i,
          a.id,
          sign * 9,
          13,
          Math.sin(sign * swing) * 6,
          4,
          4,
          4,
          appearance.skin,
        );
        part(
          `${side}Leg`,
          i,
          a.id,
          sign * 3.6,
          8,
          0,
          6,
          12,
          7,
          appearance.trousers,
          -sign * swing,
        );
        part(
          `${side}Shoe`,
          i,
          a.id,
          sign * 3.6,
          2,
          1 + Math.sin(-sign * swing) * 5,
          6,
          3,
          9,
          "#505d59",
        );
      }
      part("eyeL", i, a.id, -2, 33, 4.5, 1.2, 1.5, 0.8, "#35473d");
      part("eyeR", i, a.id, 2, 33, 4.5, 1.2, 1.5, 0.8, "#35473d");
      part(
        "detail",
        i,
        a.id,
        0,
        appearance.face === "moustache" ? 30.5 : 29.5,
        4.7,
        appearance.face === "moustache" ? 5 : 2.7,
        1,
        0.8,
        "#675744",
      );
      const glasses = appearance.face === "glasses";
      part(
        "glassesL",
        i,
        a.id,
        -2.2,
        33,
        5,
        glasses ? 3.5 : 0,
        3,
        0.6,
        "#5a665d",
      );
      part(
        "glassesR",
        i,
        a.id,
        2.2,
        33,
        5,
        glasses ? 3.5 : 0,
        3,
        0.6,
        "#5a665d",
      );
      part(
        "badge",
        i,
        a.id,
        2.5,
        22,
        4.3,
        3,
        4,
        0.8,
        ["police", "worker", "firefighter"].includes(appearance.theme)
          ? "#e6c581"
          : "#e5dbbc",
      );
      dummy.position.set(a.position[0], 8, a.position[1]);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(
        riding ? (["bus", "metro"].includes(a.transport!) ? 22 : 10) : 0,
        10,
        ["bus", "metro"].includes(a.transport!) ? 45 : 23,
      );
      if (!riding) dummy.scale.setScalar(0);
      dummy.updateMatrix();
      riderVehicles.setMatrixAt(i, dummy.matrix);
      riderVehicles.setColorAt(i, color.set(appearance.shirt));
    });
    for (const mesh of [...Object.values(bodyParts), riderVehicles]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }
  function traffic(seconds: number) {
    for (let i = 0; i < 26; i++) {
      const metro = i > 22,
        path = (
          metro ? metroLine : boulevards[i % boulevards.length]
        ) as Point[];
      const length = path
          .slice(1)
          .reduce(
            (n, p, j) => n + Math.hypot(p[0] - path[j][0], p[1] - path[j][1]),
            0,
          ),
        phase = (seconds * (metro ? 38 : 22 + (i % 5) * 3) + i * 139) % (length * 2),
        at = phase < length ? phase : length * 2 - phase;
      const a = along(path, at),
        b = along(path, Math.max(0, Math.min(length, at + (phase < length ? 3 : -3))));
      const angle = Math.atan2(b[0] - a[0], b[1] - a[1]),
        bus = i % 7 === 0;
      const dimensions = metro ? VEHICLES.metro : bus ? VEHICLES.bus : VEHICLES.car;
      dummy.rotation.set(0, angle, 0);
      dummy.position.set(
        a[0] + (metro ? 0 : Math.cos(angle) * 10),
        metro ? 17 : (metro || bus ? 16 : 9),
        a[1] - (metro ? 0 : Math.sin(angle) * 10),
      );
      dummy.scale.set(
        dimensions.width,
        dimensions.height,
        dimensions.length,
      );
      dummy.updateMatrix();
      trafficBody.setMatrixAt(i, dummy.matrix);
      trafficBody.setColorAt(
        i,
        color.set(
          metro
            ? "#70a9a0"
            : ["#c58c72", "#d5bb77", "#97b7a2", "#a8bcc4"][i % 4],
        ),
      );
      dummy.position.y += dimensions.height * 0.4;
      dummy.scale.multiply(new THREE.Vector3(0.86, 0.45, 0.66));
      dummy.updateMatrix();
      trafficGlass.setMatrixAt(i, dummy.matrix);
    }
    trafficBody.instanceMatrix.needsUpdate =
      trafficGlass.instanceMatrix.needsUpdate = true;
    if (trafficBody.instanceColor) trafficBody.instanceColor.needsUpdate = true;
  }
  let activeQuality = input().quality;
  function tick(stamp: number) {
    if (dead) return;
    frame = requestAnimationFrame(tick);
    if (document.hidden || stamp - lastDraw < 32) return;
    lastDraw = stamp;
    const state = input(),
      { world, selected } = state,
      now = Date.now() + (state.clockOffsetMs ?? 0);
    if (activeQuality !== state.quality) {
      activeQuality = state.quality;
      renderer.setPixelRatio(pixelRatio(activeQuality, devicePixelRatio));
      renderer.setSize(host.clientWidth, host.clientHeight);
    }
    lastTime = now; // simulationTime/worldTime apply the persisted pause anchor.
    if (stamp - lastState > 100 || selected !== lastSelected) {
      actors = [
        ...actorsAt(world, lastTime),
        ...(world.living
          ? crowdAt(world.living, world, lastTime, selected)
          : []),
      ].slice(0, capacity);
      current = actors.find((a) => a.id === selected) ?? actors[0];
      if (lastSelected !== selected) {
        following = true;
        if (current) focus(current.position[0], current.position[1]);
      }
      lastSelected = selected;
      lastState = stamp;
      const time = worldTime(world, lastTime);
      const daylight = time.daylight;
      ambient.intensity = 1.0 + daylight * 1.6;
      sun.intensity = 0.25 + daylight * 2.95;
      windowMaterial.emissiveIntensity = 0.15 + (1 - daylight) * 0.7;
      const golden = time.phase === "dawn" || time.phase === "dusk";
      (scene.background as THREE.Color).set("#142638").lerp(new THREE.Color(golden ? "#ffd4ac" : "#94d4f1"), daylight);
      sun.color.set(golden ? "#ffb77e" : "#fff0d8");
      sun.position.set(Math.cos(time.hour / 24 * Math.PI * 2) * 1000, 200 + daylight * 1100, 600);
      renderer.toneMappingExposure = .85 + daylight * .35;
      fog.color.copy(scene.background as THREE.Color);
    }
    if (state.target && state.target.key !== targetKey) {
      following = false;
      targetKey = state.target.key;
      focus(state.target.x, state.target.y);
    }
    const seconds = simulationTime(world, lastTime) / 1000;
    drawActors(seconds, world);
    traffic(seconds);
    animalsAt(world, lastTime)
      .slice(0, animalMeshes.length)
      .forEach((a, i) => {
        animalMeshes[i].position.set(
          a.position[0],
          a.species === "bird" ? 25 : 0,
          a.position[1],
        );
      });
    if (current) {
      ring.position.set(current.position[0], 2, current.position[1]);
      selectedLabel.position.set(current.position[0], 30, current.position[1]);
      if (lastLabel !== current.name) {
        // Reuse the single selected label texture.
        lastLabel = current.name;
        const c = selectedLabel.material.map!.image as HTMLCanvasElement,
          ctx = c.getContext("2d")!;
        ctx.clearRect(0, 0, 512, 96);
        ctx.fillStyle = "#f2eddd";
        ctx.fillRect(0, 0, 512, 96);
        ctx.fillStyle = "#375a50";
        ctx.font = "600 42px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(current.name, 256, 48, 480);
        selectedLabel.material.map!.needsUpdate = true;
      }
      if (following) {
        const next = new THREE.Vector3(
            current.position[0],
            15,
            current.position[1],
          ),
          delta = next.sub(controls.target).multiplyScalar(0.2);
        controls.target.add(delta);
        camera.position.add(delta);
      }
    }
    controls.update();
    // Keep signs subordinate to residents; distant districts need no text clutter.
    const pixelScale =
      (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) /
      Math.max(1, host.clientHeight);
    for (const { sprite, width } of venueLabels) {
      const distance = camera.position.distanceTo(sprite.position);
      sprite.visible = distance < 1800;
      const size = Math.min(
        width,
        (host.clientWidth < 700 ? 155 : 175) * distance * pixelScale,
      );
      sprite.scale.set(size, (size * 96) / 512, 1);
    }
    renderer.render(scene, camera);
    if (stamp - lastStatus > 180) {
      lastStatus = stamp;
      const speech = livingSpeechAt(world, lastTime) ?? speechAt(world, actors, state.events ?? [], lastTime),
        speaker = actors.find((a) => a.id === speech?.speaker);
      const p = new THREE.Vector3(
        speaker?.position[0] ?? 0,
        37,
        speaker?.position[1] ?? 0,
      ).project(camera);
      callbacks.status({
        name: current?.name ?? "An",
        activity: current?.activity ?? "Đang sinh hoạt",
        following,
        walking: current?.walking ?? false,
        location: current?.location ?? "",
        speech: speech?.text ?? "",
        x: ((p.x + 1) * host.clientWidth) / 2,
        y: ((1 - p.y) * host.clientHeight) / 2,
        visible:
          !!speaker &&
          p.z > -1 &&
          p.z < 1 &&
          Math.abs(p.x) < 0.85 &&
          Math.abs(p.y) < 0.8,
      });
    }
    host.dataset.ready = "true";
    host.dataset.pixelRatio = String(renderer.getPixelRatio());
    host.dataset.triangles = String(renderer.info.render.triangles);
    host.dataset.geometries = String(renderer.info.memory.geometries);
    host.dataset.textures = String(renderer.info.memory.textures);
    host.dataset.walking = String(current?.walking ?? false);
    host.dataset.position = current?.position.map(n=>n.toFixed(2)).join(",") ?? "";
    host.dataset.personHeight = String(40 * HUMAN_SCALE);
    host.dataset.carLength = String(VEHICLES.car.length);
    host.dataset.actors = String(actors.length);
    host.dataset.selected = current?.id ?? "";
    host.dataset.drawCalls = String(renderer.info.render.calls);
    host.dataset.camera = [
      camera.position.x,
      camera.position.y,
      camera.position.z,
    ]
      .map((n) => Math.round(n))
      .join(",");
  }
  frame = requestAnimationFrame(tick);
  return {
    zoom(factor) {
      const offset = camera.position.clone().sub(controls.target);
      offset.multiplyScalar(factor);
      offset.clampLength(100, 11000);
      camera.position.copy(controls.target).add(offset);
    },
    follow() {
      host.dataset.view = "follow";
      following = true;
      if (current) focus(current.position[0], current.position[1]);
    },
    overview() {
      host.dataset.view = "overview";
      following = false;
      const vertical = THREE.MathUtils.degToRad(camera.fov),
        horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
      const distance = 1700 / Math.sin(Math.min(vertical, horizontal) / 2);
      focus(
        1200,
        570,
        new THREE.Vector3(0.3, 0.95, 1).normalize().multiplyScalar(distance),
      );
      scene.fog = null;
    },
    skyline() {
      host.dataset.view = "skyline";
      following = false;
      focus(1650, 120, new THREE.Vector3(580, 500, 750));
    },
    dispose() {
      dead = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>(),
        textures = new Set<THREE.Texture>();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) geometries.add(m.geometry);
        if (m.material)
          for (const mat of Array.isArray(m.material)
            ? m.material
            : [m.material]) {
            materials.add(mat);
            const map = (mat as THREE.MeshStandardMaterial).map;
            if (map) textures.add(map);
          }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
