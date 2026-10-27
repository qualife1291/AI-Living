# Phase D — LinUCB và điều kiện kỹ năng

Đang triển khai source sau release candidate168861b; chưa deploy. Đây là Disjoint LinUCB thực với6features `[1, energy/100, hunger/100, socialNeed/100, isFreshRain, skill/100]`, ridgepriorI, inverse covariance đối xứng21số và b6số. Update Sherman–Morrison từ outcome đã được settle một lần. Score dùng `xᵀA⁻¹b + α√(xᵀA⁻¹x)`, giữ các ưu tiên nhu cầu/ngủ/sức khỏe/rain/novelty hiện hành.

Mỗi pending mới lưu context lúc chọn, không học từ needs đã thay đổi lúc hoàn tất. Snapshot legacy không có context tiếp tục tabular, không gán context giả hoặc xóa history. Tabular meanReward/trials/memories vẫn giữ; experience mới ghi disjoint-linucb-v1/context khi có update contextual. Chưa hierarchy global/role hoặc chuyển weights qua bạn bè; không gọi gradientdemo trong fileGemini là LinUCB.

Scenario thêm minSkill optional: dạy lớp8, sửa xe4, văn phòng3, dự án học2; các hoạt động cơ bản/học nghề vẫn mở để tích lũy. Không hủy các kế hoạch advanced đã tồn tại trước rulemới. Các cư dân hiện đều là người lớn mô phỏng, chưa kích hoạt hệ thống trẻ em. Chưa có vector kỹ năng riêng theo ngành.

Cũng sửa pending NPC từ180s cố định sang tổng thời lượng mọi bước thực trong plan. Nó tránh thưởng trước bước hậu thoại/cycle thứhai; vẫn là completion theo kế hoạch simulationtime, chưa phải bằng chứng vị trí vật lý hoặc authoritative occupancy đa viewer.

Test mới dùng oracle giải hệ ridge6×6 độc lập qua1.200update, sai số tối đa5,83e-16; ranking đổi theo context, gate/unlock, cần đủduration/capturecontext/noDuplicate/cancel/purity đạt. 38suite cũ đạt với integration trước thêm suite39. Không báo cải thiện model/ngôn ngữ hoặc reward3,71× từ testsynthetic; benchmark/runtimepersistence còn phải nghiệm thu riêng.

Còn phải xử lý storage policy tách khỏi snapshot trước mật độ240, hierarchy/P2P có provenance, durable dialoguepool/memory và benchmark cùng implementation/baseline/holdout. Giữ giới hạn physical completion và nativeSites trong MEMORY_SHORT.

Integration cuối hiện39/39suite/check/lint/build đạt; API Worker/D1 cô lập cũng đã ghi thật context/posterior/experiencearchive, retry không cộng lại và home/petOwners/memory cũ còn nguyên. Posterior cho context lỗi không được gắn provenanceLinUCB. Chưa browserfinal cho phaseD; sourcecandidate168861b cũ vẫn là góiđóngbăng riêng, không coi gói đó chứa các thay đổi này.
