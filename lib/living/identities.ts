import {hashSeed} from '../clock.ts';
import type {Resident} from './schema';
export type Identity={fullName:string;gender:'female'|'male';baselineAge:number;baselineSimMs:number};
export type LifeStage='mầm non'|'tiểu học'|'thiếu niên'|'thiếu nữ'|'thanh niên'|'trưởng thành'|'cao tuổi';
const family=['Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Vũ','Đặng','Bùi','Đỗ','Hồ','Ngô','Dương','Lý','Đinh','Võ'];
const female=['Mai','Linh','Hương','Thảo','Ngọc','Lan','Quỳnh','Vy','Hạnh','Trang','Yến','Nhi','Hà','Anh','Châu'];
const male=['Minh','Hải','Phúc','Tuấn','Khôi','Duy','Sơn','Huy','Long','Nam','Bảo','Khang','Quân','Lâm','Tùng'];
const special:Record<string,{age:number;gender:Identity['gender']}>= {
 'family-preschool':{age:4,gender:'female'},'family-primary':{age:8,gender:'male'},'family-primary-girl':{age:9,gender:'female'},
 'family-middle':{age:12,gender:'male'},'family-teen':{age:16,gender:'female'},'family-grandmother':{age:65,gender:'female'},'family-grandfather':{age:68,gender:'male'},
};
export function generatedName(id:string,gender:Identity['gender']) {
 const ordinal=/^neighbor-(\d+)$/.exec(id),n=ordinal?Math.max(0,Number(ordinal[1])-1):hashSeed(id)%3600;
 const given=gender==='female'?female:male,middle=gender==='female'?['Thùy','Ngọc','Thanh','Khánh']:['Minh','Đức','Quang','Gia'];
 return `${family[Math.floor(n/15)%family.length]} ${middle[Math.floor(n/(15*family.length))%middle.length]} ${given[n%given.length]}`;
}
export function residentIdentity(resident:Pick<Resident,'id'|'name'|'roleId'|'identity'>,simMs=0):Identity {
 if(resident.identity)return resident.identity;
 const cohort=special[resident.roleId],gender=cohort?.gender??(hashSeed(resident.id)%2?'female':'male');
 const raw=resident.name.trim(),fullName=raw&&!/\d/.test(raw)?raw:generatedName(resident.id,gender);
 return {fullName,gender,baselineAge:cohort?.age??20+hashSeed(resident.id)%25,baselineSimMs:simMs};
}
export function assignIdentities(residents:Resident[],simMs=0):Resident[] {
 const used=new Set<string>();
 return [...residents].sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true})).map(r=>{
  let identity=residentIdentity(r,simMs);
  if(used.has(identity.fullName))identity={...identity,fullName:generatedName(r.id,identity.gender)};
  // Preserve unique owner-customized names; generated names cover 960 per gender.
  if(used.has(identity.fullName))identity={...identity,fullName:`${family[hashSeed(r.id)%family.length]} ${identity.fullName}`};
  used.add(identity.fullName);return r.identity===identity&&r.name===identity.fullName?r:{...r,name:identity.fullName,identity};
 }).sort((a,b)=>residents.findIndex(r=>r.id===a.id)-residents.findIndex(r=>r.id===b.id));
}
export function identityAge(identity:Identity,simMs:number){return identity.baselineAge+Math.max(0,Math.floor((simMs-identity.baselineSimMs)/(365.25*86400000)));}
export function identityStage(age:number,gender:Identity['gender']):LifeStage{return age<6?'mầm non':age<11?'tiểu học':age<15?'thiếu niên':age<18?(gender==='female'?'thiếu nữ':'thiếu niên'):age<30?'thanh niên':age<60?'trưởng thành':'cao tuổi';}
export function honorific(age:number,gender:Identity['gender']){return age<6?'Bé':age<18?'Em':age<30?(gender==='female'?'Chị':'Anh'):age<55?(gender==='female'?'Cô':'Chú'):age<60?'Bác':gender==='female'?'Bà':'Ông';}
export function identityHeight(age:number,gender:Identity['gender']){return age<6?.70+age*.08:age<11?1.12+(age-6)*.055:age<16?1.40+(age-11)*.055:age<18?(gender==='female'?1.60:1.68):age>=60?(gender==='female'?1.55:1.66):gender==='female'?1.63:1.75;}
export function displayIdentity(identity:Identity,simMs:number){const age=identityAge(identity,simMs),stage=identityStage(age,identity.gender),title=honorific(age,identity.gender);return{...identity,age,stage,heightMeters:identityHeight(age,identity.gender),title,name:/^(Bé|Em|Anh|Chị|Cô|Chú|Bác|Bà|Ông)\s/.test(identity.fullName)?identity.fullName:`${title} ${identity.fullName}`};}
