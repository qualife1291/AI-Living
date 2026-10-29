# Learning, context và hội thoại

Học policy trong mô phỏng, không fine-tune trọng số Qwen. Modules chính: `lib/living/{learning,linucb,policy-store,skills,prompt-memories,context-cards,dialogue-pool,director,service}.ts` và `lib/{memory-records,memory-backfill,memory-backfill-store}.ts`; schema/code là nguồn contract chi tiết.

H6 mở rộng96candidate trong sandbox riêng, giữ41scenario live và chưa promote; contract/CI/artifact ở [H6 offline](H6_OFFLINE_POLICY_SCALE.md). Các study H6 cũ bên dưới là replay/cold-start khác, không suy kết quả của một experiment sang experiment khác. Việc còn lại chỉ ghi ở [ROADMAP](../ROADMAP.md).

## Outcome và policy

Disjoint LinUCB có6 features `[1,energy/100,hunger/100,socialNeed/100,isFreshRain,skill/100]`, ridge I, inverse covariance đối xứng21 số và b gồm 6 số; Sherman–Morrison fit outcome hợp lệ. Điểm `xᵀA⁻¹b + α√(xᵀA⁻¹x)` cùng needs/health/sleep/weather/novelty guards. Pending lưu context-at-choice; legacy thiếu context chỉ tabular, không tạo context/samples giả.

Chỉ outcome đúng plan, đủ toàn bộ duration mới cộng một lần. `planKey` phát hiện thay activity/location/duration/transport dù giữ timestamp; không là proof arrival/chữ ký. Encounter360s kiểm cả hai plan/outcome gốc, sống qua quiet slot; không nhận report ở180/300s hoặc retry cộng lại. Đây là **completion theo kế hoạch**, chưa ground authority/P2P witnessed meeting.

Tám domain thực hành: học tập, kỹ thuật, phục vụ, công việc/mua sắm, vận động, đi lại, chăm cây/thú, cộng đồng. Chỉ domain của scenario được tăng, archive giữ skillGain before/after/amount. New models cần scalar/domain gates cho dạy lớp/sửa xe/văn phòng/dự án học. Legacy giữ gate cũ, không backfill earned points hoặc hủy hồi tố plan. Đi khám không tạo chuyên môn y tế.

Migration 0007 `learning_policies` tách ma trận theo actor/exact revision, ghi chung CAS/nonce transaction với world/archive. Snapshot giữ needs/tabular/memories/pending/policyRevision; world polling không hydrate, planner/learning có hydrate. Legacy inline dùng trước migration; dữ liệu conflict/corrupt/missing ref phải dừng, không xóa để chữa. Fixture240actor×41arm:5.135.422B inline→62.302B snapshot/11chunks; không là SLA live. Rollback binary cũ cần đối chiếu backup/rows trước writer.

Animal policy có4 action rest/forage/play/shelter, giữ lịch sử riêng; không gọi là model động vật chuyên biệt. Pet walk ngắt pending tự kiếm ăn/chơi phải cancel, không nhận thưởng hoạt động chưa hoàn tất.

## Memory và bối cảnh

Structured memories ghi event-report đúng recipient hoặc simulation-plan-outcome đúng actor, stableID/INSERTORIGNORE/revision+nonce cùng batch. Future dialogue không cấp witness. Legacy record đọc có nhãn; memory backfill local additive có ở phần bên dưới, nguồn thiếu chứng cứ vẫn giữ nguyên/bỏ qua. Curation offline có ở phần dưới; corpus model thật, blind evaluation và activation còn trong [ROADMAP](../ROADMAP.md). Archive dùng INSERTSELECTjson_each, không xóa history đã lưu.

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

`data/training/` giữ6 mẫu SFT,6 cặp DPO dạng partial cũ và curriculum8cấp làm tham khảo biên tập. Chúng thiếu exact request/model nên không được nâng thành matched captures. `curation-fixtures-v1.jsonl` thêm6 cặp biên tập có contract đầy đủ và review agent rõ. `evaluateCandidateEvent()` chấm heuristic5nhóm: schema/bounds25, coloc/timing25, Vietnamese20, repetition15, continuity15; score không là nhãn chất lượng hay quyền auto-patch/fine-tune. Curation offline mới được mô tả cuối tài liệu.

`npm run benchmark:policies` dùng chooseScenario/settleLearning/linearScore runtime,8 seed×820 training chung×160 frozen holdout. V2 explicit single-domain history: tabular reward0,561797/MSE0,003588; LinUCB0,559612/0,002683. Dự đoán tốt hơn nhưng thưởng tức thời chưa thắng. [policy-holdout.json](validation/policy-holdout.json) là số liệu; v1 giữ riêng. Không nhận claim 3,71×/score 98/LLMlatency/FPS hoặc chỉnh để ép thắng holdout.

Suite/unit/API kiểm ridge oracle, gates/context/plan/cancel/retry, transaction rollback/legacy/corruption và actor privacy; xem [TESTING](TESTING.md). H1 rollout và các nghiên cứu H4/H6/H10 được mô tả bên dưới, chưa promote; peer/exemplar runtime, corpus model thật và model A/B còn ở ROADMAP.

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

Metadata đi cùng ExperienceID/world/policy/archive trong CAS/nonce batch hiện có; retry/cancel/early không tạo credit mới. Không thêm bảng/migration, đổi reward/policy mặc định, sửa archive cũ hoặc gán evidence hồi tố. Stable ID và pending/CAS bảo vệ pipeline hiện tại; inspector không phải một API nhận receipt ngoài để cấp thưởng. Snapshot vẫn chỉ200experience summary và bỏ evidence chi tiết khỏi bản serialize; archive/JSONL giữ đầy đủ evidence trong cùng batch. Projection không sửa input archive, IDs, context, reward hoặc policy. Audit phải đọc JSONL archive, không coi snapshot summary thiếu evidence là một bản export đầy đủ.

```bash
npm run training:export
npm run audit:learning-rewards -- --in=.sites-runtime/training/experiences-....jsonl --out=/tmp/reward-audit.json
```

Exporter chỉ instance local đã xác thực. Audit chỉ đọc JSONL local≤32MiB, không fetch/DB/train/import; output chỉ aggregate + SHA256, không chép ID/thoại/ký ức. File output dùng exclusive create, không ghi đè. Mã thoát2 khi có record bị bác; JSONL lỗi báo số dòng, không echo nội dung. Các nhóm: `verified-contextual`, `verified-tabular`, `legacy-unverified`, `rejected`; binding legacy được đếm riêng. Kiểm schema/version/identity/plan/time/sample, scenario transition, decision context, domain gain và component/total; duplicate ID bị bác. “Verified” chỉ là **nhất quán với simulation record**, không chứng minh một file ngoài là đáng tin hay cho phép replay vào runtime. Thiếu evidence không được biến thành dữ liệu huấn luyện tương thích bằng phỏng đoán.

H3 này hoàn thành nền provenance cho outcome hiện hành; [evidence](validation/learning-h3-2026-10-28.json) ghi54suite/check/lint/build/assets/API compiled/CAS và full H1 repeat byte/hash giữ nguyên. Reward dài hạn vẫn chờ authority và thí nghiệm chống reward hacking. H4 có thể nghiên cứu priors từ nguồn/version tương thích, tách earned samples; H6 archive replay chưa tự động được bật. [Review Society/NIM](validation/society-nim-review-2026-10-28.json) đã gộp vào ROADMAP; không gọi inference NIM, không thêm hosted trial vào production.

## H3b — Học giữ hẹn từ ground, offline v1 (29/10)

[Protocol](validation/learning-h3b-protocol-v1.json) được freeze trước triển khai; [evidence](validation/learning-h3b-2026-10-29.json) và [raw train](validation/h3b-v1/train.json)/[validation](validation/h3b-v1/validation.json)/[holdout](validation/h3b-v1/holdout.json) giữ cả kết quả âm.32train/16validation/48holdout là các offer synthetic trên8nơi, không là96câu chuyện độc lập hoặc lịch sử cư dân thật. Các cohort18000–18003/18100–18103/18200–18211 riêng; không dùng lại các seed H1/H2/H4/H6/H10.

`ground-learning.ts` chốt offer/context từ accepted root và route estimate **trước khi ghi plan mới**. Sau đó chạy GND2/GND3 physics thật với3core+1resident+3thú+12xe; chỉ hết cửa sổ150–210s mới settlement. Cần hai receipt presence-completed đúng plan/source/epoch/step2/nơi và contact LOS liên tục≥30s trong cửa sổ. Reward attend=`clip((fulfilled?value:-0,5)−actualTravelUnits/1000,−1,1)`; quãng đường cộng từ accepted physics, không từ ETA/script. Decline có utility0 theo định nghĩa offer, không tạo claim đã thực hiện hẹn. Goal value là thang mục tiêu biên tập; hiện diện không là lao động/thu nhập/hiểu biết/y tế. Planned/emitted/heard text không cấp điểm.

Feature `ground-rendezvous-6d-v1` gồm bias,value,route actor/peer,peer intent có sẵn và lead time; khác semantics `needs-6d-v1`. Reward `rendezvous-delayed-v1` và artifact `offline-ground-rendezvous-v1` tách namespace. One-pass ridge dùng lại đại số thuần LinUCB, không đổi posterior/samples/domain/skills/memory cũ. Trainer chỉ fit outcome do generator actual replay vừa tạo trong process, mỗi goal một lần; clone/JSON ngoài/partition sai không được nhận. Artifact rebuild ma trận từ ledger, checksum chỉ kiểm integrity, không xác thực file ngoài hoặc cho phép runtime import.

Evaluation giữ model cố định, alpha0; mỗi offer dùng cùng attend potential outcome replay và decline0 để so luôn nhận hẹn/heuristic causal. Đây là **utility một quyết định trên task reset**, không phải trajectory thành phố trong đó model thực sự điều khiển mọi nhân vật. CI95 dùng seed means,4seed validation/12seed holdout; không chọn lại tham số sau khi xem kết quả.

| Partition | Offer / đủ hiện diện | Cơ hội utility dương giữ lại | Tỷ lệ attend của model | Kết luận |
|---|---:|---:|---:|---|
| Train |32/15|9cơ hội dương dùng làm dữ liệu|Collection luôn attend|32mẫu replay synthetic, không bootstrap earned samples |
| Validation |16/7|3/4=75%|25%|Trượt ngưỡng giữ≥80% |
| Holdout |48/18|0/3|0%|Từ chối toàn bộ, trượt giữ cơ hội và action collapse |

Holdout model utility0, baseline luôn attend−0,717350; paired Δ+0,717350, CI95[0,669186;0,765514]. Lợi ích số này do từ chối hết, **không đủ gates nhận policy tốt**. So heuristic Δ+0,044503, CI95[−0,009782;0,098789], chưa rõ lợi ích. Giữ kết luận **không promote v1**. Chỉ3cơ hội dương holdout và geometry lặp là giới hạn quan trọng; không suy thành social intelligence/nhu cầu dài hạn tốt hơn.

```bash
npm run learning:ground-study -- --stage=train --out=.sites-runtime/training/h3b-train.json
npm run learning:ground-study -- --stage=validation --model=.sites-runtime/training/h3b-train.json --model-sha256=SHA_PAYLOAD --out=.sites-runtime/training/h3b-validation.json
npm run learning:ground-study -- --stage=holdout --model=.sites-runtime/training/h3b-train.json --model-sha256=SHA_PAYLOAD --out=.sites-runtime/training/h3b-holdout.json
```

CLI chỉ fixed splits hoặc smoke17900, output JSON exclusive dưới`.sites-runtime/training`; pin model SHA từ stdout, giới hạn byte/UTF8 và chặn symlink/hardlink/traversal/overwrite. Full train lặp byte-identical SHA`5fc80952…`;96unique task=207.360physics step, không cộng32task repeat thành32sample mới.70suite/type/lint/assets/build đạt, H1 golden15.375outcome/1.500decision giữ byte identity. Experimental reward/features/trainer không vào155JS module compiled. Không UI/runtime/schema đổi nên không browser/API run mới; không migrate/deploy.

H3b runtime/v2 còn cần protocol/split mới, capture owner offer/context tại decision, durable goal/settlement/receipt CAS và bằng chứng chống bỏ mọi lời hẹn. Không retune các cohort đã xem. Không importer, live actor training, P2P hoặc LLM fine-tune từ phase này; GND3 receipt eligibility vẫn false.

## H4 — Global/role-kind priors offline (28/10)

[Protocol](validation/learning-h4-protocol-v1.json) đăng ký trước kết quả: hai profile ordinary/cold-stress v1, ba variant personal/global/role,24agent×60ngày và shift30. Train3000–3007, validation4000–4007, holdout5000–5019 theo hashSeed(H1-seed:index); không trùng H1/H2. Không chọn/thay tham số sau validation hoặc holdout; cả hai candidate đều được báo cáo.

`hierarchical-prior.ts` fit ridge6D từ raw outcomes synthetic đã qua H3 verified-contextual/fingerprint: donor ownership/seed, monotonic sample checkpoint và unique ExperienceID. Cùng corpus fit global lẫn nhóm theo **role.kind trong default catalog**, actor được gán vai trò tất định và đổi catalog index ở ngày30. Đây là loại hoạt động của vai trò (nhiều nghề cùng read/work/social), chưa phải occupational hierarchy/expertise. Các variant dùng cùng role/place, guards và thời tiết; baseline H4 có affinity theo actual role place, khác baseline H1/H2 theo place fixture nên không so chéo số tuyệt đối.

Artifact version `hierarchical-linucb-v1` giữ source/profile/rewardVersion/featureVersion/catalog+scenario signatures, train seeds, row support/donor counts và matrices numeric; transcript SHA256 chỉ provenance/integrity, không xác thực file ngoài hoặc bảo đảm ẩn danh. Không chứa ID cư dân/thoại/ký ức. Row cần≥5outcome,≥2actor và≥2seed; schema strict, unique rows/seeds, support consistency và Cholesky kiểm covariance dương xác định. Compiler clone/freeze model. Trainer CLI **chỉ tạo synthetic**, không nhận JSONL/private archive, không có DB writer hoặc migration.

Prior toàn cục dự đoán reward theo cùng context-at-choice6D. Role mean shrink về global bằng min(0,8; support/(support+20)), thiếu group/action dùng global có support, thiếu global giữ điểm cũ. Blend prediction bằng `w=5/(ownSamples+5)`; confidence tối đa5 là metadata riêng, không thành trials/domain/memory hoặc ma trận cá nhân. Personal uncertainty/exploration, needs/affinity/taste/novelty/emergency/skill gates giữ nguyên; không gọi group fit trong evaluation. Mean prior weight/MSE có cả action forced vì vẫn là dự đoán, không có nghĩa prior thay được emergency decision.

```bash
npm run train:hierarchy -- --profile=cold-stress-v1 --out=/tmp/h4-prior.json
npm run simulate:hierarchy -- --variant=personal-v1 --profile=cold-stress-v1 --out=/tmp/h4-baseline.json
npm run simulate:hierarchy -- --variant=role-prior-v1 --profile=cold-stress-v1 --prior=/tmp/h4-prior.json --baseline=/tmp/h4-baseline.json --out=/tmp/h4-role.json
```

CLI kiểm SHA/schema/profile/train-eval overlap/size và không ghi đè artifact khác. Wrapper H4 tái sử dụng hourly rollout/oracle H1/H2 bằng selector+observer riêng; golden/default reports không đổi. Paired CI95 trên seed deltas theo gates return/needs không giảm, opportunity cost không tăng, entropy≥80% baseline; MSE so personal/blended trên **cùng decision của từng candidate**, không dùng hai trajectory khác nhau để nhận cải thiện dự đoán. Role-vs-global là ablation riêng, không tự chứng minh specialization.

Reward v1 hiện không có payoff phụ thuộc role; cải thiện nếu có chỉ từ phân bố context/action và warm start. H4 chưa cài artifact vào runtime/policy store0007, không auto promotion, không có CAS format mới. Runtime tương lai cần nguồn actor/role **tại decision**, artifact installation/version/rollback/CAS và bằng chứng riêng; không suy role lịch sử từ role hiện tại hoặc hiện thực hoá synthetic prior thành trải nghiệm thật. Không thay H2 đã thất bại, reward dài hạn, H5 sharing hoặc H6 replay.

[Evidence H4](validation/learning-h4-2026-10-28.json) và [raw artifacts](validation/h4-v1/) ghi552.960train +1.658.880validation +4.147.200holdout plans,55suite/check/lint/build/assets/API local đạt; full prior train, full role-stress và H1 đều repeat cùng byte/hash. Chưa runtime installation/deploy.

| Holdout profile / variant | Reward/agent/ngày (60ngày) | Reward ngày1/agent | Đủ gates |
|---|---:|---:|---|
|ordinary-v1 / Cá nhân|1,202140|2,529416|Baseline|
|ordinary-v1 / Global|1,200715|3,175454|Không|
|ordinary-v1 / Role-kind|1,200286|3,152865|Không|
|cold-stress-v1 / Cá nhân|3,360767|5,808847|Baseline|
|cold-stress-v1 / Global|3,353370|6,410548|Không|
|cold-stress-v1 / Role-kind|3,353333|6,392904|Không|

Cả hai candidate giảm reward60ngày với paired CI95 dưới0 ở cả hai profile: global Δ−0,001425 ordinary /−0,007397 stress; role Δ−0,001854/−0,007434. Opportunity-cost và entropy gates đạt. Stress needs đạt; ordinary needs có mean tăng nhẹ nhưng CI chưa chứng minh không giảm — không diễn giải thành needs trung bình bị giảm. Role-vs-global CI reward/opportunity-cost chứa0, chưa có bằng chứng lợi ích riêng của nhóm role.kind.

Warm-start có lợi ở ngày1: global Δreward+0,646 ordinary/+0,602stress; role+0,623/+0,584, tất cả paired CI95 trên0. Cùng-decision MSE giảm khoảng60,62%/59,06% ở global,59,98%/58,74% ở role, không đồng nghĩa policy tốt hơn cả60ngày. Giữ default LinUCB cá nhân và **không promote v1**. Warm-only/cutoff là giả thuyết nghiên cứu cho protocol/seed mới, chưa triển khai và không thử lại để ép các seed này thắng. H6 replay/curriculum là bước độc lập tiếp; H3b/H5 còn chờ authority.

## H6 — Replay/curriculum có nguồn, offline (28/10)

[Protocol](validation/learning-h6-protocol-v1.json) đăng ký trước kết quả. `outcome-replay.ts` nhận H3 verified-contextual với fingerprint-v1 và reward/features/scenario signature hiện hành; record không có evidence, thiếu context hoặc binding legacy chỉ đếm bỏ qua, không đoán bổ sung. Dữ liệu sai version/context/reward hoặc ID/sample ledger xung đột làm **hủy artifact**, không lấy bản đầu/cuối làm đúng. Duplicate canonical được đếm một lần; hai ID dùng cùng actor+earned sample bị bác. Cho phép khoảng trống lịch sử, nhưng chỉ fit số record thực có; không biến sample1001 thành1001mẫu replay. Kiểm thời gian theo sample ledger, không reset/xóa archive.

Local archive được lọc actor **trước audit/fit**; artifact chỉ thuộc actor ấy và predictor từ chối actor khác. CLI yêu cầu SHA256 của input local,≤32MiB/100krow, chỉ ghi JSON bằng exclusive-create dưới `.sites-runtime/training` (Gitignored); stdout chỉ aggregate/hash. JSONL lỗi không echo nội dung. SHA là integrity do operator pin, không chứng minh file bên ngoài đã được server xác thực. Không tự fetch/export liveDB, import runtime hay trao đổi ký ức/role. Source private và synthetic-cohort có schema riêng, không đổi nhãn để gộp dữ liệu thật vào global model.

```bash
# Dùng một JSONL export local đã có; lấy SHA256 của chính file đó trước khi chạy.
npm run replay:archive -- --in=.sites-runtime/training/experiences-....jsonl --actor=an --expected-sha256=<sha256> --out=.sites-runtime/training/replay-an.json
npm run train:replay -- --profile=cold-stress-v1 --out=/tmp/h6-models.json
npm run simulate:replay -- --variant=personal-v1 --profile=cold-stress-v1 --out=/tmp/h6-baseline.json
npm run simulate:replay -- --variant=replay-coldstart-v1 --profile=cold-stress-v1 --prior=/tmp/h6-models.json --baseline=/tmp/h6-baseline.json --out=/tmp/h6-candidate.json
```

Numeric curriculum có3stage từ context tại quyết định: needs(energy<0,2/hunger>0,72), foundation(skill<0,2), routine. Giữ riêng8stage hội thoại `self-play-curriculum.json`; không gọi heuristic/DPO/curated scene là observed experience. Chronological/curriculum fit **cùng unique corpus đúng một lượt**, ridgeI/6D/rewardv1. Ridge về lý thuyết không phụ thuộc thứ tự; validation chỉ kiểm prediction agreement≤1e−8 và báo coverage/MSE, không nhận gain từ roundoff. Các bộ đếm/model.samples trong artifact là replayed records, không được chép vào actor trials/skills/matrices/memories. Compiler tách model khỏi input, chỉ cung cấp prediction; schema kiểm SPD/finite/count/source và chống epochs giả.

Thử nghiệm warm-only là giả thuyết mới sau H4: prior k5 chỉ blend khi **tổng samples tự đạt<24**, sau đó dùng chính hàm personal trên state hiện tại, không reset hậu nghiệm hay ép trajectory trùng baseline. Không đụng personal uncertainty/guards. Train8seed6000–6007,12agent×15ngày; validation prediction8seed7000–7007 cùng kích thước; policy holdout20seed8000–8019,24agent×60ngày/shift30. Dùng2profile và cùng role/place fixture H4; không so số tuyệt đối với H1/H2. Tham số cố định trước kết quả, không tự promote/runtime activation. Actor archive artifacts không dùng làm cohort prior cho holdout.

H6 này cung cấp replay numeric/CLI private và curriculum traversal; chưa SFT/DPO training, role-history inference hoặc cài artifact lên production. H6b đã thêm multi-file/cursor, memory backfill local và curation offline ở phần dưới. Không thêm policy format0007 hoặc thuê GPU/API.

[Evidence H6](validation/learning-h6-2026-10-28.json) và [artifacts synthetic](validation/h6-v1/) ghi69.120train+69.120prediction validation+2.764.800policy holdout plans.56suite/check/lint/build/assets/API compiled đạt; API JSONL→actor replay giữ history/snapshot/earned samples. Full replay train+validation, full warm24stress và H1 repeat cùng byte/hash. Không replay archive production hoặc tạo artifact private trong Git.

| Holdout profile / variant | Reward/agent/ngày (60ngày) | Reward ngày1/agent | Đủ gates |
|---|---:|---:|---|
|ordinary-v1 / Cá nhân|1,201531|2,533758|Baseline|
|ordinary-v1 / Replay warm24|1,201322|3,145584|Không|
|cold-stress-v1 / Cá nhân|3,364077|5,817524|Baseline|
|cold-stress-v1 / Replay warm24|3,362693|6,320312|Không|

Ngày1 có Δreward+0,611826 ordinary (CI95[0,593999;0,629653]) và+0,502788stress ([0,466311;0,539265]). Nhưng60ngày ordinary Δ−0,000209 với CI chứa0, chưa chứng minh không giảm; stress Δ−0,001384 với CI dưới0. Needs gates chưa đạt ở cả hai; opportunity-cost đạt ở stress, chưa chứng minh không tăng ở ordinary; entropy floor đạt. Không đổi tham số theo holdout và **không promote**.

Chronological/curriculum validation có max prediction difference3,22e−13 ordinary/2,17e−13stress, dưới ngưỡng1e−8; đây là khác biệt số học, không là cải thiện từ curriculum. Prior predictions sau plan tự đạt thứ24 bằng0. Giữ LinUCB cá nhân; H10 tối ưu offline có budget/seed mới là bước nghiên cứu tiếp, không tự sửa code hoặc deploy.

## H10 — Tìm tham số offline có budget (28/10)

[Protocol](validation/learning-h10-protocol-v1.json) đăng ký trước kết quả: fit8seed9000–9007, point-validation9500–9507, search10000–10003, validation11000–11007 và holdout12000–12019. Hai profile và source synthetic replay H3/H6 tương thích; mô hình numeric frozen, không đọc archive private. Search9cấu hình warm6/12/24 ×k0,5/2/5 +baseline,12agent×30ngày×4seed/profile. Ngân sách691.200search plans; validation≤2candidate+baseline,8seed×24×60/profile (≤1.658.880plan); holdout≤1candidate+baseline,20seed/profile (≤2.764.800plan).

Tầng policy `bounded-search.ts` chỉ blend prediction trong số plan tự đạt đã khai báo; reward/features/uncertainty/emergency/gates và own updates giữ nguyên. K/window thuộc config H10 riêng, không sửa descriptor warm24/k5 của model H6 hoặc chép donor counts/matrices. Config schema giới hạn window≤72/k≤5 và không nhận code/effect/reward fields.

Amendment **trước search**: H1 bắt đầu lúc00h nên warm6 chỉ trùng forced sleep; giữ3cấu hình này làm negative controls nhưng require voluntary-choice effect>0 ở cả2profile trước shortlist và validation selection. Effect đếm lựa chọn khác personal trên **cùng state hiện tại**, không là counterfactual trajectory return. Không lấy MSE tốt hơn ở action forced để gọi là cải thiện hành vi. Search giữ tất cả9case, kể cả đối chứng bị loại.

Ranking dùng worst-profile relative mean Δreturn, rồi average và ID lexical; chỉ shortlist entropy≥80% baseline và≤2 window khác nhau. Validation dùng bốn paired CI95 performance gates ở cả2profile;8seed là bước chọn, chưa phải holdout20seed. Nếu đủ điều kiện, freeze≤1config trước holdout; nếu không có thì ghi status reserved với0plan và không sinh holdout outcome files. Không đưa runner-up vào thử lại sau holdout. Artifact chỉ cấu hình/dữ liệu, không tự sửa code/DB/policy/deploy.

```bash
# Trước tiên tạo model mới mỗi profile bằng train:replay với --seed-start=9000 --validation-start=9500.
npm run optimize:policy -- --stage=search --models=docs/validation/h10-v1/models --out=docs/validation/h10-v1
npm run optimize:policy -- --stage=validation --models=docs/validation/h10-v1/models --out=docs/validation/h10-v1
# Review và push checkpoint selection/model/protocol hashes trước bước cuối.
npm run optimize:policy -- --stage=holdout --models=docs/validation/h10-v1/models --out=docs/validation/h10-v1
```

CLI binds protocol bytes +model hashes +parent selection và từng case checksum, kiểm đúng profile/seed/dimension, recompute scoring/shortlist trước sang stage tiếp. Không ghi đè artifact khác. Holdout command không gọi simulator khi validation không chọn được candidate. Runtime chưa có config importer; ngay cả đạt offline cũng còn source review/installation/version/CAS/rollback riêng. Đây là finite parameter search, không genetic self-modifying code hoặc LLM fine-tune.

[Evidence H10](validation/learning-h10-2026-10-28.json) và [stage/case artifacts](validation/h10-v1/) ghi69.120fit+69.120point-validation,691.200search và1.658.880validation plans.57suite/check/lint/build/assets/API local đạt; full search/shortlist/hash, full model bundle, một full validation case và H1 lặp lại giữ nguyên. Verification repeats không phải thêm seed độc lập hoặc candidate mới.

Search giữ9candidate: warm6/k0,5/2/5 có0voluntary choice changes và raw trajectory bằng baseline, nên bị loại dù các metric có thể bằng baseline. Hai cửa sổ được freeze là `w12-k2` và `w24-k2`; commit checkpoint có trước validation.

| Validation candidate/profile | Mean Δreward/agent/ngày | CI95 | Đủ performance gates |
|---|---:|---|---|
|w12-k2 / ordinary|−0,000538|[−0,001355;0,000279]|Không|
|w12-k2 / stress|0,000470|[−0,001360;0,002300]|Không|
|w24-k2 / ordinary|−0,000390|[−0,001340;0,000561]|Không|
|w24-k2 / stress|−0,000517|[−0,001582;0,000548]|Không|

Không candidate nào chứng minh được không giảm return/needs trên cả2profile; entropy gate đạt, opportunity-cost có cải thiện rõ ở w24-k2stress nhưng chưa đủ toàn bộ tiêu chí. Đây là thiếu bằng chứng theo gate định trước, không kết luận mọi tham số đều kém trong mọi môi trường. Validation chọn **null**; command holdout ghi reserved/0plan và không sinh outcome directory. Seed12000–12019 vẫn chưa được quan sát; không đưa runner-up hoặc sửa ngưỡng để mở holdout. Giữ LinUCB cá nhân; optimizer chỉ tạo artifact offline, không cài config vào runtime. G0/UX tiếp theo trong backlog, các nghiên cứu học sau cần protocol mới.

## H6b — Bulk/cursor replay local (28/10)

[Contract](validation/learning-h6b-contract-v1.json) và [evidence](validation/learning-h6b-2026-10-28.json). `replay:bulk` đọc một bộ JSONL local đã được owner chọn, **một actor**, không gọi API/network hoặc mở DB thế giới. Manifest strict gồm `version:1`, `kind:"local-owner-replay-set-v1"`, `actorId`, `order:"chronological"|"curriculum"`, `batchRecords:1..5000`, `sources:[{file,sha256,bytes}]`. File là đường dẫn JSONL tương đối dưới thư mục manifest; không URL/traversal/symlink/file đặc biệt. Lấy SHA256/bytes thật của mỗi file, rồi SHA256 của nguyên manifest; không sửa manifest giữa các lần resume.

Tối đa64file×32MiB/file, tổng256MiB,100.000nonblank record **kể cả foreign/legacy/duplicate**, dòng≤64KiB. Một batch không vượt8MiB/10.000physical lines hoặc `batchRecords`; empty file/blank lines vẫn tiến cursor với budget riêng. Mỗi lệnh mặc định1batch, `--max-batches=20` là trần. Các giá trị SHA trong ví dụ phải được thay bằng hash64hex thật:

```bash
npm run replay:bulk -- --manifest=.sites-runtime/training/source.json --expected-manifest-sha256=SHA_MANIFEST --job=.sites-runtime/training/job-an --expected-checkpoint=new
# Resume bằng checkpointSha256 vừa in ra, không dùng artifactSha256:
npm run replay:bulk -- --manifest=.sites-runtime/training/source.json --expected-manifest-sha256=SHA_MANIFEST --job=.sites-runtime/training/job-an --expected-checkpoint=SHA_CHECKPOINT
npm run replay:bulk -- --manifest=.sites-runtime/training/source.json --expected-manifest-sha256=SHA_MANIFEST --job=.sites-runtime/training/job-an --action=status
# Chỉ export khi complete=true; output mới, private, không ghi đè:
npm run replay:bulk -- --manifest=.sites-runtime/training/source.json --expected-manifest-sha256=SHA_MANIFEST --job=.sites-runtime/training/job-an --expected-checkpoint=SHA_CHECKPOINT --action=export --out=.sites-runtime/training/replay-an.json
```

Job dùng SQLite native của Node≥22.18 trong `.sites-runtime/training/<job>/state.sqlite`, file mới600/thư mục mới700, Gitignored. Application/schema identity và replay/reward/feature/scenario signature tách khỏi mọi DB khác. `BEGIN IMMEDIATE`/FULL sync giữ cùng transaction: canonical records được chấp nhận, strong/unverified-ID ledger, counters, cursor **byte+line** và model khi hoàn tất. CLI yêu cầu SHA checkpoint trước đó để CAS; writer cạnh tranh/cursor cũ bị từ chối. Không xóa lock/DB để retry. Status chỉ đọc, `sourcesVerified:false`; sau SIGKILL giữa transaction, chạy lại run với checkpoint trước để SQLite khôi phục journal nếu status readonly chưa mở được.

Actor được lọc **trước audit/storage**; foreign raw fields không vào job. Exact canonical duplicate không tạo mẫu mới; ID đổi nội dung, strong↔legacy/weak, hai ID dùng cùng earned sample hoặc ledger thời gian fork làm rollback **toàn batch hiện tại**. JSONL/UTF8 lỗi, vượt budget hoặc nguồn đổi cũng không tăng cursor. Batch trước đã commit được giữ. CLI in một dòng hash/count/cursor sau mỗi commit (retry đã complete chỉ in status); nếu batch sau lỗi, lấy checkpoint từ dòng thành công cuối. Lỗi record chỉ nêu ordinal source/line, không echo actor/path/text.

Chỉ fit **một lượt sau khi hết source set**, global chronological/curriculum như H6 một file; không fit lại posterior từng batch. Artifact và final cursor commit cùng nhau trong job; export là bước riêng, stage+fsync rồi publish exclusive nên không có JSON nửa chừng/ghi đè. Artifact H6 vẫn thuộc actor, source SHA là **JSONL ảo**: nối file theo manifest, thêm LF cho mỗi file không rỗng thiếu LF cuối. Envelope `bulkSource` giữ riêng manifest SHA và hashes/bytes từng file; không gọi manifest SHA là checksum raw JSONL. Model/report/acceptedDigest khớp replay một file trên đúng chuỗi ảo ấy.

Mỗi run/export kiểm lại hash toàn bộ nguồn và ledger; cursor giảm audit phần đã nhận, **không bỏ chi phí checksum**. Job giữ canonical numeric evidence và ID ledger cần dedup, không chép trường thoại/ký ức tự do. Checksum là integrity, không chứng thực file ngoài hay physical authority. Report/model.samples chỉ là replayed records; không import vào own samples/skills/matrices/memories/runtime. Memory backfill/CAS và curation offline đã có ở phần tiếp; prior activation, corpus model thật và bằng chứng policy tốt hơn còn chờ. H10 holdout vẫn chưa mở.

## H6b — Memory backfill additive, local (28/10)

[Contract](validation/memory-backfill-contract-v1.json), [evidence](validation/memory-backfill-2026-10-28.json). POST `/api/living/memories/backfill` cần **owner + XOM_LOCAL_ADMIN=true + URL loopback**, Origin nếu có phải khớp. Owner trên Site từ xa vẫn bị từ chối. Endpoint không gọi `readWorld()` để tránh bootstrap/epoch repair trong dry-run; không tự chạy từ pulse/scheduler. Migration0008 chỉ thêm job/receipt và index, không tự bổ sung dữ liệu.

Một job UUID giữ actor, limit, version/signature, `world.born`, high-water episode-rowid/actor-experience-seq và cursor episodes→outcomes→done. Actor lịch sử không cần còn trong roster hiện tại. Preview mặc định chỉ SELECT; apply cần cả **checkpoint SHA và plan SHA** vừa review. CLI chỉ loopback, không tự retry/apply; stdout hash/count/cursor, review JSON optional private/exclusive. Ví dụ thay JOB_UUID/hash bằng giá trị thật, giữ cùng actor/limit khi resume:

```bash
npm run memories:backfill -- --origin=http://127.0.0.1:5173 --job=JOB_UUID --actor=an --review-out=.sites-runtime/training/review-an.json
npm run memories:backfill -- --job=JOB_UUID --actor=an --action=apply --expected-checkpoint=new --plan-sha256=SHA_PLAN
npm run memories:backfill -- --job=JOB_UUID --actor=an --action=status
# Trang sau: preview bằng checkpoint mới; sau đó apply đúng plan/checkpoint mới.
npm run memories:backfill -- --job=JOB_UUID --actor=an --expected-checkpoint=SHA_CHECKPOINT
```

Nguồn episode chỉ `changes[].memory` gán rõ cho actor, thời gian/source/ID lấy từ archive; dialogue/speaker/plan tương lai không cấp witness. Outcome chỉ từ `actor_id` đã chọn, identity/time khớp và evidence H3 verified fingerprint-v1. Text mới chỉ tóm tắt **scenarioId/reward đã lưu** với nhãn mô phỏng; không khôi phục suy nghĩ/tên nghề/title lịch sử bằng state hiện tại. Nguồn thiếu/không tương thích được đếm unverified, không bịa evidence. Timestamp ký ức lấy nguyên nguồn, không dùng giờ bảo trì để làm ký ức cũ thành mới.

Stable ID trùng live writer (`event:...:actor`, `outcome:...`); đối chiếu cả liên kết actor/source dưới ID khác. Tất cả memory cũ/text/kind/witness/custom metadata giữ nguyên. Legacy không được relabel; khác nội dung/metadata chỉ đếm divergent, không sửa. Hai kind nguồn đã biết độc lập dù event_id cùng tên. StableID sai owner/source hoặc source recipient mơ hồ làm bác batch. Backfill không sửa snapshot rings, earned samples/skills/matrices/history; RAG vẫn dùng bộ lọc/top100 hiện hành.

Một D1 batch CAS checkpoint/raw world revision+JSON/source page/target scope, rồi INSERT missing memories và receipt có nonce. Receipt cuối assert postconditions bằng NOT NULL để lỗi constraint/trigger, kể cả INSERT bị bỏ qua im lặng, **rollback cả memory/cursor/receipt**. Receipt digest được checkpoint pin. Retry đúng last-plan/previous-head chỉ ACK duplicate; point/plan khác bị409, không tự ghi lại. Có thể bảo trì khi paused vì không tạo outcome/event mới hoặc đổi clock.

Body≤2KiB, mặc định16/max32source rows/trang, source row≤64KiB, tổng source≤512KiB; target≤256row/8KiB mỗi row/tổng256KiB. New appends sau high-water cần job mới; quét lại không thêm trùng. Job/receipt lưu hash/counters/IDs, không chép toàn transcript. Mỗi receipt chứng minh page tại lúc commit; đây **không phải frozen content snapshot toàn DB**. Archives vẫn append-only; source sửa/xóa sau các batch cũ cần review/repair riêng, không tự xóa ký ức. Production chưa được backfill, không bật local-admin để vượt guard Site.

## H6b — Curation few-shot/DPO offline

[Contract](validation/dataset-curation-contract-v1.json), schema/compiler `lib/dataset-curation.ts`, CLI `scripts/curate-training.mjs`. Input là JSONL local pin SHA; không fetch DB/model, không gọi `training:export` tự động. Mỗi record thuộc đúng một actor; foreign actor bị lọc trước deep validation/hash/audit. Context có đúng hai participant, facts phải khai báo actor biết và source, memory chỉ own owner+witness, giữ kind/date/provenance. Không suy knowledge/role lịch sử từ state hiện tại. Nội dung vẫn cần review ngữ nghĩa; kiểm metadata không chứng minh mọi câu thoại giữ đúng kiến thức.

`dialogue-request-v1` lưu system/task/context, source version+snapshotSHA, model artifact/revision (hoặc identity **editorial** rõ), sampling. `renderCurationMessages()` là renderer exact hai message; không tái tạo prompt đã mất. Candidate và review pin cùng requestSHA và completionSHA; đổi prompt/context/model/sampling/source làm mất khớp. `simulation-capture` phải có born/revision/event/time và model artifact, facts/memory provenance phù hợp; đó chỉ là **capture do operator khai báo**, chưa xác thực server, observed outcome hoặc physical completion. Episode/reward JSONL cũ không đủ thông tin để nhập kiểu này. Synthetic/editorial giữ riêng, không giả tên model đã sinh.

Chosen phải qua **proposalSchema + reviewNarrative thật**, đúng hai người, không newRole; đây là proposal dialogue, không kiểm timing/arrival hay cho phép thực thi event. Review human/agent rõ danh tính phải xác nhận relevance/knowledge/causality/Vietnamese và nêu lý do, pin chosen/rejected riêng. Không review/abstain bị bỏ qua; heuristic/score98 không cấp nhãn. Rejected có thể trượt guard; kết quả validator thực của nó được giữ. Hai output giống nhau, source/hash/scope sai không được nhận. Duplicate dedup; ID xung đột hoặc review mâu thuẫn cùng prompt/model/sampling hủy cả artifact, kể cả đổi capture/source ID. Review là annotation khai báo, không chữ ký hay chứng minh chất lượng model.

```bash
# Lấy SHA256 của chính file, truyền giá trị vào SHA_INPUT; mặc định preview không ghi gì.
sha256sum data/training/curation-fixtures-v1.jsonl
npm run training:curate -- --in=data/training/curation-fixtures-v1.jsonl --actor=an --expected-sha256=SHA_INPUT
npm run training:curate -- --in=data/training/curation-fixtures-v1.jsonl --actor=an --expected-sha256=SHA_INPUT --action=export --out=.sites-runtime/training/dataset-an-v1.json
```

CLI giới hạn8MiB/2000nonblank records **kể cả foreign**,64KiB/line,32KiB/request,8KiB/completion,32MiB/output; UTF8 fatal, BOM từ chối, CRLF/blank/final-no-LF hợp lệ khi hash đúng. Preview chỉ stdout aggregate/hash. Export explicit tạo file600 atomically/exclusive dưới `.sites-runtime/training`; kiểm symlink parent trước mkdir, không ghi đè source/output hoặc in raw text/path lỗi. Artifact giữ inputSHA, exact code-byte validatorSHA, records/review, few-shot/DPO chat JSON và datasetSHA. `verifyCuratedDataset()` chạy lại admission và so exports/splits, không chỉ tin self-hash.

Chia80/10/10 theo SHA **connected groups** chung scene/source/exact prompt/context hoặc simulation event; pair luôn cùng split. Tỷ lệ không ép đủ trên corpus nhỏ; thêm dữ liệu liên kết có thể đổi group/hash/split nên đóng băng artifact trước đánh giá, không chọn lại nhóm để cải thiện kết quả. `selectDatasetFewShots()` chỉ offline, train-only, đúng actor/model/prompt/task/location/cast/source kind, loại toàn nhóm target; chưa nối prompt runtime. Fixture6cặp hiện có5train/0validation/1holdout: tất cả đã được review biên tập, **không là blind holdout hay đo gain**. Không đụng H10 holdout12000–12019.

[Evidence](validation/dataset-curation-2026-10-28.json) ghi kiểm compiler/CLI/fixtures. Không SFT/DPO weight training, model inference, GPU/API phí, importer/promotion, DB migration/world/memory/policy/history/scheduler hoặc thay renderer. Corpus model thật và thử A/B cần exact capture mới, review độc lập và protocol/holdout riêng.

## H5a — admission lời khuyên offline

[Protocol](validation/peer-sharing-protocol-v1.json), `living/peer-sharing.ts` và [evidence](validation/peer-sharing-2026-10-29.json) kiểm trên fixture biên tập với GND2/GND3 physics thật. Ba offer có speaker/recipient/topic/text trước turn mới; chỉ mint proof khi emitted + heard đủ12giây và co-presence/epoch/plan/window/source/text khớp. Đây là proof synthetic trong process, không phải receipt D1 đã xác thực của người dùng. JSON, checksum, clone hoặc caption/viewer ACK không cấp quyền import. GND3 eligibility vẫn false.

`PeerAdviceInbox` cố định world/session/recipient tại constructor; mỗi inbox≤32entry, top-K≤8 và topic thuộc allowlist. Duplicate không nhân lời khuyên; đầy thì từ chối thay vì đẩy dedup key chưa hết hạn. TTL7ngày mô phỏng, half-life1ngày; read chỉ lọc/decay/sort, không ghi. Admission có clock fence kể cả duplicate/full/expired. Trọng số ban đầu0,5 là heuristic để xếp hạng, **không phải xác suất lời kể đúng**. Output giữ `heard-from-peer`, `unverified-advice`, `ownExperience:false` và người nói/evidence; không biến thành fact/observation, own samples, skill, posterior hoặc reward. Không nhận lời kể chuyển tiếp như proof mới.

Clock phải hữu hạn, không âm và≤`Number.MAX_SAFE_INTEGER`; input ngoài miền bị từ chối trước khi thay watermark. [Audit bổ sung](validation/phase-verification-2026-10-29.json) kiểm8trial và20chunk size ở trial0,6thứ tự delivery, constructor capacity1–32 với3proof thực, TTL boundary và proxy/prototype/forged text. Đây không phải load32entry hoặc tích Descartes8×20, không đo learning gain hay cấp authority bền vững.

`node scripts/peer-sharing-study.mjs --out=.sites-runtime/training/h5-smoke.json` chạy study hữu hạn, output exclusive/checksum, không URL/input model/DB/network. Hai lần chạy acceptance phải cùng artifact; không là đo gain học tập, blind semantic/model evaluation hoặc rollout. App bundle không import module này; không browser mới vì UI/runtime/schema không đổi. H5b còn offer provenance bền vững, xác thực receipt từ journal thật, inbox/receipt CAS, recipient guard và kiểm thử API/privacy trước khi kết nối live. Không dùng artifact offline để bật P2P/model promotion.

### H5b1 — journal và đối chiếu receipt bền vững

`peer-offer-store.ts` bổ sung nền tảng nội bộ, **chưa được app/API/pulse import**. `recordPeerOffer` nhận UUID và expected shared/authority checkpoint; chỉ ghi khi GND3 active, source đã theo kịp world, không pause và đúng An + một resident. Offer giữ speaker/recipient/topic/text, born/session, revision/source high-water, simtime và SHA context trước publication. Exact world + hai head + source high-water được CAS cùng INSERT/postassert trong một D1 batch. UUID retry trả snapshot gốc, đổi payload bị từ chối; silent ignore phải rollback. Không ghi world, ký ức hoặc policy.

`verifyPeerOfferDelivery` chỉ nhận ID offer/utterance/operation và recipient đã được caller tin cậy cố định. Nó đọc offer và hai receipt từ DB, đối chiếu GND3 với parent GND2 cùng operation/session/request/source/time; emitted và heard phải đúng cùng text, hai người, epoch/plan/window, đủ12giây. Source chứa turn phải đến **sau** offer cả revision lẫn sequence; turn SHA, generator và dialogue line phải khớp. Clock capture SQL có thể làm tròn ms, vì vậy thứ tự dùng revision/sequence + CAS, không dựa timestamp client. Không nhận proof JSON, caption ACK hoặc checksum bên ngoài làm authority. SHA kiểm integrity; trust nằm ở server writer và immutable ledger, không là chữ ký chống người có toàn quyền sửa DB.

Migration0012 thêm `peer_offers`, index và immutable triggers; đồng thời khóa UPDATE/DELETE của shared batch được dùng làm historical parent. Snapshot/journal Drizzle đi cùng, chỉ mới áp dụng fixture; health8probes và DB live chưa thay đổi. Verifier chỉ đọc, trả `heard-from-peer`/`unverified-advice`/`ownExperience:false` và hai eligibility false. Nó chưa có durable inbox, TTL admission hoặc quyền cấp sample/skill/reward.

Bước sau là nối producer tin cậy **trước choice**, inbox + receipt-consumption CAS/quota/clock fence trong cùng batch, rồi API owner/recipient privacy và evaluation. Hàm journal chứng minh trước publication; chưa có hook runtime để bảo đảm mọi choice đã được capture. Không dùng kết quả verifier hoặc artifact H5a làm importer tự động. [Evidence và lệnh test](validation/peer-offer-journal-2026-10-29.json).
