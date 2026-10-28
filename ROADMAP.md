# Việc còn lại

Đây là backlog duy nhất, không là nhật ký những phase đã làm. Context/bằng chứng hiện tại ở [handoff](CODEX_HANDOFF.md), hợp đồng ở docs theo chủ đề.

## Thứ tự tiếp theo

| Phase | Việc làm | Nghiệm thu |
|---|---|---|
| H2 / WP1–2 | Thử policy prior-residual/EMA/progress, rồi warm start | Trước hết thêm stress/cold-start profile vì H1 needs gần trần/competence ngày3. Version mới giữ raw reward/context-at-choice/emergency guards, không giả trials. Ngưỡng candidate tương lai: return/needs không giảm, opportunity-cost không tăng, entropy≥80% baseline bằng paired CI. Không đạt thì giữ policy hiện hành. |
| H3/H4 / WP3–4 | Reward có nguồn rồi shared-role priors | Chỉ completed outcomes có authority; role/personal tách provenance, matrices/reward/features version mới. Tái sử dụng policy store0007, không tạo migration đè. Durable receipts/CAS giữ retry. |
| H5 / WP5 | P2P sau xác nhận cuộc gặp/chia sẻ | Ground/encounter authority trước; tips không thành own samples/observed memory, decay on-read và actor isolation. |
| H6 / WP6 | Prior/replay offline, ưu tiên học trước feature khác | Chỉ synthetic/compatible archived context; artifact hash/schema/provenance, confidence bounded, không tăng earned samples. Đo cold-start trên seed giữ lại, không ghi live DB. |
| H10 / WP10 | Tối ưu tham số offline có giới hạn | Sau harness/prior hợp lệ; train/validation seeds tách, budget cố định, diversity và paired CI. Runtime chỉ đọc artifact đã review, không tự sửa code/đổi policy/deploy. |
| G0/UX | Tải/resolution và UX tiếp tục sau các mốc học đủ điều kiện | Đo bytes/first-frame, derivative giữ canonical/license/hash; pause403/409/5xx/network, chat focus, metadata, mobile/keyboard/reduced-motion có QA. Không mở public để sửa403. |

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

Ưu tiên mới của chủ dự án: học policy từ outcome và huấn luyện/tối ưu offline trước; hệ thống thế giới phát triển cùng các mốc học, không hứa online fine-tune LLM. Hai file Claude/Deepseek28/10 đã đối chiếu trong [intelligence-review](docs/validation/intelligence-review-2026-10-28.json). Không chép lại spec vào gốc hoặc phục hồi memory/review MD dài. H1 đã có baseline/gates tại LEARNING và validation; tiếp H2 theo thứ tự, các bước sau chỉ mở khi phụ thuộc và đo lường đạt.

WP7 còn curation/few-shot theo context; WP8A–C goals/business/bonds và WP11 triggers cần whitelist/authority/giới hạn. WP12–19 mở rộng weather/calendar/laws/content/security/education/health/environment trên các schema hiện có; giữ nguồn TP.HCM và không giả dữ kiện y tế/pháp luật. Family/lifecycle không thuộc đợt này. Các mục đã có (LinUCB, policy store, RAG, dialogue pool, health error,3D/docs) không triển khai trùng.

Đã đối chiếu Gemini và `AI-Living-review-va-de-xuat.md` của Claude sau source H0. Claude đọc ZIP38 suite; các nhận xét thiếu LinUCB/runner/memory/mobile đã cũ. Phần còn phù hợp được đưa vào các hàng trên; review đầy đủ còn trong Git tại mốc `2ef7e3f`. H0 đã coalesce pulse D1, nhưng chưa bỏ client fallback vì scheduler production chưa xác minh.

Không nhận claim 3,71×/20–50×/score 98/FPS/SLA từ tài liệu làm bằng chứng. Không xóa tick/chat history theo đề xuất retention; không đổi owner-private/route permissions hoặc chặn server calls hợp lệ chỉ vì thiếu Origin. Benchmark hiện hành báo cả mặt LinUCB chưa thắng thưởng tức thời.

Public viewer, nhân vật multi-user, video/social, WebGPU và LoRA tự động là hướng dài hạn, chưa bật. Studio phải dùng timeline/nhật ký riêng; hội thoại hiện đúng hai speaker, không thêm người thứ ba mà bỏ qua quyền biết/timing. Xem [DECISIONS](docs/DECISIONS.md).
