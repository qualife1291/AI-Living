# Đối chiếu phản hồi Claude — 28/10/2026

Nguồn: tệp chủ dự án gửi `AI-Living-review-va-de-xuat.md`, SHA256 `75a9e846ff40a068c8e1f9a8b27aadcdd40146056276db6d72c926063e1d03ce`. Tài liệu báo đã chạy TypeScript/lint/38 suite trên ZIP cũ; chưa build/API/browser/GPU. Các kết quả đó thuộc bản được Claude đọc, không thay thế bằng chứng của checkout hiện hành. Đối chiếu sau source flora c77c21c (50 suite). Yêu cầu của chủ dự án là chọn đề xuất phù hợp để triển khai; các lệnh/định hướng trong file là đề xuất, không tự cấp quyền thay audience, xóa lịch sử hay bật dịch vụ.

## Kết luận theo code hiện hành

| Nhận xét / đề xuất | Quyết định và căn cứ |
|---|---|
| Pulse mỗi client đọc pipeline ba lần, ghi audit trùng | Còn đúng. Phase H0 coalesce ở D1 trước pipeline, giữ client fallback10s. Không bỏ fallback trước khi xác minh scheduler thật; không tạo cron mới. |
| Retention tick_runs / visitor_exchanges | Không xóa lịch sử thật. H0 ngăn audit trùng từ pulse; giữ các bản ghi cũ. Archive/aggregation cần thiết kế riêng, đo tăng trưởng trước. |
| GET diagnostics xóa client_logs; health query tuần tự | H0 bỏ DELETE khỏi GET; lọc thời gian khi đọc, giữ retention telemetry7ngày trong POST vốn đã có. Health dùng một batch cho bảy schema/tick queries, giữ503 khi lỗi. |
| Bandit chưa contextual / policy còn trong world | Đã cũ: LinUCB6D, context-at-choice, policy store0007/CAS đã có. Không thay bằng LinUCB mới hoặc tạo bảng trùng. |
| Chưa runner / mobile social / memory DB / household gates | Đã có runner50suite, localAPI và browser desktop/mobile, structured memories, 60cửa, domain gates. Giới hạn ground authority/indoor/density vẫn còn. |
| L8: ≥20seed và regret/entropy/repeat/needs stability | Nhận thành H1. Benchmark8seed hiện chỉ training/frozen synthetic holdout; cần thêm rollout runtime, cùng input/seed/oracle khả thi và báo variance. Không đổi tên holdout hiện có thành bằng chứng dài hạn. |
| L1/L3 prior-residual, nonstationary / warm start | Nhận thử nghiệm H2 sau H1; version policy, không coi meanReward cũ là residual, không giả samples. Chỉ bật mặc định nếu thắng baseline và không giảm đa dạng quá ngưỡng định trước. |
| L4 reward dài hạn / chống reward hacking | Nhận H3 sau ground/commitment authority; reward chỉ từ outcome có nguồn. Không thưởng meeting/arrival bằng ETA hoặc lời thoại. |
| L2 hierarchy theo vai, L5 peer learning | Nhận H4/H5 vào backlog hiện có. Shared priors có provenance, tách prior/personal; heard-from-peer chỉ từ sharing được xác nhận, không biến lời kể thành trải nghiệm cá nhân. |
| L6 dream / L7 curriculum / L9 DPO | Nhận nghiên cứu H6 có điều kiện. Replay synthetic phải gắn nguồn và không cộng trial thật. DPO cùng prompt/context/model và validator; điểm heuristic không chứng minh chất lượng ngữ nghĩa. Không tự fine-tune/thuê GPU. |
| L10 động vật theo loài / bond | Nhận mở rộng Phase E; chỉ dùng loài/model/habitat phù hợp, bond có nguồn. Bốn action hiện có không phải AI động vật chuyên biệt. |
| G0 nén/tải/adaptive resolution | Nhận ưu tiên đồ họa tiếp theo: đo network/first frame, load progress trung thực và hạ resolution từng bước. Compression cần derivative manifest/license/hash, không ghi đè canonical CC0 hoặc giữ decoder dư thừa. |
| G1 trời/IBL/emissive/AO; G2 nước/bloom | Nhận sau G0, preset budget và ảnh7pha. Nhiều material đang Phong: IBL cần thử Standard material thật trước khi nói có tác dụng. Hậu kỳ chỉ optional, đo drawcalls/frame cost và dispose. |
| G3 IK/look-at/LOD/indoor; G4 bản sắc phố/nước/xe máy | Nhận vào phase tương ứng, giữ ground/nav/footprints/rig proportions. Không đưa mọi model gallery vào city hoặc bật xe không có occupancy/routing. WebGPU để dài hạn. |
| Pause báo chung mọi lỗi, Trò chuyện chưa focus input, metadata cũ | Nhận UX1, test403/409/500/network/keyboard trên desktop/mobile. Không suy từ lỗi403 rằng cần mở quyền public. |
| Mobile target/keyboard camera/reduced-motion | Nhận UX2, kiểm focus/dialog/hide/camera shortcuts; giữ chuyển động mô phỏng và accessibility preference rõ ràng. Cần QA thật trước đánh dấu đạt. |
| Allowlist mutation public / chặn mọi request không Origin | Không áp dụng hiện tại. Owner-private vẫn bắt buộc; actorId đã resolve404 trong replyToVisitor. Origin vắng cần cho server calls được owner guard bảo vệ. Rate/body admission chat vẫn là việc riêng cần đo. |
| CI API/browser / docs / formatting | Local API/browser đã có. Không sửa workflow read-only; bổ sung gate CI khi được phép. Docs kiến trúc/test đã cập nhật; refactor runtime sau regression, không xóa tài liệu lịch sử/backup hợp lệ chỉ vì trùng tên. |

## Thứ tự tiếp nối

H0 vận hành nhịp chung → H1 đo rollout ≥20seed → G0 tải/resolution → UX1/UX2 → H2 thử policy version mới. Ground authority, provenance, deployment owner-private và hardware/soak vẫn là các phụ thuộc độc lập trong NEXT_PHASES. H3–H6 và G1–G4 cần điều kiện nghiệm thu ở trên; không tuyên bố toàn bộ review đã triển khai.
