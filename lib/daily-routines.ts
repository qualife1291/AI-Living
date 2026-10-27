import type { Step } from "./life";

// Full Vietnamese day in simulated seconds. Each entry is the destination and
// activity until the next hour boundary; travel belongs to the start of a slot.
type Slot = [number, string, string, Step["kind"]];
const day: Record<string, Slot[]> = {
  an: [
    [0, "Phòng An", "Sạc pin, ngủ yên trong phòng", "rest"],
    [5.5, "Sân chung", "Quét sân và ngắm bình minh", "work"],
    [7, "Bếp chung", "Chuẩn bị bữa sáng cùng bạn", "eat"],
    [8, "Xưởng sáng tạo", "Thử bản vẽ quầy nước", "work"],
    [11, "Bếp chung", "Ăn trưa và dọn bát", "eat"],
    [12, "Phòng An", "Nghỉ trưa, sạc pin một lát", "rest"],
    [14, "Thư viện", "Đọc cách tính chi phí", "read"],
    [16, "Công viên", "Chơi bóng nhẹ cùng Cún", "play"],
    [17.5, "Vườn nhỏ", "Phụ Chi chăm rau chiều", "garden"],
    [18.5, "Bếp chung", "Ăn tối rồi rửa bát như đã hứa", "eat"],
    [20, "Sân chung", "Ngồi trò chuyện, nghe bạn kể", "social"],
    [22, "Phòng An", "Về phòng sạc pin và nghỉ đêm", "rest"],
  ],
  binh: [
    [0, "Phòng Bình", "Sạc pin và nghỉ đêm", "rest"],
    [5.5, "Công viên", "Đi dạo chậm, nghe chim đầu ngày", "rest"],
    [7, "Bếp chung", "Dọn bàn và ăn sáng", "eat"],
    [8, "Thư viện", "Đối chiếu sổ chi tiêu", "read"],
    [11, "Bếp chung", "Cùng bạn chuẩn bị cơm trưa", "eat"],
    [12, "Phòng Bình", "Nghỉ trưa yên tĩnh", "rest"],
    [14, "Xưởng sáng tạo", "Sắp xếp vật liệu dùng chung", "work"],
    [16, "Quán cà phê", "Hỏi thăm chuyện trong xóm", "social"],
    [17.5, "Quảng trường", "Đọc bảng tin cuối ngày", "read"],
    [18.5, "Bếp chung", "Ăn tối và ghi chi phí bữa cơm", "eat"],
    [20, "Sân chung", "Nghe bạn kể và bàn việc ngày mai", "social"],
    [22, "Phòng Bình", "Về phòng sạc pin và nghỉ đêm", "rest"],
  ],
  chi: [
    [0, "Phòng Chi", "Sạc pin và nghỉ đêm", "rest"],
    [5.5, "Vườn nhỏ", "Kiểm tra đất, chăm rau đầu ngày", "garden"],
    [7, "Bếp chung", "Nấu bữa sáng rồi ăn cùng bạn", "eat"],
    [8, "Vườn nhỏ", "Tỉa lá và quan sát luống rau", "garden"],
    [11, "Bếp chung", "Nấu bữa cơm trưa", "eat"],
    [12, "Phòng Chi", "Nghỉ trưa bên cửa sổ", "rest"],
    [14, "Thư viện", "Tìm công thức món mới", "read"],
    [16, "Công viên", "Ngồi đọc sách, để Mướp tự lại gần", "rest"],
    [17.5, "Vườn nhỏ", "Kiểm tra đất và tỉa lá chiều", "garden"],
    [18.5, "Bếp chung", "Nấu và ăn bữa tối chung", "eat"],
    [20, "Sân chung", "Nhâm nhi trà, kể chuyện nhẹ nhàng", "social"],
    [22, "Phòng Chi", "Về phòng sạc pin và nghỉ đêm", "rest"],
  ],
};

export function dailyRoutine(id: string): Step[] {
  const slots = day[id] ?? day.an;
  return slots.map(([hour, location, activity, kind], i) => ({
    location,
    activity,
    kind,
    duration: ((slots[i + 1]?.[0] ?? 24) - hour) * 3600,
  }));
}

/** Resume today's schedule from a plan's final position, without snapping back. */
export function routineAfterPlan(id: string, secondOfDay: number): Step[] {
  return routineFrom(dailyRoutine(id), secondOfDay);
}

export function routineFrom(list: Step[], secondOfDay: number): Step[] {
  let t = ((secondOfDay % 86400) + 86400) % 86400;
  let i = 0;
  while (t >= list[i].duration && i < list.length - 1) t -= list[i++].duration;
  return [
    { ...list[i], duration: list[i].duration - t },
    ...list.slice(i + 1),
    ...list.slice(0, i),
    ...(t > 0 ? [{ ...list[i], duration: t }] : []),
  ];
}
