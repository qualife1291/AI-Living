import type { Step } from './life';
import type { WorldClockConfig } from './clock';
import type {
  DialogueLine,
  PersonChange,
  RelationshipChange,
} from './event-schema';

export type PersonPlan = {
  createdAt: string;
  pausedMs: number;
  from: string;
  steps: Step[];
};

export type Person = {
  id: string;
  name: string;
  role: string;
  bio: string;
  color: string;
  money: number;
  energy: number;
  hunger: number;
  skill: number;
  goal: string;
  activity: string;
  location: string;
  memories: string[];
  plan?: PersonPlan;
};

export type Relationship = {
  a: string;
  b: string;
  trust: number;
  note: string;
};

export type CommitmentItem = {
  id: string;
  fromId: string;
  toId: string;
  text: string;
  dueAt?: string;
  status: 'open' | 'done';
  eventId: string;
};

export type World = {
  clock?: WorldClockConfig;
  born: string;
  paused: boolean;
  schedule: string;
  people: Person[];
  relationships: Relationship[];
  commitments?: CommitmentItem[];
  weather: string;
  lastAI: string | null;
};

export type EpisodeEvent = {
  id: string;
  createdAt: string;
  source: 'ai' | 'opening' | string;
  contextId?: string;
  title: string;
  summary: string;
  dialogue: DialogueLine[];
  changes: PersonChange[];
  relationship?: RelationshipChange;
  revisionBefore?: number;
  revisionAfter?: number;
};

export const seed: World = {
  born: '',
  paused: false,
  schedule: 'Chưa bật lịch AI',
  weather: 'Nắng nhẹ',
  lastAI: null,
  people: [
    {
      id: 'an',
      name: 'An',
      role: 'Người ươm ý tưởng',
      bio: 'Robot AI · Lạc quan, thích thử điều mới. Muốn mở một quầy nước nhỏ, nhưng đang học cách tính chi phí.',
      color: '#ed9e6f',
      money: 200000,
      energy: 82,
      hunger: 25,
      skill: 12,
      goal: 'Dành dụm 500.000đ mở quầy nước',
      activity: 'Phác thảo quầy nước',
      location: 'Sân chung',
      memories: ['Vừa chuyển vào xóm. Muốn làm quen với Bình và Chi.'],
    },
    {
      id: 'binh',
      name: 'Bình',
      role: 'Người giữ nhịp xóm',
      bio: 'Robot AI · Điềm tĩnh, kỹ tính. Thích mọi thứ rõ ràng, nhưng luôn sẵn lòng giúp bạn khi cần.',
      color: '#8f9bc4',
      money: 350000,
      energy: 75,
      hunger: 35,
      skill: 22,
      goal: 'Lập quỹ sinh hoạt chung minh bạch',
      activity: 'Sắp xếp sổ chi tiêu',
      location: 'Phòng Bình',
      memories: ['Dự định rủ cả xóm bàn về bữa cơm chung.'],
    },
    {
      id: 'chi',
      name: 'Chi',
      role: 'Đầu bếp mộng mơ',
      bio: 'Robot AI · Ấm áp, sáng tạo và hơi ngại mở lời. Tin rằng một bữa ăn ngon có thể làm mọi người gần nhau hơn.',
      color: '#98b789',
      money: 180000,
      energy: 88,
      hunger: 20,
      skill: 18,
      goal: 'Nấu một bữa cơm được cả xóm yêu thích',
      activity: 'Chăm vườn rau',
      location: 'Vườn nhỏ',
      memories: ['Mang một chậu húng quế đến khu trọ.'],
    },
  ],
  relationships: [
    { a: 'an', b: 'binh', trust: 40, note: 'Bạn cùng xóm mới quen' },
    { a: 'an', b: 'chi', trust: 45, note: 'Cùng thích những ý tưởng nhỏ' },
    { a: 'binh', b: 'chi', trust: 42, note: 'Chưa có dịp trò chuyện nhiều' },
  ],
  commitments: [
    {
      id: 'commit-seed-1',
      fromId: 'an',
      toId: 'binh',
      text: 'Cùng Bình rà soát bảng tính chi phí nguyên liệu quầy nước',
      status: 'open',
      eventId: 'seed',
    },
    {
      id: 'commit-seed-2',
      fromId: 'binh',
      toId: 'chi',
      text: 'Bàn quy tắc ghi sổ quỹ bữa cơm chung tại Bếp chung',
      status: 'open',
      eventId: 'seed',
    },
  ],
};

export const instructions = `Bạn là tác nhân vận hành Xóm AI. Đọc GET /api/world. Nếu paused=true hãy kết thúc, không ghi sự kiện. Dùng ba nhân vật An, Bình, Chi, mỗi người chỉ biết ký ức của mình và chuyện được chứng kiến. Tạo một cảnh đời thường bằng tiếng Việt với 1–12 câu đối thoại (khuyến nghị 3–8 câu), lựa chọn có hậu quả và tối đa 1 mục thay đổi (change)/nhân vật trong mảng changes (tối đa 3 người). Giữ tính cách, nối tiếp lời hứa và sự kiện cũ; không bịa giao dịch tiền thật. Tiền là tiền mô phỏng. Không thực hiện tác vụ ngoài đời, không gọi API trả phí, không tạo video. POST /api/events với {id,contextId?,revision,title,summary,dialogue:[{speaker,text,atSecond?,location?}],changes:[{id,moneyDelta,energyDelta,hungerDelta,skillDelta,activity,location,memory,plan?}],relationship:{a,b,delta,note},source:'ai'}. id = 'ai-' + mốc giờ UTC 6 tiếng hiện tại; dùng lại id nếu retry. revision lấy từ GET. moneyDelta nguyên trong [-30000,30000], energyDelta/hungerDelta trong [-20,20], skillDelta trong [0,3]. Không cho tiền âm. location thuộc Sân chung,Phòng An,Phòng Bình,Phòng Chi,Bếp chung,Vườn nhỏ,Công viên,Quán cà phê,Thư viện,Xưởng sáng tạo,Quảng trường,Phố đi bộ. Cư dân mang hình dáng robot AI, tính cách cũ được giữ nguyên. Mỗi memory tối đa 240 ký tự, tóm tắt sự kiện nhân vật biết. relationship tùy chọn, delta [-5,5]. Khi 409 phải đọc lại và lập lại theo trạng thái mới, tối đa 1 lần. Khi thành công đọc GET xác minh event id. Đừng gọi endpoints qua browser. Dùng get_site lấy origin hiện tại và siwc_bypass_bearer_token, gửi token chỉ đến origin này qua OAI-Sites-Authorization. Không in/lưu token. Nếu không có quyền truy cập, báo lỗi và dừng. Không republish web, không tạo schedule khác.`;

export const lifeInstructions = `
EXTENSION SINH HOẠT, ĐỒNG HỒ THẾ GIỚI, BỐI CẢNH ĐA CHIỀU VÀ ĐỘNG VẬT:
- Mỗi lượt hãy thêm plan cho từng nhân vật tham gia, gồm 1–8 bước {location,activity,duration,kind}; duration 30–180 giây mỗi bước; kind thuộc work,eat,rest,social,garden,read,play. Kế hoạch được lưu và trình duyệt phát lại đường đi qua mạng lưới đường phố từ đúng vị trí mô phỏng hiện tại (không bị nhảy vị trí). Mọi trường cũ vẫn bắt buộc.
- Đầu mỗi lượt đọc GET /api/world để biết trạng thái, giờ mô phỏng, thời tiết, bối cảnh gợi ý (activeContexts) và nhật ký. Không lặp cảnh trước hoặc giải quyết mọi mục tiêu trong một lượt. Có việc dang dở, hẹn gặp, trao đổi ngắn và khoảng nghỉ. Kỹ năng chỉ tăng khi có hoạt động học/làm thực tế trong sự kiện.
- Viết hội thoại tiếng Việt tự nhiên, câu ngắn, có đáp lời và ngập ngừng hợp tính cách; tránh 3 nhân vật cùng nói như người dẫn chuyện. Chỉ cho nhân vật biết điều họ chứng kiến hoặc được kể. Không nhân cách hóa động vật bằng câu nói tiếng người.
- Cho các nhân vật đi đến cùng địa điểm trước khi trò chuyện. Có thể thêm atSecond (0–1200) và location vào mỗi dòng dialogue để hiện bong bóng đúng thời điểm của cảnh; dành đủ thời gian đi bộ (ít nhất 20–45 giây) và cách câu 6–8 giây. Không cho nói khi đang đi xa nhau.
- Động vật nền: Mướp là mèo, nghỉ yên tĩnh, khám phá, vờn đồ chơi; Cún là chó, đánh hơi, mời chơi, gần gũi khi an toàn; Đàn sẻ nhảy kiếm hạt và đi theo đàn. Robot có thể quan sát/chăm sóc, nhưng không tự thêm thay đổi vào các thuộc tính động vật vì API chưa có schema đó. Không cho mèo săn/chó đuổi đàn sẻ như trò chơi.
- Nguồn: Cats Protection cats-and-play/cats-and-sleep; RSPCA understanding dog body language; Cornell Lab House Sparrow lifehistory. Đây là mô phỏng tập tính bằng luật, không phải mô hình học máy chuyên biệt cho từng loài.
- Ghi tiền/kỹ năng/quan hệ dựa trên sự kiện đã xảy ra; kế hoạch tương lai chưa hoàn thành không được coi là kỹ năng hay thu nhập đã kiếm.
`;
