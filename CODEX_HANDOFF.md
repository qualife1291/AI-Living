# Context tiếp nhận — 16/11/2026

Đọc [AGENTS](AGENTS.md) → file này → [ROADMAP](ROADMAP.md). Chỉ mở tài liệu đúng chủ đề từ [README](README.md); ROADMAP là backlog duy nhất.

## Ontology — 19/11/2026

[ONTOLOGY](docs/ONTOLOGY.md) là audit/design/schema/API/SDK/ví dụ/migration. O1–O4 đã có code opt-in: policy độc lập LLM, typed registry, D1 CAS/audit/token, workflow/dependency/bug ownership/GitHub read-only gates và simulation projection. Local97/97suite,27ca compiled API, legacy/diagnostics/progress và frozen learning đạt theo [evidence](docs/validation/ontology-2026-11-19.json). Feature OFF mặc định,0013 chỉ fixture; không merge/deploy/migrate QA/main hoặc đổi world/policy/model/Cron.

Implementation đã push`work`ở`b9429fd` sau khi retry lỗi xác thực tạm thời; CI44555336202đã đạt đúng source, gồm97suite/build/27ca compiled API. Không tìm token cũ hoặc mở audience. O5 còn backup/migrate/credential/native QA+usage và evidence CI cùng SHA trước mở rộng. QA3631067 vẫn là bản phát hành trước tác vụ ontology.

## Trạng thái nền

| Phần | Context cần giữ |
|---|---|
| Git/release | Làm trên `work`; QA hosting/auth/Cron/catalog nằm riêng ở `cloudflare-qa`, không merge ngược. `main`402df57. Fetch trước push. Push không tự chứng minh đã deploy hoặc migrate. |
| QA đã xác minh |3631067:app code bằngcf90e43 có105suite, compiled API và browser desktop/mobile local đạt; Cloudflare App và deploy gate cùng source đạt; browser CI đã đạt. [Cost/crowd release](docs/validation/system-budgets-2026-11-16.json); [cleanup trước đó](docs/validation/repository-cleanup-2026-11-16.json); [learning snapshot trước đó](docs/validation/learning-observation-2026-11-16.json). Chưa authenticated traffic/env/D1/Cron/quota/GPU/soak readback. |
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
