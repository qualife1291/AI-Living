import { scenarioDefinitions } from "./definitions.ts";
import type { ActorFrame, CastSpec, PropFrame, ScenarioClip, ScenarioDefinition, ScenarioDialogue, ScenarioEvent, ScenarioFrame, ScenarioId, Vec3 } from "./types.ts";
export { scenarioDefinitions } from "./definitions.ts";
export type { ActorFrame, CastSpec, EnvironmentProp, PropFrame, ScenarioDefinition, ScenarioFrame, ScenarioId, Vec3 } from "./types.ts";

type PositionKey = [number, number, number]; // second, x, z; feet are on studio y=0
type Intent = [number, string, ScenarioClip?, string?];
type AngleKey = [number, number];
const clamp = (n: number, low = 0, high = 1) => Math.max(low, Math.min(high, n));
const ease = (n: number) => { const t = clamp(n); return t * t * t * (t * (t * 6 - 15) + 10); };
const progress = (t: number, from: number, until: number) => ease((t - from) / Math.max(.0001, until - from));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const blend = (a: Vec3, b: Vec3, t: number): Vec3 => a.map((n, i) => mix(n, b[i], t)) as Vec3;
const distance = (a: Vec3, b: Vec3) => Math.hypot(...a.map((n, i) => n - b[i]));

/** Quintic travel is continuous in position, velocity and acceleration at stops. */
function travel(keys: PositionKey[], t: number) {
  let traveled = 0;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i], length = Math.hypot(b[1] - a[1], b[2] - a[2]);
    if (t >= b[0]) { traveled += length; continue; }
    if (t < a[0]) break;
    const u = clamp((t - a[0]) / (b[0] - a[0])), s = ease(u), derivative = 30 * u * u * (1 - u) * (1 - u) / (b[0] - a[0]);
    return { position: [mix(a[1], b[1], s), 0, mix(a[2], b[2], s)] as Vec3, speed: length * derivative / 10, traveled: (traveled + length * s) / 10 };
  }
  const point = t < keys[0][0] ? keys[0] : keys[keys.length - 1];
  return { position: [point[1], 0, point[2]] as Vec3, speed: 0, traveled: traveled / 10 };
}
function facing(keys: AngleKey[], t: number) {
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    if (t <= b[0]) return a[1] + Math.atan2(Math.sin(b[1] - a[1]), Math.cos(b[1] - a[1])) * progress(t, a[0], b[0]);
  }
  return keys[keys.length - 1][1];
}
function actor(spec: CastSpec, keys: PositionKey[], intents: Intent[], angles: AngleKey[], t: number): ActorFrame {
  let selected = 0; for (let i = 0; i < intents.length; i++) if (t >= intents[i][0]) selected = i;
  const current = intents[selected], previous = intents[Math.max(0, selected - 1)], path = travel(keys, t);
  const clip: ScenarioClip = path.speed > .005 ? (current[1] === "run" ? "sprint" : "walk") : current[2] ?? "idle";
  const expressionFor = (intent: Intent) => /thank|receive|comfort|welcome/.test(intent[1]) ? "warm" : /inspect|look|observe/.test(intent[1]) ? "attentive" : /decline/.test(intent[1]) ? "gentle" : /wait|rest/.test(intent[1]) ? "calm" : "neutral";
  return {
    ...spec, wardrobe: { ...spec.wardrobe }, position: path.position, yaw: facing(angles, t), action: current[1], clip, gesture: current[3] ?? current[1], actionStartedAt: current[0],
    animationTime: path.speed > .005 ? path.traveled / (clip === "sprint" ? 2.8 : 1.1) : Math.max(0, t - current[0]),
    animationPhase: path.traveled / (clip === "sprint" ? 2.2 : 1.3), speedMps: path.speed, travelMeters: path.traveled,
    expression: { from: expressionFor(previous), to: expressionFor(current), blend: progress(t, current[0], current[0] + .45) },
  };
}
const grip = (a: ActorFrame, height = 10, reach = 3): Vec3 => [a.position[0] + Math.sin(a.yaw) * reach, a.position[1] + height * a.heightMeters / 1.68, a.position[2] + Math.cos(a.yaw) * reach];
const item = (id: string, kind: string, position: Vec3, size: Vec3, color: string, ownerId: string | null, holderId: string | null, stage: string, modelHint?: string): PropFrame => ({ id, kind, position, size, rotation: [0, 0, 0], color, ownerId, holderId, attachedTo: holderId, attachment: holderId ? "both-hands" : undefined, stage, visible: true, modelHint });
const event = (at: number, type: string, detail: string, actorId?: string, propId?: string): ScenarioEvent => ({ at, type, detail, actorId, propId });
const say = (at: number, until: number, speaker: string, text: string): ScenarioDialogue => ({ at, until, speaker, text });

/** A 75cm drop followed by one low-energy bounce, in 10 world units per metre. */
export function walletDropHeight(elapsed: number) {
  const gravity = 98.1, restitution = .15, floor = .3, drop = 7.5;
  const impact = Math.sqrt(2 * drop / gravity), reboundSpeed = gravity * impact * restitution;
  if (elapsed <= 0) return floor + drop;
  if (elapsed <= impact) return floor + drop - gravity * elapsed * elapsed / 2;
  const bounce = elapsed - impact;
  if (bounce <= 2 * reboundSpeed / gravity) return floor + reboundSpeed * bounce - gravity * bounce * bounce / 2;
  return floor;
}

function wallet(d: ScenarioDefinition, t: number) {
  const minh = actor(d.cast[0], [[0, -25, 0], [12, -10, 0], [25, 40, 0], [120, 40, 0]], [[0, "phone", "holding-right"], [12, "walk"], [25, "phone", "holding-right"], [52, "look", "idle"], [75, "inspect", "interact-right"], [82, "receive", "holding-both"], [95, "thank", "emote-yes"], [101, "offer-reward", "holding-right"], [108, "rest"]], [[0, Math.PI / 2], [52, Math.PI / 2], [55, -Math.PI / 2], [120, -Math.PI / 2]], t);
  const tuan = actor(d.cast[1], [[0, -45, 35], [25, -45, 35], [31, -10, 5], [37, -10, 0], [50, -10, 0], [53.5, 32, 0], [108, 32, 0], [120, 0, -30]], [[0, "wait"], [25, "walk"], [31, "look"], [31.35, "inspect", "interact-right"], [37, "pick-up", "pick-up"], [45, "inspect", "holding-both"], [50, "run"], [54, "call", "holding-right"], [75, "offer", "holding-both"], [95, "thank", "emote-yes"], [103, "decline", "emote-no"], [108, "walk"]], [[0, 2.28], [31, 2.28], [35, Math.PI], [49, Math.PI], [50, Math.PI / 2], [106, Math.PI / 2], [108, -2.32], [120, -2.32]], t);
  const actors = [minh, tuan], handoff: Vec3 = [36, 6.5, 0], origin: Vec3 = [-10, .3, -2.5];
  const pocket = (a: ActorFrame): Vec3 => [a.position[0] + Math.cos(a.yaw) * 2.5, 7.8, a.position[2] - Math.sin(a.yaw) * 2.5];
  let position: Vec3, holder: string | null, stage: string;
  if (t < 12) { position = pocket(minh); holder = "minh"; stage = "pocket"; }
  else if (t < 42) { position = [origin[0], walletDropHeight(t - 12), origin[2]]; holder = null; stage = t < 12.51 ? "falling" : "ground"; }
  else if (t < 80) { position = blend(origin, grip(tuan), progress(t, 42, 45)); holder = "tuan"; stage = t < 45 ? "lifting" : "held"; }
  else if (t < 94) { position = blend(grip(tuan), handoff, progress(t, 80, 83)); holder = "tuan"; stage = "offered"; }
  else { position = blend(handoff, pocket(minh), progress(t, 98, 102)); holder = "minh"; stage = "returned"; }
  if(t>=37&&t<42)tuan.handTargets={right:[...origin],left:[...origin]};
  if (holder === "tuan") tuan.handTargets = { right: [...position], left: [...position] };
  if (t >= 82 && t <= 98) minh.handTargets = { right: [...position], left: [...position] };
  const walletProp = item("wallet", "wallet", position, [2.2, .6, 1.6], "#5C3A21", "minh", holder, stage);
  walletProp.attachment = t < 12 || t >= 102 ? "pocket" : t >= 50 && t < 75 ? "right-hand" : "both-hands";
  const phone = item("phone", "phone", [minh.position[0] - 2, 14, minh.position[2] + 1], [1.1, 2.2, .3], "#35454a", "minh", "minh", t < 52 ? "phone-call" : "pocket"); phone.visible = t < 52;
  phone.attachment = "right-hand";
  const reward = item("reward-note", "note", grip(minh), [2.3, .05, 1.2], "#8fbaab", "minh", "minh", "offered"); reward.visible = t >= 101 && t < 108; reward.attachment = "right-hand";
  return {
    actors, props: [walletProp, phone, reward],
    events: [event(12, "wallet-dropped", "Ví rơi khỏi túi, chủ sở hữu không thay đổi.", "minh", "wallet"), event(31, "item-noticed", "Tuấn dừng lại quan sát.", "tuan", "wallet"), event(31.35, "inspection-started", "Bắt đầu quan sát sau350ms quyết định.", "tuan", "wallet"), event(42, "item-picked", "Tuấn nhặt ví rồi kiểm tra dấu hiệu chủ sở hữu.", "tuan", "wallet"), event(46, "owner-identified", "Nhận ra thông tin của người đánh rơi.", "tuan", "wallet"), event(50, "owner-called", "Gọi người lớn, giữ ví ở nơi nhìn thấy.", "tuan", "wallet"), event(82, "return-offered", "Hai tay đưa ví về phía chủ sở hữu.", "tuan", "wallet"), event(94, "wallet-returned", "Minh nhận lại đúng một chiếc ví.", "minh", "wallet"), event(101, "reward-offered", "Minh mời nhận lời cảm ơn, chưa có chuyển tiền.", "minh", "reward-note"), event(103, "reward-declined", "Tuấn nhẹ nhàng từ chối tiền cảm ơn.", "tuan")],
    dialogue: [say(54, 59, "tuan", "Bác áo xanh ơi, bác đánh rơi ví rồi ạ!"), say(77, 82, "minh", "Bác kiểm tra túi mới biết bị rơi. Cháu cho bác xem nhé?"), say(85, 90, "tuan", "Dạ, cháu thấy thông tin trong ví nên gọi bác lại."), say(96, 101, "minh", "Cảm ơn cháu nhiều. Bác rất quý sự trung thực của cháu."), say(103, 108, "tuan", "Dạ không cần đâu bác, của bác rơi thì cháu gửi lại thôi ạ!")],
    state: { walletOwner: "minh", walletHolder: holder, walletStage: stage, walletCount: 1, ownerIdentified: t >= 46, returned: t >= 94, rewardAccepted: false, restitution: .15, decisionLatencyMs: 350 },
  };
}

function sanitation(d: ScenarioDefinition, t: number) {
  const hanh = actor(d.cast[0], [[0, 0, 0], [120, 0, 0]], [[0, "sweep", "interact-right"], [20, "rest"], [24, "sweep", "interact-right"], [65, "look"], [75, "receive", "holding-both"], [85, "thank", "emote-yes"], [92, "drink", "holding-right"], [103, "sit", "sit"]], [[0, 0], [64, 0], [68, Math.PI/2], [120, Math.PI/2]], t);
  const hoang = actor(d.cast[1], [[0, -30, 30], [48, -30, 30], [58, -18, 12], [65, -12, 2], [100, -12, 2], [112, -18, 18], [120, -18, 18]], [[0, "observe"], [48, "walk"], [60, "pick-up", "pick-up"], [65, "sweep", "interact-right"], [96, "rest"], [100, "walk"], [113, "thank", "emote-yes"]], [[0, .6], [48, .6], [58, 2.2], [65, 2.2], [99, 2.2], [102, -.4], [120, -.4]], t);
  const lan = actor(d.cast[2], [[0, 30, 35], [36, 30, 35], [45, 30, 18], [50, 30, 18], [58, 20, 12], [65, 8, 0], [100, 8, 0], [112, 15, 18], [120, 15, 18]], [[0, "observe"], [36, "walk"], [45, "receive", "holding-right"], [50, "walk"], [65, "offer", "holding-both"], [83, "thank", "emote-yes"], [100, "walk"], [113, "rest"]], [[0, Math.PI], [50, Math.PI], [65, -Math.PI/2], [99, -Math.PI/2], [102, .4], [120, .4]], t);
  const handoff: Vec3 = [4, 6.5, 0], counter: Vec3 = [34.5, 6.1, 19];
  let cupPosition: Vec3, cupHolder: string | null, cupOwner: string, cupStage: string;
  if (t < 47) { cupPosition = counter; cupHolder = null; cupOwner = "vendor"; cupStage = "counter"; }
  else if (t < 78) { cupPosition = blend(counter, grip(lan), progress(t, 47, 49)); cupHolder = "lan"; cupOwner = "lan"; cupStage = t < 49 ? "picked-up" : "held"; }
  else if (t < 82) { cupPosition = blend(grip(lan), handoff, progress(t, 78, 80)); cupHolder = "lan"; cupOwner = "lan"; cupStage = "offered"; }
  else { cupPosition = blend(handoff, grip(hanh), progress(t, 82, 85)); cupHolder = "hanh"; cupOwner = "hanh"; cupStage = t < 92 ? "received" : "drinking"; }
  if(t>=45&&t<47)lan.handTargets={right:[...counter],left:[...counter]};
  if (cupHolder === "lan") lan.handTargets = { right: [...cupPosition], left: [...cupPosition] };
  if (t >= 78) hanh.handTargets = { right: [...cupPosition], left: [...cupPosition] };
  const broomGround: Vec3 = [-12, 8, 3], stowed: Vec3 = [-18, 8, 2], broomPosition = t < 63 ? broomGround : t < 98 ? blend(broomGround, grip(hoang, 9), progress(t, 63, 65)) : t < 100 ? blend(grip(hoang, 9), stowed, progress(t, 98, 100)) : stowed;
  const mainBroom = item("hanh-broom", "broom", blend(grip(hanh, 8.4), [6, 8, 0], progress(t, 65, 69)), [.6, 16, .6], "#b39766", "hanh", t < 69 ? "hanh" : null, t < 65 ? "sweeping" : "stowed"); mainBroom.attachment = "right-hand";
  const sweepEnvelope=(1-progress(t,18,20))*progress(t,0,1)+(progress(t,24,26)*(1-progress(t,63,65)));
  mainBroom.position[0]+=Math.sin(t*2.4)*1.5*sweepEnvelope;mainBroom.position[2]+=Math.cos(t*2.4)*.6*sweepEnvelope;mainBroom.rotation[2]=Math.sin(t*2.4)*.12*sweepEnvelope;
  if(t>=60&&t<63)hoang.handTargets={right:[...broomGround],left:[...broomGround]};
  const spareBroom = item("spare-broom", "broom", broomPosition, [.6, 16, .6], "#b39766", "hanh", t >= 63 && t < 100 ? "hoang" : null, t >= 100 ? "stowed" : t >= 63 ? "helping" : "available");
  const leaves = Array.from({ length: 8 }, (_, i) => item(`leaf-${i}`, "leaf", blend([-18 + i % 4 * 4, .06, 8 + Math.floor(i / 4) * 4], [-12 + i % 3 * .8, .06, 10 + Math.floor(i / 3) * .6], progress(t, 65 + i * .7, 75 + i * .7)), [1.2, .08, .6], i % 2 ? "#c9ad68" : "#ac8f59", null, null, t < 80 ? "being-gathered" : "gathered"));
  return {
    actors: [hanh, hoang, lan], props: [item("cup", "cup", cupPosition, [1.4, 2.1, 1.4], "#c3ddb8", cupOwner, cupHolder, cupStage), mainBroom, spareBroom, ...leaves],
    events: [event(31, "worker-noticed", "Hai bạn quan sát và chủ động giúp việc nhỏ.", "hoang"), event(47, "water-purchased", "Một ly nước được lấy từ quầy.", "lan", "cup"), event(63, "spare-broom-picked", "Hoàng dùng chổi phụ, không lấy chổi đang cầm.", "hoang", "spare-broom"), event(78, "water-offered", "Lan mời nước, chờ cô nhận.", "lan", "cup"), event(82, "water-received", "Cô Hạnh nhận ly sau lời mời.", "hanh", "cup"), event(92, "water-sipped", "Cô nghỉ tay rồi uống nước.", "hanh", "cup"), event(100, "spare-broom-stowed", "Chổi phụ được cất trước khi Hoàng rời vị trí.", "hoang", "spare-broom"), event(103, "rest-in-shade", "Mọi người nghỉ dưới bóng cây.", "hanh")],
    dialogue: [say(31, 36, "hoang", "Cô đang làm ngoài nắng. Mình giúp gom phần lá bên này nhé?"), say(39, 44, "lan", "Ừ, mình lấy thêm nước rồi cùng ra chào cô."), say(67, 73, "lan", "Cô ơi, tụi con mời cô ly nước. Cô nghỉ tay một lát nhé!"), say(85, 91, "hanh", "Cảm ơn hai con. Giúp cô giữ lối đi sạch thế này cô quý lắm."), say(106, 112, "hoang", "Tụi con cất chổi đúng chỗ rồi. Cô cứ nghỉ cho đỡ mệt ạ.")],
    state: { cupCount: 1, cupHolder, cupOwner, cupStage, leavesTotal: 8, leavesGathered: t >= 80 ? 8 : 0, helping: t >= 63, workerFatigue: mix(Math.min(1, t / 65), .55, progress(t, 92, 104)), sweepIntensity: mix(.75 - Math.min(t, 65) / 65 * .2, .2, progress(t, 65, 67)) },
  };
}

function kitten(d: ScenarioDefinition, t: number) {
  const thanh = actor(d.cast[0], [[0, -35, 25], [30, -35, 25], [48, -3.2, 2], [105, -3.2, 2], [120, -30, -12]], [[0, "observe"], [30, "approach"], [48, "call-rescue", "idle"], [55, "comfort", "interact-right"], [72, "prepare-cloth", "pick-up"], [88, "carry", "holding-both"], [105, "walk"]], [[0, 2.2], [94, 2.2], [105, -2.16], [120, -2.16]], t);
  const mai = actor(d.cast[1], [[0, -22, 32], [30, -22, 32], [48, 9, 9], [105, 9, 9], [120, -15, -7]], [[0, "listen"], [25, "call-adult", "interact-right"], [30, "approach"], [48, "observe"], [60, "prepare-cloth", "holding-both"], [74, "comfort", "interact-right"], [96, "thank", "emote-yes"], [105, "walk"]], [[0, 2.3], [48, 2.3], [52, -2.36], [95, -2.36], [105, -2.16], [120, -2.16]], t);
  const miu = actor(d.cast[2], [[0, 0, 0], [120, 0, 0]], [[0, "distress"], [55, "comfort"], [78, "warm"], [88, "carried"]], [[0, .4], [120, .4]], t);
  const floor: Vec3 = [0, .15, 0], carried = grip(thanh, 7), kittenPosition = t < 88 ? floor : blend(floor, carried, progress(t, 88, 92));
  miu.position = [...kittenPosition]; miu.carrierId = t >= 88 ? "thanh" : null; miu.clip = "idle"; if (t >= 88) miu.yaw = .4 + Math.atan2(Math.sin(thanh.yaw - .4), Math.cos(thanh.yaw - .4)) * progress(t, 88, 92);
  if(t>=55){const support=(sign:number):Vec3=>[kittenPosition[0]+sign*.35*Math.cos(miu.yaw)-.15*Math.sin(miu.yaw),kittenPosition[1]+.32,kittenPosition[2]-sign*.35*Math.sin(miu.yaw)-.15*Math.cos(miu.yaw)];thanh.handTargets={right:support(-1),left:support(1)};}
  const wrap=progress(t,78,88),unfold=progress(t,70,75),clothHeight=mix(.2,1.05,wrap);
  const clothPosition = t < 72 ? grip(mai, 8) : blend(grip(mai, 8), [0, .1, 0], progress(t, 72, 75));
  if(t>=78){clothPosition[0]=kittenPosition[0]*wrap;clothPosition[2]=kittenPosition[2]*wrap;clothPosition[1]=kittenPosition[1]*wrap+clothHeight/2;}
  const cloth = item("warm-cloth", "cloth", clothPosition, [mix(mix(4,5,unfold),1.65,wrap),clothHeight,mix(mix(3,4,unfold),2.5,wrap)], "#d5a6b3", "mai", t < 72 ? "mai" : t >= 88 ? "thanh" : null, t < 72 ? "folded" : t < 78 ? "laid-out" : "wrapped"); cloth.visible = t >= 60;cloth.rotation[1]=miu.yaw*wrap;
  if (t >= 78) cloth.attachment = "wrap";
  return {
    actors: [thanh, mai, miu], props: [cloth],
    events: [event(25, "child-calls-adult", "Mai gọi người lớn thay vì lao tới.", "mai"), event(48, "rescue-contacted", "Bác Thành gọi người hỗ trợ động vật.", "thanh"), event(55, "kitten-calmed", "Quan sát, nói nhỏ và giảm kích thích.", "thanh"), event(68, "rescue-guidance-confirmed", "Mô phỏng nhận hướng dẫn hỗ trợ; không trình diễn tự phẫu thuật.", "thanh"), event(75, "cloth-ready", "Chuẩn bị khăn khô trước khi di chuyển mèo.", "mai", "warm-cloth"), event(78, "kitten-warmed", "Giữ ấm theo hướng dẫn hỗ trợ.", "thanh"), event(88, "kitten-supported", "Đỡ thân mèo bằng hai tay.", "thanh"), event(105, "leave-for-support", "Đưa tới nơi có người hỗ trợ.", "thanh")],
    dialogue: [say(25, 31, "mai", "Ông ơi, con nghe tiếng mèo. Ông xem giúp nó với ạ!"), say(36, 42, "thanh", "Mình đi nhẹ thôi con. Đứng xa một chút để nó đỡ hoảng."), say(49, 55, "thanh", "Bác đang gọi người hỗ trợ. Mình chuẩn bị khăn khô và chờ hướng dẫn nhé."), say(77, 83, "mai", "Khăn khô đây ạ. Con giữ yên để ông đỡ bé cho chắc."), say(100, 106, "thanh", "Mình mang bé tới chỗ người hỗ trợ, rồi hỏi cách chăm phù hợp nhé.")],
    state: { careMode: "warm-and-call-rescue", childRushed: false, rescueContacted: t >= 48, rescueGuidance: t >= 68, clothReady: t >= 75, warmed: t >= 78, kittenHolder: t >= 88 ? "thanh" : null, medicalProcedureSimulated: false, milkGiven: false },
  };
}

const queueIds = ["teacher", "guest-2", "guest-3", "guest-4", "office"];
function bakery(d: ScenarioDefinition, t: number) {
  const queueShift = progress(t, 66, 72) * -14 * (1 - progress(t, 107, 113));
  const queueAdvance = progress(t, 115, 120) * -5;
  const actors = d.cast.map(spec => {
    if (spec.id === "ba") return actor(spec, [[0, 55, 60], [25, 55, 60], [40, 30, 50], [72, 30, 50], [77, 12, 50], [91, 12, 5], [95, 0, 5], [107, 0, 5], [113, 22, 5], [120, 28, -10]], [[0, "wait"], [25, "approach"], [40, "wait"], [64, "accept-courtesy", "emote-yes"], [72, "walk"], [95, "receive", "holding-both"], [102, "thank", "emote-yes"], [107, "walk"]], [[0, Math.PI], [72, Math.PI], [76, -Math.PI / 2], [78, Math.PI], [90, Math.PI], [93, -Math.PI / 2], [95, Math.PI], [105, Math.PI], [107, Math.PI / 2], [112, Math.PI / 2], [114, 2.83], [120, 2.83]], t);
    if (spec.id === "seller") return actor(spec, [[0, 0, -5], [120, 0, -5]], [[0, "serve", "interact-right"], [92, "offer", "holding-right"], [100, "welcome", "emote-yes"], [117, "serve", "interact-right"]], [[0, 0], [120, 0]], t);
    const index = queueIds.indexOf(spec.id), z = 14 + index * 10;
    const keys: PositionKey[] = spec.id === "office" ? [[0, 40, 65], [8, 12, 25], [12, 12, 25], [15, 25, 25], [20, 25, 54], [25, 0, 54], [120, 0, 54]] : [[0, 0, z], [120, 0, z]];
    const intents: Intent[] = spec.id === "office" ? [[0, "approach"], [8, "reconsider", "emote-no"], [12, "join-tail"], [25, "wait"], [60, "offer-courtesy", "interact-right"], [66, "wait"], [103, "rest"]] : [[0, "wait"], [64, "consent", "emote-yes"], [72, "wait"], [115, "advance"]];
    const queueAngles: AngleKey[] = [[0, Math.PI], [65.5, Math.PI], [66, -Math.PI / 2], [72, -Math.PI / 2], [72.5, Math.PI], [106.5, Math.PI], [107, Math.PI / 2], [113, Math.PI / 2], [113.5, Math.PI], [120, Math.PI]];
    const a = actor(spec, keys, intents, queueAngles, t);
    a.position[0] += queueShift; a.position[2] += queueAdvance;
    // Side steps and the final queue advance remain visible to renderer gait.
    const dt = .001, oldShift = progress(t - dt, 66, 72) * -14 * (1 - progress(t - dt, 107, 113)), oldAdvance = progress(t - dt, 115, 120) * -5;
    const lateralSpeed = (queueShift - oldShift) / dt, advanceSpeed = (queueAdvance - oldAdvance) / dt;
    a.speedMps = Math.hypot(a.speedMps * 10, lateralSpeed, advanceSpeed) / 10;
    const extraTravel = (14 * progress(t, 66, 72) + 14 * progress(t, 107, 113) + 5 * progress(t, 115, 120)) / 10;
    a.travelMeters += extraTravel;
    a.animationPhase = a.travelMeters / 1.3;
    if (Math.abs(lateralSpeed) + Math.abs(advanceSpeed) > .005) { a.clip = "walk"; a.animationTime = a.travelMeters / 1.1; }
    return a;
  });
  const ba = actors.find(a => a.id === "ba")!, seller = actors.find(a => a.id === "seller")!;
  const stock: Vec3 = [0, 6.55, 0], offered: Vec3 = [0, 6.55, 0], sellerGrip: Vec3 = [0,6.8,-.2];
  const breadPosition = t < 92 ? stock : t < 94 ? blend(stock, sellerGrip, progress(t, 92, 94)) : t < 96 ? blend(sellerGrip, stock, progress(t, 94, 96)) : t < 99 ? blend(stock, offered, progress(t, 96, 98)) : blend(offered, grip(ba, 6.5, 3), progress(t, 99, 102));
  const breadHolder = t >= 92 && t < 96 ? "seller" : t >= 99 ? "ba" : null;
  const bread = item("loaf-0", "bread", breadPosition, [3.3, .9, 1.2], "#d5a666", t >= 99 ? "ba" : "seller", breadHolder, t < 92 ? "stock" : t < 96 ? "offered" : t < 99 ? "counter" : "received", "bread");
  bread.attachment = "right-hand";bread.rotation[1]=Math.PI/2;
  if (t >= 90 && t < 99) seller.handTargets = { right: [breadPosition[0],breadPosition[1],breadPosition[2]-1.2] }; if (t >= 97) ba.handTargets = { right: [breadPosition[0],breadPosition[1],breadPosition[2]+1.2] };
  const remainingBread = Array.from({ length: 4 }, (_, i) => item(`loaf-${i + 1}`, "bread", [-8 + i * 5, 6.55, -1], [3.3, .9, 1.2], "#d5a666", "seller", null, "stock", "bread"));
  const crutch = item("ba-crutch", "crutch", [ba.position[0] + Math.cos(ba.yaw) * 3.8, 7, ba.position[2] - Math.sin(ba.yaw) * 3.8], [.7, 14, .7], "#b89563", "ba", "ba", "support");
  crutch.attachment = "left-hand";
  return {
    actors, props: [bread, ...remainingBread, crutch],
    events: [event(8, "cutting-reconsidered", "Anh Nam dừng ý định chen ngang, chưa được thêm vào giữa hàng.", "office"), event(25, "joined-tail", "Vào cuối hàng sau bốn khách đang chờ.", "office"), event(60, "courtesy-offered", "Mời chú Ba lên trước.", "office"), event(65, "priority-consented", "Cả hàng đồng ý nhường lượt.", "teacher"), event(66, "corridor-opening", "Mở lối bên phải, không đẩy người khác.", "teacher"), event(95, "priority-at-counter", "Chú Ba tới quầy sau khi lối đã mở.", "ba"), event(99, "bread-received", "Trao một ổ bánh, giảm kho đúng một.", "ba", "loaf-0"), event(115, "fifo-resumes", "Hàng gốc tiếp tục theo thứ tự ban đầu.", "teacher")],
    dialogue: [say(8, 13, "office", "Mình đang vội, nhưng mọi người đã chờ trước. Mình xuống cuối hàng vậy."), say(60, 65, "office", "Chú lên trước con nhé. Chú dùng nạng đứng lâu sẽ mỏi ạ."), say(65, 70, "teacher", "Mọi người cùng nhường một lượt cho chú Ba nhé. Mời chú qua lối bên này ạ."), say(96, 101, "seller", "Bánh của chú đây ạ, chú cầm cho chắc tay nhé."), say(102, 107, "ba", "Cảm ơn các cô các cháu đã nhường chỗ cho tôi."), say(114, 120, "office", "Mình chờ tới lượt thôi. Một buổi sáng nhẹ lòng hơn rồi.")],
    state: { queueOrder: t >= 25 ? [...queueIds] : queueIds.slice(0, 4), courtesyConsented: t >= 65, priorityId: t >= 65 && t < 107 ? "ba" : null, servedIds: t >= 99 ? ["ba"] : [], currentServiceId: t >= 117 ? "teacher" : t >= 95 && t < 107 ? "ba" : null, breadTotal: 5, breadStock: t >= 99 ? 4 : 5, officeCutQueue: false, officeJoinedAtTail: t >= 25 },
  };
}

function camera(d: ScenarioDefinition, t: number, actors: ActorFrame[], props: PropFrame[]) {
  let index = 0; for (let i = 0; i < d.shots.length; i++) if (t >= d.shots[i].at) index = i;
  const resolve = (shot: ScenarioDefinition["shots"][number]) => {
    const targetActor = actors.find(a => a.id === shot.targetId), targetProp = props.find(p => p.id === shot.targetId);
    const base: Vec3 = shot.targetId === "handoff" ? [36, 10, 0] : targetActor ? [...targetActor.position] : targetProp ? [...targetProp.position] : [0, 0, 0];
    base[1] += shot.focusHeight;
    const offset: Vec3 = [...shot.offset];
    if (shot.movement === "orbit") { const angle = progress(t, shot.at, shot.at + 25) * Math.PI, x = offset[0], z = offset[2]; offset[0] = Math.cos(angle) * x + Math.sin(angle) * z; offset[2] = -Math.sin(angle) * x + Math.cos(angle) * z; }
    if (shot.movement === "crane") offset[1] += progress(t, shot.at, 120) * 15;
    return { target: base, position: base.map((n, i) => n + offset[i]) as Vec3 };
  };
  const current = d.shots[index], previous = d.shots[Math.max(0, index - 1)], a = resolve(previous), b = resolve(current), amount = index === 0 ? 1 : progress(t, current.at, current.at + 2.4);
  const target = blend(a.target, b.target, amount), ax = a.position[0] - a.target[0], az = a.position[2] - a.target[2], bx = b.position[0] - b.target[0], bz = b.position[2] - b.target[2];
  const firstAngle = Math.atan2(ax, az), deltaAngle = Math.atan2(Math.sin(Math.atan2(bx, bz) - firstAngle), Math.cos(Math.atan2(bx, bz) - firstAngle));
  const angle = firstAngle + deltaAngle * amount, radius = mix(Math.hypot(ax, az), Math.hypot(bx, bz), amount);
  const position: Vec3 = [target[0] + Math.sin(angle) * radius, target[1] + mix(a.position[1] - a.target[1], b.position[1] - b.target[1], amount), target[2] + Math.cos(angle) * radius];
  const lensMm = mix(previous.lensMm, current.lensMm, amount), fov = 2 * Math.atan(24 / (2 * lensMm)) * 180 / Math.PI;
  return { index, data: { position, target, lensMm, fov, aperture: mix(previous.aperture, current.aperture, amount), movement: current.movement, focusDistance: distance(position, target) } };
}

/** Seekable, deterministic studio projection. It owns no timer, random state or DB. */
export function scenarioFrame(id: ScenarioId | string, elapsedSeconds: number): ScenarioFrame {
  const definition = scenarioDefinitions.find(s => s.id === id); if (!definition) throw new RangeError(`Unknown scenario: ${id}`);
  const t = elapsedSeconds === Infinity ? 120 : Number.isFinite(elapsedSeconds) ? clamp(elapsedSeconds, 0, 120) : 0;
  const result = definition.id === "wallet-return" ? wallet(definition, t) : definition.id === "sanitation-gratitude" ? sanitation(definition, t) : definition.id === "kitten-care" ? kitten(definition, t) : bakery(definition, t);
  const shot = camera(definition, t, result.actors, result.props), beat = definition.shots[shot.index];
  return {
    id: definition.id, time: t, duration: 120, complete: t >= 120,
    beat: { index: shot.index, label: beat.label, progress: clamp((t - beat.at) / ((definition.shots[shot.index + 1]?.at ?? 120) - beat.at)) },
    actors: result.actors, props: result.props,
    environment: definition.environment.map(p => ({ ...p, position: [...p.position], size: [...p.size] })),
    camera: shot.data, theme: { ...definition.theme, skyHex: [...definition.theme.skyHex] },
    dialogue: result.dialogue.filter(line => t >= line.at && t < line.until).map(line => ({ ...line })),
    events: result.events.filter(e => t >= e.at).map(e => ({ ...e })), state: result.state,
  };
}
