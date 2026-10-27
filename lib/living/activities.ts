import { hashSeed } from "../clock.ts";
import type { Step } from "../life.ts";
export function followup(location: string): Step {
 if (/Chợ|Siêu thị/.test(location)) return {location,kind:"shop",activity:"Cùng chọn thực phẩm cho bữa ăn",duration:120};
 if (/Thư viện|Trường|Lớp/.test(location)) return {location,kind:"study",activity:"Cùng đọc và ghi chú bài học",duration:120};
 if (/Công viên|Sân thể thao/.test(location)) return {location,kind:"run",activity:"Cùng chạy bộ nhẹ quanh khu vực",duration:120};
 return {location,kind:"drink",activity:"Cùng uống nước, thu dọn chỗ ngồi",duration:120};
}
export function meetingSteps(location: string, title: string): Step[] {
 return [{location,kind:"social",activity:"Tiến lại gần để gặp bạn",duration:120},{location,kind:"social",activity:"Chào và hỏi thăm",duration:30},{location,kind:"social",activity:title.slice(0,80),duration:60},{location,kind:"social",activity:"Thống nhất việc cùng làm",duration:30},followup(location)];
}
export function microActivity(id: string, seconds: number, kind: Step["kind"], activity: string) {
 // Intentional sitting/sleeping/working are valid stationary activities.
 if(["rest","eat","read","work","study","drink"].includes(kind))return {kind,activity};
 const n=(Math.floor(seconds/20)+hashSeed(id))%4;
 return [{kind:"exercise",activity:"Vươn vai, xoay nhẹ cổ tay"},{kind:"social",activity:"Nhìn quanh và chào người gần đó"},{kind:"garden",activity:"Chăm và thu dọn khu vực bên cạnh"},{kind:"play",activity:"Quan sát hoạt động trong xóm"}][n] as {kind:Step["kind"];activity:string};
}

/** Short, connected activity routes instead of looping a sprint at one root. */
export function actionSteps(location: string, activity: string, kind: Step["kind"]): Step[] {
  if (kind !== "run" && kind !== "tag" && kind !== "cycle" && kind !== "walk-pet") return [{location,activity,kind,duration:180}];
  const next = location === "Công viên" ? "Sân thể thao" : location === "Sân thể thao" ? "Công viên" : location;
  return [{location,activity,kind,duration:90},{location:next,activity,kind,duration:90}];
}
