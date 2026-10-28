import type { StreetProp } from "../../../lib/city/scenery.ts";
import type {GrowthPhase} from "../../../lib/living/flora.ts";

export type StreetSolid = { shape: "box" | "cylinder" | "wheel" | "bud"; x: number; y: number; z: number; w: number; h: number; d: number; color: string; angle?: number; tilt?: number };
/** Model dimensions stay inside the exact shared ground reservation. */
export function streetModel(prop: StreetProp,plant?:{phase:GrowthPhase;moisture:number}): StreetSolid[] {
  const parts: StreetSolid[] = [], palette = ["#dd936e", "#62a49b", "#e0b750", "#859fb4", "#a7819d"];
  const accent = palette[prop.seed % palette.length];
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, color: string, tilt = 0) => parts.push({ shape: "box", x: prop.x + x, y, z: prop.z + z, w, h, d, color, tilt });
  const round = (shape: "cylinder" | "wheel" | "bud", x: number, y: number, z: number, w: number, h: number, d: number, color: string, angle = 0) => parts.push({ shape, x: prop.x + x, y, z: prop.z + z, w, h, d, color, angle });
  if (prop.kind === "produce") {
    box(0, 6, 0, 21, 2, 13, "#ba8b62");
    for (const x of [-8.5, 8.5]) for (const z of [-4.5, 4.5]) { box(x, 3.2, z, 1, 6, 1, "#6c8d86"); round("wheel", x, 2.3, z, 3.2, 3.2, .8, "#405957", Math.PI / 2); }
    for (const x of [-10, 10]) box(x, 15.5, -5.5, .9, 18, .9, "#9e8762");
    for (let stripe = 0; stripe < 7; stripe++) box(-9.4 + stripe * 3.1, 24.5, 0, 3.1, .9, 14, stripe % 2 ? "#fff0cc" : accent);
    for (let crate = 0; crate < 3; crate++) {
      box(-7 + crate * 7, 8, 0, 6, 2.5, 10, "#e2b47c");
      for (let n = 0; n < 6; n++) round("bud", -8.2 + crate * 7 + n % 2 * 2.3, 9.8, -3 + Math.floor(n / 2) * 2.5, 2.2, 2, 2.2, ["#dc8163", "#eaca6b", "#77a16b"][crate]);
    }
  } else if (prop.kind === "books") {
    for (const x of [-6.5, 6.5]) box(x, 9, 0, 1, 18, 7, "#a58160");
    for (const y of [2, 8, 14]) {
      box(0, y, 0, 13, 1, 7, "#cda77a");
      for (let n = 0; n < 6; n++) { box(-5 + n * 2, y + 2.7, 0, 1.6, 4.2, 5, palette[(n + prop.seed) % 5]); box(-5 + n * 2, y + 3.6, 2.6, 1, .3, .1, "#f6ead0"); }
    }
  } else if (prop.kind === "workbench") {
    for (const x of [-9, 9]) for (const z of [-3.5, 3.5]) box(x, 5, z, 1.2, 9, 1.2, "#688e88");
    box(0, 9.8, 0, 22, 1.8, 10, "#d8af79"); box(-3, 10.9, 0, 11, .25, 7, "#97b8c6");
    for (let n = 0; n < 3; n++) box(-6 + n * 3, 11.1, -.8, 1.8, .1, 4, "#e3eef0");
    box(7, 11.7, -2, 4, 2, 4, "#b77f61"); box(7, 13, -2, 2, .6, 2, "#d8c29a");
    box(-1, 2.5, 0, 13, 3, 7, "#8aa29a");
  } else if (prop.kind === "bicycle") {
    for (const x of [-6, 6]) round("wheel", x, 3.5, 0, 6, 6, 1, "#455f60");
    box(0, 4.9, 0, 10, .65, .7, accent, -.25); box(-3.5, 5.7, 0, .7, 6.5, .7, accent, -.4);
    box(2, 5.5, 0, .7, 6, .7, accent, .6); box(5.5, 6.1, 0, .7, 6.5, .7, "#98a8a0", .15);
    box(-3, 8.8, 0, 4, .8, 2.4, "#6b6a5c"); box(5, 9.5, 0, 1, .7, 5, "#6c817b");
    box(-1, 2.3, 1.2, .5, 3.5, .5, "#9aab9d", -.35);
  } else if (prop.kind === "flowers") {
    box(0, 2.3, 0, 18, 3.5, 12, "#bd8c6b"); box(0, 4.1, 0, 16.8, .4, 10.8, "#776c51");
    const phase=plant?.phase??"bloom",moisture=plant?.moisture??100;
    const height={sprout:1.2,young:2.4,bud:3.1,bloom:3.5,rest:3}[phase];
    const leaf={sprout:1.1,young:1.8,bud:2.2,bloom:2.5,rest:2.1}[phase];
    const green=moisture<25?"#aaa376":moisture<55?"#93a578":"#80ac6e";
    for (let n = 0; n < 6; n++) {
      const x = -5.5 + n % 3 * 5.5, z = -2.5 + Math.floor(n / 3) * 5, stem=(height+n%3*(phase==="bloom"?1:.4))*(.75+.25*moisture/100),y=4+stem;
      box(x, (y + 4) / 2, z, .4, y - 4, .4, "#6c9c70");
      if(["bud","bloom","rest"].includes(phase)){
        const size=phase==="bloom"?3.5:phase==="bud"?1.4:1.3;
        round("bud", x, y, z, size, phase==="bloom"?1.8:1.1, size, phase==="rest"?"#b29b74":phase==="bud"?"#9db77b":["#f3c66d", "#dc91a7", "#fff2cd"][n % 3]);
      }
      box(x+(phase==="sprout"?.5:1),y-Math.min(1.5,stem*.4),z,leaf,.3,1,green,.3);
    }
  } else if (prop.kind === "notice") {
    for (const x of [-6.5, 6.5]) box(x, 11, 0, 1, 21, 1, "#8a9c8f");
    box(0, 16, 0, 16, 10, 2, "#c9a576"); box(0, 16, 1.1, 14.5, 8.5, .3, "#80a4a0");
    for (let n = 0; n < 4; n++) { box(-4.7 + n * 3.2, 16 + n % 2, 1.4, 2.8, 5, .2, ["#fff0c8", "#f5cf98", "#d1e4d4"][n % 3]); box(-4.7 + n * 3.2, 18.2 + n % 2, 1.6, .4, .4, .3, "#dc9273"); }
  } else {
    box(0, 4.2, 0, 4.5, 7, 4.5, "#709b89"); box(0, 8, 0, 5, .8, 5, "#bdd2b7");
    box(0, 7.8, 2.3, 2.5, 1.2, .3, "#466e65"); box(0, 4.2, 2.3, 1.4, 1.6, .2, "#e8e6bb");
  }
  return parts;
}
