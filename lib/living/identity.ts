import { hashSeed } from "../clock.ts";
import type { Resident } from "./schema.ts";

export type Identity = {
  ageAtArrival: number;
  gender: "female" | "male" | "unspecified";
  previousNames?: string[];
};
const families = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
const middles = ["Gia", "Minh", "Ngọc", "Thanh", "Bảo", "Khánh", "Quỳnh", "Hải", "Anh", "Đức", "Hoài", "Nhật", "Tuệ", "Xuân", "Thiên", "Hồng"];
const key = (name: string) => name.normalize("NFC").toLocaleLowerCase("vi-VN");

/** Fictional profiles, independent of names and real people's demographic data.
 * Legacy ages retain the baseline previously used by lifeStory. All current
 * residents remain adults until child schedules and eligibility are implemented. */
export function defaultIdentity(id: string): Identity {
  return {
    ageAtArrival: 20 + hashSeed(id) % 25,
    gender: id === "an" || id === "binh" ? "male" : id === "chi" ? "female" : "unspecified",
  };
}
export function nextResidentName(index: number, names: readonly string[], taken: Iterable<string>) {
  const used = new Set([...taken].map(key)), given = names[index % names.length];
  if (!used.has(key(given))) return given;
  // Natural family/middle names supply >240 distinct candidates without suffixes.
  for (let n = 0; n < families.length * middles.length; n++) {
    const family = families[(index + n) % families.length], middle = middles[Math.floor(n / families.length)];
    const candidate = `${family} ${middle} ${given}`.slice(0, 30).trim();
    if (!used.has(key(candidate))) return candidate;
  }
  throw new Error("Không còn tên riêng trong danh mục; hãy mở rộng danh mục tên");
}
function generatedLegacyName(resident: Resident, names: readonly string[]) {
  const match = /^neighbor-(\d+)$/.exec(resident.id);
  if (!match) return false;
  const index = Number(match[1]) - 1;
  return resident.name === `${names[index % names.length]} ${Math.floor(index / names.length) + 1}`;
}
/** Only replace exact old generated names. IDs, plans, memories and custom names
 * are preserved, and the former display name stays available as an alias. */
export function assignIdentities(residents: Resident[], names: readonly string[]): Resident[] {
  const used = ["An", "Bình", "Chi", ...residents.filter(r => !generatedLegacyName(r, names)).map(r => r.name)];
  const replacements = new Map<string, string>();
  for (const resident of [...residents].sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }))) {
    if (!generatedLegacyName(resident, names)) continue;
    const index = Number(resident.id.slice(9)) - 1, name = nextResidentName(index, names, used);
    used.push(name); replacements.set(resident.id, name);
  }
  return residents.map(resident => {
    const name = replacements.get(resident.id);
    if (!name && resident.identity) return resident;
    const identity = resident.identity ?? defaultIdentity(resident.id);
    return { ...resident, name: name ?? resident.name, identity: name ? { ...identity, previousNames: [...new Set([...(identity.previousNames ?? []), resident.name])] } : identity };
  });
}
export function addressFor(speakerAge: number, listenerAge: number, gender: Identity["gender"]) {
  if (listenerAge >= 60 && listenerAge - speakerAge >= 15) return "bác";
  if (listenerAge - speakerAge >= 15) return gender === "female" ? "cô" : gender === "male" ? "chú" : "bạn";
  if (speakerAge - listenerAge >= 15) return "em";
  return "bạn";
}

export type ConversationProfile = {id:string;name:string;age?:number;gender?:Identity['gender']};
export function pronounsFor(speaker:ConversationProfile,listener:ConversationProfile) {
  if(!Number.isFinite(speaker.age)||!Number.isFinite(listener.age))return {self:'mình',other:'bạn'};
  const age=speaker.age!,peerAge=listener.age!,calledByPeer=addressFor(peerAge,age,speaker.gender??'unspecified');
  if(age-peerAge>=15&&['bác','cô','chú'].includes(calledByPeer))return {self:calledByPeer,other:'cháu'};
  const other=addressFor(age,peerAge,listener.gender??'unspecified');
  if(['bác','cô','chú'].includes(other))return {self:'cháu',other};
  return {self:'mình',other:'bạn'};
}
/** Adapt only our rule templates. Never rewrite stored history or LLM output. */
export function addressTemplate(text:string,speaker:ConversationProfile,listener:ConversationProfile) {
  const form=pronounsFor(speaker,listener);
  return text.replace(/\b(mình|bạn)\b/giu,word=>{
    const replacement=word.toLocaleLowerCase('vi-VN')==='mình'?form.self:form.other;
    return word[0]===word[0].toUpperCase()?replacement[0].toUpperCase()+replacement.slice(1):replacement;
  });
}
