import type { Step } from "../life.ts";
/** Existing social scripts use seven legacy categories; new action semantics stay intact elsewhere. */
export function socialCategory(kind: Step["kind"]): string {
  if (["run", "jump", "tag", "cycle", "exercise"].includes(kind)) return "play";
  if (kind === "study") return "read";
  if (kind === "drink" || kind === "shop") return "eat";
  if (kind === "walk-pet") return "social";
  return kind;
}
export function activityLift(kind: Step["kind"], seconds: number) {
  return kind === "jump" ? Math.max(0, Math.sin(seconds * 3)) * 3 : 0;
}
export const hasHandProp = (kind: Step["kind"]) => ["read", "study", "garden", "eat", "drink", "work", "shop"].includes(kind);
export function handProp(kind: Step["kind"]): string {
  return kind === "study" ? "read" : kind === "drink" ? "cup" : kind === "eat" ? "bread" : kind === "shop" ? "bag" : kind;
}
