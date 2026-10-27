# Phase D — LinUCB và điều kiện kỹ năng

Đang triển khai source sau release candidate168861b; chưa deploy. Đây là Disjoint LinUCB thực với6features `[1, energy/100, hunger/100, socialNeed/100, isFreshRain, skill/100]`, ridgepriorI, inverse covariance đối xứng21số và b6số. Update Sherman–Morrison từ outcome đã được settle một lần. Score dùng `xᵀA⁻¹b + α√(xᵀA⁻¹x)`, giữ các ưu tiên nhu cầu/ngủ/sức khỏe/rain/novelty hiện hành.

Mỗi pending mới lưu context lúc chọn, không học từ needs đã thay đổi lúc hoàn tất. Snapshot legacy không có context tiếp tục tabular, không gán context giả hoặc xóa history. Tabular meanReward/trials/memories vẫn giữ; experience mới ghi disjoint-linucb-v1/context khi có update contextual. Chưa hierarchy global/role hoặc chuyển weights qua bạn bè; không gọi gradientdemo trong fileGemini là LinUCB.

Scenario thêm minSkill optional: dạy lớp8, sửa xe4, văn phòng3, dự án học2; các hoạt động cơ bản/học nghề vẫn mở để tích lũy. Không hủy các kế hoạch advanced đã tồn tại trước rulemới. Các cư dân hiện đều là người lớn mô phỏng, chưa kích hoạt hệ thống trẻ em. Chưa có vector kỹ năng riêng theo ngành.

Cũng sửa pending NPC từ180s cố định sang tổng thời lượng mọi bước thực trong plan. Nó tránh thưởng trước bước hậu thoại/cycle thứhai; vẫn là completion theo kế hoạch simulationtime, chưa phải bằng chứng vị trí vật lý hoặc authoritative occupancy đa viewer.

Test mới dùng oracle giải hệ ridge6×6 độc lập qua1.200update, sai số tối đa5,83e-16; ranking đổi theo context, gate/unlock, cần đủduration/capturecontext/noDuplicate/cancel/purity đạt. 38suite cũ đạt với integration trước thêm suite39. Không báo cải thiện model/ngôn ngữ hoặc reward3,71× từ testsynthetic; benchmark/runtimepersistence còn phải nghiệm thu riêng.

Còn phải xử lý storage policy tách khỏi snapshot trước mật độ240, hierarchy/P2P có provenance, durable dialoguepool/memory và benchmark cùng implementation/baseline/holdout. Giữ giới hạn physical completion và nativeSites trong MEMORY_SHORT.

Integration cuối hiện39/39suite/check/lint/build đạt; API Worker/D1 cô lập cũng đã ghi thật context/posterior/experiencearchive, retry không cộng lại và home/petOwners/memory cũ còn nguyên. Posterior cho context lỗi không được gắn provenanceLinUCB. Chưa browserfinal cho phaseD; sourcecandidate168861b cũ vẫn là góiđóngbăng riêng, không coi gói đó chứa các thay đổi này.

## Guard mở rộng vai trò

Tiếp tục từ reviewGemini: server cũ thêm hậu tố ngày trước khi ghi role, nhưng chưa chặn ID gốc đã có. reviewRoleExpansion dùng roleSchema thật, kiểm tra ID cả bản gốc/bảnđãsuffixngày, tên trùng, tiếng Việt và lời chào lặp theo Jaccard trigram đúng intersection/union. Guard chạy trước mọi world write, trả422 cho đề xuất không hợp lệ; không tự thêm ba nghề mẫu chỉ vì harness in accepted3/3. Đây là kiểm tra cấu trúc/trùng từ, không gọi là hiểu ngữ nghĩa. Helper/test và server wiring mới đang qua kiểm thử40suite/API.

Guard mở rộng đã qua40/40suite/check/lint/build; compiledWorker/D1 xác nhận đề xuất dùng ID cũ trả422 trước thêm hậu tố ngày và snapshot/revision giữ nguyên. Kiểm thử cached-context chỉ dùng D1côlập, không gọi model/provider hoặc production.

## Ký ức có nguồn và lưu batch

Đang nối bảng memories đã tồn tại (không migration/reset): event-report chỉ cho người được gán change.memory; không tự cho tất cả người nói trong kế hoạch biết báo cáo của người khác. simulation-plan-outcome lưu kết quả theo đồng hồ kế hoạch, không nhận physicaloccupancy. INSERT theo cùng revision/CAS transaction, ID ổn định cho retry. Endpoint owner-only /api/living/memories lấy topK từ tối đa100record của đúng actor; promptinstructions context đính kèm nhóm theo actor, coi chuỗi là dữ liệu.

Archive trải nghiệm đổi từ mỗi outcome một câu SQL sang một INSERT SELECT json_each trong cùng nonce/revisionguard; bulk memory cũng một câu SQL. Mục tiêu tránh hàng trăm câu lệnh khi cohort240cùng hoàn tất. Snapshot/history/tabular cũ vẫn giữ. Helper ranking/recipient/provenance/purity/bounds đã test; compiledAPIvàfull41suite còn đang chạy, chưa chốtfeature.

Structuredmemory đã qua41/41suite/check/lint/build và compiledWorker/D1 thật: event/outcome record đúngactor/provenance; GETmemories ownerguard; topK không rò actor khác; retry không duplicate; staleCAS không ghi record; archive JSONbulk giữmodel/context. Không migrationmới hoặc xóa snapshot/history. Legacy structured rows được đọc với kindlegacy-record và recipient riêng, không suy ra bằng chứng vật lý. Còn backfill lịch sử cũ theo quy trình riêng và lưu policy riêng khỏi snapshot; không tự gán fullmigration hoàn tất.

## Pool chống lặp và xưng hô — WIP

Server lưu tối đa64scene fingerprints trong living.dialoguePool qua snapshot CAS, chỉhash/toàncảnh vàhashdòng, khôngthaythếhistoryarchive. Cảnh rules củaAn nếu trùngtoànbộcảnhgầnđây sẽ dùng grammar lấy câu chưa dùng; proposalLLMtrùngcảnhcũ bị422, chỉ finalLLM được ghi pool thaydraft rules. Mỗi LivingTurn mới có addressing hai chiều từ tuổi/giới mô phỏng; grammar vàruletemplates dùng cháu/bác, cháu/cô/chú hoặc mình/bạn phù hợp thông tin. Prompt nhận addressing; fewshotdaemon sửa từ2lượt lên4lượt để khớp guard4–6.

Ambientclient giữ thêm poolhash tronglocalStorage theo world.born đểF5 khônglặp nguyênnhữngcâuvừagenerated, khônglưu rawtext/name/credential. Storage bịchặn/hếtquota cófallbacksession; loại tham chiếuSQLitehistory khôngxóa. Pool chỉghi “đãsinh”, không là bằngchứngngườiđãnghe và khôngtựgrantreward/kỹnăng. Cảnh ambient chưa đồng bộ readingtime/occupancy giữaviewers; khôngclaim clientstorage là backendauthoritativepool cho mọi ambientscene.

Test mới kiểm reciprocalpronouns, JSONpersist/reloadantiRepeat, scopeworldriêng, hash-only vàstoragefailure; sinh500scene giữbudget64record. Suite42/check/lint/build/API vàbrowserreload cuối đang chạy; không nhận WIP là phát hành.

Pool/xưnghô đã qua42/42suite/check/lint/build và API D1 thật: từ chối proposal trùngscene đãlưu, revision khôngđổi khi422; finalLLM pool cóđúngcảnhtrước+cảnhmới, khônglưurulesdraft chưapháthành. Browser desktop/mobile vẫn đủ6lượt/quapoll/cameracontrols, reloadcùngbrowser khônglặp câuđãsinh; ảnhreload ởdocs/screenshots/social. Đây là kiểm thửfixture, không phải lượtmodelthực hoặc đồngbộhaiviewer.

## Tách policy khỏi snapshot — đã kiểm thử local
Migration 0007 tạo learning_policies, không sửa migration cũ. Snapshot giữ needs/tabular/memories/pending và policyRevision; ma trận inverse/b/samples ghi vào hàng riêng cùng transaction CAS/nonce với world/outcome/archive. readWorld thường không query policy; planner, living view cho daemon và learning export hydrate đúng version. Không xóa history hoặc tác động policy của mutation không liên quan. Legacy inline được giữ trước migration; matching inline có thể chuyển khi có learning write; xung đột/corrupt/mất tham chiếu dừng để bảo toàn dữ liệu. Mixed revision được đọc lại một lần. Rollback binary cũ có thể bỏ qua bảng mới nhưng không được coi là khôi phục policy; phải đối chiếu trước ghi learning nếu snapshot cũ không còn reference.
D1 test 240 actor × 41 arm: inline 5.131.102 byte, snapshot 57.982 byte, 11 parameter chunks dưới 500KB. Đây là fixture riêng; không cam kết world live dưới 50KB hoặc GET dưới 150ms. Stale CAS không ghi policy, failure cuối batch rollback cả world/matrices, thiếu bảng trước migration giữ inline, corrupt/conflict/missing refs không reset. Full 44 suite/check/lint/build và compiled API đạt; API xác minh world polling bỏ matrices, learning endpoint hydrate và retry không tăng credit.

## Benchmark dùng runtime thật
Chạy `npm run benchmark:policies -- --output docs/validation/policy-holdout.json`. 8 seed, mỗi seed 820 outcome training dùng chung và 160 observation holdout độc lập; cả hai dùng cùng needs/weather/skill/gates, model đóng băng khi đánh giá. Import chooseScenario/settleLearning/linearScore thật; không thêm skill bonus hoặc P2P giả. Reward vẫn là công thức mô phỏng hiện hành, không phải hoàn thành vật lý hoặc chất lượng hội thoại/LLM.
Kết quả trung bình: tabular reward 0,560713/MSE 0,003851, LinUCB reward 0,550357/MSE 0,003062. LinUCB dự đoán tốt hơn trên mẫu này nhưng quyết định với exploration có thưởng tức thời thấp hơn; không kết luận thuật toán luôn thắng hoặc tăng tốc 3,71×. Immediate regret không đo lợi ích dài hạn. Không chỉnh hyperparameter để ép thắng holdout.
