# Model 3D được nhập từ các gói đính kèm

Catalog này dùng tám gói ZIP do chủ dự án cung cấp. Mỗi gói có `License.txt` ghi rõ Creative Commons Zero, CC0, cho phép dùng cá nhân, giáo dục và thương mại. Bản gốc của tám giấy phép được giữ trong `public/models/kenney/{pack}/License.txt`. Kenney không yêu cầu ghi công; dự án vẫn ghi nguồn tại đây.

Người tạo/phân phối: [Kenney](https://kenney.nl). Giấy phép: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Không đăng ký dịch vụ, mua asset hoặc tải mã thực thi từ các gói.

| Pack trong catalog | Gói chủ dự án cung cấp | Model được chọn |
| --- | --- | --- |
| `characters` | `kenney_blocky-characters_20.zip` — Blocky Characters 2.0 | `character-a`, `character-b`, `character-c`, `character-d`, `character-e` |
| `cars` | `kenney_car-kit.zip` — Car Kit 3.1 | `sedan`, `hatchback-sports`, `taxi` |
| `commercial` | `kenney_city-kit-commercial_2.1.zip` — Commercial 2.1 | Ba tòa nhà thấp, một cao ốc, mái hiên và dù |
| `suburban` | `kenney_city-kit-suburban_20.zip` — Suburban 2.0 | Ba nhà ở, cây lớn và cây nhỏ |
| `market` | `kenney_mini-market.zip` — Mini Market 1.0 | Quầy bánh mì/hoa quả, máy tính tiền, hai kệ hàng, giỏ, xe đẩy, tủ đông |
| `roads` | `kenney_city-kit-roads.zip` — Roads 2.2 | Rào/cọc công trường, thùng rác, đèn đường, biển dừng, đèn giao thông, đoạn đường thẳng |
| `trains` | `kenney_train-kit.zip` — Train Kit 1.1 | Tàu điện thành phố, tram, đoạn ray thẳng |
| `watercraft` | `kenney_watercraft-pack.zip` — Watercraft Kit 2.1 | Thuyền đánh cá nhỏ, thuyền chèo, nhà thuyền, phao |

Tổng: **41 GLB, 103 file, 2.954.655 byte**, gồm texture, preview tham chiếu, giấy phép và catalog nhỏ cho trình duyệt. Toàn bộ ZIP không được đưa vào Git hoặc gói production. Số byte trên là bộ file được nhập, không phải số byte bắt buộc tải khi mở trang; renderer chọn model theo nhu cầu.

## Catalog và cách nhập lại

- `data/assets/kenney-manifest.json`: nguồn đầy đủ để kiểm tra, gồm SHA-256 từng ZIP/model/resource, license, số byte, triangle/vertex, default bounds, mesh/node hierarchy, tên clip và channel animation.
- `public/models/kenney/catalog.json`: subset trình duyệt, `assets[]` có `id`, `url`, `bytes`, `license`, `bounds`, `clips`, `sha256`. Không đưa toàn bộ metadata chi tiết vào bundle JavaScript.
- URL model: `/models/kenney/{pack}/{name}.glb`. Texture giữ đúng URI tương đối trong GLB, ví dụ `Textures/colormap.png`. Các dependency đều được phục vụ cùng Site; model đã chọn không cần gọi CDN bên ngoài khi chạy.

Nhập lại từ ZIP đã tải về, rồi kiểm tra bản import và các đầu vào nguy hiểm:

```sh
python3 scripts/import-kenney.py --source-dir /workspace/attachments
python3 scripts/import-kenney.py --check
python3 scripts/import-kenney.py --self-test
```

Importer chỉ đọc whitelist GLB, các PNG/BIN mà GLB tham chiếu, preview và giấy phép. Nó kiểm tra GLB 2.0, độ dài file, bounds hữu hạn, dependency đầy đủ, SHA-256 và ngân sách 8 MiB. Nó từ chối URL ngoài, đường dẫn tuyệt đối/`..`, đường dẫn đã percent-encode nguy hiểm, backslash, symlink ZIP, file mã hóa, thành viên quá lớn và chỉ mục ZIP trùng tên. Không giải nén toàn bộ gói, không chạy `.html`, `.url`, script hoặc lệnh từ nội dung đính kèm. `--check` chạy được trong CI mà không cần ZIP nguồn.

## Rig và kích thước thực đã kiểm tra

Năm character được chọn đều có **sáu mesh, 72 triangle, 27 clip, không có skin/skeleton**. Chuyển động là animation các node `root`, `leg-left`, `leg-right`, `torso`, `arm-left`, `arm-right`, `head`. `torso` là parent của hai tay và đầu; đầu có scale cục bộ `0.1`. Cần giữ hierarchy khi clone và dùng `AnimationMixer`; không thể coi sáu mesh là một khối cứng nếu muốn phát clip.

Character `c` có preview người lớn đầu hói/tóc thưa, áo xanh lá có logo gamepad và quần be; tên file không biểu thị giới tính hay độ tuổi. Cần chọn/đổi tạo hình phù hợp nhân vật trong kịch bản. `e` là biến thể tóc nâu/áo tím, dùng làm gợi ý tạo hình nữ/trẻ hơn cho Chi và Hạnh/Lan/Mai/người bán hàng trong bản dựng. Đây là lựa chọn tạo hình gần đúng: độ tuổi được thể hiện thêm bằng chiều cao/thông tin nhân vật; model không tái hiện đúng các nếp nhăn, sợi tóc, lỗ chân lông hoặc đặc điểm vi mô trong kịch bản. Không suy ra tuổi hay giới tính thật từ tên file.

Các clip có sẵn gồm `idle`, `walk`, `sprint`, `sit`, `pick-up`, `holding-right`, `holding-left`, `holding-both`, `interact-right`, `interact-left`, gật/lắc đầu và nhóm wheelchair. Chưa có finger bones, facial morph target, nếp nhăn hoặc shader da chi tiết ở mức milimet. Các yêu cầu đó trong kịch bản cần được ghi là phần chưa hỗ trợ nếu renderer chưa thực hiện.

Default bounds character là `1.6 × 2.7 × 0.8`, đáy ở `Y=0`. Nếu chỉ scale đồng đều lên cao 17,5 world units thì rộng khoảng 10,37 units; phải kiểm tra bề rộng/animation envelope với bán kính tránh va chạm của dự án. `bounds` trong manifest là tư thế mặc định của glTF, không phải bảo đảm bao hết clip động. Ảnh render thật xác nhận mặt hướng `+Z`; heading không cộng π. Giả định `-Z` ban đầu đã tạo lỗi quay lưng lúc trao ví và đã được sửa.

Material gốc có texture ngoài; character còn khai báo `KHR_materials_unlit`. Khi đổi sang Phong hoặc vật liệu phù hợp hệ ánh sáng, cần giữ map/color space và UV transform. Không ép cùng một texture của pack khác chỉ vì tên file đều là `colormap.png`.

## Những giới hạn khi dùng trong thành phố

- Gói Train chứa ray và tàu; không có model nhà ga trong ZIP đã kiểm tra. Model tàu nhập sẵn không có nghĩa là tuyến tàu chạy đã hợp lệ. Chỉ đặt tàu/ray tĩnh hoặc triển khai tuyến và kiểm tra hình học trước khi cho chạy.
- Mỗi nhà/xe/đồ vật phải được fit trong footprint đã dành chỗ, đặt đáy đúng nền và kiểm tra lại khoảng trống đường đi. Số polygon nhỏ không thay thế kiểm thử collision hoặc frame time.
- Các model có preview tham chiếu đi kèm để chọn kiểu. Preview Kenney không phải ảnh chụp ứng dụng và không được dùng làm bằng chứng QA production.
- API miễn phí bên ngoài do người dùng gợi ý cần kiểm tra license, availability và budget riêng trước khi nhập. Catalog này chỉ chứng thực các file Kenney đã được nhập và kiểm tra; nó không tự chạy mã từ API/manifest hoặc tuyên bố đã fine-tune một model AI.

## Khảo sát API miễn phí ngày 27/10/2026

Đã đọc metadata thực, không chạy lệnh onboarding hoặc hướng dẫn nhúng trong phản hồi API.

| Nguồn | Kết quả truy cập từ môi trường này | Vai trò phù hợp |
| --- | --- | --- |
| [Gobkit /api/free](https://gobkit.com/api/free) | HTTP 200; schema 2; 255 model; CORS `*`; URL GLB và clip có trong metadata | Nhân vật/động vật rigged. Model có skin cần clone skeleton; không mặc định dùng cách clone rigid của Kenney |
| [3DAssets.dev API](https://3dassets.dev/api/v1/assets?q=tree&style=low-poly&limit=2) | HTTP 200; metadata CC0/CDN; API mẫu không gửi CORS header | Tìm asset rồi nhập có kiểm tra; không dựa vào fetch API trực tiếp từ trình duyệt |
| [Poly Haven models API](https://api.polyhaven.com/assets?type=models) | HTTP 200; CORS `*`; catalog model công khai | Nguồn PBR/HDRI khi có ngân sách GPU/texture và phong cách phù hợp |

Bản này dùng model Kenney tự phục vụ để tránh phụ thuộc availability của ba API khi người xem mở trang. Không tải toàn bộ catalog, không có key hoặc dịch vụ tính phí mới.

## Bổ sung asset có kiểm soát

`npm run assets:maintain` quét nhu cầu semantic của cast/cảnh/props, ghép asset CC0 đã duyệt hoặc công thức procedural đã thực hiện, rồi ghi `data/assets/runtime-bindings.json` trong workspace. Model đã duyệt có tên khớp nhu cầu có thể tự được bind. Nhu cầu chưa có model/công thức và license chưa biết phải hiện `missing` và làm kiểm tra thất bại; không tạo hình hộp giả rồi báo đã hỗ trợ.

CI có quyền `contents:read`, xác minh bindings, hash/texture/license/budget và test logic. Nó không tự sửa/push Git hoặc deploy. Automatic approval đã từ chối bản workflow cấp quyền ghi/autopush trước khi push; thiết kế cuối đã loại bỏ khả năng đó. Công cụ local giúp agent phát hiện phần thiếu, chuẩn bị code/model và kiểm thử; đây không phải tự huấn luyện weights hay một agent production hoạt động liên tục. Chưa có cơ chế tự tải và thực thi code từ bên ngoài.

Sau commit Gemini `a5b7c5a`, PNG texture/preview đã được chủ dự án tùy biến; GLB geometry giữ nguyên. Số byte trên phản ánh catalog hiện hành sau tùy biến. Preview asset và ảnh AI ở `public/renders-3d` không phải ảnh QA; ảnh chụp trình duyệt thật được giữ trong `docs/screenshots`.
