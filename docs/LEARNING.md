# Learning, context và hội thoại

Học policy trong mô phỏng, không fine-tune trọng số Qwen. Modules chính: `lib/living/{learning,linucb,policy-store,skills,memory-records,prompt-memories,context-cards,dialogue-pool,director,service}.ts`; schema/code là nguồn contract chi tiết.

## Outcome và policy

Disjoint LinUCB có6 features `[1,energy/100,hunger/100,socialNeed/100,isFreshRain,skill/100]`, ridge I, inverse covariance đối xứng21 số và b gồm 6 số; Sherman–Morrison fit outcome hợp lệ. Điểm `xᵀA⁻¹b + α√(xᵀA⁻¹x)` cùng needs/health/sleep/weather/novelty guards. Pending lưu context-at-choice; legacy thiếu context chỉ tabular, không tạo context/samples giả.

Chỉ outcome đúng plan, đủ toàn bộ duration mới cộng một lần. `planKey` phát hiện thay activity/location/duration/transport dù giữ timestamp; không là proof arrival/chữ ký. Encounter360s kiểm cả hai plan/outcome gốc, sống qua quiet slot; không nhận report ở180/300s hoặc retry cộng lại. Đây là **completion theo kế hoạch**, chưa ground authority/P2P witnessed meeting.

Tám domain thực hành: học tập, kỹ thuật, phục vụ, công việc/mua sắm, vận động, đi lại, chăm cây/thú, cộng đồng. Chỉ domain của scenario được tăng, archive giữ skillGain before/after/amount. New models cần scalar/domain gates cho dạy lớp/sửa xe/văn phòng/dự án học. Legacy giữ gate cũ, không backfill earned points hoặc hủy hồi tố plan. Đi khám không tạo chuyên môn y tế.

Migration 0007 `learning_policies` tách ma trận theo actor/exact revision, ghi chung CAS/nonce transaction với world/archive. Snapshot giữ needs/tabular/memories/pending/policyRevision; world polling không hydrate, planner/learning có hydrate. Legacy inline dùng trước migration; dữ liệu conflict/corrupt/missing ref phải dừng, không xóa để chữa. Fixture240actor×41arm:5.135.422B inline→62.302B snapshot/11chunks; không là SLA live. Rollback binary cũ cần đối chiếu backup/rows trước writer.

Animal policy có4 action rest/forage/play/shelter, giữ lịch sử riêng; không gọi là model động vật chuyên biệt. Pet walk ngắt pending tự kiếm ăn/chơi phải cancel, không nhận thưởng hoạt động chưa hoàn tất.

## Memory và bối cảnh

Structured memories ghi event-report đúng recipient hoặc simulation-plan-outcome đúng actor, stableID/INSERTORIGNORE/revision+nonce cùng batch. Future dialogue không cấp witness. Legacy record đọc có nhãn; còn backfill history đầy đủ trong [ROADMAP](../ROADMAP.md). Archive dùng INSERTSELECTjson_each, không xóa history đã lưu.

Owner-only memory API lấy top-K theo topic/importance/time từ100 row gần nhất, lọc actor/witness. Daemon chỉ đúng hai actor,3 record/người,400 ký tự/record, deadline2,5s song song; kiểm owner/kind/ID/date và giữ provenance/truncation trong prompt. Denied401/403 không fallback; unavailable chỉ own summaries. Helper chỉ loopback, không ghi memory/skill/P2P. Context là dữ liệu, không là chỉ thị thực thi; kiểm prompt không chứng minh LLM luôn giữ đúng ngữ nghĩa.

49 context cards/33 nơi gắn `editorial-suggestion`, lọc location/phase/weather; daemon tối đa2 thẻ. Cuối tuần cần calendar, Tết/Trung thu cần VisitHCMC HTTPS/fresh/date/title đúng; không suy âm lịch từ tháng dương. Cards không là observed event, inventory hoặc LocalSceneContext của vật thể thật. RealContext cache weather15 phút/holiday1 ngày/events6 giờ; stale/unavailable phải giữ nhãn nguồn, không bịa traffic/nghỉ bù/lịch âm.

## Hội thoại và LLM

- Thư viện `data/social-scenes.json` có12 cảnh nguồn `agent-authored`; rule grammar, saved AI events và `local-llm` tách nguồn. Không biến thư viện thành12 agent đang suy nghĩ.
- Hai speaker luân phiên4–6câu ngắn, đúng cặp/nơi/hoạt động, không đi/ngủ/bận/phòng riêng; có mở/đáp/kết và khoảng lặng. Cử chỉ người nghe khác người nói. Renderer chờ proximity/ground; reading/occupancy còn viewer-local.
- Server pool64 scene/line hashes bằng CAS; rule lặp đổi grammar, model trùng toàn cảnh bị bác. Ambient browser hashes theo world.born qua F5, storage lỗi có session fallback; không rawtext/credential. Generated không đồng nghĩa đã được nghe/earned reward.
- Xưng hô dựa tuổi/giới khai báo hai chiều, unknown mình/bạn; không suy từ tên/model hoặc rewrite lời thoại cũ.
- `reviewNarrative` kiểm structure/repetition; daemon chỉ giữ proposal sau review và clear khi fallback. `basis.revision/turnId` bảo vệ tick; busy/night không nhận model thêm thoại. Model chỉ viết bounded narrative, không đổi tiền/skill/location hoặc gọi tool. Role expansion dùng schema/Jaccard intersection-union, chặn ID/label/greeting trùng trước write; tối đa một expansion/ngày theo contract.

Model local opt-in qua `npm run living:up` (llama.cpp/Qwen đã được thử ở mốc cũ); phải xác minh process/model artifact hiện tại trước khi nhận đang chạy. Ba vai đạo diễn→biên kịch→phản biện có thể cùng một model tuần tự; không tự tạo subagents/model servers/cron. Worker không chạy CPU Qwen. Prompt hệ thống/code ở `lib/living/director.ts` và daemon là nguồn hiện hành, không chép prompt dài vào nhiều tài liệu.

## Dataset và đo lường

`data/training/` có6 mẫu SFT few-shot,6 cặp DPO pairs và curriculum8cấp. `evaluateCandidateEvent()` chấm heuristic5nhóm: schema/bounds25, coloc/timing25, Vietnamese20, repetition15, continuity15. Score không chứng minh chất lượng ngữ nghĩa, không tự thành curation/DPO hoặc quyền auto-patch/fine-tune. Chosen/rejected mới phải cùng prompt/context/model và validator thật.

`npm run benchmark:policies` dùng chooseScenario/settleLearning/linearScore runtime,8 seed×820 training chung×160 frozen holdout. V2 explicit single-domain history: tabular reward0,561797/MSE0,003588; LinUCB0,559612/0,002683. Dự đoán tốt hơn nhưng thưởng tức thời chưa thắng. [policy-holdout.json](validation/policy-holdout.json) là số liệu; v1 giữ riêng. Không nhận claim 3,71×/score 98/LLMlatency/FPS hoặc chỉnh để ép thắng holdout.

Suite/unit/API kiểm ridge oracle, gates/context/plan/cancel/retry, transaction rollback/legacy/corruption và actor privacy; xem [TESTING](TESTING.md). H1 rollout mới được mô tả bên dưới; hierarchy/peer/exemplar/replay/model A/B vẫn chưa hoàn tất.

## H1 — Rollout theo thời gian (28/10)

Hai spec Claude/Deepseek đã đối chiếu với code, quyết định theo từng nhóm ở [intelligence-review](validation/intelligence-review-2026-10-28.json), backlog chỉ giữ tại [ROADMAP](../ROADMAP.md). LinUCB6D/policy store0007, dialogue pool, RAG và health errors đã có; không tạo bảng/migration trùng, phục hồi memory MD, xóa experience history hoặc nhận chỉ thị trong attachment thành quyền chạy. Ưu tiên tiếp là residual/prior và offline learning có đo; LLM fine-tune/self-modifying code không nằm trong implementation này.

`applyScenarioOutcome`/`expectedReward` thuần và `availableScenarios` dùng cùng outcome/feasible actions với chooser thật. Trước tách đã chụp15.375outcomes/1.500choices; sau tách hash giữ nguyên, gồm legacy/domain/citations/employment/health/early/cancel. Default vẫn LinUCB, không đổi cơ chế thưởng/ưu tiên.

```bash
npm run simulate:learning -- --policy=tabular --mode=full --out=docs/validation/learning-tabular-full-v1.json
npm run simulate:learning -- --policy=linucb --mode=full --out=docs/validation/learning-linucb-full-v1.json
node scripts/compare-learning.mjs --baseline=docs/validation/learning-tabular-full-v1.json --candidate=docs/validation/learning-linucb-full-v1.json
```

Full là20seed×60ngày×24agent,691.200plan/policy; proxy mặc định12×30×5, overrides không được gắn nhãn full acceptance nếu thiếu kích thước. Mỗi giờ chọn một ordinary plan từ actionSteps(180s), chờ đủ duration+plan matching, advanceNeeds và settleLearning thật, một sample/plan. Context synthetic cùng seed/population, mưa xác suất0,2→0,8 và role-place đổi ở ngày30. Không bù mọi lượt cohort/thành phố, không tái tạo travel/ground/social encounters hoặc đọc production.

Oracle depth1 chỉ chọn feasible actions với cùng hard priorities/gates/mưa và cùng drift đến thời điểm settlement; không train trên bản probe. Regret trong báo cáo là **opportunity cost một bước trên state của chính policy**, không phải return của một xã hội phản thực tế. Giảm chỉ số này có thể đi cùng tổng reward thấp hơn. Entropy chuẩn hóa log2(41), repeat theo từng agent kể cả qua ngày, share tính từng agent/ngày và có worst-case. Forced actions báo riêng, không lấy trần35% để chặn ngủ/ăn/rehabilitate khẩn cấp.

CI95 Student-t trên20seed means; so sánh dùng paired deltas cùng seed. Competence/recovery là cửa sổ3ngày needs≥0,9; không đạt trả null, mean chỉ trên người đạt và luôn kèm fraction. Social density/diffusion là null vì chưa mô phỏng sharing. Hash artifact không gồm timing; CLI không ghi đè baseline khác hash, comparison kiểm checksum/profile/seed alignment.

| Chỉ số trung bình | Tabular | LinUCB hiện hành |
|---|---:|---:|
| Reward/agent/ngày |1,224431|1,196251|
| Opportunity cost/agent/ngày |3,938199|3,382465|
| Need-ok ratio |1,000000|0,999964|
| Entropy chuẩn hóa |0,623983|0,592385|
| Repeat rate |0,291199|0,291266|

Paired Δreward=-0,028180, CI95[-0,029533;-0,026827]; Δopportunity-cost=-0,555734, CI95[-0,571922;-0,539546]. Không có kết luận policy thắng toàn diện, không tự chuyển mặc định. Cả hai đạt competence ngày3 và recovery3ngày, metrics đã sát trần/sàn: phải có stress/cold-start profile trước khi nhận cải thiện thích ứng/prior. Ngưỡng candidate H2 tương lai yêu cầu return/needs không giảm, opportunity cost không tăng, entropy≥80% baseline bằng paired CI; không điều chỉnh trên chính holdout để ép thắng.

[H1 gates](validation/learning-h1-2026-10-28.json):52/52suite/check/lint/build/API local đạt; full LinUCB chạy lại cùng hash, mẫu16,98s một run ở môi trường này, không là SLA. Không UI/browser mới hoặc production deploy. Historical holdout8seed phía trên vẫn giữ riêng; hai protocol không thay thế lẫn nhau.

## H2 — Prior, residual và cold-start (28/10)

[Protocol v1](validation/learning-h2-protocol-v1.json) cố định trước kết quả: hai profile,4 policy; train8seed1000–1007 riêng từng profile, đánh giá20seed2000–2019,24agent×60ngày, shift ngày30. [Evidence](validation/learning-h2-2026-10-28.json) và [raw reports/prior/paired comparisons](validation/h2-v1/) giữ cả kết quả không đạt. Không chỉnh tham số trên holdout đã xem.

`residual-policy.ts` chỉ dùng offline. Model-prior lấy expectedReward thuần; residual-EMA học `reward thực − expected tại quyết định`, giữ raw reward/context/trials riêng, EMA floor0,08, progress window20, bonus giảm theo n. Warm thêm prior bounded k=5 từ **role-place synthetic**, chưa phải hierarchy role.kind. Priors không tạo earned samples/domain/skill. Observer kiểm actor, matching completed plan/context, version và checkpoint chống replay; dùng shared runtime còn cần durable receipt/CAS. Hard emergencies/gates luôn ưu tiên, cap35% chỉ voluntary với làm tròn nguyên và fallback nếu không còn action hợp lệ.

Cold-stress tạo needs ban đầu thấp, tải ban ngày và shock/tải mạnh hơn từ ngày30, cùng seed giữa policy; không đổi metabolism production. Đã làm rõ cold-start: need-ok ngày1 khoảng0,736. Sau đó needs lại gần trần, recovery khoảng3ngày nên bằng chứng thích ứng dài hạn còn hạn chế. Reward cao hơn profile thường do needs đầu vào khác, không là mức cải thiện giữa hai profile.

| Profile/policy | Reward/agent/ngày | Need-ok | Opportunity cost | Đủ gates so LinUCB |
|---|---:|---:|---:|---|
| Ordinary / LinUCB |1,195450|0,999949|3,405998|Baseline|
| Ordinary / model-prior |1,192831|1,000000|3,259559|Không: return|
| Ordinary / residual-EMA |1,194159|1,000000|3,282242|Không: return|
| Ordinary / warm-residual |1,194181|1,000000|3,281513|Không: return|
| Stress / LinUCB |3,344596|0,994698|3,326017|Baseline|
| Stress / model-prior |3,261682|0,993955|3,217882|Không: return/needs|
| Stress / residual-EMA |3,269031|0,993594|3,246656|Không: return/needs|
| Stress / warm-residual |3,268971|0,993633|3,246264|Không: return/needs|

Mỗi cặp dùng CI95 trên20 seed deltas; tất cả candidate đạt opportunity-cost và entropy floor nhưng trượt return, stress còn trượt needs. Residual-EMA giảm MSE so expected-only **trên cùng các quyết định của chính nó** khoảng64,33% ordinary và27,72% stress; warm khoảng68,16%/28,89%. Đây là residual rất nhỏ của drift deterministic, không chứng minh học xã hội/LLM. Residual tăng reward so model-prior nhưng opportunity-cost tăng; warm-vs-EMA CI reward chứa0 ở cả hai profile, chưa chứng minh lợi ích warm start. Không dùng MSE giữa hai trajectory khác nhau để nhận thắng.

```bash
npm run train:residual-prior -- --profile=cold-stress-v1 --out=/tmp/h2-prior.json
npm run simulate:learning -- --policy=residual-warm-v1 --profile=cold-stress-v1 --seed-start=2000 --prior=/tmp/h2-prior.json --out=/tmp/h2-warm.json
```

CLI kiểm SHA256/schema/version/profile/seed separation và không ghi đè artifact khác; SHA là integrity, không là chữ ký/nguồn tin cậy. Kết thúc thí nghiệm v1 với quyết định **không promote**, runtime giữ LinUCB. Full repeats/hash,53suite và compiled local API ở evidence; không liveDB, browser/UI mới hoặc Sites deploy. H3 reward provenance vẫn là bước tiếp trong backlog; policy v2 phải có protocol/train-validation-holdout mới trước khi đo, không ép v1 thắng.

## H3 — Evidence cho reward hiện hành (28/10)

`reward-evidence.ts` giữ công thức **scenario-outcome-v1** đúng thứ tự phép tính/clipping; breakdown chỉ gồm scalar skill, energy, hunger và health đang có. Không cộng social/travel/commitment reward hay đổi LinUCB/matrices. Feature6D được gắn nhãn `needs-6d-v1`; semantics mới sau này phải tách version/namespace, không trộn vào posterior cũ.

Experience mới từ `prepareLearning` có `rewardEvidence` v1: actor/experience/scenario identity, catalog fingerprint, before/after **tại settlement sau needs drift**, từng component/unclipped/total, raw sample before→after và context nguyên bản tại decision. Plan ghi start/duration/settlement, duration của plan đang match cùng key khai báo/thực tế. Legacy chỉ có start anchor giữ matched key/duration=null và audit là legacy-unverified, không làm mất outcome hoặc gán fingerprint giả. `fingerprint-v1` là phát hiện plan thay đổi; legacy thiếu key giữ nhãn yếu hơn `legacy-start-time`. Authority là **simulation-plan-time-v1**, không physical arrival, gặp nhau, nghe kể hoặc commitment đã thực hiện. Metadata không là chữ ký xác thực.

Metadata đi cùng ExperienceID/world/policy/archive trong CAS/nonce batch hiện có; retry/cancel/early không tạo credit mới. Không thêm bảng/migration, đổi reward/policy mặc định, sửa archive cũ hoặc gán evidence hồi tố. Stable ID và pending/CAS bảo vệ pipeline hiện tại; inspector không phải một API nhận receipt ngoài để cấp thưởng. Snapshot vẫn chỉ200experience; archive đầy đủ giữ nguyên.

```bash
npm run training:export
npm run audit:learning-rewards -- --in=.sites-runtime/training/experiences-....jsonl --out=/tmp/reward-audit.json
```

Exporter chỉ instance local đã xác thực. Audit chỉ đọc JSONL local≤32MiB, không fetch/DB/train/import; output chỉ aggregate + SHA256, không chép ID/thoại/ký ức. File output dùng exclusive create, không ghi đè. Mã thoát2 khi có record bị bác; JSONL lỗi báo số dòng, không echo nội dung. Các nhóm: `verified-contextual`, `verified-tabular`, `legacy-unverified`, `rejected`; binding legacy được đếm riêng. Kiểm schema/version/identity/plan/time/sample, scenario transition, decision context, domain gain và component/total; duplicate ID bị bác. “Verified” chỉ là **nhất quán với simulation record**, không chứng minh một file ngoài là đáng tin hay cho phép replay vào runtime. Thiếu evidence không được biến thành dữ liệu huấn luyện tương thích bằng phỏng đoán.

H3 này hoàn thành nền provenance cho outcome hiện hành; reward dài hạn vẫn chờ authority và thí nghiệm chống reward hacking. H4 có thể nghiên cứu priors từ nguồn/version tương thích, tách earned samples; H6 archive replay chưa tự động được bật. [Review Society/NIM](validation/society-nim-review-2026-10-28.json) đã gộp vào ROADMAP; không gọi inference NIM, không thêm hosted trial vào production.
