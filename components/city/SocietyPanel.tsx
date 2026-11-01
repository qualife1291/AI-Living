"use client";
import type {World,EpisodeEvent} from "@/lib/world";
import {simulatedMoneyOverview,verifiedRelations} from "@/lib/living/society";

/** Audited state only: never label a visual store, conversation, or proposed
 * plan as a paid purchase, earned wage or established friendship. */
export function SocietyPanel({world,events,selected}:{
  world:World;events:EpisodeEvent[];selected:string;
}){
  const overview=simulatedMoneyOverview(world,events);
  const self=overview.balances.find(x=>x.id===selected);
  const ties=verifiedRelations(world,selected);
  const roster=[...world.people,...(world.living?.residents??[])];
  const nameOf=(id:string)=>roster.find(x=>x.id===id)?.name??"Cư dân";
  return <details className="life-story" data-society-audit>
    <summary>Quan hệ xã hội & tiền trong mô phỏng</summary>
    {self
      ? <div>
          <p><strong>Số dư của {self.name}: {self.balance.toLocaleString("vi-VN")}đ mô phỏng</strong></p>
          <small>Trong các sự kiện được tải: thu {self.recordedIncome.toLocaleString("vi-VN")}đ,
          chi {self.recordedExpense.toLocaleString("vi-VN")}đ. Đây không phải số liệu thu chi cả đời.</small>
        </div>
      : <p>Chưa có ví/số dư được ghi cho cư dân này; không tự gán tiền từ vai trò hoặc cửa hàng.</p>}
    <h4>Quan hệ đã ghi</h4>
    {ties.length
      ? <ul>{ties.slice(0,12).map(link=><li key={link.peerId}>
          <b>{nameOf(link.peerId)}</b> · tin cậy {link.trust}/100
          {link.meetings>0? ` · ${link.meetings} cuộc gặp hoàn tất`:" · quan hệ cốt lõi đã ghi"}
        </li>)}</ul>
      : <p>Chưa ghi nhận cuộc gặp hoàn tất hoặc mối quan hệ được lưu.</p>}
    <p className="muted">Các cuộc hội thoại hiển thị, kế hoạch tương lai, quầy hàng và chuyển động tay
      không tự tạo quan hệ hoặc giao dịch. Mọi số tiền chỉ là tiền mô phỏng.</p>
  </details>;
}
