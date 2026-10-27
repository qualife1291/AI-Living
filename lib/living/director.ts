import { proposalSchema } from "./schema.ts";

export const socialDirectionInstructions = `
CHỈ ĐẠO CẢNH ĐỜI THƯỜNG — ba vai agent, không gọi API trả phí:
1. Đạo diễn: đọc trạng thái, giờ mô phỏng, người ở đâu, mục tiêu và ký ức thực đã lưu. Chọn đúng hai người, một việc nhỏ có lý do gặp nhau, một địa điểm phù hợp. Lập mở lời → trả lời → phản hồi → kết thúc. Không ép ngủ/đi bộ thành nói chuyện.
2. Nhân vật: An tò mò, hỏi cụ thể; Bình điềm đạm, chú ý cách làm; Chi quan sát và chăm chút. Mỗi người giữ giọng riêng. Viết4–6 lượt luân phiên, câu ngắn có dấu, câu sau đáp ý câu trước; chỉ gợi dự định nếu chưa thực hiện. Không bịa tiền, quan hệ, ký ức, thời tiết/tin tức hay gán lời người chưa có mặt.
3. Phản biện: bỏ câu chào lặp, câu không đáp ý, độc thoại và khẳng định việc chưa xảy ra. Chỉ lưu sau khi cả hai có kế hoạch cùng tới địa điểm; atSecond phải sau thời gian di chuyển (tối đa62%duration mỗi bước), mỗi lượt cách12giây để có khoảng nghe. Cả hai phải còn ở đó khi nói. Giữ khoảng lặng giữa các cảnh và nghỉ đêm22–06giờ mô phỏng.
4. Xưng hô: dùng scene.addressing theo speaker/peerId nếu có (self là cách tự xưng, other là cách gọi người nghe). Không suy tuổi/giới từ tên hay model. Khi chưa có dữ liệu, dùng mình/bạn; không tự tạo quan hệ huyết thống. Ví dụ cháu/bác, cháu/cô, anh/em là các vai giao tiếp, không là ký ức gia đình.
Nếu dùng /api/events: theo đúng schema bên trên, có location/atSecond mỗi câu, không thay các chỉ số không liên quan; ID retry không đổi, CAS conflict đọc mới và thử lại tối đa1lần, GET readback xác minh. Đừng coi kịch bản biên tập/animation là model đang suy nghĩ. Nếu cần viết cảnh khi mọi người đang ngủ, chỉ mô tả nhịp nghỉ yên tĩnh, không ép gọi nhau đi làm.
`;

/** Editorial guard in addition to JSON validation. No state mutation or model trust. */
export function reviewNarrative(value: unknown, participants: string[]) {
  const parsed = proposalSchema.safeParse(value);
  if (!parsed.success) return { ok: false as const, reason: "JSON không đúng schema" };
  const lines = parsed.data.dialogue;
  if (lines.length < 4) return { ok: false as const, reason: "Cần ít nhất4 lượt để có hỏi, đáp, phản hồi và kết thúc" };
  if (lines.some(d => !participants.includes(d.speaker)) || new Set(lines.map(d => d.speaker)).size !== 2)
    return { ok: false as const, reason: "Cảnh cần đúng hai người được chọn" };
  if (lines.some((d, i) => d.text.length > 180 || (i > 0 && lines[i - 1].speaker === d.speaker)))
    return { ok: false as const, reason: "Câu cần ngắn và người nói luân phiên" };
  if (new Set(lines.map(d => d.text.trim().toLowerCase())).size !== lines.length)
    return { ok: false as const, reason: "Lượt thoại bị lặp" };
  const grams = (text: string) => {
    const words = text.toLowerCase().replace(/[\p{P}\p{S}]/gu, "").split(/\s+/);
    return new Set(words.slice(2).map((_, i) => words.slice(i, i + 3).join(" ")));
  };
  for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) {
    const a = grams(lines[i].text), b = grams(lines[j].text);
    if (Math.min(a.size, b.size) >= 6 && [...a].filter(g => b.has(g)).length / Math.min(a.size, b.size) > .65)
      return { ok: false as const, reason: "Hai lượt chỉ nhắc lại cùng một ý gần nguyên văn" };
  }
  if (/^(đạo diễn|nhân vật|phản biện|kịch bản)$/i.test(parsed.data.title.trim()))
    return { ok: false as const, reason: "Tiêu đề cần mô tả việc đang diễn ra" };
  return { ok: true as const, proposal: parsed.data };
}
