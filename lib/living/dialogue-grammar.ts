import {addressTemplate,type ConversationProfile} from "./identity.ts";
import {lineHash} from "./dialogue-pool.ts";
/** Scripted slot grammar; never fabricate observations or remembered events. */
export class DialogueGrammar {
  private history = new Map<string, string[]>();
  private prior=new Set<string>();
  seed(hashes:Iterable<string>) { this.prior=new Set([...hashes].slice(-768)); }
  reset() { this.history.clear(); this.prior.clear(); }
  lines(a: ConversationProfile, b: ConversationProfile, location: string, serial: number, count = 4) {
    const pair = [a.id, b.id].sort().join(":");
    const previous = this.history.get(pair) ?? [];
    const topics = /Chợ|Siêu thị|Nhà hàng|Bếp|cà phê/.test(location)
      ? ["chọn món", "mua rau", "mua trái cây", "chuẩn bị bữa tối", "dọn bàn", "chia phần ăn", "pha trà", "rửa dụng cụ"]
      : /Thư viện|Lớp|Trường/.test(location)
      ? ["chọn sách", "đọc truyện", "ghi chú", "học từ mới", "ôn bài", "tìm tài liệu", "đọc báo", "thảo luận bài học"]
      : ["đi dạo", "chăm cây", "nghỉ chân", "tập thở", "ngắm phố", "vận động nhẹ", "thu dọn đồ", "tìm chỗ ngồi"];
    const leads = ["Bạn có muốn", "Mình đang tính", "Hay là mình cùng", "Lát nữa ta thử", "Nếu bạn rảnh, mình cùng", "Hôm nay mình muốn", "Bạn thấy sao nếu mình cùng", "Mình có thể cùng bạn"];
    const tails = ["một lúc nhé", "ở đây nhé", "rồi nghỉ một chút nhé", "chậm rãi thôi nhé", "khi sẵn sàng nhé", "trước khi về nhé", "nếu bạn thấy tiện nhé", "cùng nhau nhé"];
    const used = [...previous];
    const topicIndex=((serial % topics.length)+topics.length)%topics.length;
    const result: { speaker: string; text: string; gesture: string }[] = [];
    for (let line = 0; line < count; line++) {
      let text = "";
      for (let attempt = 0; attempt < 512; attempt++) {
        const n = (serial * 29 + line * 113 + attempt) % 512;
        const topic=topics[(topicIndex+Math.floor(attempt/64))%topics.length];
        text = line % 2
          ? `${["Được, mình cùng", "Ừ, ta thử", "Mình đồng ý", "Nghe được đấy, mình cùng", "Mình sẵn sàng", "Vậy mình cùng", "Mình cũng muốn", "Cảm ơn bạn rủ, mình cùng"][n % 8]} ${topic} ${tails[Math.floor(n / 8) % 8]}.`
          : `${leads[n % 8]} ${topic} ${tails[Math.floor(n / 8) % 8]}?`;
        text=addressTemplate(text,line%2?b:a,line%2?a:b);
        if (!used.includes(text)&&!this.prior.has(lineHash(text))) break;
      }
      this.prior.add(lineHash(text));if(this.prior.size>768)this.prior.delete(this.prior.values().next().value!);
      used.push(text); result.push({ speaker: line % 2 ? b.id : a.id, text, gesture: line % 2 ? "open" : "explain" });
    }
    this.history.delete(pair); this.history.set(pair, used.slice(-50));
    if (this.history.size > 256) this.history.delete(this.history.keys().next().value!);
    return result;
  }
}
