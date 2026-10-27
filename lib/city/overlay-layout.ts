export type LabelAnchor = { id: string; name: string; x: number; y: number; selected: boolean; speaking: boolean };
export type OverlayRect = { x: number; y: number; width: number; height: number };
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(Math.max(low, high), n));
export function speechRect(anchor: { x: number; y: number }, size: { width: number; height: number }, viewport: { width: number; height: number }): OverlayRect {
  const margin = 12, top = 82, bottom = viewport.width <= 900 ? 162 : 104;
  const width = Math.min(size.width, viewport.width - margin * 2), height = Math.min(size.height, viewport.height - top - bottom);
  const above = anchor.y - height - 36, below = anchor.y + 18;
  return { x: clamp(anchor.x - width / 2, margin, viewport.width - width - margin),
    y: clamp(above < top && below + height <= viewport.height - bottom ? below : above, top, viewport.height - bottom - height), width, height };
}
function overlaps(a: OverlayRect, b: OverlayRect) {
  return a.x < b.x + b.width + 5 && a.x + a.width + 5 > b.x && a.y < b.y + b.height + 5 && a.y + a.height + 5 > b.y;
}
/** Bounded screen labels; do not move an overcrowded badge far from its actor. */
export function nameLabels(anchors: LabelAnchor[], viewport: { width: number; height: number }, speech?: OverlayRect) {
  const placed: (LabelAnchor & OverlayRect)[] = [], occupied = speech ? [speech] : [];
  const bottom = viewport.width <= 900 ? 160 : 100;
  for (const a of [...anchors].sort((a,b) => Number(b.selected)-Number(a.selected) || Number(b.speaking)-Number(a.speaking) || a.id.localeCompare(b.id))) {
    if (placed.length >= 16 || !Number.isFinite(a.x + a.y)) continue;
    const width = Math.min(116, Math.max(50, Array.from(a.name).length * 6.6 + 32)), height = 26;
    const x = clamp(a.x - width / 2, 10, viewport.width - width - 10);
    if (Math.abs(x + width/2 - a.x) > 32) continue;
    for (const shift of [0, 30]) {
      const rect = { x, y: a.y - height - 6 - shift, width, height };
      if (rect.y < 80 || rect.y + height > viewport.height - bottom || occupied.some(b => overlaps(rect,b))) continue;
      placed.push({ ...a, ...rect }); occupied.push(rect); break;
    }
  }
  return placed;
}
