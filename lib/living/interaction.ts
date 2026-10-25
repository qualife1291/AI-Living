import type { World } from '../world';
import { actorsAt } from '../life.ts';
import { crowdAt } from './engine.ts';
export function replyToVisitor(world: World, actorId: string, message: string, now: number) {
  const actor=[...actorsAt(world,now),...(world.living ? crowdAt(world.living,world,now,actorId):[])].find(a=>a.id===actorId);
  if(!actor)return null;
  const person=world.people.find(p=>p.id===actorId), resident=world.living?.residents.find(r=>r.id===actorId);
  const memory=(person?.memories ?? resident?.memories ?? []).at(-1);
  const text=message.toLocaleLowerCase('vi');
  const topic=/nhớ|hôm qua|ký ức/.test(text) ? `Mình còn nhớ: ${memory ?? 'những người bạn vừa gặp trong xóm.'}`
    : /mục tiêu|ước mơ|muốn|dự định/.test(text) ? `${person?.goal ?? 'Mình muốn hiểu công việc và gần gũi hơn với hàng xóm.'} Bạn có ý tưởng nhỏ nào cho mình không?`
    : /mệt|nghỉ|sức khỏe/.test(text) ? `Cảm ơn bạn đã hỏi. Mình sẽ giữ nhịp vừa sức và nghỉ khi cần. Bạn cũng nhớ nghỉ một chút nhé.`
    : /đang|làm gì|đi đâu/.test(text) ? `Mình đang ${actor.activity.toLocaleLowerCase('vi')} ${actor.walking ? 'trên đường tới' : 'ở'} ${actor.location}. Bạn muốn nghe chuyện công việc hay ký ức của mình?`
    : `${person?.id==='chi' ? 'Có bạn ghé thăm, căn bếp cũng vui hơn.' : person?.id==='binh' ? 'Chào bạn, mình rất vui được nghe bạn kể.' : 'Chào bạn! Hôm nay bạn có chuyện gì vui không?'} Mình đang ${actor.activity.toLocaleLowerCase('vi')}.`;
  return {actorId,name:actor.name,text,source:'rules' as const};
}
