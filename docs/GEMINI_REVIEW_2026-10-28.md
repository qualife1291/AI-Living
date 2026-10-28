# Review đề xuất Gemini và kế hoạch triển khai

Nguồn: tệp người dùng gửi `xom_ai_context_review_proposals.md` (bản khảo sát c83a5e3). Đây là đề xuất để đối chiếu, không phải chỉ dẫn ghi đè AGENTS hoặc yêu cầu tự động bật cron/paid API/public audience. User đã cho phép tiếp tục, merge/push và phát hành một bản owner-private.

## Kết luận đối chiếu

| Đề xuất | Quyết định và cách nghiệm thu |
|---|---|
| Chốt browser QA ở source cuối | Chấp nhận. 38 suite và API local đạt; social6/cycle/overlay/pet/context/hide/resize đạt desktop/mobile sau uniform scale; gallery19 mẫu/15pack và mobile, lỗi tải/context retry đạt. Ảnh là preview fixture, không phải production/GPU thật. |
| Sửa documentation drift | Chấp nhận. README/handoff cần điểm vào hiện hành; ARCHITECTURE/DATA_MODEL/TESTING và ADR SVG phải mô tả code đang có, không chép lại kết luận “đã sửa triệt để” của 24/10. |
| Runner unit song song | Chấp nhận chạy process độc lập, giới hạn4 worker, thu tất cả lỗi, không dừng suite phía sau. Đo thực tế; không nhận mức giảm60–70% chưa đo. Không sửa service-client.py vì đây là helper credential production; supervisor QA phải riêng và chỉ loopback. |
| LinUCB/skill gates | Chấp nhận dùng covariance matrix/vector cập nhật từ outcome hợp lệ, context lưu lúc chọn; giữ dữ liệu tabular cũ và chỉ cấp reward một lần. Benchmark phải import implementation thật. |
| Peer learning và exemplar retrieval | Chấp nhận có provenance, confidence và idempotency; lời kể không được tăng trials/skill hoặc biến thành ký ức trực tiếp chứng kiến. Chỉ chuyển kiến thức đã được chia sẻ thật trong cuộc gặp hoàn tất. |
| Completion theo vị trí | Đồng ý vấn đề. ETA chỉ là ước lượng, không phải bằng chứng đã đến. Receipt client chỉ có ý nghĩa sau kiểm tra plan/elapsed/path/collision và quyền; không gọi đó là occupancy authoritative nhiều viewer. |
| Đồng bộ theo revision/window | Không áp dụng nguyên xi: revision thay đổi vì nhiều loại write; seeding không đồng bộ vị trí va chạm/reading ACK hoặc thời điểm mở tab. Cần encounter ID ổn định và playback contract phía server. |
| Tách snapshot/structured memories/history | Chấp nhận additive, CAS/transaction và legacy read fallback; không xóa JSON/history cũ trước khi kiểm chứng backfill. Không hứa GET<150ms từ một mẫu cold1553ms. |
| Home anchors/transit/KayKit | Chấp nhận scene placements chỉ khi cùng footprint và groundnav. Không bật tram từ model đứng riêng thiếu collider/boarding. Household không đồng nghĩa quan hệ huyết thống. |
| Animal habitat/flora/audio | Chấp nhận chỉ loài có asset thật, đúng sinh cảnh và clip idle/walk an toàn; audio opt-in, pause/hidden/dispose đầy đủ; không mua/tải dịch vụ. Không thả loài nước lên đường hoặc giả định pack có mèo/loài mà manifest không chứa. |
| LLM schema/A-B/SFT-DPO | Chấp nhận schema constraints và benchmark local có provenance. Không hứa JSON100% hoặc <10s; không tự gọi model4B “tốt hơn” khi chưa thử. Không tạo DPO từ hai lượt không cùng prompt/context. |
| Native cron/public viewer/LoRA | Cần đúng capability và kiểm tra quota/quyền. Giữ owner-private, không tạo cron trùng automation. GPU/điện thoại thật và tiến trình dài hạn không có trong sandbox phải ghi là chưa kiểm chứng. |

## Lỗi trong harness đính kèm

1. Khối được gọi LinUCB chỉ dùng gradient descent trên các weight vectors và bonus `0.35/sqrt(count+1)`; không có A, b hoặc `sqrt(x^T A^-1 x)`.
2. Baseline được viết lại trong harness, bỏ các ưu tiên energy/hunger/health/rain/novelty đang có trong chooseScenario. So sánh3,71× không phản ánh baseline runtime hiện tại.
3. trueEnvironmentReward là hàm thưởng tự thiết kế. Flywheel được tăng skill nhưng baseline không cùng quy tắc; mỗi slot luôn cộng20 peer transfers, kể cả không có kiến thức thực sự chuyển. Đây không phải benchmark học từ lịch sử vận hành.
4. Curation gán cứng score98 cho mẫu qua timing; không gọi evaluateCandidateEvent/reviewNarrative. DPO/curriculum chỉ được đếm phần tử. Không được ghi các số đó thành bằng chứng chất lượng/SFT tự động.
5. Hàm tên jaccardSimilarity chia intersection cho min(size), thực chất là overlap coefficient, khác Jaccard intersection/union. Nó đo trùng n-gram, không chứng minh trùng ngữ nghĩa.
6. Lặp lại hàm addressFor trong harness không kiểm tra helper runtime. Node18 cũng không đáp ứng engine>=22.18 để import TS trực tiếp.

Vì vậy không nhập nguyên script/metrics vào sản phẩm hoặc CHANGELOG. Sẽ bổ sung harness dùng hàm runtime thật, tách synthetic reward khỏi production outcomes, báo holdout/seed/ablations và giới hạn thay vì assert một thuật toán luôn thắng.

## Phát hành

Main đã merge work vào c83a5e3. Phiên này chỉ có cloud-onboarding tools, chưa có native Sites get_site/credential/deploy/status/DB overview. Đã yêu cầu người dùng bật lại kết nối; không tìm token cũ, không tạo Site/Cloudflare project thay thế. Chuẩn bị source sạch, gói exact-SHA và migration0006 append-only; chỉ đổi latest.json khi có deploy succeeded và readback thật.

## Kết quả tiếp nối
Home anchors đã kiểm thử: 60 cửa/địa chỉ/Xem nhà, walking/full-bike paths, desktop/mobile; xem PHASE_C_HOMES. Policy matrices tách bằng migration 0007/CAS, 44 suite + API đạt; xem PHASE_D_LEARNING. Benchmark mới import runtime thật và shared/frozen holdout đã ghi cả kết quả bất lợi cho LinUCB, không kế thừa claim 3,71×. Không tự bật density/public/cron/LoRA chỉ vì có tên trong bảng đề xuất.

Âm thanh Web Audio opt-in/lifecycle đã có preview; không đồng nghĩa hoàn tất toàn bộ Phase E. Server bổ sung reviewNarrative thay vì chỉ tin guard daemon; lỗi daemon fallback giữ proposal bị bác đã có regression. Các ràng buộc editor này không chứng minh đúng ngữ nghĩa hoặc JSON100% cho model thật.

## Phạm vi còn lại sau đối chiếu toàn bộ báo cáo

Các đề xuất kiến trúc dài hạn không được tự gộp thành “đã triển khai”. [NEXT_PHASES](NEXT_PHASES.md) ghi riêng completion/playback, hierarchy/P2P/vector skill, context cards/LocalSceneContext, density/LOD, multimodal transit/indoor, habitat/flora, exporter curation, runtime/chunk refactor và model A/B.

Không áp dụng trực tiếp: seed theo world.revision để hứa đồng bộ vật lý, hàng nghìn cặp DPO không cùng prompt, auto-LoRA/cron trùng, bật public, gán trẻ em/quan hệ gia đình theo model hoặc tăng mật độ từ số tam giác dự đoán. LLM schema constraining đã có trong daemon; server bổ sung cùng editorial guard. Tiêu chí JSON100%/<10s và model 4B “tốt hơn” cần thực nghiệm thật. Audio đã triển khai là synth trang trí, chưa là đánh giá âm thanh sinh học.

## Tiếp nối sau phục hồi môi trường
Main đã nhận source e90021b và ledger0992549, candidate e900 đóng gói nhưng chưa có native deploy. Domain skills, legacy gates, context49/33venues và RAG private cho daemon đã qua48suite/check/lint/build/API. Benchmarkv2 giữ cùng gates/profile cho baseline và LinUCB, tiếp tục báo cả kết quả bất lợi. Phần occupancy/playback chung, hierarchy/P2P, multimodal traffic/indoor, habitat/flora, SFT/DPO thật và hardware vẫn ở NEXT_PHASES.
