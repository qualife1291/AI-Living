import { HUMAN_SCALE, VEHICLES, pixelRatio, shadowMapSize, type Quality } from "@/lib/city/scale";
import { SocialDirector, type SocialPose, type Exchange } from "@/lib/living/social";
import { WalkDirector } from "@/lib/city/walkability";
import { TrafficDirector, TRAFFIC_COUNT, trafficJunctions, type TrafficVehicle } from "@/lib/city/traffic";
import { venueGeometry, openVenue, segmentHits } from "@/lib/city/footprints";
import { sceneryTrees, sceneryLamps, streetProps, venueSceneryPose } from "@/lib/city/scenery";
import { characterShot, cameraRayBlocked } from "@/lib/city/cinematography";
import { groundElevation } from "@/lib/city/ground";
import {HOME_ANCHORS,homeAnchor,homeCameraOffset} from "../../../lib/city/homes";
import {gardenPlot,gardenCameraOffset} from "../../../lib/city/garden-plots";
import {createGardens} from "./gardens";
import { resolveModel } from "@/lib/city/asset-bindings";
import { createPeople } from "./people";
import { createAmbience } from "./ambience";
import { createFauna } from "./fauna";
import { AssetLibrary, setAssetTransform, type AssetPlacement } from "./assets";
import { createModelActors } from "./model-actors";
import { SceneDetail } from "./scene-detail";
import { QualityBudget } from "../../../lib/city/quality-budget";
import { streetModel } from "./streetscape";
import * as THREE from "three";
import type { LabelAnchor } from "../../../lib/city/overlay-layout";
import { logClient, recordFrame } from "../../../lib/diagnostics";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  actorsAt,
  animalsAt,
  simulationTime,
  type Actor,
} from "@/lib/life";
import { crowdAt } from "@/lib/living/engine";
import { worldTime, weatherAt } from "@/lib/clock";
import { boulevards, metroLine, venues, type Venue } from "@/lib/city/world";
import {
  cityBuildings,
  pedestrianSegments,
} from "@/lib/city/three-layout";
import type { World, EpisodeEvent } from "@/lib/world";
import {sampleAuthoritySpeech,type AuthorityView} from '@/lib/living/ground-authority-view';
import {sampleSharedGround,type SharedGroundView} from '@/lib/living/shared-ground-view';

export type SceneInput = {
  world: World;
  quality?: Quality;
  events?: EpisodeEvent[];
  selected: string;
  clockOffsetMs?: number;
  sharedGroundRequested?:boolean;
  sharedGround?:SharedGroundView;
  sharedAuthority?:AuthorityView;
  target?: { x: number; y: number; key: number; homeId?:string;gardenId?:string } | null;
};
export type SceneStatus = {
  name: string;
  activity: string;
  following: boolean;
  speech: string;
  speechKey: string;
  labels: LabelAnchor[];
  viewportWidth: number;
  viewportHeight: number;
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
  presentSpeech: (key: string) => void;
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
  tilt?: number;
};

export function createCity(
  host: HTMLDivElement,
  input: () => SceneInput,
  callbacks: {
    select: (id: string) => void;
    venue: (v: Venue) => void;
    status: (v: SceneStatus) => void;
    fatal: () => void;
  },
  assets = new AssetLibrary(),
): CityRuntime {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(
    pixelRatio(input().quality, devicePixelRatio, host.clientWidth, host.clientHeight),
  );
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  let renderQuality = input().quality;
  renderer.shadowMap.enabled = shadowMapSize(renderQuality, host.clientWidth) > 0;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  controls.enableDamping = !motionPreference.matches;
  controls.listenToKeyEvents(renderer.domElement);
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
  const ambient = new THREE.HemisphereLight("#e3f2ff", "#9c8265", 1.35);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight("#fff1d0", 2.75);
  sun.position.set(-420, 1250, 620);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(shadowMapSize(input().quality, host.clientWidth) || 512);
  sun.shadow.bias = -0.0004;
  Object.assign(sun.shadow.camera, { left: -180, right: 180, top: 180, bottom: -180, near: 100, far: 3200 });
  scene.add(sun, sun.target);
  function configureShadows() {
    const size = shadowMapSize(renderQuality, host.clientWidth), enabled = size > 0;
    const changed = renderer.shadowMap.enabled !== enabled || enabled && sun.shadow.mapSize.x !== size;
    host.dataset.shadowMap = String(size);
    if (!changed) return;
    renderer.shadowMap.enabled = sun.castShadow = enabled;
    sun.shadow.map?.dispose(); sun.shadow.map = null;
    if (enabled) sun.shadow.mapSize.setScalar(size);
    scene.traverse(o => { const material = (o as THREE.Mesh).material; if (material) for (const m of Array.isArray(material) ? material : [material]) m.needsUpdate = true; });
  }
  const solids: Solid[] = [],
    facadeDetails: Solid[] = [],
    cylinders: Solid[] = [],
    leaves: Solid[] = [],
    windows: Solid[] = [],
    shadows: Solid[] = [], propWheels: Solid[] = [], propBuds: Solid[] = [];
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
  const placements: AssetPlacement[] = [];
  const modelBuildings = ["commercial/building-a", "commercial/building-b", "commercial/building-c"];
  const modelHomes = ["suburban/building-type-a", "suburban/building-type-b", "suburban/building-type-c"];
  const propAsset = (prop: typeof streetProps[number]) => resolveModel(prop.kind === "produce" ? prop.venue === "Chợ nhỏ" ? "display-bread" : "display-fruit" : prop.kind) ?? "";
  const buildings = cityBuildings();
  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i],
      { x, z, width: w, depth: d, height: h } = b;
    box(x, 1.2, z, w + 12, 2, d + 12, "#ded9c6");
    const modelId = modelHomes[i % modelHomes.length];
    if (!b.tower && i % 16 === 0 && assets.get(modelId)) {
      placements.push({ id: modelId, x, y: 2.2, z, width: w, height: h, depth: d, yaw: Math.PI, stretch: true });
      continue;
    }
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
  const nameOccluders = buildings.map(b => new THREE.Box3(new THREE.Vector3(b.x-b.width/2, 0, b.z-b.depth/2), new THREE.Vector3(b.x+b.width/2, b.height+6, b.z+b.depth/2)));
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
    cylinder(x, 17 + (seed % 7) / 2, z, 3, 34 + (seed % 7), "#9c8769");
    shadows.push({
      x: x + 4,
      y: 1.1,
      z: z + 4,
      w: 25,
      h: 0.15,
      d: 18,
      color: "#a4b69e",
    });
    for (const side of [-1, 0, 1]) leaves.push({
      x: x + side * 6, y: 36 + (seed % 7) + (side === 0 ? 4 : 0), z: z + (side === 0 ? 0 : 2),
      w: side === 0 ? 22 : 18, h: side === 0 ? 26 : 20, d: 20,
      color: side === 0 ? (seed % 2 ? "#84b66e" : "#57a886") : side < 0 ? "#75ad79" : "#9bc783",
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
    if (!open) nameOccluders.push(new THREE.Box3(new THREE.Vector3(v.x-52,0,v.y-83), new THREE.Vector3(v.x+52,height+6,v.y-11)));
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
        // Soccer pitch + center line + 3D soccer ball + adjacent community swimming pool basin
        box(v.x - 16, 2.5, v.y - 35, 56, 1, 44, "#79ab78");
        box(v.x - 16, 3.05, v.y - 35, .8, .2, 42, "#eff2e1");
        cylinder(v.x - 16, 4.2, v.y - 35, 2.6, 2.6, "#f7f6ec");
        for (const dx of [-43, 11])
          box(v.x + dx, 11, v.y - 35, 1.5, 18, 18, "#edf0df");
        // Turquoise swimming pool lane next to pitch
        box(v.x + 28, 2.2, v.y - 35, 24, 1.6, 42, "#e8e2ce");
        box(v.x + 28, 2.8, v.y - 35, 20, 1.2, 38, "#5bc4d8");
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
      const modelId = v.type === "home" ? modelHomes[venues.indexOf(venue) % modelHomes.length] : modelBuildings[venues.indexOf(venue) % modelBuildings.length];
      if (assets.get(modelId)) {
        placements.push({ id: modelId, x: v.x, y: 2, z: v.y - 47, width: 104, height, depth: 72, yaw: Math.PI, stretch: true });
        box(v.x, 3.5, v.y - 10, 104, 4, 2, "#b8a68d");
        for (let step = 0; step < 3; step++) box(v.x, 1.2 + step * .6, v.y - 3 - step * 4, 34, 1.2 + step * 1.2, 4, "#c4c5af");
        if (["cafe", "restaurant", "market"].includes(v.type)) {
          for (let k = -5; k <= 5; k++) box(v.x + k * 10, 31.2, v.y + 1, 9.5, 1.5, 25, k % 2 ? "#f7e5bd" : "#438f86");
          for (const dx of [-49, 49]) cylinder(v.x + dx, 15, v.y + 10, 1.4, 28, "#9c7954");
        }
      } else {
      box(v.x, height / 2 + 2, v.y - 47, 104, height, 72, color);
      box(v.x, height + 4, v.y - 47, 110, 5, 78, "#e9e3cf");
      for (const dx of [-53, 53]) box(v.x + dx, height + 7, v.y - 47, 2, 5, 76, "#c1b899");
      for (const dz of [-86.5, -7.5]) box(v.x, height + 7, v.y + dz, 108, 5, 2, "#c1b899");
      box(v.x, 3.5, v.y - 10, 104, 4, 2, "#b8a68d");
      for (let step = 0; step < 3; step++) box(v.x, 1.2 + step * .6, v.y - 3 - step * 4, 34, 1.2 + step * 1.2, 4, "#c4c5af");
      for (const dx of [-9, 9]) detailBox(v.x + dx, 15, v.y - 8.8, 1, 28, 1, "#e9d5af");
      detailBox(v.x, 28.5, v.y - 8.8, 19, 1, 1, "#e9d5af");
      detailBox(v.x + 5.5, 14, v.y - 8, .6, 3.5, .9, "#c5a86f");
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
  for (const prop of streetProps) {
    if(prop.kind==="flowers")continue; // Stateful flower beds use their own two batches.
    const id = propAsset(prop);
    if (id && assets.get(id)) placements.push({ id, x: prop.x, y: groundElevation(prop.x, prop.z), z: prop.z, width: prop.width, depth: prop.depth, height: prop.kind === "bin" ? 8 : 12, yaw: Math.PI });
    else for (const part of streetModel(prop)) {
      const list = part.shape === "wheel" ? propWheels : part.shape === "bud" ? propBuds : part.shape === "cylinder" ? cylinders : facadeDetails;
      list.push(part);
    }
  }
  for (const [index, id] of ["watercraft/boat-fishing-small", "watercraft/boat-row-small", "watercraft/boat-house-a"].entries()) if (assets.get(id)) placements.push({ id, x: 920 + index * 280, y: .4, z: 1608 + index * 6, width: 24, depth: 56, height: 32, yaw: Math.PI / 2 });
  if (assets.get("watercraft/buoy")) for (const x of [760, 1680]) placements.push({ id: "watercraft/buoy", x, y: .3, z: 1585, width: 8, depth: 8, height: 14 });
  // Tram models remain available in the catalog until their route and collider agree.
  if (assets.get("trains/railroad-straight")) for (let i = 1; i < metroLine.length; i++) {
    const a = metroLine[i - 1], b = metroLine[i], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let n = 20; n < length; n += 40) placements.push({ id: "trains/railroad-straight", x: a[0] + (b[0] - a[0]) * n / length, y: 3.1, z: a[1] + (b[1] - a[1]) * n / length, width: 10, height: 1, depth: 40, yaw: Math.atan2(b[0] - a[0], b[1] - a[1]), stretch: true });
  }
  const updateAssetLOD = assets.addWorldLOD(scene, placements);
  host.dataset.assetPlacements = String(placements.length);
  host.dataset.loadedAssets = String(assets.stats().loaded);
  host.dataset.failedAssets = String(assets.stats().failed);
  host.dataset.streetProps = String(streetProps.length);
  const dummy = new THREE.Object3D(),
    color = new THREE.Color();
  const detailChunks: { mesh: THREE.InstancedMesh; x: number; z: number }[] = [];
  const sceneDetail = new SceneDetail();
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
      dummy.rotation.set(0, s.angle ?? 0, s.tilt ?? 0);
      dummy.scale.set(s.w, s.h, s.d);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, color.set(s.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
    return mesh;
  }
  batch(new THREE.CylinderGeometry(0.5, 0.5, 1, 20), shadows);
  batch(new THREE.BoxGeometry(1, 1, 1), solids, new THREE.MeshPhongMaterial({ shininess: 10, specular: "#4a4f4a" }));
  batch(new THREE.BoxGeometry(1, 1, 1), facadeDetails, new THREE.MeshPhongMaterial({ shininess: 14, specular: "#595e58" }), true);
  batch(sceneDetail.register(new THREE.CylinderGeometry(0.5, 0.5, 1, 16), new THREE.CylinderGeometry(0.5, 0.5, 1, 8)), cylinders, new THREE.MeshPhongMaterial({ shininess: 14, specular: "#525752" }));
  batch(sceneDetail.register(new THREE.SphereGeometry(.5, 16, 12), new THREE.SphereGeometry(.5, 8, 4)), leaves, new THREE.MeshPhongMaterial({ shininess: 16, specular: "#4e6b52" }));
  batch(sceneDetail.register(new THREE.TorusGeometry(.42, .08, 8, 18), new THREE.TorusGeometry(.42, .08, 4, 12)), propWheels);
  batch(sceneDetail.register(new THREE.IcosahedronGeometry(.5, 1), new THREE.IcosahedronGeometry(.5, 0)), propBuds, new THREE.MeshPhongMaterial({ shininess: 18 }), true);
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

  const ambience = createAmbience(scene);
  const gardens=createGardens(scene);
  host.dataset.gardenPlots=String(gardens.stats().plots);
  host.dataset.gardenPlants=String(gardens.stats().plants);
  host.dataset.gardenBatches=String(gardens.stats().batches);
  host.dataset.fountainStreams = String(ambience.stats.fountainStreams);
  host.dataset.cloudLobes = String(ambience.stats.cloudLobes);
  const capacity = 72, people = createPeople(scene, capacity), boxGeo = people.geometry.box;
  people.setQuality(input().quality);
  sceneDetail.apply(scene, input().quality);
  const modelActors = createModelActors(scene, assets);
  // Ground paint marks real generated doors; it adds no solid obstacle.
  const homeMarkers=new THREE.InstancedMesh(new THREE.RingGeometry(4,5,12),new THREE.MeshBasicMaterial({color:'#5e9e90',transparent:true,opacity:.23,depthWrite:false}),HOME_ANCHORS.length),homeDummy=new THREE.Object3D();
  HOME_ANCHORS.forEach((anchor,index)=>{homeDummy.position.set(anchor.point[0],groundElevation(...anchor.point)+.035,anchor.point[1]);homeDummy.rotation.x=-Math.PI/2;homeDummy.updateMatrix();homeMarkers.setMatrixAt(index,homeDummy.matrix);});
  homeMarkers.instanceMatrix.needsUpdate=true;scene.add(homeMarkers);host.dataset.homeDoors=String(HOME_ANCHORS.length);
  host.dataset.assetActors = String(modelActors.ids.size);
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
  const carIds = ["car-sedan", "car-hatchback", "car-taxi"].map(key => resolveModel(key)!);
  const carModels = carIds.map(id => assets.compile(id));
  const importedCars = carModels.every(Boolean) ? carModels.map(model => {
    const mesh = new THREE.InstancedMesh(model!.geometry, model!.material, TRAFFIC_COUNT);
    mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(mesh); return mesh;
  }) : [];
  host.dataset.assetCars = String(importedCars.length);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(6, 7, 32),
    new THREE.MeshBasicMaterial({ color: "#ffe0a0", side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);
  const fauna = createFauna(scene, people.geometry);
  host.dataset.animalBatches = String(fauna.stats.batches);
  const shadowCanvas = document.createElement("canvas"); shadowCanvas.width = shadowCanvas.height = 64;
  const shadowContext = shadowCanvas.getContext("2d")!, gradient = shadowContext.createRadialGradient(32, 32, 3, 32, 32, 31);
  gradient.addColorStop(0, "rgba(28,44,41,.34)"); gradient.addColorStop(1, "rgba(28,44,41,0)");
  shadowContext.fillStyle = gradient; shadowContext.fillRect(0, 0, 64, 64);
  const contactShadows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }), capacity + TRAFFIC_COUNT);
  contactShadows.frustumCulled = false; scene.add(contactShadows);
  let following = !motionPreference.matches,
    dead = false,
    frame = 0,
    lastDraw = 0,
    lastState = 0,
    targetKey: number | undefined;
  let current: Actor | undefined,
    actors: Actor[] = [],
    groundAnimals: ReturnType<typeof animalsAt> = [],
    lastSelected = "";
  let socialPoses = new Map<string, SocialPose>(), exchanges: Exchange[] = [];
  const walkDirector = new WalkDirector(), trafficDirector = new TrafficDirector(), socialDirector = new SocialDirector();
  let cars: TrafficVehicle[] = [];
  let lastTime = Date.parse(input().world.born);
  let lastStatus = 0;
  const viewOffset = new THREE.Vector3(48, 34, 62);
  const cameraBuildings = [...venues.filter(v => !openVenue(v)).map(venueGeometry), ...buildings.map(b => ({ x:b.x,z:b.z,width:b.width,depth:b.depth }))];
  // Render-only crown/trunk bounds, separate from walkable ground footprints.
  const cameraFoliage=sceneryTrees.flatMap(t=>{
    const ground=groundElevation(t.x,t.z);
    return [{x:t.x,z:t.z,width:3,depth:3,minY:ground,maxY:ground+34+t.seed%7},
      ...[-1,0,1].map(side=>({x:t.x+side*6,z:t.z+(side===0?0:2),width:side===0?22:18,depth:20,
        minY:ground+36+t.seed%7+(side===0?4:0)-(side===0?13:10),
        maxY:ground+36+t.seed%7+(side===0?4:0)+(side===0?13:10)}))];
  });
  function focus(x: number, z: number, offset = viewOffset,targetY=15) {
    scene.fog = fog;
    controls.minPolarAngle=Math.hypot(offset.x,offset.z)<.1?0:.22;
    controls.target.set(x, targetY, z);
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
  const motionChanged = () => {
    controls.enableDamping = !motionPreference.matches;
    if(motionPreference.matches)following=false;
  };
  motionPreference.addEventListener('change',motionChanged);
  const cameraKey = (event: KeyboardEvent) => {
    if(event.key.startsWith('Arrow'))onStart();
  };
  // Key listeners stay on the canvas; typing in chat never moves the camera.
  renderer.domElement.addEventListener('keydown',cameraKey);
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
      .intersectObjects(scene.children, true)
      .find((h) => h.object !== ring);
    if (!hit) return;
    if (hit.object.userData.actorId) callbacks.select(hit.object.userData.actorId);
    else if (hit.object.userData.venue) callbacks.venue(hit.object.userData.venue);
    else if (
      hit.instanceId !== undefined &&
      hit.object.userData.ids?.[hit.instanceId]
    ) {
      callbacks.select(hit.object.userData.ids[hit.instanceId]);
      following = !motionPreference.matches;
    }
  };
  renderer.domElement.addEventListener("pointerdown", pointerDown);
  renderer.domElement.addEventListener("pointerup", pointerUp);
  const lost = (e: Event) => {
    e.preventDefault();
    logClient("webgl_lost");
    if (!dead) callbacks.fatal();
  };
  renderer.domElement.addEventListener("webglcontextlost", lost);
  const resize = new ResizeObserver(() => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setPixelRatio(pixelRatio(renderQuality, devicePixelRatio, width, height));
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    configureShadows();
  });
  resize.observe(host);
  const heading = new Map<string, number>();
  function drawActors(seconds: number, world: World, dt: number) {
    modelActors.prepare(world,input().selected,actors.filter(a=>!world.people.some(p=>p.id===a.id)&&Math.hypot(camera.position.x-a.position[0],camera.position.z-a.position[1])<420).sort((a,b)=>Math.hypot(camera.position.x-a.position[0],camera.position.z-a.position[1])-Math.hypot(camera.position.x-b.position[0],camera.position.z-b.position[1])),socialPoses.keys());
    host.dataset.assetActors = String(modelActors.ids.size);
    const updated = people.draw(world, actors, socialPoses, seconds, dt, camera, input().selected, modelActors.ids);
    heading.clear(); for (const [id, yaw] of updated) heading.set(id, yaw);
    modelActors.draw(world, actors, socialPoses, heading, seconds);
  }
  function traffic() {
    let fallbackCars = cars;
    if (importedCars.length) {
      for (const mesh of importedCars) mesh.count = 0;
      fallbackCars = [];
      for (const [index, car] of cars.entries()) {
        if (Math.hypot(camera.position.x - car.position[0], camera.position.z - car.position[1]) > 450) { fallbackCars.push(car); continue; }
        const which = index % importedCars.length, mesh = importedCars[which], at = mesh.count++;
        setAssetTransform(dummy, carModels[which]!.size, { id: carIds[which], x: car.position[0], y: groundElevation(...car.position), z: car.position[1], width: car.width, height: car.height, depth: car.length, yaw: car.yaw + Math.PI, stretch: true });
        mesh.setMatrixAt(at, dummy.matrix);
      }
      for (const mesh of importedCars) mesh.instanceMatrix.needsUpdate = true;
    }
    trafficBody.count = trafficGlass.count = fallbackCars.length;
    trafficWheels.count = trafficLights.count = fallbackCars.length * 4;
    fallbackCars.forEach((car, i) => {
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
  const visibilityChanged = () => { lastDraw = 0; };
  document.addEventListener("visibilitychange", visibilityChanged);
  window.addEventListener('resize',visibilityChanged);
  let activeQuality = input().quality;
  const qualityBudget = new QualityBudget();
  let drawnFrames = 0;
  function tick(stamp: number) {
    try { drawFrame(stamp); }
    catch (error) {
      cancelAnimationFrame(frame);
      logClient("render_error", { actor: input().selected, error: error instanceof Error ? error.name : "RendererError" });
      if (!dead) callbacks.fatal();
    }
  }
  function drawFrame(stamp: number) {
    if (dead) return;
    frame = requestAnimationFrame(tick);
    if (document.hidden || stamp - lastDraw < 15) return;
    const frameMs = stamp - lastDraw;
    if (lastDraw) recordFrame(frameMs);
    const dt = Math.min(.15, Math.max(.001, frameMs / 1000));
    lastDraw = stamp;
    const state = input(),
      { world, selected } = state,
      now = Date.now() + (state.clockOffsetMs ?? 0);
    const budgetQuality = qualityBudget.frame(state.quality, frameMs);
    const targetRatio=pixelRatio(budgetQuality, devicePixelRatio, host.clientWidth, host.clientHeight);
    if (activeQuality !== budgetQuality || Math.abs(renderer.getPixelRatio()-targetRatio)>.001) {
      activeQuality = renderQuality = budgetQuality;
      renderer.setPixelRatio(targetRatio);
      renderer.setSize(host.clientWidth, host.clientHeight);
      configureShadows();
      people.setQuality(activeQuality);
      sceneDetail.apply(scene, activeQuality);
    }
    lastTime = now; // simulationTime/worldTime apply the persisted pause anchor.
    let seconds = simulationTime(world, lastTime) / 1000;
    if(state.sharedGroundRequested){
      const shared=state.sharedGround;
      if(shared&&shared.worldBorn===world.born){
        const sampled=sampleSharedGround(shared,now-1500);
        const animals=new Set(['muop','cun','se']),allHumans=sampled.actors.filter(a=>!animals.has(a.id));
        const serverLines=sampleAuthoritySpeech(state.sharedAuthority,shared,sampled.simMs,sampled.actors);
        const preferred=new Set([selected,...(serverLines.length?serverLines.flatMap(u=>[u.speakerId,u.listenerId]):[world.livingTurn?.residentId])]);
        const reserved=serverLines.length?preferred.size:2;
        actors=[...allHumans.slice(0,capacity-reserved),...allHumans.filter(a=>preferred.has(a.id)&&!allHumans.slice(0,capacity-reserved).some(p=>p.id===a.id))].slice(0,capacity);
        groundAnimals=animalsAt(world,0).flatMap(base=>{const actor=sampled.actors.find(a=>a.id===base.id);return actor?[{...base,...actor}]:[];});cars=sampled.cars;seconds=sampled.simMs/1000;
        socialPoses=new Map();exchanges=[];
        for(const line of serverLines){const source=line.generator==='local-llm'?'ai':'script';socialPoses.set(line.speakerId,{peerId:line.listenerId,gesture:'explain',speaking:true,source});socialPoses.set(line.listenerId,{peerId:line.speakerId,gesture:'listen',speaking:false,source});exchanges.push({a:line.speakerId,b:line.listenerId,title:'Trò chuyện trong xóm',source,speech:{speaker:line.speakerId,text:line.text,source:source==='ai'?'ai':'routine',key:`ground:${line.id}`}});}
        host.dataset.sharedAuthority=JSON.stringify({checkpoint:state.sharedAuthority?.checkpoint??null,parentCheckpoint:shared.checkpoint,simMs:sampled.simMs,utterances:serverLines.map(u=>({id:u.id,speaker:u.speakerId,listener:u.listenerId,text:u.text,fromSimMs:u.fromSimMs,untilSimMs:u.untilSimMs}))});
        host.dataset.sharedGround=JSON.stringify({checkpoint:shared.checkpoint,sequence:shared.sequence,realMs:sampled.realMs,simMs:sampled.simMs,positions:sampled.actors.map(a=>({id:a.id,position:a.position})),cars:cars.map(c=>({id:c.id,position:c.position})),backlogMs:shared.backlogMs});
      }else{actors=[];groundAnimals=[];cars=[];socialPoses=new Map();exchanges=[];host.dataset.sharedGround='waiting';delete host.dataset.sharedAuthority;}
      current=actors.find(a=>a.id===selected)??actors[0];
    }else{
      delete host.dataset.sharedGround;delete host.dataset.sharedAuthority;
      const rawActors = [
        ...actorsAt(world, lastTime),
        ...(world.living
          ? crowdAt(world.living, world, lastTime, selected)
          : []),
      ].slice(0, capacity);
      const animalProjections = animalsAt(world, lastTime);
      cars = trafficDirector.frame(seconds, [...actors, ...groundAnimals].map(a => a.position), [...actors, ...groundAnimals].map(a => a.bicycle?.radius ?? 4.8));
      const safeAll = walkDirector.frame(world, rawActors, seconds, cars, animalProjections);
      const byId = new Map(safeAll.map(a => [a.id, a]));
      groundAnimals = animalProjections.map(a => ({ ...a, ...byId.get(a.id) }));
      const safeActors = safeAll.filter(a => rawActors.some(p => p.id === a.id));
      const social = socialDirector.frame(world, safeActors, state.events ?? [], lastTime, null, true);
      actors = social.actors;
      socialPoses = social.poses;
      exchanges = social.exchanges;
      current = actors.find((a) => a.id === selected) ?? actors[0];
    }
    {
      if (lastSelected !== selected) {
        following = !motionPreference.matches;
        if (current) {
          const peer = actors.find(a => a.id === socialPoses.get(current!.id)?.peerId) ?? groundAnimals.find(a => a.petOwnerId === current!.id);
          const height = Math.max(modelActors.height(current.id), peer && modelActors.ids.has(peer.id) ? modelActors.height(peer.id) : peer && actors.some(a => a.id === peer.id) ? 20 : 0);
          const shot = characterShot(current, peer, heading.get(current.id) ?? .35, cameraBuildings, camera.aspect, height, {boxes:cameraFoliage,peerHeight:peer && groundAnimals.some(a=>a.id===peer.id) ? 5 : height,elevation:p=>groundElevation(p[0],p[1])});
          scene.fog = fog;
          controls.target.set(...shot.target);
          camera.position.set(...shot.position);
          controls.update();
        }
      }
      lastSelected = selected;
    }
    if (current) {
      sun.position.x += current.position[0] - sun.target.position.x;
      sun.position.z += current.position[1] - sun.target.position.z;
      sun.target.position.set(current.position[0], 0, current.position[1]);
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
      sun.position.set(sun.target.position.x + Math.cos(time.hour / 24 * Math.PI * 2) * 1000, 200 + daylight * 1100, sun.target.position.z + 600);
      renderer.toneMappingExposure = .85 + daylight * .15;
      fog.color.copy(scene.background as THREE.Color);
    }
    if (state.target && state.target.key !== targetKey) {
      following = false;
      targetKey = state.target.key;
      const home=homeAnchor(state.target.homeId);
      const plot=gardenPlot(state.target.gardenId),clear=(from:[number,number],to:[number,number])=>!cameraBuildings.some(rect=>segmentHits(rect,from,to,2));
      const offset=plot?gardenCameraOffset(plot,clear,camera.aspect):home?homeCameraOffset(home,clear):undefined;
      focus(state.target.x,state.target.y,offset?new THREE.Vector3(...offset):undefined,plot?plot.floor+5:15);
      if(home)host.dataset.homeFocus=home.id;
      if(plot)host.dataset.gardenFocus=plot.id;
    }
    gardens.draw(world,seconds*1000);
    if(stamp-lastStatus>180){
      const stats=gardens.stats();host.dataset.gardenStates=JSON.stringify(stats.views);host.dataset.gardenUpdates=String(stats.updates);host.dataset.gardenStateError=String(stats.failed);
      const plot=gardenPlot(state.target?.gardenId);
      if(plot){let framed=true;for(const dx of [-plot.width/2,plot.width/2])for(const dz of [-plot.depth/2,plot.depth/2])for(const y of [plot.floor,plot.floor+11]){const p=new THREE.Vector3(plot.x+dx,y,plot.z+dz).project(camera);if(Math.abs(p.x)>1||Math.abs(p.y)>1||Math.abs(p.z)>1)framed=false;}host.dataset.gardenFramed=String(framed);}
    }
    const currentWeather = weatherAt(world.born, worldTime(world, lastTime), world.clock?.weatherOverride);
    ambience.update(seconds, currentWeather.kind, currentWeather.intensity);
    if (ambience.flash > 0) {
      sun.intensity = 4.2;
      ambient.intensity = 2.1;
    }
    drawActors(seconds, world, dt);
    traffic();
    contactShadows.count = actors.length + cars.length;
    for (let i = 0; i < contactShadows.count; i++) {
      const car = i >= actors.length ? cars[i - actors.length] : null, point = car?.position ?? actors[i].position;
      dummy.position.set(point[0], groundElevation(point[0], point[1]) + .04, point[1]); dummy.rotation.set(0, car?.yaw ?? 0, 0); dummy.scale.set(car ? car.width * 1.35 : 11, 1, car ? car.length * 1.2 : 8); dummy.updateMatrix(); contactShadows.setMatrixAt(i, dummy.matrix);
    }
    contactShadows.instanceMatrix.needsUpdate = true;
    fauna.draw(groundAnimals, seconds, dt, world.paused);
    host.dataset.animalPositions = JSON.stringify(groundAnimals.map(a => ({ id: a.id, species: a.species, position: a.position })));
    host.dataset.homeTargets=JSON.stringify(actors.filter(a=>a.homeAnchor).map(a=>({id:a.id,target:a.homeAnchor,position:a.position})));
    if (current) {
      ring.position.set(current.position[0], 2, current.position[1]);
      if (following) {
        const partnerId = socialPoses.get(current.id)?.peerId;
        const peer = actors.find(a => a.id === partnerId) ?? groundAnimals.find(a => a.petOwnerId === current!.id);
        const height = Math.max(modelActors.height(current.id), peer && modelActors.ids.has(peer.id) ? modelActors.height(peer.id) : peer && actors.some(a => a.id === peer.id) ? 20 : 0);
        const shot = characterShot(current, peer, heading.get(current.id) ?? .35, cameraBuildings, camera.aspect, height, {boxes:cameraFoliage,peerHeight:peer && groundAnimals.some(a=>a.id===peer.id) ? 5 : height,elevation:p=>groundElevation(p[0],p[1])});
        const sightClear=(position:THREE.Vector3)=>[{actor:current!,height},...(peer?[{actor:peer,height:groundAnimals.some(a=>a.id===peer.id)?5:height}]:[])].every(({actor,height:h})=>
          !cameraFoliage.some(box=>cameraRayBlocked(box,[actor.position[0],groundElevation(...actor.position)+Math.max(2,h*.8),actor.position[1]],position.toArray()))&&
          !cameraBuildings.some(box=>segmentHits(box,actor.position,[position.x,position.z],2)));
        const desired=new THREE.Vector3(...shot.position),target=new THREE.Vector3(...shot.target);
        if(!sightClear(camera.position)&&sightClear(desired)){
          // Easing through an opaque crown hides the companion even when the
          // chosen endpoint is clear. Make an explicit deterministic correction.
          controls.target.copy(target);camera.position.copy(desired);
        }else{
          const alpha = 1 - Math.exp(-2.8 * dt);
          controls.target.lerp(target, alpha);camera.position.lerp(desired, alpha);
        }
      }
    }
    controls.update();
    // Keep signs subordinate to residents; distant districts need no text clutter.
    updateAssetLOD(camera, activeQuality === "sharp");
    for (const chunk of detailChunks) chunk.mesh.visible = Math.hypot(camera.position.x - chunk.x, camera.position.z - chunk.z) < 520;
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
      const actorHead = (actor: Actor) => modelActors.head(actor.id)?.add(new THREE.Vector3(0, 1, 0)) ?? new THREE.Vector3(actor.position[0], groundElevation(...actor.position) + 21.5 + (actor.bicycle ? 4 : 0), actor.position[1]);
      const p = speaker ? actorHead(speaker).project(camera) : new THREE.Vector3();
      const labels: LabelAnchor[] = [];
      for (const actor of actors) {
        const head = actorHead(actor), point = head.clone().project(camera);
        const selected = actor.id === current?.id, speaking = socialPoses.get(actor.id)?.speaking ?? false;
        if (point.z < -1 || point.z > 1 || Math.abs(point.x) > .98 || Math.abs(point.y) > .95) continue;
        if (!selected && !speaking && camera.position.distanceTo(new THREE.Vector3(actor.position[0],0,actor.position[1])) > 240) continue;
        const ray = new THREE.Ray(camera.position, head.clone().sub(camera.position).normalize()), hit = new THREE.Vector3();
        if (nameOccluders.some(box => ray.intersectBox(box,hit) && hit.distanceTo(camera.position) < head.distanceTo(camera.position)-.3)) continue;
        labels.push({ id: actor.id, name: actor.name, x: (point.x+1)*host.clientWidth/2, y: (1-point.y)*host.clientHeight/2, selected, speaking });
      }
      callbacks.status({
        name: current?.name ?? "An",
        activity: current?.activity ?? "Đang sinh hoạt",
        following,
        walking: current?.walking ?? false,
        location: current?.location ?? "",
        speech: speech?.text ?? "",
        speechKey: speech?.key ?? "",
        labels, viewportWidth: host.clientWidth, viewportHeight: host.clientHeight,
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
    if(!drawnFrames){
      const now=performance.now();
      host.dataset.firstFrameMs=now.toFixed(1);
      performance.measure('xom-city-start-to-first-frame',{start:Number(host.dataset.startedAt)||now,end:now});
    }
    host.dataset.ready = "true";
    host.dataset.paused = String(world.paused);
    host.dataset.frame = String(++drawnFrames);
    host.dataset.pixelRatio = String(renderer.getPixelRatio());
    host.dataset.effectiveQuality = activeQuality ?? "balanced";
    host.dataset.reducedMotion = String(motionPreference.matches);
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
    host.dataset.cyclists = JSON.stringify(actors.filter(a => a.bicycle).map(a => {
      const radius = a.bicycle!.radius;
      const inFrame = [-radius, radius].every(x => [-radius, radius].every(z => [0, 25].every(y => {
        const p = new THREE.Vector3(a.position[0] + x, y + groundElevation(...a.position), a.position[1] + z).project(camera);
        return p.z > -1 && p.z < 1 && Math.abs(p.x) < .95 && Math.abs(p.y) < .95;
      })));
      return { id: a.id, position: a.position, walking: a.walking, ...a.bicycle, inFrame };
    }));
    host.dataset.tagCast = JSON.stringify(actors.filter(a => a.tagGame).map(a => ({ id: a.id, position: a.position, walking: a.walking, ...a.tagGame })));
    host.dataset.petWalks = JSON.stringify(groundAnimals.filter(a => a.petOwnerId).map(a => {
      const screen = new THREE.Vector3(a.position[0], 2, a.position[1]).project(camera);
      const clearSightline=!cameraFoliage.some(box=>cameraRayBlocked(box,[a.position[0],groundElevation(...a.position)+4,a.position[1]],camera.position.toArray()))&&!cameraBuildings.some(box=>segmentHits(box,a.position,[camera.position.x,camera.position.z],2));
      return { id: a.id, ownerId: a.petOwnerId, position: a.position, walking: a.walking, clearSightline, onScreen: screen.z > -1 && screen.z < 1 && Math.abs(screen.x) < .95 && Math.abs(screen.y) < .95 };
    }));
    host.dataset.selected = current?.id ?? "";
    host.dataset.humanBatches = String(people.stats().batches);
    host.dataset.humanInstances = String(people.stats().instances);
    host.dataset.modelActors = JSON.stringify(modelActors.snapshots());
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
    presentSpeech(key) { if(!input().sharedGroundRequested)socialDirector.presented(key, Date.now() + (input().clockOffsetMs ?? 0)); },
    zoom(factor) {
      following = false;
      host.dataset.view = "orbit";
      const offset = camera.position.clone().sub(controls.target);
      offset.multiplyScalar(factor);
      offset.clampLength(42, 11000);
      camera.position.copy(controls.target).add(offset);
    },
    follow() {
      callbacks.select("an");
      host.dataset.view = "follow";
      following = !motionPreference.matches;
      lastSelected = ""; // One explicit framing in reduced motion, then a stationary camera.
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
      document.removeEventListener("visibilitychange", visibilityChanged);
      window.removeEventListener('resize',visibilityChanged);
      motionPreference.removeEventListener('change',motionChanged);
      renderer.domElement.removeEventListener('keydown',cameraKey);
      modelActors.dispose();
      gardens.dispose();
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
      assets.collectAndClose({ geometries, materials, textures });
      people.collectGeometry(geometries);
      sceneDetail.collect(geometries);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
