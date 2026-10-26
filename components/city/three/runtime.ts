import { HUMAN_SCALE, VEHICLES, pixelRatio, type Quality } from "@/lib/city/scale";
import { SocialDirector, type SocialPose, type Exchange } from "@/lib/living/social";
import { WalkDirector } from "@/lib/city/walkability";
import { TrafficDirector, TRAFFIC_COUNT, trafficJunctions, type TrafficVehicle } from "@/lib/city/traffic";
import { venueGeometry, openVenue } from "@/lib/city/footprints";
import { sceneryTrees, sceneryLamps, venueSceneryPose } from "@/lib/city/scenery";
import { characterShot } from "@/lib/city/cinematography";
import { createHumanGeometry, humanPose } from "./humans";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  actorsAt,
  animalsAt,
  simulationTime,
  type Actor,
  type Point,
} from "@/lib/life";
import { crowdAt } from "@/lib/living/engine";
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
  speaker: string;
  listener: string;
  conversationSource: string;
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
    powerPreference: "high-performance",
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
  const camera = new THREE.PerspectiveCamera(38, 1, 2, 20000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.minDistance = 42;
  controls.maxDistance = 11000;
  controls.minPolarAngle = 0.22;
  controls.maxPolarAngle = Math.PI / 2 - 0.08;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };
  const ambient = new THREE.HemisphereLight("#d9edff", "#8e7458", 1.25);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight("#fff0ce", 2.6);
  sun.position.set(-400, 1200, 600);
  scene.add(sun);
  const solids: Solid[] = [],
    facadeDetails: Solid[] = [],
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
  const detailBox = (...args: Parameters<typeof box>) => { box(...args); facadeDetails.push(solids.pop()!); };
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
  for (const junction of trafficJunctions) cylinder(junction.position[0], 1.15, junction.position[1], junction.radius * 2, .4, "#65767b");
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
    const levels = Math.floor((h - 18) / 30),
      cols = Math.max(2, Math.floor(w / 14));
    for (let f = 0; f < levels; f++)
      for (let c = 0; c < cols; c++) {
        const wx = x - w / 2 + ((c + 0.5) * w) / cols,
          y = 25 + f * 30;
        detailBox(wx, y, z + d / 2 + .3, 9.5, 14, .8, "#e4e1cf");
        detailBox(wx, y, z - d / 2 - .3, 9.5, 14, .8, "#e4e1cf");
        windowBox(wx, y, z + d / 2 + 0.6, 7, 9, 1, i + c + f);
        windowBox(wx, y, z - d / 2 - 0.6, 7, 9, 1, i + c + f + 1);
      }
    for (let f = 0; f < levels; f++)
      for (let c = 0; c < 3; c++) {
        const wz = z - d / 2 + ((c + 0.5) * d) / 3;
        windowBox(x + w / 2 + 0.6, 25 + f * 30, wz, 1, 12, 8, i + f);
        windowBox(x - w / 2 - 0.6, 25 + f * 30, wz, 1, 12, 8, i + f + 1);
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
      y: 36 + (seed % 7),
      z,
      w: 25,
      h: 26,
      d: 25,
      color: seed % 2 ? "#89b966" : "#48a481",
    });
  }
  for (const venue of venues) {
    const open = openVenue(venue), v = venueSceneryPose(venue);
    const height =
      v.type === "office"
        ? 140
        : ["hospital", "school"].includes(v.type)
          ? 78
          : v.type === "airport"
            ? 48
            : 43;
    box(v.x, 1, v.y - 25, 125, 2, 112, open ? "#c8d3b4" : "#e6dec9");
    // Functional details at the edges; the central door/frontage slots stay open.
    if (["cafe", "restaurant"].includes(v.type)) {
      for (const side of [-1, 1]) {
        const x = v.x + side * 65, z = v.y + 20;
        cylinder(x, 7.5, z, 13, 1, "#e7c88b");
        cylinder(x, 4.5, z, 1.3, 6, "#638783");
        cylinder(x, 8.6, z, 1.8, 1.4, "#fff4dc");
        cylinder(x + 3, 8.5, z + 2, 2.4, .35, "#da8970");
        for (const dz of [-10, 10]) {
          box(x, 4.5, z + dz, 5, 1, 5, "#69a48f");
          box(x, 7, z + dz + Math.sign(dz) * 2, 5, 5, 1, "#69a48f");
          for (const dx of [-1.8, 1.8]) cylinder(x + dx, 2.5, z + dz, .7, 4, "#587a74");
        }
      }
    }
    if (["park", "square", "bus", "metro", "library"].includes(v.type)) {
      const x = v.x + 65, z = v.y + 12;
      box(x, 5, z, 18, 1.5, 5, "#d49b66");
      box(x, 8, z - 2, 18, 5, 1.5, "#d49b66");
      for (const dx of [-6, 6]) box(x + dx, 2.8, z, 1.2, 5, 4, "#5f7c75");
    }
    if (!open) {
      for (const side of [-1, 1]) {
        cylinder(v.x + side * 53, 3, v.y - 4, 5, 5, "#c68668");
        leaves.push({ x: v.x + side * 53, y: 7.5, z: v.y - 4, w: 6, h: 7, d: 6, color: "#68a879" });
      }
    }
    if (open) {

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
      for (const dx of [-53, 53]) box(v.x + dx, height + 7, v.y - 47, 2, 5, 76, "#c1b899");
      for (const dz of [-86.5, -7.5]) box(v.x, height + 7, v.y + dz, 108, 5, 2, "#c1b899");
      box(v.x, 3.5, v.y - 10, 104, 4, 2, "#b8a68d");
      box(v.x, 6, v.y - 7, 34, 12, 12, "#b0bba5");
      windowBox(v.x, 15, v.y - 10, 17, 26, 2, 1);
      for (let f = 0; f < Math.floor(height / 30); f++)
        for (const dx of [-35, -12, 12, 35]) {
          if (f === 0 && Math.abs(dx) < 20) continue;
          detailBox(v.x + dx, 20 + f * 30, v.y - 10.5, 15, 15, 2, "#f3e6cc");
          windowBox(v.x + dx, 20 + f * 30, v.y - 9.7, 12, 12, 1, f);
          detailBox(v.x + dx, 12.5 + f * 30, v.y - 8, 16, 1.5, 4, "#d0b997");
        }
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
      if (["cafe", "restaurant", "market"].includes(v.type)) {
        for (let k = -5; k <= 5; k++) box(v.x + k * 10, 31.2, v.y + 1, 9.5, 1.5, 25, k % 2 ? "#f7e5bd" : v.type === "cafe" ? "#438f86" : "#df8d6e");
        for (const dx of [-49, 49]) cylinder(v.x + dx, 15, v.y + 10, 1.4, 28, "#9c7954");
      }
      if (v.type === "factory")
        for (const dx of [-32, 30])
          cylinder(v.x + dx, height + 22, v.y - 60, 8, 42, "#7b908d");
      if (v.type === "airport") {
        cylinder(v.x + 35, 67, v.y - 40, 8, 70, "#c6d3cc");
        box(v.x + 35, 103, v.y - 40, 30, 16, 25, "#73969b");
      }

    }
    const sign = label(v.name, v.x, open ? 43 : height + 22, v.y - 20, 112);
    if (sign) {
      sign.userData.venue = venue;
      venueLabels.push({ sprite: sign, width: 112 });
    }
  }
  for (const t of sceneryTrees) tree(t.x, t.z, t.seed);
  for (const lamp of sceneryLamps) {
    cylinder(lamp.x, 26, lamp.z, 1.4, 52, "#728882");
    box(lamp.x - 4, 52, lamp.z, 11, 2, 5, "#f7dba1");
  }
  const dummy = new THREE.Object3D(),
    color = new THREE.Color();
  const detailChunks: { mesh: THREE.InstancedMesh; x: number; z: number }[] = [];
  function batch(
    geometry: THREE.BufferGeometry,
    list: Solid[],
    material: THREE.Material = new THREE.MeshLambertMaterial(),
    detail = false,
  ) {
    if (detail) {
      const groups = new Map<string, Solid[]>();
      for (const s of list) { const key = `${Math.floor(s.x / 256)}:${Math.floor(s.z / 256)}`, group = groups.get(key) ?? []; group.push(s); groups.set(key, group); }
      for (const [key, group] of groups) { const mesh = batch(geometry, group, material); const [x, z] = key.split(":").map(Number); detailChunks.push({ mesh, x: x * 256 + 128, z: z * 256 + 128 }); }
      return new THREE.InstancedMesh(geometry, material, 0);
    }
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
  batch(new THREE.BoxGeometry(1, 1, 1), facadeDetails, new THREE.MeshLambertMaterial(), true);
  batch(new THREE.CylinderGeometry(0.5, 0.5, 1, 8), cylinders);
  batch(new THREE.IcosahedronGeometry(0.5, 1), leaves);
  const windowMaterial = new THREE.MeshPhongMaterial({
    shininess: 40,
    emissive: "#638082",
    emissiveIntensity: 0.12,
  });
  batch(new THREE.BoxGeometry(1, 1, 1), windows, windowMaterial, true);
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
  const humanGeo = createHumanGeometry(), boxGeo = humanGeo.box;
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
      part === "head" ? humanGeo.head : part === "hair" ? humanGeo.hair : /Arm|Leg|Hand/.test(part) ? humanGeo.limb : /Shoe/.test(part) ? humanGeo.shoe : ["torso", "hat"].includes(part) ? humanGeo.round : boxGeo,
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
      TRAFFIC_COUNT,
    ),
    trafficGlass = new THREE.InstancedMesh(
      boxGeo,
      new THREE.MeshStandardMaterial({ color: "#496d77", roughness: 0.3 }),
      TRAFFIC_COUNT,
    );
  const trafficWheels = new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,10),new THREE.MeshStandardMaterial({color:"#273c49",roughness:.9}),TRAFFIC_COUNT * 4);
  const trafficLights = new THREE.InstancedMesh(boxGeo,new THREE.MeshStandardMaterial({emissive:"#ffe5a0",emissiveIntensity:.25}),TRAFFIC_COUNT * 4);
  trafficWheels.frustumCulled=trafficLights.frustumCulled=false;
  scene.add(trafficBody, trafficGlass, trafficWheels, trafficLights);
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
  const selectedLabel = label("An", 0, 25, 0, 14)!;
  const shadowCanvas = document.createElement("canvas"); shadowCanvas.width = shadowCanvas.height = 64;
  const shadowContext = shadowCanvas.getContext("2d")!, gradient = shadowContext.createRadialGradient(32, 32, 3, 32, 32, 31);
  gradient.addColorStop(0, "rgba(28,44,41,.34)"); gradient.addColorStop(1, "rgba(28,44,41,0)");
  shadowContext.fillStyle = gradient; shadowContext.fillRect(0, 0, 64, 64);
  const contactShadows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }), capacity + TRAFFIC_COUNT);
  contactShadows.frustumCulled = false; scene.add(contactShadows);
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
  let socialPoses = new Map<string, SocialPose>(), exchanges: Exchange[] = [];
  const walkDirector = new WalkDirector(), trafficDirector = new TrafficDirector(), socialDirector = new SocialDirector();
  let cars: TrafficVehicle[] = [];
  const previousPositions = new Map<string, Point>();
  let lastTime = Date.parse(input().world.born);
  let lastStatus = 0;
  const viewOffset = new THREE.Vector3(48, 34, 62);
  const cameraBuildings = [...venues.filter(v => !openVenue(v)).map(venueGeometry), ...buildings.map(b => ({ x:b.x,z:b.z,width:b.width,depth:b.depth }))];
  function focus(x: number, z: number, offset = viewOffset) {
    scene.fog = fog;
    controls.target.set(x, 15, z);
    camera.position.copy(controls.target).add(offset);
    controls.update();
    for (const chunk of detailChunks) chunk.mesh.visible = Math.hypot(camera.position.x - chunk.x, camera.position.z - chunk.z) < 520;
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
    result = new THREE.Matrix4(), faceRoot = new THREE.Matrix4(), faceRotation = new THREE.Matrix4(), faceFront = new THREE.Matrix4().makeTranslation(0, 30, 0), faceBack = new THREE.Matrix4().makeTranslation(0, -30, 0);
  const faceParts = new Set(["head", "hair", "hat", "eyeL", "eyeR", "detail", "glassesL", "glassesR"]);
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
    result.multiplyMatrices(faceParts.has(name) ? faceRoot : root, local);
    mesh.setMatrixAt(index, result);
    mesh.setColorAt(index, color.set(tint));
    mesh.userData.ids[index] = id;
  }
  const heading = new Map<string, number>();
  function drawActors(seconds: number, world: World, dt: number) {
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
      const movementYaw = moving ? Math.atan2(a.position[0] - old![0], a.position[1] - old![1]) : undefined;
      previousPositions.set(a.id, a.position);
      const riding = a.walking && a.transport && a.transport !== "walk";
      const social = socialPoses.get(a.id), peer = social && social.gesture !== "idle" ? actors.find(p => p.id === social.peerId) : undefined;
      const wantedYaw = peer ? Math.atan2(peer.position[0] - a.position[0], peer.position[1] - a.position[1]) : movementYaw ?? heading.get(a.id) ?? .35;
      const oldYaw = heading.get(a.id) ?? wantedYaw;
      const yaw = oldYaw + Math.atan2(Math.sin(wantedYaw - oldYaw), Math.cos(wantedYaw - oldYaw)) * (world.paused ? 1 : 1 - Math.exp(-12 * dt)),
        s = HUMAN_SCALE;
      heading.set(a.id, yaw);
      const pose = humanPose({ ...a, walking: a.walking && !!moving }, seconds, i, social?.gesture === "idle" ? undefined : social);
      position.set(a.position[0], (riding ? 8 : 2) + pose.breath * s, a.position[1]);
      rotation.setFromAxisAngle(up, yaw);
      scale.setScalar(s);
      root.compose(position, rotation, scale);
      faceRotation.makeRotationFromEuler(new THREE.Euler(pose.headTilt, pose.headTurn, 0));
      faceRoot.copy(root).multiply(faceFront).multiply(faceRotation).multiply(faceBack);
      const swing = a.walking && moving && !riding ? pose.rightArm : 0;
      const usingProp = !a.walking && ["read", "garden", "eat", "work"].includes(a.kind);
      part("prop", i, a.id, 0, 15.5, 8, usingProp ? 7 : 0, a.kind === "read" ? 1 : 3, 5, a.kind === "read" ? "#e9b549" : a.kind === "garden" ? "#50adba" : "#fff5cf");
      part("torso", i, a.id, 0, 20, 0, 11.5, 13, 7.5, appearance.shirt);
      part("head", i, a.id, 0, 32, 0, 9, 10, 9, appearance.skin);
      part(
        "hair",
        i,
        a.id,
        0,
        35.8,
        -.4,
        appearance.hair === "bald" ? 0 : 10,
        6,
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
          sign * 7.5,
          21,
          0,
          4,
          12,
          5,
          appearance.shirt,
          side === "left" ? pose.leftArm : pose.rightArm,
        );
        part(
          `${side}Hand`,
          i,
          a.id,
          sign * 7.5,
          13 + (side === "left" ? pose.leftHandY : pose.rightHandY),
          side === "left" ? pose.leftHandZ : pose.rightHandZ,
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
          2 + 6 * (1 - Math.cos(-sign * swing)),
          1 - Math.sin(-sign * swing) * 6,
          6,
          3,
          9,
          "#505d59",
        );
      }
      part("eyeL", i, a.id, -2, 33, 4.1, 1.2, 1.5 * pose.blink, 0.8, "#35473d");
      part("eyeR", i, a.id, 2, 33, 4.1, 1.2, 1.5 * pose.blink, 0.8, "#35473d");
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
  function traffic() {
    trafficBody.count = trafficGlass.count = cars.length;
    trafficWheels.count = trafficLights.count = cars.length * 4;
    cars.forEach((car, i) => {
      const a = car.position, angle = car.yaw, dimensions = car;
      dummy.rotation.set(0, angle, 0);
      dummy.position.set(a[0], 9, a[1]);
      dummy.scale.set(dimensions.width, dimensions.height, dimensions.length);
      dummy.updateMatrix(); trafficBody.setMatrixAt(i, dummy.matrix);
      trafficBody.setColorAt(i, color.set(["#dc876f", "#e2bb55", "#5c9e9d", "#96adb8"][i % 4]));
      dummy.position.y += dimensions.height * .4;
      dummy.scale.set(dimensions.width * .82, dimensions.height * .38, dimensions.length * .58);
      dummy.updateMatrix(); trafficGlass.setMatrixAt(i, dummy.matrix);
      for (let wheel = 0; wheel < 4; wheel++) {
        const side = wheel % 2 === 0 ? -1 : 1, end = wheel < 2 ? -1 : 1;
        const dx = side * dimensions.width * .48, dz = end * dimensions.length * .3;
        dummy.position.set(a[0] + dx * Math.cos(angle) + dz * Math.sin(angle), 4, a[1] - dx * Math.sin(angle) + dz * Math.cos(angle));
        dummy.rotation.set(0, angle, Math.PI / 2); dummy.scale.set(3.5, 2.5, 3.5); dummy.updateMatrix(); trafficWheels.setMatrixAt(i * 4 + wheel, dummy.matrix);
        const lx = side * dimensions.width * .32, lz = end * dimensions.length * .505;
        dummy.position.set(a[0] + lx * Math.cos(angle) + lz * Math.sin(angle), 9, a[1] - lx * Math.sin(angle) + lz * Math.cos(angle));
        dummy.rotation.set(0, angle, 0); dummy.scale.set(3, 2, 1); dummy.updateMatrix(); trafficLights.setMatrixAt(i * 4 + wheel, dummy.matrix); trafficLights.setColorAt(i * 4 + wheel, color.set(end > 0 ? "#fff1b5" : "#ed7864"));
      }
    });
    for (const mesh of [trafficBody, trafficGlass, trafficWheels, trafficLights]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }
  let activeQuality = input().quality;
  let drawnFrames = 0;
  function tick(stamp: number) {
    if (dead) return;
    frame = requestAnimationFrame(tick);
    if (document.hidden || stamp - lastDraw < 15) return;
    const dt = Math.min(.05, Math.max(.001, (stamp - lastDraw) / 1000));
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
    const seconds = simulationTime(world, lastTime) / 1000;
    {
      const rawActors = [
        ...actorsAt(world, lastTime),
        ...(world.living
          ? crowdAt(world.living, world, lastTime, selected)
          : []),
      ].slice(0, capacity);
      cars = trafficDirector.frame(seconds, actors.map(a => a.position));
      const safeActors = walkDirector.frame(world, rawActors, seconds, cars);
      const social = socialDirector.frame(world, safeActors, state.events ?? [], lastTime, null, true);
      actors = social.actors;
      socialPoses = social.poses;
      exchanges = social.exchanges;
      current = actors.find((a) => a.id === selected) ?? actors[0];
      if (lastSelected !== selected) {
        following = true;
        if (current) focus(current.position[0], current.position[1]);
      }
      lastSelected = selected;
    }
    if (stamp - lastState > 500) {
      lastState = stamp;
      const time = worldTime(world, lastTime);
      const daylight = time.daylight;
      ambient.intensity = .5 + daylight * .8;
      sun.intensity = .2 + daylight * 2.4;
      windowMaterial.emissiveIntensity = 0.15 + (1 - daylight) * 0.7;
      const golden = time.phase === "dawn" || time.phase === "dusk";
      (scene.background as THREE.Color).set("#142638").lerp(new THREE.Color(golden ? "#ffd4ac" : "#94d4f1"), daylight);
      sun.color.set(golden ? "#ffb77e" : "#fff0d8");
      sun.position.set(Math.cos(time.hour / 24 * Math.PI * 2) * 1000, 200 + daylight * 1100, 600);
      renderer.toneMappingExposure = .85 + daylight * .15;
      fog.color.copy(scene.background as THREE.Color);
    }
    if (state.target && state.target.key !== targetKey) {
      following = false;
      targetKey = state.target.key;
      focus(state.target.x, state.target.y);
    }
    drawActors(seconds, world, dt);
    traffic();
    contactShadows.count = actors.length + cars.length;
    for (let i = 0; i < contactShadows.count; i++) {
      const car = i >= actors.length ? cars[i - actors.length] : null, point = car?.position ?? actors[i].position;
      dummy.position.set(point[0], 2.05, point[1]); dummy.rotation.set(0, car?.yaw ?? 0, 0); dummy.scale.set(car ? car.width * 1.35 : 11, 1, car ? car.length * 1.2 : 8); dummy.updateMatrix(); contactShadows.setMatrixAt(i, dummy.matrix);
    }
    contactShadows.instanceMatrix.needsUpdate = true;
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
      selectedLabel.position.set(current.position[0], 25, current.position[1]);
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
        const partnerId = socialPoses.get(current.id)?.peerId;
        const shot = characterShot(current, actors.find(a => a.id === partnerId), heading.get(current.id) ?? .35, cameraBuildings);
        const alpha = 1 - Math.exp(-2.8 * dt);
        controls.target.lerp(new THREE.Vector3(...shot.target), alpha);
        camera.position.lerp(new THREE.Vector3(...shot.position), alpha);
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
      const exchange = exchanges.find(e => e.a === current?.id || e.b === current?.id) ?? exchanges.find(e => {
        const a = actors.find(a => a.id === e.a);
        return a && current && Math.hypot(a.position[0] - current.position[0], a.position[1] - current.position[1]) < 75;
      });
      const speech = exchange?.speech,
        speaker = actors.find((a) => a.id === speech?.speaker);
      const listener = actors.find(a => a.id === (exchange?.a === speaker?.id ? exchange?.b : exchange?.a));
      const p = new THREE.Vector3(
        speaker?.position[0] ?? 0,
        25,
        speaker?.position[1] ?? 0,
      ).project(camera);
      callbacks.status({
        name: current?.name ?? "An",
        activity: current?.activity ?? "Đang sinh hoạt",
        following,
        walking: current?.walking ?? false,
        location: current?.location ?? "",
        speech: speech?.text ?? "",
        speaker: speaker?.name ?? "",
        listener: listener?.name ?? "",
        conversationSource: exchange?.source ?? "",
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
    host.dataset.paused = String(world.paused);
    host.dataset.frame = String(++drawnFrames);
    host.dataset.pixelRatio = String(renderer.getPixelRatio());
    host.dataset.triangles = String(renderer.info.render.triangles);
    host.dataset.geometries = String(renderer.info.memory.geometries);
    host.dataset.textures = String(renderer.info.memory.textures);
    host.dataset.walking = String(current?.walking ?? false);
    host.dataset.position = current?.position.map(n=>n.toFixed(2)).join(",") ?? "";
    host.dataset.personHeight = String(40 * HUMAN_SCALE);
    host.dataset.carLength = String(VEHICLES.car.length);
    host.dataset.actors = String(actors.length);
    host.dataset.exchanges = String(exchanges.length);
    host.dataset.socialCast = JSON.stringify(actors.filter(a => socialPoses.get(a.id)?.gesture !== "idle" && socialPoses.has(a.id)).map(a => ({ id: a.id, position: a.position, ...socialPoses.get(a.id) })));
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
      callbacks.select("an");
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
