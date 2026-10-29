# Việc còn lại

Đây là backlog duy nhất, không là nhật ký những phase đã làm. Context/bằng chứng hiện tại ở [handoff](CODEX_HANDOFF.md), hợp đồng ở docs theo chủ đề.

## Đồ họa mới — cập nhật theo yêu cầu 29/10

[Review ZIP1/2/3 và inventory có hash](docs/validation/asset-review-2026-10-29.json), [ảnh mở model thật](docs/screenshots/asset-review/zip-1-contact-sheet.jpg).343GLB và25bản nhạc trong ZIP1–3; chưa nhập binary các ZIP vào runtime. Chủ dự án xác nhận free; ghi nguồn theo xác nhận, không tự gắn CC0. Ba ZIP gốc đã giữ ngoài app ở `/workspace/AI-Living-assets/source-archives`, có [manifest/hash](data/assets/source-archives.json). GitHub draft upload hiện401, chưa có backup ngoài workspace; ZIP4 chưa nhận.

| Bước | Triển khai và gate |
|---|---|
| A1 — chọn bộ chung | ZIP1/2/3 đã đối chiếu; tiếp ZIP4 trước khi chốt phong cách. Ưu tiên5rig sinh hoạt Casino/Chess;2rig sân khấu cho cảnh riêng. Chỉ giữ canonical/texture/license/provenance cần dùng, loại bản trùng WC và exports FBX/OBJ cùng nội dung. Không lưu ZIP vào repo. |
| A2 — nhân vật | Audit adapter hiện tại đo5rig Casino bị nhỏ10.3–10.9units, tay bám index-finger/toe và một số clip Chess vượt radius; cần exact joint/idle/clip/root-motion normalization, atlas/material tương thích, geometry LOD và shared textures. Giữ radius/navigation/identity;3core+≤5near rig. Source7.7–11.2k triangles/6–8primitives mỗi người chưa đạt budget hiện tại khi nhân lên cả cảnh. City và4Studio phải qua contact/seek/pause/fallback/late-load, ảnh desktop/mobile, console và âm thanh. |
| A3 — đồ dùng | Chọn ghế/bàn/sách/đèn/máy tính/bàn cờ từ hai bộ; palette đồng bộ, semantic binding và footprint. Không nhập slot machine/casino props chỉ vì miễn phí. Hình ảnh không cấp inventory/skill hay xác nhận outcome. |
| A4 — môi trường sau | Chọn cây/rau/quả/đồ gỗ nhẹ trong225module, rồi indoor/chợ theo phụ thuộc gameplay. Chợ full115.240triangle/384primitives cần tách/merge/LOD; tách240UCX khỏi render WC. ZIP2 có module tường/cửa/mái55.900triangle/69texture, giữ kế hoạch chuẩn hóa từng module/atlas/LOD cho nhà gỗ hoặc indoor sau này. Sáu crateZIP2~1.5M triangles, backpack/ghế4K, crate445MB/3×8K và fantasy1.5M triangles không nhập raw. Texture rời phải chứng minh UV khớp trước dùng. |
| Âm thanh/animation bổ sung | ZIP3 có25bản nhạc48kHz stereo (~89.7phút), chọn sau human listening rồi OGG/ducking/loop/opt-in, không gọi là ambience hay bước chân. Mannequin nhiều LOD và rig xe đạp167joint chỉ làm tham khảo/retarget sau khi chuẩn hóa; giữ copyright UDD-CID. Fab đã đọc120listing/6detail; ưu tiên foley/ambience/props có format portable và tier phù hợp0đ, không nhập Niagara/UMG native. Chưa có account/library entitlement để tải file Fab. |
| A5 — remote QA còn chờ | Đã push`b157968`, Cloudflare Build1774e31b báo success; còn authenticated browser/native version/deployment/D1/scheduled progress và independent review. Giữ Access/JWT/D1 và một cron; không gọi build check là runtime acceptance. |

## Thứ tự tiếp theo

| Phase | Việc làm | Nghiệm thu |
|---|---|---|
| H2: promotion còn chờ | V1 đã đo và không promote; chỉ nghiên cứu v2 khi có protocol mới | Cả3 candidate trượt return, stress còn trượt needs; warm chưa chứng minh lợi ích. Không retune20seed đã xem. Nếu thử tiếp, tách train/validation/holdout mới, giữ raw reward/context/emergency guards, durable receipt/CAS trước runtime; return/needs không giảm, opportunity-cost không tăng, entropy≥80% baseline bằng paired CI. |
| H3b / WP3 — runtime/promotion chờ | V1 offline đã đo, không promote; cần protocol mới cho v2/runtime | [V1](docs/validation/learning-h3b-2026-10-29.json):96task actual physics, reward giữ hẹn/actual travel cost và namespace riêng. Holdout model từ chối48/48, giữ0/3cơ hội dương; không retune cohort đã xem. Runtime cần capture offer/context trước choice, durable goal/settlement/CAS và gates mới chống action collapse. Không thưởng ETA/thoại, hiện diện giả làm lao động hoặc trộn posterior v1. |
| H4/H6: promotion còn chờ | Runtime priors sau kết quả offline và nguồn phù hợp | Global/role.kind priors H4 và warm24 H6 chưa đủ gates để thay cá nhân. Nếu nghiên cứu tiếp cần protocol/seed mới; dữ liệu thật cần role-at-choice có nguồn, artifact installation/version/rollback/CAS trong store0007, không copy donor samples/matrices hoặc tạo migration đè. |
| H5 / WP5 — cần protocol/admission | P2P sau xác nhận cuộc gặp/chia sẻ | Sau GND3 local: cần sharing admission/namespace và benchmark actor isolation riêng; tips không thành own samples/observed memory, decay on-read và actor isolation. |
| H10: nghiên cứu/promotion còn chờ | Candidate mới sau finite search v1 | Grid9 và validation đã kết thúc không selection; holdout12000–12019 vẫn chưa dùng. Nghiên cứu mới cần protocol/search/validation khác và candidate có effect thật, không retune dữ liệu đã xem. Runtime artifact review/installation/version/CAS/rollback còn riêng; không tự sửa code/deploy. |

## Các phụ thuộc và phần chưa xong

| Mảng | Điều kiện cần hoàn thành |
|---|---|
| Ground/playback chung | GND2/GND3 local có source journal, all-actor replay, presence/encounter/heard và caption server. Còn bus/metro boarding, effects ngoài hiện diện, liveness/catch-up/long-session budgets và production rollout; xem [nghiệm thu GND3](docs/validation/ground-authority-2026-10-29.json). Bootstrap là simulation seed; client receipt/ETA/frame không cấp skill/P2P. |
| Phát hành owner-private | Native Sites đúng project/credential mới; backup full DB/schema0006–0011 theo tình trạng thật; exact candidate/readback history/memory và ledger. Không tạo lịch trùng. |
| H3: reward dài hạn | H3b offline v1 đã có grounded rendezvous objective, candidate trượt. Còn runtime goal/decision capture và durable settlement; commitment/social/travel chỉ từ effect đúng phạm vi có nguồn và gates chống reward hacking/action collapse. |
| H4: hierarchy | Global/role priors có provenance, tách prior/personal, giữ cá tính; benchmark cùng dữ liệu/gates và không tăng samples giả. LinUCB6D/normalized policy hiện đã có. |
| H5: P2P | Heard-from-peer chỉ khi sharing/cuộc gặp được xác nhận; lời kể không tăng trials/skill hoặc thành ký ức trực tiếp. Exemplar giữ context/validator/nguồn. |
| H6: corpus/model evaluation còn chờ | Replay/bulk/backfill và curation offline có rồi. Cần exact capture model thật theo renderer mới, source/model artifact/actor-scope, review ngữ nghĩa độc lập; không dựng prompt/role bị mất từ episode hoặc state hiện tại. Freeze dataset/version/splits và protocol/holdout mới trước model A/B. Sáu fixture mới đều editorial, chưa đo gain hoặc blind evaluation; không importer/runtime few-shot/training/promotion tự động, không thuê GPU/fine-tune. Prior/replay không thành trải nghiệm thật; backfill production còn riêng. |
| Bối cảnh tại chỗ | LocalSceneContext chỉ gồm vật/thú/cây/tàu thực có gần actor;49 thẻ biên tập hiện tại không phải observed event/occupancy. |
| Density/LOD | Giữ footprint, skeleton/matrix/drawcall budget và chuyển LOD liên tục; đo60/120/240 trên GPU thật trước tăng density live. |
| Traffic/indoor | Nhiều làn/giao lộ/tín hiệu/parking/ray/điểm dừng; walking→waiting→boarding→riding→alighting dùng occupancy chung; indoor có vào/ra/collider. Model tĩnh không phải tuyến chạy. |
| Flora/habitat | Cây lớn, thu hoạch/inventory/NPC care có outcome; loài đúng model/sinh cảnh và clip hợp lệ. Không fly kiwi/penguin hoặc loop attack/dead. KayKit gallery chưa là placement city. |
| G1/G2 | Trời/IBL/emissive/AO, rồi wetroad/water/bloom optional theo preset. Phong không tự nhận IBL; thử Standard material thật, ảnh7pha và đo frame/drawcalls/dispose. |
| G3/G4 | IK/look-at/LOD/interior, rồi bản sắc phố/xe máy/nước; giữ rig proportions/nav/footprints và routing/occupancy. |
| Model A/B | Artifact/license/checksum, cùng prompt/context/schema; đo latency/tokens/acceptance và review ngữ nghĩa. Không hứa JSON 100%/<10s hoặc model lớn luôn tốt hơn. |
| Ops/refactor | GPU/soak/telemetry phiên dài; chat rate admission (body stream đã giới hạn2.000B), tăng trưởng audit/history, GET living/context cost cần đo. Refactor runtime/supervisor loopback giữ regression, không sửa credential helper hay workflow read-only để autopush/deploy. |

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

Ưu tiên mới của chủ dự án: học policy từ outcome và huấn luyện/tối ưu offline trước; hệ thống thế giới phát triển cùng các mốc học, không hứa online fine-tune LLM. Hai file Claude/Deepseek28/10 đã đối chiếu trong [intelligence-review](docs/validation/intelligence-review-2026-10-28.json). Không chép lại spec vào gốc hoặc phục hồi memory/review MD dài. H1/H2 đã có baseline/gates tại LEARNING và validation; H2 v1 kết thúc bằng không promote, default giữ LinUCB. H3 foundation đã có versioned reward evidence/archive audit, giữ v1 reward; H4 đã có bounded global/role.kind prediction priors offline, chưa promote; H6 đã có replay/curriculum foundation và cold-start study không promote; H10 đã có bounded grid/staged selection, không candidate đạt validation và holdout chưa mở; G0/UX đã có transport/pixel budget và QA; H6b bulk/cursor, memory backfill local và curation offline đã có. GND3 local đã có authority giới hạn hiện diện/thoại; tiếp protocol/admission H3b/H5; không cần bật residual thất bại để làm provenance.

WP7 còn corpus model thật và runtime few-shot theo context sau đánh giá; WP8A–C goals/business/bonds và WP11 triggers cần whitelist/authority/giới hạn. WP12–19 mở rộng weather/calendar/laws/content/security/education/health/environment trên các schema hiện có; giữ nguồn TP.HCM và không giả dữ kiện y tế/pháp luật. Family/lifecycle không thuộc đợt này. Các mục đã có (LinUCB, policy store, RAG, dialogue pool, health error,3D/docs) không triển khai trùng.

Đã đối chiếu Gemini và `AI-Living-review-va-de-xuat.md` của Claude sau source H0. Claude đọc ZIP38 suite; các nhận xét thiếu LinUCB/runner/memory/mobile đã cũ. Phần còn phù hợp được đưa vào các hàng trên; review đầy đủ còn trong Git tại mốc `2ef7e3f`. H0 đã coalesce pulse D1, nhưng chưa bỏ client fallback vì scheduler production chưa xác minh.

Không nhận claim 3,71×/20–50×/score 98/FPS/SLA từ tài liệu làm bằng chứng. Không xóa tick/chat history theo đề xuất retention; không đổi owner-private/route permissions hoặc chặn server calls hợp lệ chỉ vì thiếu Origin. Benchmark hiện hành báo cả mặt LinUCB chưa thắng thưởng tức thời.

Public viewer, nhân vật multi-user, video/social, WebGPU và LoRA tự động là hướng dài hạn, chưa bật. Studio phải dùng timeline/nhật ký riêng; hội thoại hiện đúng hai speaker, không thêm người thứ ba mà bỏ qua quyền biết/timing. Xem [DECISIONS](docs/DECISIONS.md).
