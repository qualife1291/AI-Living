import type { BufferGeometry, Mesh, Object3D } from 'three';
import type { Quality } from '../../../lib/city/scale.ts';

/** Both variants keep the same physical bounds; only vertex density changes. */
export class SceneDetail {
  private variants = new Map<BufferGeometry, { fine: BufferGeometry; light: BufferGeometry }>();
  register(fine: BufferGeometry, light: BufferGeometry) {
    const pair = { fine, light };
    this.variants.set(fine, pair); this.variants.set(light, pair);
    return fine;
  }
  apply(scene: Object3D, quality: Quality = 'balanced') {
    scene.traverse(object => {
      const mesh = object as Mesh, pair = this.variants.get(mesh.geometry);
      if (pair) mesh.geometry = quality === 'sharp' ? pair.fine : pair.light;
    });
  }
  collect(target: Set<BufferGeometry>) { for (const geometry of this.variants.keys()) target.add(geometry); }
}
