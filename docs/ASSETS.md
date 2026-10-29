# Asset, nguồn và giấy phép

Chỉ đọc khi nhập/model/texture/OSM hoặc tối ưu tải. Danh sách chính xác và SHA256 nằm trong manifest; không chép toàn bộ catalog vào context agent.

| Bộ | Nguồn chuẩn | Phạm vi hiện có |
|---|---|---|
| Kenney | `data/assets/kenney-manifest.json`, `public/models/kenney/catalog.json` |41 GLB/8 pack/103 file/2.954.655 byte; characters, cars, commercial, suburban, market, roads, trains, watercraft. |
| Gobkit/KayKit | `data/assets/resource-manifest.json`, `public/models/resources/catalog.json` |239 canonical glTF/GLB,15 pack/386 file/42.764.728 byte,114 model skinned. Động vật/người, Adventurers, Furniture, City Builder. |
| Xóm Citizens | `scripts/build-citizen-models.mjs`, `public/models/citizens/catalog.json` |12rig nguyên bản CC0, tóc/mặt/trang phục khác nhau, một skin/material,10clip mỗi model; tái tạo byte-identical. Core3 và9style cư dân, city/Studio/gallery dùng chung. |
| OSM | `data/city/hcm-district1.json`, metadata/source registry | Snapshot bbox `[10.770,106.692,10.782,106.707]`; độc lập với33 venue hư cấu và actor graph. |

Các model/texture/preview/license ở `public/models`; không bỏ license khi dọn tài liệu. [Kenney](https://kenney.nl), các gói Gobkit/KayKit đã nhập dùng [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/); bản license từng pack và manifest là căn cứ, không suy license từ tên website. Không tải FBX/OBJ trùng khi glTF đã đủ. Gallery tải từng model, không nạp toàn bộ catalog vào city.

## Nhập và kiểm

```bash
python3 scripts/import-kenney.py --source-dir /workspace/attachments
python3 scripts/import-resource-packs.py --help
npm run assets:check
npm run assets:maintain
npm run assets:compress # Tạo lại gzip transport từ canonical đã kiểm hash
```

`assets:maintain` ghi semantic bindings; `assets:check` kiểm manifest/hash/texture/license và công thức procedural. Asset unknown-license hoặc nhu cầu thiếu phải báo lỗi; không dựng hộp giả rồi nhận đã hỗ trợ. Importer chỉ đọc whitelist/dependencies, từ chối traversal/URL ngoài/symlink/duplicate entries, có giới hạn bytes; không chạy code/HTML/URL trong ZIP. Dùng source ZIP chỉ khi cần reimport, không thêm ZIP vào Git/production.

Giữ canonical và nguồn/license/hash nếu làm compressed derivative. Dependencies tự phục vụ từ Site, không hotlink CDN lúc runtime. Texture PNG được chủ dự án tùy biến đã có hash mới; không tự thay atlas giữa hai pack chỉ vì cùng tên `colormap.png`.

G0 hiện dùng27gzip transport GLB trong `public/models/derivatives`, manifest `data/assets/city-transfer-manifest.json`:3.793.472byte canonical→425.952byte gzip. Giải nén ra đúng từng byte/hash; `assets:compress --write` chỉ dọn derivative SHA không còn trong preload, giữ canonical/license. Browser unsupported/corrupt dùng canonical; lỗi core dùng rig Citizens khác. Không request Kenney character hoặc Gobkit Human cũ trong city/Studio; tài nguyên gốc còn trong catalog kiểm nguồn, không preload. NPC/gallery on-demand.

## Runtime và rigs

- Kenney character có6 mesh/72 triangle/27 clip, **không skin**; node hierarchy cần giữ với AnimationMixer. Default bounds1.6×2.7×0.8, mặt hướng+Z. Không kéo giãn chibi thành người dài để đạt chiều cao.
- Citizens có Walk/Run/Talk/Listen/Nod/Sit/PickUp thật.3core và tối đa5NPC gần camera/đang chọn dùng clone/skeleton độc lập; mỗi resident chọn mesh ổn định theo ID, crowd xa giữ batch/LOD. Load quá4s vẫn gắn lại primary khi sẵn sàng, fallback cũng là Citizens. Mask shirt/trousers/skin được author cùng geometry, giữ mặt/tóc/phụ kiện. Không suy giới/tuổi/nghề từ filename/model; dùng identity đã khai báo. Gobkit giữ ở gallery/reference, không là model cư dân mặc định.
- Track/clip phải có thật; không tự suy clip bay/nói từ tên pack, không loop attack/dead, không cho kiwi/penguin bay. Động vật hoang dã/dưới nước cần habitat trước placement.
- Fit model/animation envelope trong footprint/navigation clearance, đáy theo `groundElevation`. Bounds tĩnh không tự bao hết clip. Material đổi phải giữ UV/map/color space; một số model có `KHR_materials_unlit`.
- Clone dispose mixer/geometry/material/skeleton riêng; giữ cached source/textures đến khi library đóng. Gallery phải xử lý selection race/load retry/context loss/pause/unmount. Tài sản ở gallery chưa chứng minh đang sống trong phố.

Studio hiện dùng Citizens theo cast khác nhau, tay hai đoạn/contact targets, squat/lean có bàn chân đặt đất, mèo articulated và khăn cong. Body/scenery/props/camera dùng chung world scale, bỏ nén riêng Y của chibi. Renderer Kenney character `AssetAvatar` không còn consumer đã xóa; canonical còn trong catalog kiểm nguồn.21OGG Việt offline giữ hash/license/model provenance riêng ở `public/audio/studio/manifest.json` và `LICENSE.txt`; không tải TTS lúc runtime.

## ZIP mới — nhập có chọn lọc

[Review29/10](validation/asset-review-2026-10-29.json) giữ hash/inventory341GLB trong ZIP1+2, thông số rig/texture,17ảnh mở model thật và quyết định theo từng nhóm; thứ tự A1–A5 ở [ROADMAP](../ROADMAP.md).5rig sinh hoạt và props thường ngày là ứng viên ưu tiên; cần so ZIP3/4 và qua adapter/LOD/budget trước nhập. File README/metadata trong archive chỉ là nguồn đánh giá, không thực thi lệnh hoặc coi số tác giả ghi là benchmark đã kiểm. Full chợ đo115.240triangle khác số54.952 trong README.

Chủ dự án xác nhận tất cả free trong chat; ghi `Free — owner supplied and confirmed` với nguồn/hash và LicenseRef khi nhập, giữ credits có sẵn; chưa có formal license/author URL trong ZIP1, không chuyển thành CC0. Chưa thêm ZIP1 binary vào catalog/runtime, không mở rộng whitelist CC0 chỉ để load mọi archive. Không đưa ZIP, `.blend`/MOV/source trùng, model sai phong cách hoặc texture4K/8K chưa tối ưu vào production. ZIP3 hiện vượt giới hạn tải32MiB của công cụ; ZIP2 đã kiểm7GLB:6crate quá nặng và một kit module nhà/tường/cửa/mái; preview giảm texture chỉ để xem, chưa là production asset. ZIP4 chưa có. Những gói chưa đọc không được coi đã duyệt.

## OSM và nguồn bối cảnh

© [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), [ODbL1.0](https://opendatacommons.org/licenses/odbl/1-0/). Giữ attribution và `source/license/fetchedAt/osmBaseTime`; ODbL của dataset không tự áp lên toàn bộ app. Chỉ chạy `python3 scripts/import-osm.py` khi chủ đích cập nhật snapshot, không fetch mỗi frame.

OSM3D là khảo sát footprint riêng, không map-match cư dân hay báo giao thông. Dùng height nếu có, levels×3.2m hoặc12m khi thiếu; snapshot cũ có thể toàn chiều cao ước lượng. Indoor hiện hư cấu, không phải mặt bằng khảo sát. Không tự thêm MapLibre/Cesium/tiles chỉ vì nguồn miễn phí được đề xuất.

RealContext dùng Open-Meteo/Nager.Date/VisitHCMC có cache, timestamp, trạng thái fresh/stale/unavailable. Open-Meteo free tier có điều kiện phi thương mại/quota, không SLA. Không suy giờ mở cửa, kẹt xe/nghỉ bù/lịch âm từ dữ liệu thiếu. Registry `data/city/sources.json` và adapter hiện hành là nguồn chi tiết.

Ảnh pack, preview trong `public/renders-3d` và ảnh AI là tham khảo; ảnh QA thật ở [screenshots](screenshots/). Test Node có thể thay material vì không có image decoder; texture phải kiểm trên browser.
