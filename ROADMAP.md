# Việc chưa hoàn tất

Backlog duy nhất của dự án: H5b1 nghiệm thu trên `work`13999b2; đối chiếu `main`402df57 và `cloudflare-qa`7157c32 ngày29/10/2026 (Asia/Saigon). Local test/build không thay runtime readback hoặc deployment. Context hiện tại ở [handoff](CODEX_HANDOFF.md); số liệu/SHA test ở validation và release ledger.

**Trạng thái:** *Chưa có* = thiếu implementation; *Một phần* = có nền tảng nhưng thiếu phần được nêu; *Chờ nghiệm thu* = có code/bằng chứng ở phạm vi hẹp hơn; *Nhánh riêng* = chưa hợp nhất vào work/main; *Chưa đạt* = đã nghiên cứu nhưng chưa đủ gates để bật; *Hoãn* = ngoài phạm vi đang triển khai.

## Ưu tiên 0 — nghiệm thu, vận hành và bảo toàn nguồn

| Mục | Trạng thái | Phần còn làm và điều kiện đóng |
|---|---|---|
| QA cùng source | Chờ nghiệm thu | Authenticated browser/API trên đúng bản QA hiện hành, readback version/config/D1 và independent review. Native Cron/log correlation đã có cho 4377; QA 7157c32 đã hợp nhất H6 marker và Studio followup, cần readback cùng source và kiểm cảnh bế mèo trên remote. Không dùng CI success, HEAD 403 hoặc ảnh local thay authenticated E2E. [QA](docs/CLOUDFLARE_AGENT_QA.md), [Ops evidence](docs/validation/qa-observability-2026-10-29.json). |
| Production/cutover | Chờ nghiệm thu | Lấy capability hiện hành, full backup DB/schema, dựng candidate từ source đã duyệt, migration append-only theo DB thật và readback đầy đủ. Gói 77d1d1f chưa deploy; giữ một writer/scheduler, IDs/born/history/memory/policy và rollback. Staging/QA/Sites A có auth và DB riêng. [Runbook](docs/PRODUCTION_RUNBOOK.md). |
| GPU, soak và chi phí | Chờ nghiệm thu | Đo thiết bị thật ở 60/120/240 actor trước tăng density; mobile pin/nhiệt, tài nguyên/dispose và phiên dài/24 giờ. Đo CPU/D1/polling/history growth, GND2 catch-up/scale 60 và crowd liveness. Log/progress CLI đã có; snapshot 15 phút không thay soak hoặc bảo đảm 24/7. [Testing](docs/TESTING.md), [Observability](docs/OBSERVABILITY.md). |
| Backup ZIP nguồn | Một phần | Kiểm vault theo manifest và tạo backup ngoài workspace bằng kênh được cấp quyền; lần upload được ghi nhận trước trả 401. Giữ license/hash và nguyên bản, chia ZIP4 nếu đích giới hạn 2 GiB. Không đưa raw ZIP hoặc credential vào repo công khai. [Asset](docs/ASSETS.md). |

## Ưu tiên 1 — nối các nền tảng đã có và đóng integration

| Mục | Trạng thái | Phần còn làm và điều kiện đóng |
|---|---|---|
| H5b / WP5: P2P bền vững | Một phần | H5b1 có journal immutable + exact source/two-head CAS và verifier đọc emitted/heard từ D1; chưa app import hoặc migrate live. Tiếp producer trước choice, transactional inbox/receipt-consumption CAS + quota/TTL/clock fence, API owner/recipient privacy và evaluation trước runtime. JSON/caption/forwarded story không là authority; lời kể không thành own samples, skill hoặc witnessed memory. [Contract](docs/LEARNING.md#h5b1--journal-và-đối-chiếu-receipt-bền-vững), [evidence](docs/validation/peer-offer-journal-2026-10-29.json). |
| H3b / WP3: grounded reward runtime | Một phần / chưa đạt | V1 có physics study nhưng model trượt. Cần protocol/split mới, offer/context trước choice, durable goal/settlement/CAS và chống action collapse trước runtime. Không thưởng ETA/thoại hoặc coi presence là lao động/y tế. Không retune cohort đã xem. [H3b evidence](docs/validation/learning-h3b-2026-10-29.json). |
| H6 shadow R1–R3 | Một phần | Catalog 96/trainer/workflow đã merge; QA marker `shadow-only` không là model inference. Còn baseline24–72 h theo source, scorer cùng live decision/context chỉ ghi aggregate, compatibility/privacy/CPU và rollout/rollback có gate. Runtime 41/personal LinUCB giữ nguyên; không tạo fake policy rows/arms/samples để đạt coverage. [H6](docs/H6_OFFLINE_POLICY_SCALE.md). |
| H2/H4/H6 priors và H10 search | Chưa đạt | Giữ kết quả negative/no-selection hiện có. Nghiên cứu mới cần protocol, split/seed mới, effect thật và strict full-profile gates trước installation/version/CAS/rollback runtime. Bảo toàn artifact/provenance trước khi artifact CI hết hạn; không copy donor matrices/samples hay mở lại holdout 12000–12019 để retune. [Learning](docs/LEARNING.md). |
| Corpus, model A/B và thoại tự nhiên | Một phần | Có rules/local LLM, RAG, replay/backfill/curation; còn exact capture model/prompt/context/actor-scope, review ngữ nghĩa độc lập và blind evaluation theo renderer hiện hành. Đo latency/tokens/repetition/continuity/acceptance cùng schema; chỉ bật model/few-shot sau gates. Sáu fixture editorial, heuristic score và model lớn không tự chứng minh chất lượng. [Learning](docs/LEARNING.md). |
| Ground dùng chung ngoài local | Một phần | GND1–3 có journal/replay/receipt; còn rollout có backup/schema, long-session budgets và effects ngoài arrival/presence/heard. Chứng minh completion/đến nơi từ authority đúng phạm vi trước khi nối memory/reward; default viewer/projection không tự trở thành multiplayer authority. [Architecture](docs/ARCHITECTURE.md). |

## Ưu tiên 2 — đời sống, bối cảnh và đồ họa

| Mục | Trạng thái | Phần còn làm và điều kiện đóng |
|---|---|---|
| A3: props đời thường | Một phần | Nhập chọn lọc bàn/ghế/sách/đèn/máy tính/bàn cờ, palette/LOD/footprint và semantic binding; gallery chưa là placement city. Không nhập casino props chỉ vì free. Inventory/outcome phải có code và nguồn riêng. [Assets](docs/ASSETS.md). |
| A4: nhà/chợ/công trường | Một phần | Chuẩn hóa module/atlas/LOD và collider cho indoor/chợ. ZIP4 là 50 mesh tĩnh×5 LOD: re-rig/tách dụng cụ, giảm texture trước placement; không coi tư thế là hành vi/nghề. Giữ ngân sách hình học/texture theo [asset review](docs/validation/asset-review-2026-10-29.json), không nhập raw nặng. |
| Traffic, boarding và indoor | Một phần | Giao lộ/nhiều làn/tín hiệu/parking; walking→waiting→boarding→riding→alighting dùng occupancy chung. Thêm vào/ra nhà, collider/nội thất/thang máy và routing tương ứng. Model xe/nhà tĩnh không thay tuyến chạy hoặc boarding authority. [Rendering](docs/RENDERING.md). |
| Flora, habitat và care | Một phần | Có growth/tưới cây, pet-follow và model/clip loài; còn thu hoạch/inventory/NPC care có outcome, habitat và ecology phù hợp. Không cho kiwi/penguin bay, loop attack/dead hoặc cấp reward từ animation. [Rendering](docs/RENDERING.md), [Assets](docs/ASSETS.md). |
| Bối cảnh có nguồn | Một phần | 49 context cards là gợi ý biên tập. Mở rộng LocalSceneContext chỉ từ vật/thú/cây/phương tiện thực có gần actor; observed/witnessed/heard cần provenance riêng, không biến catalog hoặc dữ liệu stale thành event. [Learning](docs/LEARNING.md). |
| G1/G2: ánh sáng và vật liệu | Một phần | IBL/PBR/Standard material, emissive/AO, rồi wetroad/water/bloom optional theo preset. Kiểm ảnh 7 pha, màu/bầu trời/sightline và frame/drawcall/dispose; Phong không tự là IBL. Không tăng preset trước GPU/budget gates. |
| G3/G4: chuyển động và bản sắc phố | Một phần | Rig/crowd cùng skin, contact IK tay/bàn đạp, wardrobe và camera đã có. Còn foot IK trên nền/bậc, look-at/finger/weight transfer và chất lượng nội thất/phố/xe máy/nước. Giữ tỷ lệ/nav/footprints/LOD; IK không là vật lý toàn thân hoặc learning proof. [Rendering](docs/RENDERING.md), [Studio](docs/SCENARIOS.md). |
| Âm thanh bổ sung | Một phần | Có 21 voice Studio và soundscape opt-in; còn human listening/MOS, lip-sync và nhạc/foley/ambience mới qua license/ducking/loop/lifecycle. 25 WAV nguồn là nhạc, không tự gọi là ambience. Fab cần entitlement/tier/format portable hợp lệ trước nhập. [Assets](docs/ASSETS.md). |

## Theo phụ thuộc — chưa mở thành tính năng live

| Mục | Trạng thái | Phụ thuộc và điều kiện đóng |
|---|---|---|
| WP8A–C / WP11: goals/business/bonds/triggers | Một phần | Mở rộng các nền tảng hiện có bằng effect whitelist, durable decision/receipt/CAS và giới hạn. Không cho model hoặc trigger tự cấp tiền/skill/thực thi code. |
| WP20: kinh tế | Chưa có ledger đầy đủ | Journal chuyển tiền/currency/units/conservation, reserve/spend/stock/budget và reconcile moneyDelta cũ trước thuế/wage. Tiền khởi tạo/tân cư phải có nguồn; không claim lạm phát từ số biên tập. |
| WP21: nhà/tân cư/lifecycle | Một phần | Có 60 cửa/home/identity/population. Còn capacity/ownership/rent đồng bộ kinh tế, quá trình trưởng thành và quan hệ gia đình có thiết kế riêng; giữ ID/history/petOwners, không tạo population loop thứ hai. |
| WP22: học nghề | Một phần | Có mastery/domain skills. Còn mentor/apprentice hai phía và completed session có authority, quota thực hành; contract/shift trước wage, quỹ trước pension/retirement. |
| WP24: nhóm/dự án | Chưa có đầy đủ | Sau bonds/kinh tế/nhà: membership, lịch/nơi, họp có authority và reserve/spend/complete cùng CAS. Giải thể giữ history; không mở hội thoại 3 speaker bằng cách bỏ quyền biết. |
| WP23: văn hóa/tin | Chưa có đầy đủ | Sau calendar/nhóm/sharing: template/curated source, public availability tách witnessed/heard, hop/source/dedup/decay. Tác giả biên tập không thành cư dân đã sáng tác. |
| WP25: care xã hội | Chưa có đầy đủ | Sau health/bonds/outcome authority: adult care có effects hai phía; không tự tạo chuyên môn y tế/tiền. Child/family cần thiết kế riêng. |
| WP26: ký ức chung/reputation | Một phần | Có actor memories; còn group/public knowledge và reputation có receipt. Lọc owner/actor/witness/heard-source trước retrieval/prompt; không mở audience/API public. |
| WP12–19: weather/calendar/laws/security/education/health/environment | Một phần | Mở rộng schema/nguồn có sẵn theo từng effect được xác minh; giữ nguồn TP.HCM và không bịa lịch âm, pháp luật/y tế hoặc lịch giao thông. |
| WP27: norms offline | Chưa có | Versioned dataset đủ chất lượng, effect size, temporal dependence, multiple-testing và holdout mới; 6 tháng/p<.01 riêng lẻ không đủ. Review trước promote, không tự áp luật/code/deploy. |
| NIM P0–P4 | Hoãn / tùy chọn | Adapter cô lập→fixture tiếng Việt→retrieval→reflection→review sau các mốc học ưu tiên. Chưa xác minh key/account/quota/inference; disabled mặc định, không model/network trong pulse/planner/CAS. Trial API/output không dùng production. [Review](docs/validation/society-nim-review-2026-10-28.json). |
| Public/multi-user/video/WebGPU/LoRA tự động | Hoãn | Cần projection/namespace owner-character-world, consent/privacy và release gates riêng. Không bật trong các phase owner-private hiện tại. [Decisions](docs/DECISIONS.md). |

Thứ tự đóng: acceptance/backup → integration có chủ sở hữu → authority/H5b và quality gates → mở rộng đời sống/đồ họa theo phụ thuộc. Kết quả nghiên cứu cũ ở [Learning](docs/LEARNING.md) và [validation](docs/validation/), không là việc phải triển khai lại. Không reset history để sửa lỗi, tăng samples giả hoặc tự hạ test/promotion gates.
