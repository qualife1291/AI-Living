# Asset, nguồn và giấy phép

Chỉ đọc khi nhập/model/texture/OSM hoặc tối ưu tải. Danh sách chính xác và SHA256 nằm trong manifest; không chép toàn bộ catalog vào context agent.

| Bộ | Nguồn chuẩn | Phạm vi hiện có |
|---|---|---|
| Kenney | `data/assets/kenney-manifest.json`, `public/models/kenney/catalog.json` |41 GLB/8 pack/103 file/2.954.655 byte; characters, cars, commercial, suburban, market, roads, trains, watercraft. |
| Gobkit/KayKit | `data/assets/resource-manifest.json`, `public/models/resources/catalog.json` |239 canonical glTF/GLB,15 pack/386 file/42.764.728 byte,114 model skinned. Động vật/người, Adventurers, Furniture, City Builder. |
| Xóm Citizens | `scripts/build-citizen-models.mjs`, `public/models/citizens/catalog.json` |12rig nguyên bản CC0, tóc/mặt/trang phục khác nhau, một skin/material,10clip mỗi model; tái tạo byte-identical. Giữ ở gallery/reference; city và Studio đã chuyển sang bộ supplied bên dưới. |
| Casino/Chess do chủ dự án cung cấp | `data/assets/supplied-selection.json`, `public/models/supplied/catalog.json` |5rig đã duyệt SHA, một mesh/material,44joint/11clip mỗi model; 2401–2551triangle;2palette dùng chung. LicenseRef theo xác nhận của chủ dự án, không CC0. |
| OSM | `data/city/hcm-district1.json`, metadata/source registry | Snapshot bbox `[10.770,106.692,10.782,106.707]`; độc lập với33 venue hư cấu và actor graph. |

Các model/texture/preview/license ở `public/models`; không bỏ license khi dọn tài liệu. [Kenney](https://kenney.nl), các gói Gobkit/KayKit đã nhập dùng [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/); bản license từng pack và manifest là căn cứ, không suy license từ tên website. Không tải FBX/OBJ trùng khi glTF đã đủ. Gallery tải từng model, không nạp toàn bộ catalog vào city.

## Nhập và kiểm

```bash
python3 scripts/import-kenney.py --source-dir /workspace/attachments
python3 scripts/import-resource-packs.py --help
npm run assets:check
npm run assets:maintain
npm run assets:compress # Tạo lại gzip transport từ canonical đã kiểm hash
npm run assets:import:supplied # Authoring từ source-vault đã xác minh; không cần trong CI
```

`assets:maintain` ghi semantic bindings; `assets:check` kiểm manifest/hash/texture/license và công thức procedural. Asset unknown-license hoặc nhu cầu thiếu phải báo lỗi; không dựng hộp giả rồi nhận đã hỗ trợ. Importer chỉ đọc whitelist/dependencies, từ chối traversal/URL ngoài/symlink/duplicate entries, có giới hạn bytes; không chạy code/HTML/URL trong ZIP. Dùng source ZIP chỉ khi cần reimport, không thêm ZIP vào Git/production.

Giữ canonical và nguồn/license/hash nếu làm compressed derivative. Dependencies tự phục vụ từ Site, không hotlink CDN lúc runtime. Texture PNG được chủ dự án tùy biến đã có hash mới; không tự thay atlas giữa hai pack chỉ vì cùng tên `colormap.png`.

G0 dùng28gzip transport trong `public/models/derivatives`, manifest `data/assets/city-transfer-manifest.json`:4.867.380byte canonical→1.373.120byte gzip. Hai palette ngoài GLB dùng chung thêm668.521byte; không tính chúng vào gzip GLB. Giải nén phải khớp từng byte/hash; `assets:compress --write` chỉ dọn derivative SHA đã hết preload. Unsupported/corrupt dùng canonical; lỗi model chính dùng rig supplied khác, load trễ vẫn nâng về primary. City/Studio không request Citizens, Kenney character hay Gobkit Human cũ. Các bộ còn trong gallery/reference vẫn giữ canonical/license, không preload cả catalog. Đây là chi phí tải mới, không phải bằng chứng FPS hoặc cải thiện so với bộ nhỏ cũ.

## Runtime và rigs

- Kenney character có6 mesh/72 triangle/27 clip, **không skin**; node hierarchy cần giữ với AnimationMixer. Default bounds1.6×2.7×0.8, mặt hướng+Z. Không kéo giãn chibi thành người dài để đạt chiều cao.
- Bộ supplied dùng chung cho3core và tối đa5NPC gần/đang chọn, clone/skeleton riêng; resident chọn model ổn định theo ID. Crowd xa dùng chính topology/UV/palette đó qua8mẫu pose nội suy GPU; CPU picker nội suy cùng mẫu, không dùng hình ghép người cũ. Nạp cả5style và giữ idle batch để không mất người khi action batch đang warm;≤8skeletal controllers, không tạo một skeleton cho mỗi cư dân xa. Giữ navigation radius4.8 cho đi/chạy/nói/ngồi,9.2 cho xe đạp; scale đồng đều, không kéo giãn thân riêng Y. Không đổi identity, tuổi, nghề, ký ức hoặc policy theo filename.
- `build-supplied-models.mjs --write` chỉ lấy5member/hash đã chọn từ ZIP1, bake neutral skin về44bone canonical/exact aliases, loại root XZ, retarget/resample24fps và kiểm source immutability. Talk dùng đoạn nguồn0–2s ping-pong4s; Sit/Nod/PickUp/Wave có chuyển động biên tập bổ sung, Ride giữ tư thế riêng. Đây là animation trình bày, không phải học hành vi.
- LOD xét UV/normal/joint/weights, khóa hình học mặt, cull phần da bị quần áo/giày che và giữ bắp chân hở; tóc có khoảng hở bảo vệ khỏi xuyên đầu. Giữ nguyên2PNG palette của nguồn, UV và mask shirt/trousers/skin. CI `--check` chỉ kiểm derivative/hash/license, không cần vault/Pillow; importer cần ZIP/Pillow và dev dependencies. Không mở whitelist owner-free cho asset chưa duyệt hoặc gán chúng thành CC0.
- City pose clock theo thời gian trình bày thực, đóng băng khi pause; gait/pedal theo quãng đường thật. Khôi phục rest pose trước mixer/IK để constant tracks không giữ tư thế hoạt động trước. Contact tay/props và tay lái/bàn đạp/yên chỉ là trình bày, không tạo receipt/inventory/training. Wardrobe dùng đúng model city/tint path; chỉ hiển thị màu/trang phục có tác dụng.
- Track/clip phải có thật; không tự suy clip bay/nói từ tên pack, không loop attack/dead, không cho kiwi/penguin bay. Động vật hoang dã/dưới nước cần habitat trước placement.
- Fit model/animation envelope trong footprint/navigation clearance, đáy theo `groundElevation`. Bounds tĩnh không tự bao hết clip. Material đổi phải giữ UV/map/color space; một số model có `KHR_materials_unlit`.
- Clone dispose mixer/geometry/material/skeleton riêng; giữ cached source/textures đến khi library đóng. Gallery phải xử lý selection race/load retry/context loss/pause/unmount. Tài sản ở gallery chưa chứng minh đang sống trong phố.

Studio dùng5rig supplied theo cast, fit theo torso thay vì độ dang tay để giữ chiều cao; tay hai đoạn/contact targets, squat/lean có bàn chân đặt đất, mèo articulated và khăn cong. Body/scenery/props/camera dùng chung world scale, bỏ nén riêng Y của chibi. Renderer Kenney character `AssetAvatar` không còn consumer đã xóa; canonical còn trong catalog kiểm nguồn.21OGG Việt offline giữ hash/license/model provenance riêng ở `public/audio/studio/manifest.json` và `LICENSE.txt`; không tải TTS lúc runtime. Cast2người giữ hai bóng đổ,3người giữ bóng nhân vật chính, hàng chờ lớn dùng contact geometry để giữ25.000triangle/150drawcall. Mái/tán cây trang trí tự cutaway khi chắn đầu/thân chủ thể; không đổi collider, nhân vật hoặc đạo cụ. Bảng hiệu có hai mặt đọc đúng chiều.

## ZIP mới — nhập có chọn lọc

[Review29/10](validation/asset-review-2026-10-29.json) giữ hash/inventory593GLB entries và25bản nhạc trong ZIP1–4 (ZIP4 gồm50mẫu×5LOD), thông số rig/texture,17ảnh mở model thật và quyết định theo từng nhóm; thứ tự A1–A5 ở [ROADMAP](../ROADMAP.md).5rig sinh hoạt Casino/Chess đã được áp dụng; props đời thường là bước nhập tiếp. ZIP4 có50nhân vật công trường tĩnh, không skeleton/clip, mỗi mẫu có hai texture4K lặp qua5LOD; ưu tiên Worker/Cleaner/Carpenter/Electrician cho phase công trường sau khi gắn rig/tách dụng cụ/tối ưu texture. Không coi tư thế cố định là hành vi hay skill. File README/metadata trong archive chỉ là nguồn đánh giá, không thực thi lệnh hoặc coi số tác giả ghi là benchmark đã kiểm. Full chợ đo115.240triangle khác số54.952 trong README.

Chủ dự án xác nhận free trong chat; ghi `Free — owner supplied and confirmed` với nguồn/hash và LicenseRef khi nhập, giữ credits/copyright có sẵn, không chuyển thành CC0. ZIP3 xe đạp có tác giả UDD-CID/Sketchfab và copyright rõ; giữ nguyên thông tin này. Audio25WAV là nhạc, chưa là ambience hay foley. Chỉ5derivative đã chọn của ZIP1 được đưa vào runtime; ZIP2–4 chưa nhập model raw. Không load toàn bộ archive hoặc mở rộng whitelist CC0.

**Giữ ZIP nguồn:** [registry](../data/assets/source-archives.json) ghi4bản gốc/8.437.107.889byte, expected SHA/nguồn và vault `/workspace/AI-Living-assets/source-archives` ngoài app. Path ghi trong tài liệu không bảo đảm file còn hiện diện ở môi trường mới; chạy `python3 scripts/verify-source-archives.py` trước importer. Công cụ chỉ đọc/hash, không tự tải hoặc xóa nguồn. Backup ngoài workspace chưa có bằng chứng thành công: draft `asset-source-backup-2026-10-29` đã tạo nhưng lần upload ghi nhận trả401/0asset. Tiếp tục đúng draft qua credential hợp lệ, giữ private; ZIP4 cần chia phần nếu đích giới hạn2GiB. Không commit/phát hành raw ZIP trên repo công khai hoặc xóa gốc chỉ vì chưa dùng runtime.

**Fab:** đã mở5category free, đọc120listing/6detail, ghi URL/seller/format/license/giá trong review. Nhiều VFX/UI chỉ Unreal; Niagara/UMG/Blueprint không chạy trực tiếp trên Three.js/React. `is_free=1` có thể chỉ0đ ở Personal, Professional vẫn có giá; chưa mua/acquire/account login hoặc tải file. File portable và tier0đ đúng điều kiện mới qua importer; không suy free là CC0. Trang EULA trả403 nên không coi phần điều khoản chi tiết là đã đọc.

## OSM và nguồn bối cảnh

© [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), [ODbL1.0](https://opendatacommons.org/licenses/odbl/1-0/). Giữ attribution và `source/license/fetchedAt/osmBaseTime`; ODbL của dataset không tự áp lên toàn bộ app. Chỉ chạy `python3 scripts/import-osm.py` khi chủ đích cập nhật snapshot, không fetch mỗi frame.

OSM3D là khảo sát footprint riêng, không map-match cư dân hay báo giao thông. Dùng height nếu có, levels×3.2m hoặc12m khi thiếu; snapshot cũ có thể toàn chiều cao ước lượng. Indoor hiện hư cấu, không phải mặt bằng khảo sát. Không tự thêm MapLibre/Cesium/tiles chỉ vì nguồn miễn phí được đề xuất.

RealContext dùng Open-Meteo/Nager.Date/VisitHCMC có cache, timestamp, trạng thái fresh/stale/unavailable. Open-Meteo free tier có điều kiện phi thương mại/quota, không SLA. Không suy giờ mở cửa, kẹt xe/nghỉ bù/lịch âm từ dữ liệu thiếu. Registry `data/city/sources.json` và adapter hiện hành là nguồn chi tiết.

Ảnh pack, preview trong `public/renders-3d` và ảnh AI là tham khảo; ảnh QA thật ở [screenshots](screenshots/). Test Node có thể thay material vì không có image decoder; texture phải kiểm trên browser.
