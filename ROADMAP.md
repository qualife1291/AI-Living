# Việc còn lại

Đây là backlog duy nhất, không là nhật ký những phase đã làm. Context/bằng chứng hiện tại ở [handoff](CODEX_HANDOFF.md), hợp đồng ở docs theo chủ đề.

## Thứ tự tiếp theo

| Phase | Việc làm | Nghiệm thu |
|---|---|---|
| H1 | Benchmark rollout bằng runtime thật | ≥20 seed, cùng input/seed; oracle chỉ chọn action hợp lệ. Báo regret, entropy, tỷ lệ lặp, thời gian needs ổn định và variance. Holdout8 seed hiện tại không phải rollout dài hạn. |
| G0 | Tải asset và adaptive resolution | Đo baseline bytes/first frame; progress phản ánh tải thật; hạ resolution từng bước trước đổi preset. Compression tạo derivative có license/hash, giữ canonical. QA lifecycle và đo trước/sau. |
| UX1 | Thao tác rõ ràng | Pause phân biệt403/409/5xx/network; Trò chuyện mở/focus input; metadata đúng. Test keyboard/desktop/mobile/320px. Không mở quyền public để chữa403. |
| UX2 | Accessibility | Tap targets, keyboard camera, focus/dialog/hide và reduced-motion có hành vi rõ; giữ pause/movement contract. QA thật, không chỉ grep CSS. |
| H2 | Thử prior-residual/nonstationary policy | Version mới không lẫn meanReward cũ/residual, không giả samples. Chọn ngưỡng trước; chỉ bật khi thắng H1 baseline và giữ đa dạng. Không chỉnh để ép thắng holdout. |

## Các phụ thuộc và phần chưa xong

| Mảng | Điều kiện cần hoàn thành |
|---|---|
| Ground/playback chung | Server-owned timeline/arrival và kiểm plan/revision/collision/speed; hai viewer mở lệch giờ thống nhất. Client receipt/ETA không là authority. Không cấp skill/P2P chỉ vì hết giờ plan. |
| Phát hành owner-private | Native Sites đúng project/credential mới; backup full DB/schema0006/0007 theo tình trạng thật; exact candidate/readback history/memory và ledger. Không tạo lịch trùng. |
| H3: reward dài hạn | Commitment/social/travel reward chỉ từ outcome có nguồn và authority; kiểm reward hacking/action dominance. |
| H4: hierarchy | Global/role priors có provenance, tách prior/personal, giữ cá tính; benchmark cùng dữ liệu/gates và không tăng samples giả. LinUCB6D/normalized policy hiện đã có. |
| H5: P2P | Heard-from-peer chỉ khi sharing/cuộc gặp được xác nhận; lời kể không tăng trials/skill hoặc thành ký ức trực tiếp. Exemplar giữ context/validator/nguồn. |
| H6: replay/curriculum/export | Synthetic prior/replay gắn nguồn, không thành trải nghiệm thật. Memory backfill additive có checkpoint/CAS/đối chiếu ID. DPO chỉ chosen/rejected cùng prompt/context/model; validator thật, không gán score 98 tự động. Không tự thuê GPU/fine-tune. |
| Bối cảnh tại chỗ | LocalSceneContext chỉ gồm vật/thú/cây/tàu thực có gần actor;49 thẻ biên tập hiện tại không phải observed event/occupancy. |
| Density/LOD | Giữ footprint, skeleton/matrix/drawcall budget và chuyển LOD liên tục; đo60/120/240 trên GPU thật trước tăng density live. |
| Traffic/indoor | Nhiều làn/giao lộ/tín hiệu/parking/ray/điểm dừng; walking→waiting→boarding→riding→alighting dùng occupancy chung; indoor có vào/ra/collider. Model tĩnh không phải tuyến chạy. |
| Flora/habitat | Cây lớn, thu hoạch/inventory/NPC care có outcome; loài đúng model/sinh cảnh và clip hợp lệ. Không fly kiwi/penguin hoặc loop attack/dead. KayKit gallery chưa là placement city. |
| G1/G2 | Trời/IBL/emissive/AO, rồi wetroad/water/bloom optional theo preset. Phong không tự nhận IBL; thử Standard material thật, ảnh7pha và đo frame/drawcalls/dispose. |
| G3/G4 | IK/look-at/LOD/interior, rồi bản sắc phố/xe máy/nước; giữ rig proportions/nav/footprints và routing/occupancy. |
| Model A/B | Artifact/license/checksum, cùng prompt/context/schema; đo latency/tokens/acceptance và review ngữ nghĩa. Không hứa JSON 100%/<10s hoặc model lớn luôn tốt hơn. |
| Ops/refactor | GPU/soak/telemetry phiên dài; chat rate/body admission, tăng trưởng audit/history, GET living/context cost cần đo. Refactor runtime/supervisor loopback giữ regression, không sửa credential helper hay workflow read-only để autopush/deploy. |

## Đề xuất ngoài và ranh giới

Đã đối chiếu Gemini và `AI-Living-review-va-de-xuat.md` của Claude sau source H0. Claude đọc ZIP38 suite; các nhận xét thiếu LinUCB/runner/memory/mobile đã cũ. Phần còn phù hợp được đưa vào các hàng trên; review đầy đủ còn trong Git tại mốc `2ef7e3f`. H0 đã coalesce pulse D1, nhưng chưa bỏ client fallback vì scheduler production chưa xác minh.

Không nhận claim 3,71×/20–50×/score 98/FPS/SLA từ tài liệu làm bằng chứng. Không xóa tick/chat history theo đề xuất retention; không đổi owner-private/route permissions hoặc chặn server calls hợp lệ chỉ vì thiếu Origin. Benchmark hiện hành báo cả mặt LinUCB chưa thắng thưởng tức thời.

Public viewer, nhân vật multi-user, video/social, WebGPU và LoRA tự động là hướng dài hạn, chưa bật. Studio phải dùng timeline/nhật ký riêng; hội thoại hiện đúng hai speaker, không thêm người thứ ba mà bỏ qua quyền biết/timing. Xem [DECISIONS](docs/DECISIONS.md).
