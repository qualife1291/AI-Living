import type { LivingState, Resident } from "./schema";
export type HomeAssignment = { householdId: string; label: string; place: string };
export const HOUSEHOLD_SIZE = 4;

/** Additive backfill: preserve established homes and every resident's history.
 * This groups real residents already in the snapshot; it never creates people. */
export function assignHomes(residents: Resident[]): Resident[] {
  const groups = new Map<string, { home: HomeAssignment; count: number }>();
  for (const resident of residents) if (resident.home?.householdId) {
    const group = groups.get(resident.home.householdId) ?? { home: resident.home, count: 0 };
    group.count++; groups.set(resident.home.householdId,group);
  }
  return residents.map(resident => {
    if (resident.home?.householdId) return resident;
    let index = 1;
    while ((groups.get(`household-${index}`)?.count ?? 0) >= HOUSEHOLD_SIZE) index++;
    const id = `household-${index}`;
    const group = groups.get(id) ?? { count: 0, home: { householdId: id, label: `Nhóm ở ${String(index).padStart(2,"0")}`, place: "Khu dân cư" } };
    group.count++; groups.set(id,group);
    return { ...resident, home: { ...group.home } };
  });
}
export function households(state: Pick<LivingState, "residents">) {
  const groups = new Map<string, { home: HomeAssignment; members: Resident[] }>();
  for (const resident of assignHomes(state.residents)) {
    const home = resident.home!, group = groups.get(home.householdId) ?? { home, members: [] };
    group.members.push(resident); groups.set(home.householdId,group);
  }
  return [...groups.values()];
}
export function householdFor(state: LivingState | undefined, id: string) {
  return state && households(state).find(group => group.members.some(r => r.id === id));
}
