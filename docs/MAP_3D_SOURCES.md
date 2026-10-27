# Nguồn map 3D và bối cảnh — khảo sát 25/10/2026

Ưu tiên không phí, không thẻ thanh toán/API key, không phụ thuộc runtime vào nguồn bên ngoài nếu không cần. Giấy phép engine không thay thế giấy phép dữ liệu/tile. Các URL dưới đây đã đối chiếu với tài liệu nhà cung cấp; chưa tải/bundle asset chỉ vì nó có tên trong bảng.

| Nguồn chính thức | Có thể dùng cho | Điều kiện và quyết định |
|---|---|---|
| [OSM Simple 3D Buildings](https://wiki.openstreetmap.org/wiki/Simple_3D_Buildings) | Dấu chân, building parts, chiều cao/tầng | Dữ liệu OSM ODbL; attribution bắt buộc. Dữ liệu chiều cao có thể thiếu. Đã dùng 912 polygon kín từ snapshot trung tâm TP.HCM để dựng khảo sát Three.js, chưa fetch tile. |
| [MapLibre 3D extrusion](https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/) | Renderer bản đồ nghiêng và tòa nhà theo thuộc tính | Lựa chọn mở rộng tương lai; chưa thêm dependency. Ví dụ chính thức dùng OpenFreeMap. Không nhầm engine với dịch vụ tile. |
| [OpenFreeMap](https://openfreemap.org/) | Tile vector phục vụ map nền rộng hơn | Công bố instance công khai không cần key/đăng ký, có thể dùng thương mại, không SLA. Giữ attribution OSM/OpenMapTiles; không tải hàng loạt. Chưa bật runtime request trong bản này. |
| [Overture Buildings](https://docs.overturemaps.org/guides/buildings/) / [schema](https://docs.overturemaps.org/schema/reference/buildings/building/) / [attribution](https://docs.overturemaps.org/attribution/) | Footprint, parts, height, nguồn gốc từng trường | Có height nhưng optional; coverage TP.HCM chưa đo. Kiểm tra license theo theme/source, không mặc định toàn bộ là CC0. Chỉ nên tải bbox nhỏ và ghi release/hash. |
| [OSM Indoor Tagging](https://wiki.openstreetmap.org/wiki/Simple_Indoor_Tagging) | Phòng, hành lang, tầng, routing | Schema hữu ích cho indoor graph. Không chứng minh đã có mặt bằng mọi tòa nhà tại TP.HCM. Interior hiện tại vẫn là hư cấu. |
| [Kenney City Kit](https://kenney.nl/assets/city-kit-commercial), [Furniture Kit](https://kenney.nl/assets/furniture-kit), [Car Kit](https://kenney.nl/assets/car-kit) | Building modules, furniture, vehicles | Các pack được kiểm tra ghi CC0. Ưu tiên nhập một tập nhỏ glTF, tối ưu số polygon, hash và lưu license. Chưa nhập model từ các pack này. |
| [Poly Haven license](https://polyhaven.com/license) | HDRI, PBR, props | Asset CC0, dùng thương mại được. API vận hành có điều khoản riêng; ưu tiên file chọn lọc tự host, không hotlink mọi frame. Chưa bundle asset. |
| [ambientCG license](https://docs.ambientcg.com/license/) | Vật liệu sàn, tường, đường | Asset CC0; chọn độ phân giải nhỏ, nén và giữ nguồn. Chưa bundle texture. |
| [Protomaps / PMTiles](https://docs.protomaps.com/), [giới thiệu](https://protomaps.com/about) | Bản đồ tĩnh dạng archive, self-host | Định dạng/engine mở; lưu trữ/băng thông vẫn có chi phí. Chỉ xem xét extract nhỏ trong quota hiện hữu, không bật dịch vụ lưu trữ mới. |
| [CesiumJS](https://github.com/CesiumGS/cesium) | Globe, terrain, 3D Tiles | Runtime Apache2; Cesium ion là dịch vụ riêng. Chưa phù hợp ưu tiên khu phố nhẹ; không bật ion hoặc photorealistic tiles mặc định. |

## Các bối cảnh đời sống
- [Overture Places](https://docs.overturemaps.org/schema/reference/places/place/): loại cơ sở, confidence, trạng thái hoạt động. `operating_status` không phải giờ mở cửa hôm nay. Cần tách cơ sở thật khỏi địa điểm hư cấu đang dùng.
- [Open-Meteo](https://open-meteo.com/en/pricing): API miễn phí dành cho phi thương mại, có giới hạn và không SLA; dữ liệu yêu cầu attribution. Dự án đang dùng cache và nhãn nguồn. Không suy diễn miễn phí vô điều kiện khi thương mại hóa.
- VisitHCMC và Nager.Date đã có adapter/cache: lịch nguồn không đầy đủ, có thể stale/unavailable; không tự tạo ngày lễ/nghỉ bù hoặc tin thời tiết thật.
- Hoạt động trong quán, thang máy, giấc ngủ, hàng chờ và đối thoại cần engine mô phỏng, không thể lấy trực tiếp từ hình học map. Phải gắn reward vào kết quả hoàn tất; không gọi hoạt cảnh là AI suy nghĩ.

## Đã phát triển trong lần này
- Chế độ OSM + 3D dùng dữ liệu đóng gói, merge hình học thành ít draw call. Không hiển thị cư dân trên snapshot vì chưa map-match graph mô phỏng vào mạng đường thật.
- Ưu tiên `heightM`; nếu chỉ có `levels` thì ước lượng 3.2m/tầng; nếu thiếu cả hai thì 12m. Snapshot cũ chưa giữ height/levels nên chiều cao đều ước lượng. Không gọi chúng là chiều cao đo đạc.
- Importer mới giữ metadata height/levels khi cập nhật có chủ đích. Không tự thay snapshot và timestamp nếu chưa tải lại dữ liệu.
- Fallback 2D khi không mở được WebGL, giữ credit/giấy phép và nhãn snapshot.

## Bước phát triển có lợi nhất tiếp theo
Đo coverage height/indoor cho bbox thật; sau đó nhập bộ furniture/xe nhỏ CC0 và indoor graph. MapLibre/OpenFreeMap phù hợp nếu cần mở rộng vùng khảo sát; Overture phù hợp bổ sung footprint/parts có nguồn; không thay renderer đời sống hiện tại chỉ để thêm engine lớn.
