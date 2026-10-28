# Các phần chưa hoàn tất sau review Gemini / Claude

Đối chiếu Claude: [CLAUDE_REVIEW_2026-10-28](CLAUDE_REVIEW_2026-10-28.md). [H0 pulse admission/read-only diagnostics/health](PHASE_H0_PULSE.md) đã đạt gate source51/API; chưa thay scheduler production. Tiếp H1, sau đó G0/UX.

| Phase bổ sung | Điều kiện nghiệm thu |
|---|---|
| H1 — đo rollout | ≥20seed cùng runtime/input, oracle chỉ chọn action hợp lệ; regret/entropy/repeat/needs stability và variance. Không coi holdout8seed là rollout dài hạn. |
| G0 — tải và resolution | Đo baseline network/first frame; tiến độ tải thật, resolution từng bước/lifecycle. Compression derivative giữ canonical license/hash. |
| UX1/UX2 | Pause phân biệt403/409/5xx/network; Trò chuyện focus input, metadata đúng; mobile target/keyboard/reduced-motion có QA desktop/mobile. |
| H2 — prior/residual/nonstationary | Version mới không lẫn reward cũ/residual hoặc giả trial; thử cùng H1 và chỉ bật khi đạt ngưỡng định trước. |
| H3–H6 / G1–G4 | Reward có authority, hierarchy/P2P có provenance, replay/DPO synthetic gắn nguồn; trời/đêm/hậu kỳ/IK/bản sắc phố theo budget và ground. Phụ thuộc và giới hạn cụ thể ở bảng review Claude. |

Danh sách này là backlog thực, không phải tuyên bố các phase đã hoàn thành. Source có LinUCB, skill gates và tám nhóm điểm thực hành, normalized policy, structured memory/top-K, dialogue hashes/xưng hô, 49 context cards/33 nơi, RAG theo chủ đề cho daemon, 60 cửa nhà và audio opt-in. Candidate và production được ghi riêng trong releases; không suy từ push GitHub.

| Ưu tiên | Phần còn lại | Điều kiện nghiệm thu |
|---|---|---|
| P1 | Hoàn thành theo ground và playback chung | Đã có pending plan change-detection và full-duration outcome-bound reporting qua quiet slot; còn server-owned timeline/arrival, plan/revision/collision/speed validation; hai viewer mở lệch giờ vẫn thống nhất trạng thái. Client receipt/ETA đơn lẻ không phải authority. Không cấp skill hoặc P2P từ việc mới hết giờ kế hoạch. |
| P1 | Phát hành owner-private | Native Sites đúng project, credential mới, backup full DB, migration additive 0006/0007 theo tình trạng thật, deploy một candidate, readback mọi history/memory và cập nhật latest ledger. Phiên hiện thiếu các native tools. |
| P2 | Vector kỹ năng và hierarchy | Tám nhóm và bốn domain gates đã có source kiểm thử, giữ legacy gates; còn global/role priors có provenance, giữ cá tính cá nhân; benchmark cùng dữ liệu/seed/holdout và không giả tăng samples. |
| P2 | P2P và exemplar | Chỉ ghi heard-from-peer khi cuộc gặp/chia sẻ đã được xác nhận; không tăng trials/skill từ lời kể. Exemplar phải có context, validator và nguồn thật; điểm cấu trúc cao không bảo đảm chất lượng ngữ nghĩa. |
| P2 | Memory/history/export đầy đủ | RAG daemon đã dùng private top-K cho đúng hai actor, có bounds và provenance; còn backfill additive có checkpoint/CAS và đối chiếu từng ID. Xuất SFT candidates cần validator thật; DPO chỉ ghép chosen/rejected cùng prompt/context và model metadata. Không ghép hai lượt độc lập. |
| P2 | Bối cảnh ở 33 nơi | 49 context cards đã phủ 33 nơi và lễ hội có điều kiện; còn LocalSceneContext chỉ đưa vật/thú/cây/tàu thực sự có ở gần, không biến seed/projection thành sự kiện đã chứng kiến. |
| P2 | Mật độ và LOD | Ba tầng có budget skeleton/matrix/draw calls, giữ footprint và tính liên tục khi đổi LOD; kiểm tra 60/120/240 trên GPU thật trước tăng density live. Synthetic 240 không phải bằng chứng hiệu năng thiết bị. |
| P2 | Giao thông và nội thất | Đồ thị nhiều làn, giao lộ/tín hiệu, parking, ray và vịnh dừng thật; walking→waiting→boarding→riding→alighting có cùng occupancy contract. Không bật bus/tram chỉ từ model đứng rời; indoor có đường vào/ra và collider. |
| P2 | Habitat, flora, KayKit | Loài đúng asset và sinh cảnh; không fly kiwi/penguin hoặc dùng attack/dead làm loop. Năm khóm hoa/30 cây đã có growth/moisture/care state và hai batch trong footprint/nav cũ (PHASE_E_GARDENS); còn cây lớn, loài/habitat và placements KayKit. Các model hiện có trong gallery chưa đồng nghĩa đang sống trong city. |
| P2 | LLM A/B và curation | Model artifacts/license/checksum, chạy cùng prompt/context/schema và guard; đo latency/tokens/acceptance/semantic review thật. Không hứa model lớn hơn tốt hơn hoặc JSON100%/<10s khi chưa đo. |
| P3 | Tách runtime, bundle và supervisor QA | Refactor theo camera/environment/overlay chỉ khi giữ lifecycle và regression; tránh manualChunks thiếu đo đạc. Supervisor loopback tách khỏi helper credential; không che lỗi bằng restart hoặc hạ assertion. |
| Theo capability | GPU/soak/ops | GPU phần cứng, telemetry qua phiên dài và kiểm tra lịch đang có trước thay scheduler. Không tạo cron trùng automation. |

Public viewer, nhân vật do viewer sở hữu, video/social và LoRA tự động không được bật trong đợt source này. Owner-private và không phát sinh phí vẫn là yêu cầu của chủ dự án. Hội thoại ba người cần protocol/guard/playback mới; contract hiện hành cố ý dùng đúng hai người, không thêm speaker thứ ba vào schema mà bỏ qua quyền biết và timing.

Các claim 3,71×, 20–50×, score98, JSON100%, GET<150ms và GPU FPS trong tệp Gemini chưa được công nhận. Harness được viết lại dùng runtime đã cho thấy LinUCB có prediction MSE tốt hơn nhưng thưởng tức thời thấp hơn tabular trong synthetic holdout; xem PHASE_D_LEARNING và policy-holdout.json.
