# Bốn kịch bản Studio — hợp đồng hiện hành

Nguồn đặc tả: [living-scenarios-request](specs/living-scenarios-request.md), file người dùng `Kịch Bản.md`, SHA256 `787b96e54aaab31c567170074702b3e082184807071e596d126d6eb20954f327`. Chỉ tra cứu micro-spec khi sửa cảnh. Các điểm94–97, tự patch/weights và WebGPU-ultra trong đặc tả không phải kết quả nghiệm thu.

## Chạy và nguồn dữ liệu

Mở `/studio`. Bốn ID `wallet-return`, `sanitation-gratitude`, `kitten-care`, `bakery-courtesy`, mỗi cảnh120giây/năm shot,10world units/m. `lib/city/scenarios/index.ts` xuất `scenarioDefinitions`, `scenarioFrame(id,seconds)` và types. Frame có cast, chuyển động, đạo cụ/custody, camera, thoại và ledger biên tập; seek/pause/replay tuyệt đối. Studio không đọc/ghi worldDB, memory/policy hoặc lịch sử live.

Hiện dùng5rig supplied Casino/Chess đã chuẩn hóa cùng city/gallery, giữ tỷ lệ và chung world scale với đạo cụ/camera, bỏ tay nguyên khối khỏi instance rồi dựng tay hai đoạn/khuỷu/palm và contact targets. Absolute rig sampling giữ seek tương đương; kernel chuyển động nhân quả0,6s nối các hành động, prop theo tay hiện tại. Mèo có khớp/chuyển động thở/tai/đuôi, khăn gấp cong theo thân. Camera fit người/đạo cụ theo aspect và shot, nền không lộ mép trong portrait. Renderer giữ dưới25.000triangle/150drawcall theo contract local. Đây là điều khiển kinematic, chưa vật lý toàn thân hoặc finger/foot locking đầy đủ.

Studio đã bỏ đường render/preload Kenney character cũ và factory mèo placeholder. Catalog Kenney còn dùng ở city fallback, environment và gallery nên vẫn giữ model/texture/license đó; không xóa tài nguyên đang có consumer.

## Hợp đồng câu chuyện

| Cảnh | Điều kiện chính |
|---|---|
| Trả ví | Một ID ví, chủ sở hữu luôn Minh; rơi→Tuấn nhặt/kiểm tra→xác nhận chủ→trao Minh, không nhận tiền thưởng. Rơi75cm/restitution0,15 cho nảy khoảng1,69cm. |
| Tri ân lao công | Mời trước nhận/uống; Hạnh cất chổi, Lan chuyển ly; Hoàng dùng chổi phụ rồi cất; tám lá bảo toàn. |
| Chăm mèo | Trẻ gọi người lớn và chờ hỗ trợ; chuẩn bị khăn trước giữ ấm/bế, người lớn đỡ bụng; không trình diễn cắt dây sát da hoặc cho uống sữa. |
| Quầy bánh | Ba được mở lối tới quầy; Nam trở về cuối hàng, giữ FIFO bốn người khác; một lần giao ổ bánh/năm ổ bảo toàn. Kết cảnh không có nghĩa mọi người đã mua xong. |

Cast/tuổi/địa điểm là hư cấu riêng của Studio. Khoảng tâm tối thiểu trong logic v2: ví0,8m, lao công0,8m, hai người chăm mèo1,4066m, hàng bánh1m; không là khoảng hở bề mặt da. Mèo được phép gần người lớn khi đang đỡ.

## Âm thanh

Mặc định off, chỉ tạo AudioContext sau gesture.21clip tiếng Việt dựng offline, hash/duration/license/model revision tại `public/audio/studio/manifest.json` và `LICENSE.txt`; Piper/VAIS1000medium CC BY4.0 chỉ là công cụ authoring, model/venv không được đóng gói. Runtime tải OGG cùng Site, không gọi TTS/API ngoài, không clone danh tính. Có nền, bước chân và foley theo timeline; pause/seek/hidden/mute hủy hoặc phát lại đúng offset, dispose idempotent.

Browser đã đo AudioContext phát voice/steps và điều khiển, không phải human listening/MOS hay lip-sync. Navigation tạo document mới và không autoplay; lời gọi close trong document đang unload không quan sát được từ browser harness. Contract dispose/stop-order được kiểm riêng bằng mocked WebAudio unit.

## Bằng chứng và giới hạn

Mới nhất: [Supplied acceptance](validation/supplied-civilians-2026-10-29.json)/[12ảnh thật](screenshots/supplied-civilians/manifest.json), source68060d6:8case desktop/mobile,40shot dưới25ktriangle/150drawcall, scenery sightline/cutaway,4contact gap0 và4audio output thật. Fit theo torso, cap vai và LOD có skin weights giữ hình thể; không lấy ảnh chuyển cảnh làm ảnh settled. Mốc trước: [Citizens acceptance](validation/citizens-2026-10-29.json)/[ảnh](screenshots/citizens/manifest.json),8case desktop/mobile với rig mới; contact gap≤0,2943unit, không đổi custody/logic/audio. Mốc Human002 trước đó: [Contract v2](validation/studio-quality-contract-v2.json), [report](validation/studio-quality-v2-2026-10-29.json), [12ảnh thật gồm before](screenshots/studio-v2/manifest.json). Logic11/11case/28.804frame, không static/swept-human overlap; rig test bốn cảnh seek tương đương, gap tiếp xúc tối đa0,2231unit. Browser8case desktop/mobile qua40shot/framing, play/pause/seek/end/replay, thêm hai retest khăn; audio bốn cảnh có output thật. Nguồn build cho từng nhóm được tách rõ trong report, không gọi tất cả là một lần chạy cùng SHA. Mốc GND3 sau đó chạy đầy đủ69suite, gồm cả hai suite Studio.

```bash
npm run simulate:living
node scripts/test-studio-quality.mjs
node --experimental-transform-types scripts/test-studio-sound.mjs
QA_BASE=http://127.0.0.1:PORT QA_OUT=work/studio python3 scripts/qa-studio.py
QA_BASE=http://127.0.0.1:PORT QA_OUT=work/studio-sound python3 scripts/qa-studio-sound.py
```

SwiftShader/local fixture chưa chứng minh GPU/mobile FPS,24h soak, tiếp xúc từng ngón, weight transfer toàn thân, pores/tóc/vải/lông vi mô, DOF/volumetrics/reflection hoặc chất lượng model LLM. Không fine-tune weights, auto-patch hoặc xuất video từ cảnh; video/public/multi-user vẫn tạm hoãn.
