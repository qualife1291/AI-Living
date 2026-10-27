import data from "../../data/assets/runtime-bindings.json" with { type: "json" };
const bindings: Record<string, string> = data.bindings;
export function resolveModel(hint: string) { const value = bindings[hint]; return value && !value.startsWith("procedural/") ? value : undefined; }
