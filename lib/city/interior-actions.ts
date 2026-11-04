/** Pure, display-only semantics projected from a resident's already planned
 * activity. No completed action, location, floor assignment, reward or
 * object possession can be derived from these visual cues. */
export type InteriorAction =
  | 'eat' | 'drink' | 'cook' | 'serve' | 'wash' | 'clean' | 'tidy'
  | 'read' | 'write' | 'study' | 'type' | 'repair' | 'pack'
  | 'shop' | 'browse' | 'garden' | 'care' | 'exercise'
  | 'social' | 'rest' | 'sleep' | 'observe' | 'watch-tv' | 'watch-film' | 'fridge';

const literal: Record<string, InteriorAction> = {
  eat: 'eat', drink: 'drink', garden: 'garden', read: 'read',
  study: 'study', shop: 'shop', social: 'social', rest: 'rest',
  exercise: 'exercise', run: 'exercise', jump: 'exercise',
  play: 'exercise', work: 'type', 'walk-pet': 'social',
};
export function interiorAction(kind: string, activity: string): InteriorAction {
  const a = activity.toLocaleLowerCase('vi');
  const patterns: [RegExp, InteriorAction][] = [
    [/tủ lạnh/i,'fridge'],[/xem tivi|xem tv|truyền hình/i,'watch-tv'],[/xem phim|rạp phim/i,'watch-film'],[/nhậu|nhâm nhi/i,'drink'],
    [/ngủ|chợp mắt|đi ngủ|sleep/i,'sleep'],
    [/rửa bát|rửa chén|lau chén|rửa ly|úp khô/i,'wash'],
    [/tỉa cành|trồng hạt|tưới cây|đất|cây trồng/i,'garden'],
    [/kiểm tra phanh|lốp xe|hiệu chỉnh|bảo dưỡng|sửa thiết bị/i,'repair'],
    [/viết thiệp|ghi nhật ký|ghi chép|lập danh sách/i,'write'],
    [/dọn dẹp quầy|dọn khu vực|phân loại chất hữu cơ/i,'clean'],
    [/nấu|chuẩn bị món|chế biến|cắt rau|xào|bếp/i,'cook'],
    [/phục vụ|bưng món|dọn bàn ăn/i,'serve'],
    [/rửa bát|rửa chén|lau chén|rửa ly/i,'wash'],
    [/quét|lau nhà|vệ sinh|dọn rác/i,'clean'],
    [/sắp xếp|gấp quần áo|thu dọn|xếp đồ/i,'tidy'],
    [/sửa chữa|lắp ráp|bảo dưỡng|kiểm tra máy/i,'repair'],
    [/đóng gói|soạn hàng|gói hàng|giao kiện/i,'pack'],
    [/viết|ghi chú|chép|soạn thảo/i,'write'],
    [/đọc sách|đọc báo|đọc tài liệu|đọc truyện/i,'read'],
    [/học bài|ôn tập|luyện tập kiến thức/i,'study'],
    [/gõ máy|soạn email|làm trên máy tính|nhập liệu/i,'type'],
    [/thanh toán|chọn hàng|mua hàng|đi chợ/i,'shop'],
    [/xem hàng|ngắm đồ|duyệt sách/i,'browse'],
    [/tưới cây|chăm hoa|nhặt lá|trồng cây/i,'garden'],
    [/khám bệnh|chăm sóc|đo nhiệt độ|đỡ người/i,'care'],
    [/ăn cơm|ăn sáng|ăn trưa|ăn tối|dùng bữa/i,'eat'],
    [/uống nước|uống trà|cà phê|nhâm nhi/i,'drink'],
    [/trò chuyện|thăm hỏi|chào hỏi|gặp gỡ/i,'social'],
    [/nghỉ ngơi|thư giãn|ngồi nghỉ/i,'rest'],
    [/tập thể dục|khởi động|vươn vai/i,'exercise'],
  ];
  for (const [pattern, action] of patterns) if (pattern.test(a)) return action;
  return literal[kind] ?? 'observe';
}
export const INTERIOR_ACTIONS: InteriorAction[] = [
  'eat','drink','cook','serve','wash','clean','tidy','read','write',
  'study','type','repair','pack','shop','browse','garden','care',
  'exercise','social','rest','sleep','observe','watch-tv','watch-film','fridge',
];
export function interiorProp(action: InteriorAction) {
  if (['eat','serve'].includes(action)) return 'plate';
  if (action==='drink') return 'cup';
  if(action==='fridge')return 'plate';
  if (['cook','wash'].includes(action)) return 'pan';
  if (['read','study','write'].includes(action)) return 'book';
  if (['type','repair'].includes(action)) return 'tablet';
  if (['shop','browse','pack','tidy'].includes(action)) return 'bag';
  if (['garden','clean'].includes(action)) return 'tool';
  if (action==='care') return 'medical';
  return 'none';
}
