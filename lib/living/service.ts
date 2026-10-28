import { assignIdentities } from "./identity";
import { assignHomes } from "./households";
import { scheduleResidentSocial } from "./social-scheduler";
import { scenarios, prepareLearning, initializeAgent } from "./learning";
import { settleAnimalLearning } from "./animal-learning";
import { env } from "cloudflare:workers";
import { database, readWorld } from "../store";
import { realContext, fetchProviders, type ContextCache } from "./realtime";
import { initializeLiving, planLivingTurn, turnId, population } from "./engine";
import { proposalSchema, type LivingTurn, type LivingState } from "./schema";
import { reviewRoleExpansion } from "./expansion";
import { memoryInsert, outcomeMemory } from "../memory-records";
import {hasDialogue,rememberDialogue} from "./dialogue-pool";
import {preparePolicyWrite} from "./policy-store";
import {reviewNarrative} from "./director";
import {pendingPlanMatches} from "./plan-identity";

export function fetchContext(input: RequestInfo | URL, init?: RequestInit) {
  const relay = env.XOM_CONTEXT_RELAY;
  if (relay) {
    const base = new URL(relay);
    if (!["127.0.0.1", "localhost"].includes(base.hostname))
      throw new Error("Context relay must be local");
    const url = new URL(String(input));
    const path =
      url.hostname === "api.open-meteo.com"
        ? "/weather"
        : url.hostname === "visithcmc.vn"
          ? `/events/${url.searchParams.get("year")}/${url.searchParams.get("month")}`
          : `/holidays/${url.pathname.split("/")[4]}`;
    return fetch(new URL(path, base), init);
  }
  return fetchProviders(input, init);
}
export function contextCache(): ContextCache {
  const db = database();
  return {
    read: (key) =>
      db
        .prepare("SELECT data, expires_at FROM context_cache WHERE id = ?")
        .bind(key)
        .first(),
    async write(key, data, expiresAt) {
      await db
        .prepare(
          "INSERT INTO context_cache (id,data,expires_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, expires_at=excluded.expires_at",
        )
        .bind(key, data, expiresAt)
        .run();
    },
  };
}
export async function livingView() {
  const current = await readWorld({includePolicies:true});
  const now = Date.parse(current.serverNow);
  const context = await realContext(now, contextCache(), fetchContext);
  const rows = await database()
    .prepare("SELECT data FROM living_turns ORDER BY created_at DESC LIMIT 24")
    .all<{ data: string }>();
  return {
    ...current,
    living: current.world.living ?? initializeLiving(now),
    context,
    turns: rows.results.map((r) => JSON.parse(r.data) as LivingTurn),
  };
}
function archiveStatements(
  state: LivingState,
  nonce: string,
  revision: number,
  extra: import("./learning").Experience[] = [],
) {
  const entries = [...new Map([...(state.experiences ?? []), ...extra].map((e) => [e.id, e])).values()];
  if (!entries.length) return [];
  return [database().prepare("INSERT OR IGNORE INTO agent_experiences(id,actor_id,created_at,data) SELECT json_extract(value,'$.id'),json_extract(value,'$.actorId'),json_extract(value,'$.at'),json_extract(value,'$.data') FROM json_each(?) WHERE EXISTS(SELECT 1 FROM worlds WHERE id='home' AND revision=? AND json_extract(data,'$.living.learningCommit')=?)")
    .bind(JSON.stringify(entries.map(e => ({id:e.id,actorId:e.actorId,at:e.at,data:JSON.stringify(e)}))),revision,nonce),
    ...memoryInsert(database(), extra.map(e => outcomeMemory(e, state.learning?.[e.actorId]?.memories.at(-1) ?? `Kết quả kế hoạch ${e.scenarioId}; phản hồi ${e.reward.toFixed(2)}.`)),revision,nonce)];
}
export async function auditTick(status: string, detail: Record<string, string | number | boolean>) {
  const at = new Date().toISOString();
  try { await database().prepare("INSERT INTO tick_runs (id,started_at,finished_at,status,model,error) VALUES (?,?,?,?,?,?)")
    .bind(`diagnostic:${crypto.randomUUID()}`, at, at, status, "request", JSON.stringify(detail)).run(); }
  catch { console.warn("tick diagnostic persistence unavailable"); }
}
export async function tickLiving(proposal?: unknown, basis?: { revision: number; turnId: string }) {
  const started = performance.now();
  try {
    const result = await tickLivingInternal(proposal, basis);
    await auditTick(result.status >= 400 ? "rejected" : "request_completed", { status: result.status, duplicate: "duplicate" in result.data && result.data.duplicate === true, durationMs: Math.round(performance.now()-started), reason: "error" in result.data ? String(result.data.error).slice(0,160) : "ok" });
    return result;
  } catch (error) { await auditTick("request_failed", { durationMs: Math.round(performance.now()-started), reason: error instanceof Error && error.name === "TimeoutError" ? "timeout" : "internal_error" }); throw error; }
}
async function tickLivingInternal(proposal?: unknown, basis?: { revision: number; turnId: string }) {
  const now = Date.now(),
    id = turnId(now),
    db = database();
  const existing = await db
    .prepare("SELECT id FROM living_turns WHERE id=?")
    .bind(id)
    .first();
  if (existing) return { status: 200, data: { ok: true, duplicate: true, id } };
  const current = await readWorld({includePolicies:true});
  if (proposal !== undefined && (!basis || basis.revision !== current.revision || basis.turnId !== id))
    return { status: 409, data: { error: "Cảnh đã thay đổi; hãy sinh lại hội thoại." } };
  if (current.world.paused)
    return { status: 409, data: { error: "Xóm đang tạm nghỉ" } };
  const context = await realContext(now, contextCache(), fetchContext);
  const result = planLivingTurn(current.world, context, now);
  const parsed = proposalSchema.safeParse(proposal);
  // Models only write bounded narrative. They cannot invent live facts, change money,
  // move entities, invoke tools, or change the activity chosen by the world engine.
  if (proposal !== undefined && !parsed.success) return { status: 422, data: { error: "Proposal schema rejected" } };
  if (parsed.success) {
    if (!result.turn.dialogue.length) return {status:422,data:{error:"Kế hoạch hiện tại không có cuộc gặp; không thể thêm hội thoại."}};
    if (!parsed.data.dialogue.every(d => ["an", result.turn.residentId].includes(d.speaker))) return { status: 422, data: { error: "Proposal speaker rejected" } };
    if (parsed.data.newRole) {
      const reviewed = reviewRoleExpansion(parsed.data.newRole, result.state.catalog.roles);
      if (!reviewed.ok) return { status: 422, data: { error: reviewed.reason } };
    }
    const reviewed = reviewNarrative(parsed.data, ["an", result.turn.residentId]);
    if (!reviewed.ok) return {status:422,data:{error:reviewed.reason}};
    if(hasDialogue(current.world.living?.dialoguePool,'an',result.turn.residentId,parsed.data.dialogue))return {status:422,data:{error:'Hội thoại trùng toàn bộ cảnh gần đây'}};
    const allowed = new Set(["an", result.turn.residentId]);
    if (parsed.data.dialogue.every((d) => allowed.has(d.speaker))) {
      const { newRole, ...narrative } = parsed.data;
      result.state.dialoguePool=rememberDialogue(current.world.living?.dialoguePool,'an',result.turn.residentId,narrative.dialogue,'local-llm');
      result.turn = { ...result.turn, ...narrative, generator: "local-llm", scriptId: undefined };
      result.world.lastAI = result.turn.createdAt;
      if (
        newRole &&
        result.state.lastExpansionOn !== context.date &&
        result.state.catalog.roles.length < 40 &&
        !result.state.catalog.roles.some(
          (r) =>
            r.label === newRole.label &&
            r.activity === newRole.activity &&
            r.place === newRole.place,
        )
      ) {
        const id = `${newRole.id.slice(0, 28)}-${context.date.replaceAll("-", "")}`;
        result.state.catalog.roles.push({ ...newRole, id });
        result.state.lastExpansionOn = context.date;
        result.state.residents = population(result.state, context.date);
        result.state.learning ??= {};
        for (const resident of result.state.residents)
          result.state.learning[resident.id] ??= initializeAgent(resident.id);
      }
      const an = result.world.people.find((p) => p.id === "an");
      if (an?.plan) an.plan.generator = "local-llm";
    }
  }
  result.world.livingTurn = result.turn;
  const previousPending=current.world.living?.learning?.an?.pending;
  const previousId = previousPending?.id ?? current.world.living?.lastTurnId;
  if (previousId && !current.world.living?.reportedEncounters?.includes(previousId)) {
    const row = await db
      .prepare("SELECT data FROM living_turns WHERE id=?")
      .bind(previousId)
      .first<{ data: string }>();
    const previous = row ? (JSON.parse(row.data) as LivingTurn) : null;
    const plan = current.world.people.find((p) => p.id === "an")?.plan;
    const peer=current.world.living?.residents.find(r=>r.id===previous?.residentId);
    const peerPending=peer?current.world.living?.learning?.[peer.id]?.pending:undefined;
    const fullDurationMs=plan&&peer?.plan?Math.max(plan.steps.reduce((sum,s)=>sum+s.duration,0),peer.plan.steps.reduce((sum,s)=>sum+s.duration,0))*1000:Infinity;
    const elapsed =
      (result.turn.simStartedAt ?? 0) - (previous?.simStartedAt ?? Infinity);
    if (
      previous && typeof previous.simStartedAt==="number" && (previous.dialogue?.length??0)>=4 &&
      previousPending?.id===previous.id && peerPending?.id===`${previous.id}-${previous.residentId}` &&
      pendingPlanMatches(previousPending,plan) && pendingPlanMatches(peerPending,peer?.plan) &&
      plan?.simStartedAt === previous.simStartedAt && peer?.plan?.simStartedAt===previous.simStartedAt &&
      fullDurationMs>0 && elapsed >= fullDurationMs
    ) {
      const earned=new Map(result.newExperiences.map(e=>[e.id,e.actorId]));
      const missing=[previousPending.id,peerPending.id].filter(id=>!earned.has(id));
      if(missing.length){
        const rows=await db.prepare("SELECT id,actor_id FROM agent_experiences WHERE id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(missing)).all<{id:string;actor_id:string}>();
        for(const row of rows.results)earned.set(row.id,row.actor_id);
      }
      const state=result.state,person=state.residents.find(r=>r.id===previous.residentId);
      const an = result.world.people.find((p) => p.id === "an");
      if(person&&an&&earned.get(previousPending.id)==="an"&&earned.get(peerPending.id)===person.id){
        state.reportedEncounters=[...(state.reportedEncounters??[]),previous.id].slice(-64);
        const legacyMemory=`${previous.date}: Dành thời gian ${previous.activity.toLowerCase()} tại ${previous.location}.`;
        if(!an.memories.includes(legacyMemory)){
          const memory=`${previous.date}: Kế hoạch mô phỏng hoàn tất: ${previous.activity.toLowerCase()} tại ${previous.location}.`;
          person.familiarity=Math.min(100,person.familiarity+1);
          if(!person.memories.includes(memory))person.memories=[...person.memories,memory].slice(-20);
          if(!an.memories.includes(memory))an.memories=[...an.memories,memory].slice(-60);
        }
      }
    }
  }
  const learned = result.state.learning?.an;
  if (learned) {
    result.state.energy = learned.energy;
    result.state.hunger = learned.hunger;
    result.state.skills.learning = learned.skill;
    for (const kind of ["read", "work"])
      result.state.skills[kind] = Math.min(
        100,
        Object.entries(learned.actions).reduce((sum, [id, action]) => {
          const scenario = scenarios.find((s) => s.id === id);
          return (
            sum + (scenario?.kind === kind ? action.trials * scenario.skill : 0)
          );
        }, 0),
      );
  }
  const anState = result.world.people.find((p) => p.id === "an");
  if (anState) {
    anState.energy = result.state.energy;
    anState.hunger = result.state.hunger;
    anState.skill = Math.min(
      100,
      Math.max(
        anState.skill,
        (result.state.skills.read ?? 0) + (result.state.skills.work ?? 0),
      ),
    );
  }
  const learningCommit = crypto.randomUUID();
  result.state.learningCommit = learningCommit;
  const policies = await preparePolicyWrite(db, result.world, current.revision + 1, learningCommit);
  try {
    const results = await db.batch([
      db
        .prepare(
          "INSERT INTO living_turns (id,created_at,data) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM worlds WHERE id=? AND revision=?)",
        )
        .bind(
          id,
          result.turn.createdAt,
          JSON.stringify(result.turn),
          "home",
          current.revision,
        ),
      db
        .prepare(
          "UPDATE worlds SET data=?,revision=revision+1 WHERE id=? AND revision=?",
        )
        .bind(policies.data, "home", current.revision),
      db
        .prepare(
          "INSERT OR IGNORE INTO tick_runs (id,started_at,finished_at,status,model,event_id) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM living_turns WHERE id=?)",
        )
        .bind(
          id,
          result.turn.createdAt,
          new Date().toISOString(),
          "completed",
          result.turn.generator === "local-llm"
            ? "Qwen2.5-1.5B-Instruct (local)"
            : "rules",
          id,
          id,
        ),
      ...archiveStatements(result.state, learningCommit, current.revision + 1, result.newExperiences),
      ...policies.statements,
    ]);
    if (!results[1].meta.changes) {
      const duplicate = await db
        .prepare("SELECT id FROM living_turns WHERE id=?")
        .bind(id)
        .first();
      return duplicate
        ? { status: 200, data: { ok: true, duplicate: true, id } }
        : { status: 409, data: { error: "Revision conflict" } };
    }
    return {
      status: 200,
      data: { ok: true, id, generator: result.turn.generator },
    };
  } catch (error) {
    const duplicate = await db
      .prepare("SELECT id FROM living_turns WHERE id=?")
      .bind(id)
      .first();
    if (duplicate)
      return { status: 200, data: { ok: true, duplicate: true, id } };
    throw error;
  }
}
export async function saveCatalog(
  catalog: LivingState["catalog"],
  revision: number,
) {
  const current = await readWorld();
  if (current.revision !== revision) return false;
  const living = current.world.living ?? initializeLiving(Date.now(), catalog);
  // Removed role IDs must not orphan residents or erase their memories.
  const used = new Set(living.residents.map((r) => r.roleId));
  if ([...used].some((id) => !catalog.roles.some((r) => r.id === id)))
    throw new Error("Không thể xóa vai trò đang có cư dân");
  living.catalog = catalog;
  living.residents = assignHomes(assignIdentities(living.residents, catalog.names));
  current.world.living = living;
  const res = await database()
    .prepare(
      "UPDATE worlds SET data=?,revision=revision+1 WHERE id=? AND revision=?",
    )
    .bind(JSON.stringify(current.world), "home", revision)
    .run();
  return Boolean(res.meta.changes);
}

/** Finalize completed experiences independently from the five-minute narrative slot. */
export async function learnCompleted() {
  const current = await readWorld({includePolicies:true});
  if (current.world.paused)
    return { status: 409, data: { error: "Xóm đang tạm nghỉ" } };
  const state = current.world.living;
  if (!state) return { status: 200, data: { ok: true, updated: 0 } };
  const previous = Object.values(state.learning ?? {}).reduce(
    (s, a) => s + a.samples,
    0,
  );
  const newExperiences: import("./learning").Experience[] = [];
  const learning = prepareLearning(current.world, state, Date.now(), (e) => newExperiences.push(e));
  const trained =
    Object.values(learning).reduce((s, a) => s + a.samples, 0) - previous;
  const animals = settleAnimalLearning(current.world, state, Date.now());
  if (!trained && !animals)
    return { status: 200, data: { ok: true, updated: 0 } };
  if (learning.an) {
    state.energy = learning.an.energy;
    state.hunger = learning.an.hunger;
  }
  for (const person of current.world.people) {
    const agent = learning[person.id];
    if (agent) {
      person.energy = agent.energy;
      person.hunger = agent.hunger;
      person.skill = Math.max(person.skill, agent.skill);
    }
  }
  const nonce = crypto.randomUUID();
  state.learningCommit = nonce;
  const policies = await preparePolicyWrite(database(), current.world, current.revision + 1, nonce);
  const batch = await database().batch([
    database()
      .prepare(
        "UPDATE worlds SET data=?,revision=revision+1 WHERE id=? AND revision=?",
      )
      .bind(policies.data, "home", current.revision),
    ...archiveStatements(state, nonce, current.revision + 1, newExperiences),
    ...policies.statements,
  ]);
  const result = batch[0];
  return result.meta.changes
    ? {
        status: 200,
        data: {
          ok: true,
          updated: trained + animals,
          humanExperiences: trained,
          animalExperiences: animals,
        },
      }
    : { status: 409, data: { error: "Revision conflict" } };
}

/** Advances ordinary residents independently of An's five-minute narrative slot. */
export async function advanceResidentSocial() {
 const current=await readWorld(),result=scheduleResidentSocial(current.world,Date.now());
 if(!result.changed)return {status:200,data:{ok:true,pairs:0}};
 const write=await database().prepare("UPDATE worlds SET data=?,revision=revision+1 WHERE id=? AND revision=?").bind(JSON.stringify(result.world),"home",current.revision).run();
 return write.meta.changes?{status:200,data:{ok:true,pairs:result.pairs}}:{status:409,data:{error:"Revision conflict"}};
}
