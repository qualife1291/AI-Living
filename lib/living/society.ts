import type { World, EpisodeEvent } from '../world.ts';

/** Only persisted relationships and completed resident meetings are counted.
 * Browser-rendered conversations never enter the verified graph. */
export function verifiedRelations(world: World, id: string) {
  const relations = new Map<string,{peerId:string;trust:number;meetings:number;source:'core'|'completed-meeting'}>();
  for (const link of world.relationships) {
    if (link.a!==id && link.b!==id) continue;
    const peerId=link.a===id?link.b:link.a;
    relations.set(peerId,{peerId,trust:link.trust,meetings:0,source:'core'});
  }
  for (const edge of Object.values(world.living?.socialGraph??{})) {
    if (edge.a!==id && edge.b!==id) continue;
    const peerId=edge.a===id?edge.b:edge.a;
    if(!Number.isFinite(edge.meetings)||edge.meetings<1)continue;
    const previous=relations.get(peerId);
    relations.set(peerId,{peerId,trust:previous?.trust??edge.trust,meetings:edge.meetings,source:'completed-meeting'});
  }
  return [...relations.values()].sort((a,b)=>b.meetings-a.meetings||b.trust-a.trust||a.peerId.localeCompare(b.peerId));
}

export type SimulatedMoneyLine = {
  eventId: string; actorId: string; amount: number; title: string; at: string;
};

/** Read-only accounting view over committed event records. Running a scenario
 * or drawing a shop does NOT imply a wage, transfer, sale, payment or tax. */
export function recordedMoneyChanges(events: EpisodeEvent[]):SimulatedMoneyLine[] {
  const seen=new Set<string>(),changes:SimulatedMoneyLine[]=[];
  for(const event of events) {
    if(!event || !event.id || seen.has(event.id))continue;
    seen.add(event.id);
    for(const change of event.changes??[]) {
      if(!Number.isSafeInteger(change.moneyDelta)||change.moneyDelta===0)continue;
      if(Math.abs(change.moneyDelta)>30000)continue;
      changes.push({eventId:event.id,actorId:change.id,amount:change.moneyDelta,
        title:event.title,at:event.createdAt});
    }
  }
  return changes;
}
export function simulatedMoneyOverview(world:World,events:EpisodeEvent[]) {
  const entries=recordedMoneyChanges(events),balances=world.people.map(p=>({
    id:p.id,name:p.name,balance:p.money,
    recordedIncome:entries.filter(x=>x.actorId===p.id&&x.amount>0).reduce((n,x)=>n+x.amount,0),
    recordedExpense:entries.filter(x=>x.actorId===p.id&&x.amount<0).reduce((n,x)=>n-x.amount,0),
  }));
  return {currency:'VND (simulation only)',balances,entries:entries.slice(-60),
    // These are currently observed balances, not accumulated lifetime wealth.
    observedTotal:balances.reduce((n,b)=>n+b.balance,0)};
}
