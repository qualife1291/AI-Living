/** Small, licensed daily-life set. Fantasy/armed costumes stay in the gallery. */
export const CORE_MODELS: Record<string, string> = {
  an: "gobkit-human002/it-engineer",
  binh: "gobkit-human002/accountant",
  chi: "gobkit-human002/receptionist",
};
export function residentModel(roleId: string) {
  if (/doctor|nurse|medic/.test(roleId)) return "gobkit-human005/white-coat-doctor";
  if (/vendor|shop|cashier/.test(roleId)) return "gobkit-human001/cashier";
  if (/delivery|courier/.test(roleId)) return "gobkit-human001/food-courier";
  if (/guard|police/.test(roleId)) return "gobkit-human002/security-guard";
  return "gobkit-human002/office-intern";
}
