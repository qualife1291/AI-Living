# Context tiếp nhận — 16/11/2026

Đọc [AGENTS](AGENTS.md) → file này → [ROADMAP](ROADMAP.md). Chỉ mở tài liệu đúng chủ đề từ [README](README.md); ROADMAP là backlog duy nhất.

## WIP — giảm rows_written và gỡ tụ tập

Ưu tiên chủ dự án: hôm qua Cloudflare cảnh báo80%, nhân vật lag/tụ nhóm. Đang test gate55s/browser60s (shared ground1s giữ), bỏ audit duplicate tick, telemetry sample60s/critical15s/backoff, JSONL không hydrate và7route bounded streaming. Cost fixture coordination721→121rows/giờ; telemetry41→11POST/10phút. Viewer-only congestion recovery đạt72/72đến đích trong180s mô phỏng, swept collision/no-teleport/pause/world unchanged đạt; đang chạy full/API/browser, **chưa phát hành**. GND authority mặc định giữ algorithm cũ, không migrate/reset/model promote. API/body/queue tests đạt, còn build/full/browser cùng source và bổ sung evidence.

## Trạng thái nền

| Phần | Context cần giữ |
|---|---|
| Git/release | Làm trên `work`; QA hosting/auth/Cron/catalog nằm riêng ở `cloudflare-qa`, không merge ngược. `main`402df57. Fetch trước push. Push không tự chứng minh đã deploy hoặc migrate. |
| QA đã xác minh |a7eaea0:101suite, compiled API và browser desktop/mobile CI đạt; Cloudflare App báo version cùng source. [Cleanup/release evidence](docs/validation/repository-cleanup-2026-11-16.json); [learning snapshot trước đó](docs/validation/learning-observation-2026-11-16.json). Chưa authenticated traffic/env/D1/Cron/quota/GPU/soak readback. |
| Live/learning | LinUCB cá nhân học outcome theo plan;9night action và giờ ngủ riêng theo simulation clock. QA103day+9night;41legacy/96shadow không đổi. H6/scorer/canary OFF, chưa quality gain. Đã sửa dirty-policy writes, archive replay, wake/nap; QA lọc thiếu tiền trước scoring và book fare ở cả learning-first/tick-first. [Contract](docs/LEARNING.md). |
| Ground/P2P | GND1–3 có local journal/replay/receipt. H3b/H5a offline; H5b1 journal/verifier có test nhưng chưa app/API/pulse/importer hoặc P2P live.0012 chỉ được kiểm fixture. [H5b1](docs/LEARNING.md#h5b1--journal-và-đối-chiếu-receipt-bền-vững). |
| Đồ họa |5supplied skin dùng chung city/Studio/phòng; bed/sofa/dining/cinema/fridge/TV có contact trình bày. Camera/floor giữ canvas, visibility gating, Studio30Hz/OSM on-demand đã có proof. Animation không cấp physical receipt. [Renderer](docs/RENDERING.md), [UI evidence](docs/validation/ui-review-2026-11-05.json). |
| Sites A | [latest.json](docs/releases/latest.json) là readback lịch sử version11; [candidate](docs/releases/candidate.json)77d1d1f chưa deploy.24table source không là schema live. Backup/readback theo [runbook](docs/PRODUCTION_RUNBOOK.md) trước cutover. |

## Việc tiếp theo và giới hạn

1. Nghiệm thu source QA mới: native traffic/env/D1/Cron/quota và authenticated API/browser; phiên trước chỉ có Access302. Snapshot read-only07:35 có52.827experience=memory=sumPolicySamples/105policy. Cần đo cohort/UTC window sau fix, không suy intelligence gain từ sample tăng.
2. GPU/mobile/soak và nightly behavior qua speed/pause theo P0 của ROADMAP; headless/local fixtures không thay thiết bị thật hoặc24h.
3. H5b2 producer trước choice → inbox/consumption CAS/quota/TTL/clock fence → privacy/evaluation. Giữ các model chưa đạt promotion gates và holdout đã đóng băng.
4. Kiểm vault nguồn/backup ngoài workspace theo [registry](data/assets/source-archives.json); chưa có bằng chứng backup ngoài workspace thành công.

Không reset hoặc tự resume world; giữ ID/born/history/memory/home/petOwners/policy và unfinished plans. Các bất biến chung ở AGENTS, hợp đồng ở tài liệu chủ đề; lịch sử test/SHA/ảnh ở validation và Git. Docs hậu release chỉ push `work`, không redeploy chỉ để đổi tài liệu.
