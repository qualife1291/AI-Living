# Phase D — lựa chọn hoạt động, dữ liệu học và hội thoại

Đã kiểm thử trong source, chưa deploy. Đây là học policy trong mô phỏng; trọng số Qwen không được fine-tune.

## LinUCB và điều kiện kỹ năng

Disjoint LinUCB dùng 6 features `[1, energy/100, hunger/100, socialNeed/100, isFreshRain, skill/100]`, ridge prior I, inverse covariance đối xứng 21 số và b 6 số. Sherman–Morrison cập nhật từ outcome hợp lệ; điểm là `xᵀA⁻¹b + α√(xᵀA⁻¹x)`. Các ưu tiên nhu cầu, ngủ, sức khỏe, mưa và tránh lặp vẫn được giữ.

Pending mới lưu context lúc chọn. Pending cũ thiếu context tiếp tục tabular, không gán context giả; trials, meanReward, memories và archive cũ được giữ. Chỉ hoàn tất đúng kế hoạch một lần mới học. MinSkill mở dạy lớp ở 8, sửa xe ở 4, văn phòng ở 3 và dự án học ở 2; hoạt động học cơ bản vẫn mở. Không hủy hồi tố kế hoạch cũ. Tám nhóm điểm thực hành và bốn domain gates đã bổ sung trong source tiếp nối; chưa phân cấp global/role/P2P.

Pending NPC đã dùng tổng thời lượng mọi bước thay 180 giây cố định. Completion vẫn theo simulation time và plan matching, **chưa phải bằng chứng vị trí ground**. Không dùng nó để công nhận đã trực tiếp gặp, nghe kể hoặc boarding thật.

## Policy tách khỏi snapshot

Migration 0007 tạo learning_policies theo actor với exact revision. Snapshot giữ needs, tabular, memories, pending và policyRevision; ma trận inverse/b/samples ghi cùng transaction CAS/nonce với world/outcome/archive. World polling không query bảng policy; planner, living view cho daemon và learning API hydrate đúng version.

Legacy inline được giữ trước migration, chuyển khi có learning write và bảng đã tồn tại. Inline khớp bản riêng được tiếp nhận; conflict, corrupt hoặc thiếu tham chiếu dừng để bảo toàn dữ liệu. Mixed revision được đọc lại một lần. Không xóa history hoặc policy của actor vắng trong snapshot. Binary cũ không hiểu policyRevision: rollback phải đối chiếu backup và các hàng policy trước khi bật writer, không tự hợp nhất/xóa chúng.

D1 test 240 actor × 41 arm: inline 5.131.102 byte, snapshot 57.982 byte, 11 parameter chunks dưới 500KB. Đây là fixture, không cam kết world live dưới 50KB hoặc GET dưới 150ms. Stale CAS không ghi policy; lỗi cuối batch rollback cả world và ma trận.

## Ký ức có provenance

Bảng memories nhận event-report cho đúng change recipient và simulation-plan-outcome cho đúng actor; không suy người chứng kiến từ speaker của hội thoại tương lai. Stable IDs, INSERT OR IGNORE và revision/nonce guard đi cùng transaction. Archive experiences dùng một INSERT SELECT json_each thay hàng trăm INSERT riêng; không cắt lịch sử đã lưu.

GET /api/living/memories owner-only lọc actor/witness, lấy top-K theo topic/importance/time từ 100 hàng gần nhất. Instructions context có 4 record/core, gắn nguồn và coi chuỗi là dữ liệu, không phải chỉ thị. Legacy rows được đọc với nhãn legacy-record. Chưa có backfill đầy đủ mọi chuỗi lịch sử, RAG cho toàn bộ daemon/NPC hoặc tuyển chọn exemplar chất lượng ngữ nghĩa.

## Chống lặp và xưng hô

Server lưu 64 scene/line hashes cho lượt An bằng CAS; rule scene lặp dùng grammar còn câu chưa dùng, LLM trùng toàn cảnh bị bác trước write. Pool cuối dùng bản LLM đã nhận, không chứa rules draft bị thay. Generated không đồng nghĩa đã được nghe hoặc đã nhận reward.

Ambient browser lưu hash theo world.born qua F5, không lưu raw text, tên hoặc credential; storage bị chặn có session fallback. Đây chưa phải authority chung cho nhiều viewer. Tuổi/giới đã khai báo cấp cặp xưng hô hai chiều cho template mới và turn.addressing của LLM; unknown dùng mình/bạn. Không rewrite lịch sử hoặc suy tuổi/giới từ model.

Server chạy reviewNarrative: 4–6 câu ngắn, hai speaker luân phiên, không lặp gần nguyên văn. Daemon chỉ gán proposal sau review và xóa nó khi fallback; JSON hợp lệ nhưng bị review bác không còn bị gửi lên server. Guard cấu trúc/trùng từ không chứng minh đúng ngữ nghĩa. Role expansion dùng roleSchema và Jaccard intersection/union, chặn ID gốc/dated-ID, label và greeting trùng trước write.

## Benchmark và kiểm chứng

`npm run benchmark:policies -- --output docs/validation/policy-holdout.json` import chooseScenario/settleLearning/linearScore thật. 8 seed, mỗi seed 820 outcome training dùng chung, 160 observation holdout độc lập và model đóng băng; cùng needs/weather/skills/gates, không cộng skill/P2P giả.

| Policy | Reward trung bình | Prediction MSE |
|---|---:|---:|
| Tabular | 0,560713 | 0,003851 |
| LinUCB | 0,550357 | 0,003062 |

LinUCB dự đoán tốt hơn nhưng điểm có exploration cho thưởng tức thời thấp hơn trong mẫu này. Reward là công thức mô phỏng, không phải hoàn thành vật lý/chất lượng ngôn ngữ; immediate regret không đo lợi ích dài hạn. Không chỉnh hyperparameter để ép thắng holdout hoặc nhận claim 3,71×/20–50×.

Oracle ridge độc lập 1.200 update sai số tối đa 5,83e-16; test context-at-choice/gates/no-early/no-duplicate/cancel/legacy/purity đạt. Full 45 suite/check/lint/build/assets và compiled Worker/D1 API đạt, gồm policy hydration, CAS/retry/history, actor privacy, role guard và server review. Browser dialogue/poll/F5 đã đạt ở mốc phase D; lượt nguồn tích hợp mới được ghi riêng trong MEMORY_LONG và candidate ledger sau khi hoàn tất. Chưa có model A/B thực, GPU phần cứng, soak dài hoặc production readback phiên này.

## Điểm thực hành theo ngành

Tám nhóm: học tập, kỹ thuật, phục vụ, công việc/mua sắm, vận động, đi lại, chăm cây/thú và cộng đồng. Hoàn tất kế hoạch hợp lệ chỉ cộng nhóm skillDomain của scenario, tối đa 100. Việc mới bắt đầu, bị hủy, sai plan hoặc retry không cộng; đi khám không tạo chuyên môn y tế. Archive ghi skillGain thực gồm domain/before/after/amount, không gán điểm cũ cho mọi nhóm.

New models phải đủ minSkill và minDomainSkill cho bốn hoạt động nâng cao. Mô hình cũ chưa có vector vẫn dùng scalar; khi có outcome mới, ghi vector từ 0 và giữ đúng danh sách gate đã mở trước đó. Core có scalar progress trước khi có policy cũng giữ các gate cũ, không được tăng samples/điểm ngành chỉ vì backfill. ID, ký ức, tabular và posterior được giữ; chưa retroactively hủy plan. UI Học hỏi hiển thị tám nhóm và bốn trạng thái mở khóa.

46/46 suite, check/lint/build, API D1 archive/persistence đạt. Browser desktop/mobile/320px xác minh hai gate mở/hai khóa theo fixture, legacy giữ bốn gate, không NaN/overflow/JS error; social6/poll/F5 đạt. Ảnh ở screenshots/domain-skills là preview fixture, không phải production.

Benchmark v1 ở bảng phía trên được giữ riêng tại validation/policy-holdout-v1.json. V2 trong policy-holdout.json dùng explicit single-domain synthetic history và meetsSkillGate runtime cho cả baseline/oracle. V2 reward/MSE: tabular 0,561797/0,003588; LinUCB 0,559612/0,002683. Tiếp tục không tuyên bố thuật toán luôn thắng; đây không phải model A/B ngôn ngữ hoặc hoàn thành ground.
