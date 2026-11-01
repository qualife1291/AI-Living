import type { World } from '../world';
import { actorsAt } from '../life.ts';
import { crowdAt } from './engine.ts';
/** Replies may mention the current simulated location/activity, but may not
 * invent a witnessed object, completed action, inventory item or event.
 * Keep this pure: visitor text is not a new observation or learning sample. */
export function localContextReply(location: string, activity: string, message: string): string | null {
  const question = message.toLocaleLowerCase('vi');
  const current = `Mình đang ${activity.toLocaleLowerCase('vi')} ở ${location}.`;
  if (/cây|vườn|chậu|tưới|\bhoa\b/u.test(question)) {
    return /Vườn|Công viên/u.test(location)
      ? `${current} Mình có thể cùng quan sát đất và lá, nhưng chưa có bản ghi xác nhận cây nào đã được tưới hoặc đang cần nước.`
      : `Mình hiện ở ${location}, chưa có quan sát cây cụ thể tại đây. Mình không muốn đoán tình trạng cây chỉ từ tên địa điểm.`;
  }
  if (/mèo|chó|thú cưng|con vật/u.test(question)) {
    return `${current} Mình chưa có ghi nhận được kiểm chứng về con vật đang ở cạnh mình. Nếu gặp thú cưng, mình sẽ hỏi người chăm trước khi lại gần.`;
  }
  if (/sách|thư viện|tài liệu|trang sách/u.test(question)) {
    return /Thư viện|Lớp học|Trường/u.test(location)
      ? `${current} Mình có thể cùng tìm hiểu, nhưng chưa có dữ liệu xác nhận một cuốn sách hay trang cụ thể đã được đọc.`
      : `Mình hiện ở ${location}, chưa có ghi nhận về cuốn sách cụ thể nào trước mặt. Bạn muốn trao đổi về chủ đề nào?`;
  }
  return null;
}

export function replyToVisitor(world: World, actorId: string, message: string, now: number) {
  const actor=[...actorsAt(world,now),...(world.living ? crowdAt(world.living,world,now,actorId):[])].find(a=>a.id===actorId);
  if(!actor)return null;
  const person=world.people.find(p=>p.id===actorId), resident=world.living?.residents.find(r=>r.id===actorId);
  const memory=(person?.memories ?? resident?.memories ?? []).at(-1);
  const lower=message.toLocaleLowerCase('vi');
  const contextual=localContextReply(actor.location,actor.activity,message);
  const text=/nhớ|hôm qua|ký ức/.test(lower) ? `Mình còn nhớ: ${memory ?? 'những người bạn vừa gặp trong xóm.'}`
    : /mục tiêu|ước mơ|muốn|dự định/.test(lower) ? `${person?.goal ?? 'Mình muốn hiểu công việc và gần gũi hơn với hàng xóm.'} Bạn có ý tưởng nhỏ nào cho mình không?`
    : /mệt|nghỉ|sức khỏe/.test(lower) ? `Cảm ơn bạn đã hỏi. Mình sẽ giữ nhịp vừa sức và nghỉ khi cần. Bạn cũng nhớ nghỉ một chút nhé.`
    : /đang|làm gì|đi đâu/.test(lower) ? `Mình đang ${actor.activity.toLocaleLowerCase('vi')} ${actor.walking ? 'trên đường tới' : 'ở'} ${actor.location}. Bạn muốn nghe chuyện công việc hay ký ức của mình?`
    : (contextual ?? `${person?.id==='chi' ? 'Có bạn ghé thăm, căn bếp cũng vui hơn.' : person?.id==='binh' ? 'Chào bạn, mình rất vui được nghe bạn kể.' : 'Chào bạn! Hôm nay bạn có chuyện gì vui không?'} Mình đang ${actor.activity.toLocaleLowerCase('vi')}.`);
  return {actorId,name:actor.name,text,source:'rules' as const};
}
