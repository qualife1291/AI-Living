import * as THREE from "three";

/** Reviewed Human002 props are disconnected islands in an authored side tray.
 * Keep body, fingers, clothes and headset together. Gallery uses the full source.
 * This region is in Human002 source units; do not apply it to other rigs. */
export function dailyHumanGeometry(source: THREE.BufferGeometry) {
  const position = source.getAttribute("position"), parents = Array.from({ length: position.count }, (_, i) => i);
  const find = (i: number): number => parents[i] === i ? i : (parents[i] = find(parents[i]));
  const vertices = new Map<string, number>();
  for (let i = 0; i < position.count; i++) {
    const key = [position.getX(i), position.getY(i), position.getZ(i)].map(n => n.toFixed(6)).join(",");
    const other = vertices.get(key);
    if (other === undefined) vertices.set(key, i); else parents[find(i)] = find(other);
  }
  const indices = source.index ? Array.from(source.index.array) : parents.map((_, i) => i);
  for (let i = 0; i < indices.length; i += 3) {
    parents[find(indices[i])] = find(indices[i + 1]);
    parents[find(indices[i + 1])] = find(indices[i + 2]);
  }
  const bounds = new Map<number, { minX: number; maxY: number }>();
  for (let i = 0; i < position.count; i++) {
    const root = find(i), box = bounds.get(root) ?? { minX: Infinity, maxY: -Infinity };
    box.minX = Math.min(box.minX, position.getX(i)); box.maxY = Math.max(box.maxY, position.getY(i)); bounds.set(root, box);
  }
  const keep = indices.filter(i => { const box = bounds.get(find(i))!; return !(box.minX > .055 && box.maxY < .06); });
  const geometry = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(source.attributes)) {
    const array = new (attribute.array.constructor as Float32ArrayConstructor)(keep.length * attribute.itemSize);
    for (let i = 0; i < keep.length; i++) for (let j = 0; j < attribute.itemSize; j++) array[i * attribute.itemSize + j] = attribute.getComponent(keep[i], j);
    geometry.setAttribute(name, new THREE.BufferAttribute(array, attribute.itemSize, attribute.normalized));
  }
  return geometry;
}
