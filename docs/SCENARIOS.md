# Bốn kịch bản Studio — hợp đồng hiện hành

Nguồn đặc tả: [living-scenarios-request](specs/living-scenarios-request.md), file người dùng `Kịch Bản.md`, SHA256 ` 787b96e54aaab31c567170074702b3e082184807071e596d126d6eb20954f327`. Chỉ tra cứu micro-spec khi sửa cảnh. Các điểm94–97, tự patch/weights và WebGPU-ultra trong đặc tả không phải kết quả nghiệm thu.

## Chạy và nguồn dữ liệu

Mở `/studio`. Bốn ID `wallet-return`, `sanitation-gratitude`, `kitten-care`, `bakery-courtesy`, mỗi cảnh120 giây/năm shot,10world units/m. `lib/city/scenarios/index.ts` xuất `scenarioDefinitions`, `scenarioFrame(id,seconds)` và types. Frame có cast, chuyển động, đạo cụ/custody, camera, thoại và ledger biên tập; seek/pause/replay tuyệt đối. Studio không đọc/ghi worldDB, memory/policy hoặc lịch sử live.

Hiện dùng 5rig supplied Casino/Chess đã chuẩn hóa cùng city/gallery, giữ tỷ lệ và chung world scale với đạo cụ/camera, bỏ tay nguyên khối khỏi instance rồi dựng tay hai đoạn/khuỷu/palm và contact targets. Absolute rig sampling giữ seek tương đương; kernel chuyển động nhân quả0,6s nối các hành động, prop theo tay hiện tại. Mèo có khớp/chuyển động thở/tai/đuôi, khăn gấp cong theo thân. Camera fit người/đạo cụ theo aspect và shot, nền không lộ mép trong portrait. Renderer giữ dưới 25.000 triangle/150 drawcall theo contract local. Đây là điều khiển kinematic, chưa vật lý toàn thân hoặc finger/foot locking đầy đủ.

Studio đã bỏ đường render/preload Kenney character cũ và factory mèo placeholder. Catalog Kenney còn dùng cho environment/gallery/reference nên vẫn giữ model/texture/license; fallback nhân vật hiện theo bộ supplied ở ASSETS, không xóa tài nguyên đang có consumer.

Khi chọn mèo đang được đỡ hoặc bế, camera lấy cả người hỗ trợ vào khung và tự nới khung lúc bắt đầu bế; chọn lại hoặc reset vẫn dùng envelope thực của đầu/tay/chân/đạo cụ. Kích thước đạo cụ cập nhật từng frame theo timeline, không chỉ lúc tạo mesh. Khăn xoay theo mèo, quấn quanh thân và để hở đầu; hai palm đỡ dưới bụng được kiểm khoảng cách tới tam giác của model mèo thực.

## Hợp đồng câu chuyện

| Cảnh | Điều kiện chính |
|---|---|
| Trả ví | Một ID ví, chủ sở hữu luôn Minh; rơi→Tuấn nhặt/kiểm tra→xác nhận chủ→trao Minh, không nhận tiền thưởng. Rơi75cm/restitution 0,15 cho nảy khoảng 1,69cm. |
| Tri ân lao công | Mời trước nhận/uống; Hạnh cất chổi, Lan chuyển ly; Hoàng dùng chổi phụ rồi cất; tám lá bảo toàn. |
| Chăm mèo | Trẻ gọi người lớn và chờ hỗ trợ; chuẩn bị khăn trước giữ ấm/bế, người lớn đỡ bụng; không trình diễn cắt dây sát da hoặc cho uống sữa. |
| Quầy bánh | Ba được mở lối tới quầy; Nam trở về cuối hàng, giữ FIFO bốn người khác; một lần giao ổ bánh/năm ổ bảo toàn. Kết cảnh không có nghĩa mọi người đã mua xong. |

Cast/tuổi/địa điểm là hư cấu riêng của Studio. Khoảng tâm tối thiểu trong logic v2: ví0,8m, lao công0,8m, hai người chăm mèo1,4066m, hàng bánh1m; không là khoảng hở bề mặt da. Mèo được phép gần người lớn khi đang đỡ.

## Âm thanh

Mặc định off, chỉ tạo AudioContext sau gesture.21 clip tiếng Việt dựng offline, hash/duration/license/model revision tại `public/audio/studio/manifest.json` và `LICENSE.txt`; Piper/VAIS1000medium CC BY4.0 chỉ là công cụ authoring, model/venv không được đóng gói. Runtime tải OGG cùng Site, không gọi TTS/API ngoài, không clone danh tính. Có nền, bước chân và foley theo timeline; pause/seek/hidden/mute hủy hoặc phát lại đúng offset, dispose idempotent.

Browser đã đo AudioContext phát voice/steps và điều khiển, không phải human listening/MOS hay lip-sync. Navigation tạo document mới và không autoplay; lời gọi close trong document đang unload không quan sát được từ browser harness. Contract dispose/stop-order được kiểm riêng bằng mocked WebAudio unit.

## Bằng chứng và giới hạn

Mới nhất: [Graphics acceptance](validation/graphics-interactions-2026-10-29.json)/[ảnh trước-sau](screenshots/graphics-interactions/manifest.json): city/Studio controls, animated prop dimensions, cat/supporter focus và belly-contact geometry; renderer Studio followup `a404bf4`. Có một cold navigation timeout local được giữ cùng kết quả chạy lại, không nhận soak/reliability PASS. Bản sửa đã vào work tại 5989cff; QA cần nghiệm thu theo source đang deploy.

Các mốc trước giữ nguyên để audit: [supplied](validation/supplied-civilians-2026-10-29.json), [Citizens](validation/citizens-2026-10-29.json), [contract v2](validation/studio-quality-contract-v2.json)/[report](validation/studio-quality-v2-2026-10-29.json). Mỗi report giữ source, contact/framing/seek và audio scope riêng; không gộp số case hoặc SHA của các lượt đó thành một lần nghiệm thu mới.

```bash
npm run simulate:living
node scripts/test-studio-quality.mjs
node --experimental-transform-types scripts/test-studio-sound.mjs
QA_BASE=http://127.0.0.1:PORT QA_OUT=work/studio python3 scripts/qa-studio.py
QA_BASE=http://127.0.0.1:PORT QA_OUT=work/studio-sound python3 scripts/qa-studio-sound.py
```

SwiftShader/local fixture chưa chứng minh GPU/mobile FPS,24h soak, tiếp xúc từng ngón, weight transfer toàn thân, pores/tóc/vải/lông vi mô, DOF/volumetrics/reflection hoặc chất lượng model LLM. Không fine-tune weights, auto-patch hoặc xuất video từ cảnh; video/public/multi-user vẫn tạm hoãn.
