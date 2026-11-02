/** Fictional VND travel budget. Never a payment processor or real transaction. */
export const MOBILITY_FARES_VND = {
  "mobility-drive-car": 6500,
  "mobility-ride-bus": 7000,
  "mobility-ride-metro": 9000,
} as const;
export type PaidMobilityAction = keyof typeof MOBILITY_FARES_VND;
export type MobilityPayment = {
  experienceId: string;
  actorId: string;
  actionId: PaidMobilityAction;
  currency: "VND";
  fare: number;
  balanceBefore: number;
  balanceAfter: number;
  completedAt: string;
};
export function fareForAction(id: string): number {
  return Object.prototype.hasOwnProperty.call(MOBILITY_FARES_VND, id)
    ? MOBILITY_FARES_VND[id as PaidMobilityAction] : 0;
}
export function canAffordMobility(balance: number, action: string): boolean {
  return Number.isSafeInteger(balance) && balance >= fareForAction(action) && balance >= 0;
}
/** Called on the server only for verified, completed plan experience. */
export function chargeCompletedMobility(
  balance: number, ledger: readonly MobilityPayment[],
  completion: { id: string; actorId: string; scenarioId: string; at: string },
): { balance: number; ledger: MobilityPayment[]; charged: boolean } {
  if (ledger.some(row => row.experienceId === completion.id))
    return { balance, ledger: [...ledger], charged: false };
  const fare = fareForAction(completion.scenarioId);
  if (!fare || !canAffordMobility(balance, completion.scenarioId))
    return { balance, ledger: [...ledger], charged: false };
  const row: MobilityPayment = {
    experienceId: completion.id, actorId: completion.actorId,
    actionId: completion.scenarioId as PaidMobilityAction,
    currency: "VND", fare, balanceBefore: balance, balanceAfter: balance - fare,
    completedAt: completion.at,
  };
  return { balance: row.balanceAfter, ledger: [...ledger, row], charged: true };
}
