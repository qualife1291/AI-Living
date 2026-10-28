# Việc còn lại

Đây là backlog duy nhất, không là nhật ký những phase đã làm. Context/bằng chứng hiện tại ở [handoff](CODEX_HANDOFF.md), hợp đồng ở docs theo chủ đề.

## Thứ tự tiếp theo

| Phase | Việc làm | Nghiệm thu |
|---|---|---|
| H2: promotion còn chờ | V1 đã đo và không promote; chỉ nghiên cứu v2 khi có protocol mới | Cả3 candidate trượt return, stress còn trượt needs; warm chưa chứng minh lợi ích. Không retune20seed đã xem. Nếu thử tiếp, tách train/validation/holdout mới, giữ raw reward/context/emergency guards, durable receipt/CAS trước runtime; return/needs không giảm, opportunity-cost không tăng, entropy≥80% baseline bằng paired CI. |
| H3b / WP3 — chờ authority | Reward dài hạn sau nền evidence v1 | Social/travel/commitment chỉ từ effect hoàn tất có nguồn và authority thật; reward/features mới tách namespace, đo chống reward hacking/action dominance. Không thưởng từ ETA/thoại hoặc backfill giả. |
| H4 / WP4 — bước code tiếp | Shared-role priors sau provenance | Role/personal tách nguồn/confidence, giữ cá tính và earned samples; tái sử dụng policy store0007, không tạo migration đè. Benchmark seed mới và CAS/retry. |
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
| H6: replay/curriculum/export | H2 đã có synthetic residual-prior CLI/hash/seed split; còn compatible archive replay/curriculum, không coi phần synthetic này hoàn tất H6. Prior/replay gắn nguồn, không thành trải nghiệm thật. Memory backfill additive có checkpoint/CAS/đối chiếu ID. DPO chỉ chosen/rejected cùng prompt/context/model; validator thật, không gán score 98 tự động. Không tự thuê GPU/fine-tune. |
| Bối cảnh tại chỗ | LocalSceneContext chỉ gồm vật/thú/cây/tàu thực có gần actor;49 thẻ biên tập hiện tại không phải observed event/occupancy. |
| Density/LOD | Giữ footprint, skeleton/matrix/drawcall budget và chuyển LOD liên tục; đo60/120/240 trên GPU thật trước tăng density live. |
| Traffic/indoor | Nhiều làn/giao lộ/tín hiệu/parking/ray/điểm dừng; walking→waiting→boarding→riding→alighting dùng occupancy chung; indoor có vào/ra/collider. Model tĩnh không phải tuyến chạy. |
| Flora/habitat | Cây lớn, thu hoạch/inventory/NPC care có outcome; loài đúng model/sinh cảnh và clip hợp lệ. Không fly kiwi/penguin hoặc loop attack/dead. KayKit gallery chưa là placement city. |
| G1/G2 | Trời/IBL/emissive/AO, rồi wetroad/water/bloom optional theo preset. Phong không tự nhận IBL; thử Standard material thật, ảnh7pha và đo frame/drawcalls/dispose. |
| G3/G4 | IK/look-at/LOD/interior, rồi bản sắc phố/xe máy/nước; giữ rig proportions/nav/footprints và routing/occupancy. |
| Model A/B | Artifact/license/checksum, cùng prompt/context/schema; đo latency/tokens/acceptance và review ngữ nghĩa. Không hứa JSON 100%/<10s hoặc model lớn luôn tốt hơn. |
| Ops/refactor | GPU/soak/telemetry phiên dài; chat rate/body admission, tăng trưởng audit/history, GET living/context cost cần đo. Refactor runtime/supervisor loopback giữ regression, không sửa credential helper hay workflow read-only để autopush/deploy. |

## Xã hội và model — phần bổ sung để làm sau

Đã đối chiếu hai attachment28/10 với source và điều khoản/model card NVIDIA tại [review máy đọc](docs/validation/society-nim-review-2026-10-28.json). Đây là backlog có điều kiện, không thêm root spec hay chuỗi đọc bắt buộc. Ưu tiên H3→H4→H5/H6/H10; không tạo module/cờ placeholder hoặc mua dịch vụ chỉ từ tài liệu.

| Gói tương lai | Phạm vi được nhận và điều kiện |
|---|---|
| WP20 kinh tế | Sau business/employment: journal chuyển tiền có receipt/CAS, cùng currency/units, không âm. Tổng gồm cash+savings+business+quỹ; thuế là chuyển nội bộ, tiền khởi tạo/tân cư cần nguồn rõ. Reconcile moneyDelta cũ, guard stock0 và budget. Bounded snapshot, giữ journal; chưa áp thuế hoặc claim lạm phát5%. |
| WP21 nhà/tân cư | Mở rộng60 cửa/home/identity và population loop hiện có; capacity/ownership/rent đồng bộ kinh tế, không tạo vòng nhập cư thứ hai. Chuyển nhà/đi giữ IDs/memory/home/pet/history; lifecycle/family cần thiết kế riêng. |
| WP22 học nghề | Mastery theo domain đã có; mentor/apprentice hai phía và completed session có authority, giới hạn practice/ngày. Contract/shift trước wage; pension phải có quỹ, chưa thêm retirement tự động. |
| WP24 nhóm/dự án | Sau bonds/kinh tế/nhà: nhóm thành viên riêng biệt, lịch/nơi hợp lệ, họp có authority, dự án reserve/spend/complete cùng CAS. Giải thể giữ lịch sử; chưa đổi hợp đồng thoại hai speaker. |
| WP23 văn hoá/tin | Sau calendar/nhóm và sharing authority: template/curated source rõ, public availability tách heard/witnessed; hop có source/dedup/decay, bảng tin không phục hồi độ tin cậy của gossip. Không biến tác giả biên tập thành cư dân đã sáng tác. |
| WP25 care | Adult care sau health/bonds/outcome authority, numeric health giữ tương thích. Hai phía phải có effects xác nhận, không tạo tiền/chuyên môn y tế; child/family ngoài đợt này. |
| WP26 ký ức chung | Sau nhóm/care/news: public availability ≠ witnessed. Actor/witness/heard-source lọc trước retrieval/prompt; reputation từ receipt có nguồn. Không mở public API/audience, giữ audit và knowledge isolation. |
| WP27 norms offline | Sau versioned dataset đủ chất lượng: effect size, temporal dependence, multiple-testing và holdout mới;6tháng/p<.01 riêng lẻ không đủ. Artifact/schema/hash và review trước promote, không tự áp luật/code/deploy. |
| NIM P0→P4 (tuỳ chọn) | Sau các mốc học ưu tiên: adapter chat/embed/rerank cô lập→100fixture thoại Việt→memory retrieval→reflection→review giữ/loại/local. Chỉ synthetic, disabled mặc định, quota/deadline/fallback và metric có uncertainty; không network trong pulse/planner/CAS. Trial API **và output** không dùng production; không key/account/quota/inference nào đã được kiểm. Chưa thêm vector DB/backfill hay7model runtime. |

Retention chỉ giới hạn working set/cache; giữ durable journal/history. Dry-run không ghi world/policy; lỗi invariant phải hủy batch thực sự và báo lỗi. Bảng phụ thuộc trong spec là gợi ý, không thay authority/gates hay chứng minh đã triển khai. Không nhận quota D1/API cố định, số suite38 cũ, tốc độ/FPS/miễn phí production làm bằng chứng.

## Đề xuất ngoài và ranh giới

Ưu tiên mới của chủ dự án: học policy từ outcome và huấn luyện/tối ưu offline trước; hệ thống thế giới phát triển cùng các mốc học, không hứa online fine-tune LLM. Hai file Claude/Deepseek28/10 đã đối chiếu trong [intelligence-review](docs/validation/intelligence-review-2026-10-28.json). Không chép lại spec vào gốc hoặc phục hồi memory/review MD dài. H1/H2 đã có baseline/gates tại LEARNING và validation; H2 v1 kết thúc bằng không promote, default giữ LinUCB. H3 foundation đã có versioned reward evidence/archive audit, giữ v1 reward; tiếp H4 hierarchy trên nguồn tương thích, H3b chờ authority; không cần bật residual thất bại để làm provenance. Các tính năng phụ thuộc authority vẫn phải chờ bằng chứng tương ứng.

WP7 còn curation/few-shot theo context; WP8A–C goals/business/bonds và WP11 triggers cần whitelist/authority/giới hạn. WP12–19 mở rộng weather/calendar/laws/content/security/education/health/environment trên các schema hiện có; giữ nguồn TP.HCM và không giả dữ kiện y tế/pháp luật. Family/lifecycle không thuộc đợt này. Các mục đã có (LinUCB, policy store, RAG, dialogue pool, health error,3D/docs) không triển khai trùng.

Đã đối chiếu Gemini và `AI-Living-review-va-de-xuat.md` của Claude sau source H0. Claude đọc ZIP38 suite; các nhận xét thiếu LinUCB/runner/memory/mobile đã cũ. Phần còn phù hợp được đưa vào các hàng trên; review đầy đủ còn trong Git tại mốc `2ef7e3f`. H0 đã coalesce pulse D1, nhưng chưa bỏ client fallback vì scheduler production chưa xác minh.

Không nhận claim 3,71×/20–50×/score 98/FPS/SLA từ tài liệu làm bằng chứng. Không xóa tick/chat history theo đề xuất retention; không đổi owner-private/route permissions hoặc chặn server calls hợp lệ chỉ vì thiếu Origin. Benchmark hiện hành báo cả mặt LinUCB chưa thắng thưởng tức thời.

Public viewer, nhân vật multi-user, video/social, WebGPU và LoRA tự động là hướng dài hạn, chưa bật. Studio phải dùng timeline/nhật ký riêng; hội thoại hiện đúng hai speaker, không thêm người thứ ba mà bỏ qua quyền biết/timing. Xem [DECISIONS](docs/DECISIONS.md).
