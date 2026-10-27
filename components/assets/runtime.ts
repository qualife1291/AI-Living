import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { AssetLibrary } from "../city/three/assets.ts";
import { RiggedAvatar } from "../city/three/rigged-avatar.ts";

export async function createAssetViewer(host: HTMLDivElement, onClips: (clips: string[]) => void, onError: (message: string) => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#d6e9e6");
  scene.add(new THREE.HemisphereLight("#fff8eb", "#9aaf95", 2));
  const sun = new THREE.DirectionalLight("#fff1d6", 2.5);
  sun.position.set(-15, 30, 25); scene.add(sun);
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 1000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.minDistance = 8; controls.maxDistance = 350;
  controls.maxPolarAngle = Math.PI / 2 - .02;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(32, 48), new THREE.MeshLambertMaterial({ color: "#c9cfad" }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.08; scene.add(floor);
  let dirty = true, dead = false, lost = false, version = 0, frame = 0, last = 0, time = 0, poseVersion = 0, playing = true, clip = "idle";
  let library: AssetLibrary | undefined, pendingLibrary: AssetLibrary | undefined, avatar: RiggedAvatar | undefined, staticRoot: THREE.Group | undefined;
  const fit = () => {
    camera.aspect = Math.max(1, host.clientWidth) / Math.max(1, host.clientHeight);
    camera.updateProjectionMatrix();
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const distance = 22 / (2 * Math.tan(fov / 2) * Math.min(1, camera.aspect));
    // Leave room below the model for the caption on narrow displays.
    controls.target.set(0, 5, 0);
    camera.position.copy(controls.target).add(new THREE.Vector3(.5, .25, 1).normalize().multiplyScalar(distance * 1.3));
    controls.update(); dirty = true;
  };
  const resize = new ResizeObserver(() => { renderer.setSize(Math.max(1, host.clientWidth), Math.max(1, host.clientHeight)); fit(); });
  resize.observe(host);
  const disposeModel = () => {
    avatar?.dispose(); avatar = undefined;
    staticRoot?.removeFromParent(); staticRoot = undefined;
    library?.dispose(); library = undefined;
  };
  const contextLost = (event: Event) => {
    event.preventDefault(); lost = true; cancelAnimationFrame(frame);
    host.dataset.ready = "false"; onError("Không gian 3D bị gián đoạn. Hãy thử mở lại.");
  };
  renderer.domElement.addEventListener("webglcontextlost", contextLost);
  async function select(id: string) {
    if (dead || lost) return;
    const ticket = ++version;
    pendingLibrary?.dispose(); disposeModel(); dirty = true;
    host.dataset.loading = "true"; host.dataset.ready = "false"; host.dataset.renderedModel = "";
    onClips([]); onError("");
    const extra = id.startsWith("kaykit-adventurers/") ? ["kaykit-adventurers/rig_medium_general", "kaykit-adventurers/rig_medium_movement-basic"] : [];
    const next = new AssetLibrary(); pendingLibrary = next;
    try {
      // Await this selection's loads. A preload timeout must not mark a late model ready.
      await Promise.all([next.load(id), ...extra.map(key => next.load(key))]);
      if (dead || lost || ticket !== version) { next.dispose(); return; }
      const source = next.get(id)!;
      pendingLibrary = undefined; library = next;
      let skinned = false;
      source.scene.traverse(o => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned = true; });
      if (skinned) {
        const animations = source.animations.length ? source.animations : extra.flatMap(key => next.get(key)?.animations ?? []);
        avatar = new RiggedAvatar({ ...source, animations }, 18, 100);
        scene.add(avatar.group); onClips(animations.map(a => a.name));
      } else {
        const object = source.scene.clone(true), box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
        const scale = 18 / Math.max(...size);
        object.position.set(-center.x, -box.min.y, -center.z);
        staticRoot = new THREE.Group(); staticRoot.add(object); staticRoot.scale.setScalar(scale); scene.add(staticRoot);
      }
      clip = "idle"; time = 0; poseVersion += 1000; dirty = true;
      host.dataset.model = id; host.dataset.loading = "false"; host.dataset.skinned = String(skinned); host.dataset.ready = "true";
      fit();
    } catch {
      next.dispose();
      if (dead || lost || ticket !== version) return;
      pendingLibrary = undefined; disposeModel(); host.dataset.loading = "false";
      onError("Chưa mở được mô hình. Hãy thử lại.");
    }
  }
  function tick(stamp: number) {
    if (dead || lost) return;
    frame = requestAnimationFrame(tick);
    const dt = last ? Math.min(.2, (stamp - last) / 1000) : 0; last = stamp;
    if (document.hidden) return;
    if (avatar && (playing || dirty)) {
      if (playing) time += dt;
      avatar.pose(clip, time, poseVersion + time, [0, 0, 0], 0, 0); dirty = true;
    }
    const moved = controls.update();
    if (!dirty && !moved) return;
    renderer.render(scene, camera); dirty = false;
    host.dataset.renderedModel = host.dataset.model ?? "";
    host.dataset.frames = String(Number(host.dataset.frames ?? 0) + 1);
    host.dataset.triangles = String(renderer.info.render.triangles);
    host.dataset.clip = avatar?.snapshot().resolvedClip ?? "static";
    host.dataset.pose = JSON.stringify(avatar?.snapshot() ?? null);
  }
  frame = requestAnimationFrame(tick);
  return {
    select,
    play(value: boolean) { playing = value; dirty = true; },
    animation(value: string) { clip = value; time = 0; poseVersion += 1000; dirty = true; },
    dispose() {
      dead = true; version++; cancelAnimationFrame(frame); resize.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      pendingLibrary?.dispose(); disposeModel(); floor.geometry.dispose(); floor.material.dispose();
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    },
  };
}
