import * as THREE from "three";
import { venues } from "../../../lib/city/world.ts";
import { venueSceneryPose } from "../../../lib/city/scenery.ts";

/** Small, pooled simulation-clock effects; no event/history or per-frame allocation. */
export function createAmbience(scene: THREE.Scene) {
  const fountains = venues.filter(v => ["park", "square"].includes(v.type)).map(venueSceneryPose);
  const count = fountains.length * 4 * 8, positions = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.BufferAttribute(positions, 3); attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", attribute);
  const droplets = new THREE.Points(geometry, new THREE.PointsMaterial({ color: "#b3ecf0", size: .85, sizeAttenuation: true }));
  droplets.frustumCulled = false; scene.add(droplets);
  const cloudMaterial = new THREE.MeshLambertMaterial({ color: "#fff7e7", emissive: "#b4d4e4", emissiveIntensity: .13 });
  const clouds = new THREE.InstancedMesh(new THREE.SphereGeometry(.5, 8, 4), cloudMaterial, 18);
  clouds.frustumCulled = false; scene.add(clouds);
  const dummy = new THREE.Object3D();
  let lastSeconds = NaN;
  return {
    update(seconds: number) {
      if (!Number.isFinite(seconds) || lastSeconds === seconds) return;
      lastSeconds = seconds; let index = 0;
      for (const fountain of fountains) for (let stream = 0; stream < 4; stream++) for (let bead = 0; bead < 8; bead++) {
        const t = ((seconds * .7 + bead / 8) % 1 + 1) % 1, angle = stream * Math.PI / 2;
        positions[index++] = fountain.x + Math.cos(angle) * t * 9;
        positions[index++] = 11.8 + Math.sin(t * Math.PI) * 9;
        positions[index++] = fountain.y - 44 + Math.sin(angle) * t * 9;
      }
      attribute.needsUpdate = true;
      for (let n = 0; n < 18; n++) {
        const group = Math.floor(n / 3), lobe = n % 3;
        dummy.position.set(-300 + group * 550 + lobe * 85 + Math.sin(seconds / 700 + group) * 80, 420 + group % 3 * 80 + (lobe === 1 ? 22 : 0), -450 + group % 2 * 220);
        dummy.scale.set(190, lobe === 1 ? 90 : 65, 110); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); clouds.setMatrixAt(n, dummy.matrix);
      }
      clouds.instanceMatrix.needsUpdate = true;
    },
    stats: { fountainStreams: fountains.length * 4, droplets: count, cloudLobes: 18 },
  };
}
