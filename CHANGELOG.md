# Changelog

Chỉ ghi mốc sản phẩm. Chi tiết commit/review nằm trong Git; số version/deployment và readback nằm ở [releases](docs/releases/).

## 29/10/2026

- Bộ12rig Citizens nguyên bản cho core/NPC gần/Studio, tải trễ tự đổi về model chính, fallback cùng phong cách; bỏ renderer Kenney character không còn dùng. Studio chung tỷ lệ với đạo cụ, sửa tư thế cúi/đỡ mèo. Review341GLB ZIP1/2 với hash/texture/ảnh thật và kế hoạch nhập chọn lọc A1–A5; không đưa ZIP hoặc asset thừa vào app.

- H3b offline thêm goal/context trước plan, delayed rendezvous reward từ hai GND3 presence receipt/contact và actual travel cost; trainer/CLI có namespace/partition/exact-once/file guards.96task physics, train lặp cùng hash,70suite và H1 golden đạt. Holdout model từ chối48/48 nên **không promote**, giữ nguyên runtime; [evidence](docs/validation/learning-h3b-2026-10-29.json).

- GND3 local thêm receipt arrival/presence/co-presence/emitted/heard từ physics GND2, clock/plan/window/recipient binding và0011 ledger cùng CAS. Shared viewer chỉ phát caption server đúng checkpoint, ACK không ghi memory.69suite,5nhóm compiled D1 API và browser hai viewer/default regression đạt; [evidence](docs/validation/ground-authority-2026-10-29.json) ghi cả preview failure/retest. Chưa reward/P2P/training, remote QA hoặc rollout production.
- Studio v2 thay đường render character cũ bằng daily rigs/tay có khuỷu, mèo articulated/khăn cong, nối chuyển động và camera portrait;21voice Việt offline+foley opt-in có provenance. Bốn cảnh desktop/mobile, contact/seek và AudioContext thật đã kiểm; [report/ảnh before-after](docs/validation/studio-quality-v2-2026-10-29.json). Giữ asset còn dùng ở city/gallery và license.
- Nghiệm thu lại chức năng local:63suite,4nhóm compiled API và20harness browser, gồm4timeline120s+studio desktop/mobile. Sửa camera tán cây/companion/catch-up và prompt ví dụ lệch cảnh; từ chối output model bị cắt. Giữ negative learning/model quality,27lượt lỗi+disposition, ảnh thật và blocker production tại [acceptance](docs/validation/acceptance-2026-10-28.json); chưa deploy/migrate prod.

## 28/10/2026

- GND2 thêm immutable world journal cùng transaction, server replay người/NPC/thú/12xe với serialized bike/tag/pet state, checkpoint/CAS/receipt và canonical clock. Local `?ground=shared` đọc frame server theo cùng absolute time, không vật lý riêng;63suite/compiled D1 và browser hai viewer desktop/mobile đạt. Migration0010 chưa prod, chưa reward/P2P/encounter; gói prod chặn preview/runtime caches.

- Ground GND1 thêm server timeline local cho3core/static footprints:100ms fixed-step, bounded backlog/speed/swept collisions, plan SHA/observation và arrival scope riêng. Migration0009 giữ session+operation receipt cùng CAS/postassert rollback.62suite và compiled D1 đạt; renderer/traffic chưa chung, receipt không cấp reward/P2P, chưa migrate production.

- H6b thêm curation few-shot/DPO offline: exact request/context/model/sampling/source SHA, review ngữ nghĩa riêng, validator thật, actor-owned memory và connected splits/train-only selector. CLI mặc định preview, export private600/atomic/exclusive;6 cặp mới là biên tập rõ, không nâng nhãn6partial cũ.61suite/check/lint/build/assets/API local đạt; chưa training, corpus model thật hay runtime importer.

- Memory backfill local có preview/plan-SHA/checkpoint-CAS, nguồn episode đúng recipient/outcome có evidence, stable-ID/legacy reconciliation. Migration0008 thêm job/receipt/index; batch lỗi rollback cả cursor/memory, không rewrite world/policy/history.60suite/API đạt; chưa backfill production, còn dataset curation.

- H6b thêm replay nhiều file local có manifest/source SHA, checkpoint SQLite/CAS và cursor byte+line. Batch lỗi/crash không cộng dở; chỉ fit một lượt khi hoàn tất, export private không ghi đè.59suite và API JSONL→bulk/resume đạt; giữ nguyên own samples/history/runtime, chưa memory backfill hoặc promote policy.

- G0/UX thêm26 transport gzip lossless/hash-pinned, fallback canonical và tải avatar dự phòng khi cần; render pixel budget theo màn hình/DPR. Pause phân biệt lỗi/ACK, chat giữ focus/draft, camera keyboard/reduced-motion và metadata hiện hành.58suite/API và browser desktop/mobile đạt; canonical/license/dữ liệu học giữ nguyên.

- H10 thêm optimizer offline có grid/budget/seed cohorts cố định, effect/diversity gate và stage hashes.9candidate→2validation, không selection nên giữ holdout chưa dùng và LinUCB hiện hành.57suite/API đạt; không cài config, sửa code tự động hoặc deploy.

- H6 thêm actor-scoped local archive replay có SHA/dedup/conflict guard, one-pass numeric curriculum và warm24 study trên seed mới.56suite/API JSONL integration đạt; ridge order chỉ khác số học, warm24 chưa đủ gates nên giữ LinUCB. Không sửa history, own samples hoặc bật runtime importer.

- H4 thêm global/role.kind priors có H3 provenance, strict artifact/seed split và bounded prediction blend;55suite/API local đạt. Warm-start ngày đầu và MSE tốt hơn trong mô phỏng, nhưng reward60ngày giảm nên chưa promote; default LinUCB cá nhân giữ nguyên.

- Review Society/NIM, đưa phần phù hợp vào backlog có phụ thuộc và sửa accounting/knowledge/retention assumptions. H3 thêm evidence/version/breakdown cho reward simulation hiện hành và audit JSONL offline; giữ raw reward/LinUCB/legacy, chưa có reward dài hạn hoặc tích hợp NIM.

- H2 thêm cold-stress, model-prior/residual-EMA và warm prior có provenance/seed split, receipt chống replay; hơn5,5 triệu plan đánh giá offline. Cả3 candidate chưa đủ gates thay LinUCB; giữ default, không ghi liveDB.53suite/check/lint/build/assets/API local đạt.

- Review hai spec Claude/Deepseek và ưu tiên lộ trình học hành vi/offline prior trước các mở rộng đồ họa. H1 thêm rollout runtime20seed×60ngày×24agent và paired confidence intervals; expected outcome/gates tách thuần,15375golden outcomes/1500choices giữ nguyên.52suite/check/lint/build/API local đạt; chưa bật policy mới hoặc deploy.

- Dọn tài liệu: hai file để tiếp nhận, một backlog, tài liệu theo chủ đề; bỏ bản sao/review/WIP cũ và bộ nhớ lặp. Giữ license, đặc tả gốc, release ledger và bằng chứng QA. Không đổi hành vi ứng dụng.
- H0: pulse dùng admission chung D1, expiry/nonce/retry; diagnosticsGET chỉđọc và healthschema batch.51 suite/check/lint/build/assets/API đạt; chưa deploy Sites.
- Flora:5 khóm/30 cây,5 phase/moisture theo simclock, care owner/CAS và camera; hai batch giữ footprint cũ. Browser desktop/mobile đạt.
- Learning:LinUCB6D/policy store0007,8 domain skills/gates, structured memories/top-K/RAG, dialogue pool/xưng hô,49 context cards/33 nơi; planKey/full-duration report không cộng sớm/trùng.
- 60 cửa và địa chỉ household additive, camera Xem nhà; audio WebAudio opt-in có pause/hidden/dispose. Không indoor/arrival authority hay fine-tune.

## 27/10/2026

- Chỉ giữ3D; pet assignment/follow, tag theo cặp và xe đạp di chuyển với vùng va chạm toàn xe; DOM tên/thoại gọn, camera mobile.
- 239 Gobkit/KayKit canonical CC0 và gallery on-demand; clone skeleton độc lập, clip mapping/lifecycle. Giữ appearance và lịch sử.
- Sửa chuyển động cộng dồn, props còn sau đổi plan, cắt thoại khi frame trễ, mất telemetry khi HTML200/ACK lỗi và batch UTF8 quá lớn. Migration0006 thêm telemetry/index.

## 24–26/10/2026

- Snapshot/events/idempotency/CAS, segmentedclock/routine và planner; NPC, contexts/cache, daemon local, experience archive0003.
- Thành phố Three.js, OSM snapshot có attribution, wardrobe/interior preview, social scripts, visitor chat/rules, lượt mở và pulse.
- Production đếnversion11 được ghi trong ledger riêng; không suy rằng source mới đã deploy hoặc scheduler/LLM đang chạy24/7.
