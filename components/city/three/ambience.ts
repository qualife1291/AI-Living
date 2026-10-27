import * as THREE from "three";
import { venues } from "../../../lib/city/world.ts";
import { venueSceneryPose } from "../../../lib/city/scenery.ts";
import type { WeatherKind } from "../../../lib/clock.ts";

/** Small, pooled simulation-clock effects (fountains, clouds, rain, lightning); no event/history or per-frame allocation. */
export function createAmbience(scene: THREE.Scene) {
  const fountains = venues.filter(v => ["park", "square"].includes(v.type)).map(venueSceneryPose);
  const count = fountains.length * 4 * 8, positions = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.BufferAttribute(positions, 3); attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", attribute);
  const droplets = new THREE.Points(geometry, new THREE.PointsMaterial({ color: "#b3ecf0", size: .85, sizeAttenuation: true }));
  droplets.frustumCulled = false; scene.add(droplets);

  const cloudMaterial = new THREE.MeshLambertMaterial({ color: "#fff7e7", emissive: "#b4d4e4", emissiveIntensity: .13 });
  const clouds = new THREE.InstancedMesh(new THREE.SphereGeometry(.5, 10, 6), cloudMaterial, 18);
  clouds.frustumCulled = false; scene.add(clouds);

  // Pooled rain streaks (256 drops -> total droplets count + 256 <= 512 budget)
  const rainCount = 256, rainPositions = new Float32Array(rainCount * 3);
  const rainGeo = new THREE.BufferGeometry();
  const rainAttr = new THREE.BufferAttribute(rainPositions, 3); rainAttr.setUsage(THREE.DynamicDrawUsage);
  rainGeo.setAttribute("position", rainAttr);
  const rainMat = new THREE.PointsMaterial({ color: "#c6e6f5", size: 1.35, transparent: true, opacity: .78, sizeAttenuation: true });
  const rain = new THREE.Points(rainGeo, rainMat);
  rain.frustumCulled = false; rain.visible = false; scene.add(rain);

  // 3D Forked Lightning bolt segments for thunderstorm / heavy rain bursts
  const boltVerts = new Float32Array(12 * 3);
  const boltGeo = new THREE.BufferGeometry();
  const boltAttr = new THREE.BufferAttribute(boltVerts, 3); boltAttr.setUsage(THREE.DynamicDrawUsage);
  boltGeo.setAttribute("position", boltAttr);
  const boltMat = new THREE.LineBasicMaterial({ color: "#fffbe0" });
  const lightning = new THREE.LineSegments(boltGeo, boltMat);
  lightning.frustumCulled = false; lightning.visible = false; scene.add(lightning);

  const dummy = new THREE.Object3D();
  let lastSeconds = NaN, lightningFlash = 0;
  return {
    update(seconds: number, weather: WeatherKind = "clear", intensity = 0.4) {
      if (!Number.isFinite(seconds) || lastSeconds === seconds) return;
      lastSeconds = seconds; let index = 0;
      for (const fountain of fountains) for (let stream = 0; stream < 4; stream++) for (let bead = 0; bead < 8; bead++) {
        const t = ((seconds * .7 + bead / 8) % 1 + 1) % 1, angle = stream * Math.PI / 2;
        positions[index++] = fountain.x + Math.cos(angle) * t * 9;
        positions[index++] = 11.8 + Math.sin(t * Math.PI) * 9;
        positions[index++] = fountain.y - 44 + Math.sin(angle) * t * 9;
      }
      attribute.needsUpdate = true;

      const windy = weather === "windy" ? 2.4 : 1;
      const stormy = weather === "rain" && intensity >= 0.6;
      cloudMaterial.color.set(stormy ? "#7b8d99" : weather === "rain" ? "#9fb0ba" : weather === "cloudy" ? "#e2e8ec" : "#fff7e7");
      cloudMaterial.emissive.set(stormy ? "#435666" : "#b4d4e4");

      for (let n = 0; n < 18; n++) {
        const group = Math.floor(n / 3), lobe = n % 3;
        dummy.position.set(-300 + group * 550 + lobe * 85 + Math.sin(seconds / (700 / windy) + group) * 80, 420 + group % 3 * 80 + (lobe === 1 ? 22 : 0), -450 + group % 2 * 220);
        dummy.scale.set(190, lobe === 1 ? 90 : 65, 110); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); clouds.setMatrixAt(n, dummy.matrix);
      }
      clouds.instanceMatrix.needsUpdate = true;

      const raining = weather === "rain";
      rain.visible = raining;
      if (raining) {
        const windDrift = (intensity > 0.6 ? 28 : 10) * Math.sin(seconds * 0.5);
        for (let i = 0; i < rainCount; i++) {
          const seed = (i * 97) % 256;
          const fall = ((seconds * 1.9 + seed / 256) % 1 + 1) % 1;
          rainPositions[i * 3] = 200 + (i % 16) * 135 + windDrift * fall;
          rainPositions[i * 3 + 1] = (1 - fall) * 380;
          rainPositions[i * 3 + 2] = -100 + Math.floor(i / 16) * 110;
        }
        rainAttr.needsUpdate = true;
      }

      // Deterministic lightning strike pulse during heavy rain (every ~19s for 0.18s)
      const cycle = ((seconds % 19) + 19) % 19;
      const strike = stormy && (cycle > 14.0 && cycle < 14.18 || cycle > 14.28 && cycle < 14.36);
      lightning.visible = strike;
      lightningFlash = strike ? 1.85 : 0;
      if (strike) {
        const bx = 650 + Math.floor(seconds / 19) % 3 * 420, bz = 180;
        const pts: [number, number, number][] = [
          [bx, 420, bz], [bx - 18, 330, bz + 10],
          [bx - 18, 330, bz + 10], [bx + 12, 240, bz - 8],
          [bx + 12, 240, bz - 8], [bx - 24, 130, bz + 14],
          [bx - 24, 130, bz + 14], [bx - 8, 12, bz + 4],
          // Fork branch
          [bx - 18, 330, bz + 10], [bx - 58, 250, bz + 26],
          [bx + 12, 240, bz - 8], [bx + 54, 165, bz - 20],
        ];
        for (let k = 0; k < pts.length; k++) {
          boltVerts[k * 3] = pts[k][0];
          boltVerts[k * 3 + 1] = pts[k][1];
          boltVerts[k * 3 + 2] = pts[k][2];
        }
        boltAttr.needsUpdate = true;
      }
    },
    get flash() { return lightningFlash; },
    stats: { fountainStreams: fountains.length * 4, droplets: count + rainCount, cloudLobes: 18 },
  };
}
