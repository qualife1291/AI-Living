# Thành phố 3D — 25/10/2026

Tiếp nối [URBAN_WORLD](URBAN_WORLD.md). Bản này đổi lớp hiển thị mặc định của `/` sang WebGL/Three.js; dùng cùng snapshot, tọa độ, graph đường đi và đồng hồ với bản 2D. Không có migration hay thao tác sửa/xóa ký ức, policy hoặc lịch sử.

## Phase 1 — Không gian và công trình

- 257 công trình sinh tất định, gồm 151 cao ốc, cộng 25 công trình dịch vụ/nhà ở: tổng 282 khối nhà. Các quảng trường, vườn, sân thể thao và trạm giao thông nằm ngoài số khối nhà này. 33 điểm đến vẫn dùng tên/tọa độ cũ.
- Cao ốc nhiều tầng, mái giật cấp, cửa kính, đèn cửa sổ, khối thương mại và mái che tầng trệt. Nhà phố, cây khối, bồn nước, sân thể thao, trường học, bệnh viện có dấu chữ thập, nhà máy có ống khói, sân bay có tháp điều hành.
- Bộ sinh bố trí chừa khoảng quanh cửa/địa điểm, toàn bộ đoạn đường bộ trong graph và các đại lộ. Dựng phố dày hơn không thay thế đường đi bằng vị trí ngẫu nhiên.
- Đây là thành phố hư cấu; số tầng, chiều cao và dòng xe không phải khảo sát hay dữ liệu giao thông TP.HCM. Chế độ OSM giữ nguyên khảo sát footprint/đường 2D có attribution; chưa đặt nhân vật vào đường OSM thật.

## Phase 2 — Cư dân và trải nghiệm quan sát

- Nhân vật khối 3D gồm thân, đầu trụ, tay/chân chuyển động, tóc, mũ nghề, màu áo/quần/da, kính/râu và chi tiết ngực; đọc appearance đã lưu và 14 theme hiện có. Mẫu 3D tự dựng bằng hình học, không nhập model/logo LEGO.
- Dùng `actorsAt`, `crowdAt`, `animalsAt`, `livingSpeechAt`: không sinh lịch sinh hoạt hay thoại thứ hai trong renderer. Giữ ưu tiên cư dân đang được theo dõi; vòng sáng và tên cho nhân vật đang chọn.
- Hiển thị phương tiện ở pha đang đi xe; dòng xe bối cảnh/buýt/metro là mô phỏng. Hình xe đang đơn giản hóa; chưa có mô hình vật lý, va chạm hay nội thất tương tác.
- HUD nhỏ và các bảng thông tin cũ; chọn cư dân từ danh sách để theo. Kéo để xoay, chuột phải/hai ngón để dịch, cuộn/chụm để zoom. Nút Theo nhân vật, Khu cao ốc, Toàn cảnh; camera toàn cảnh tính theo FOV/tỷ lệ màn hình.
- Biển tên có giới hạn kích thước trên màn hình và ẩn ở khoảng cách xa để bớt che cư dân. Địa điểm có biển tên chọn được; danh sách địa điểm là phương án bàn phím. Camera tự theo nhân vật, ngừng theo khi người dùng điều khiển hoặc chọn địa điểm. Các tòa nhà có thể che khuất khi xoay tự do; nút Theo nhân vật khôi phục góc mặc định.
- Trong Địa điểm có nút chuyển 3D/2D. Trình duyệt không có WebGL2 hoặc mất context tự dùng 2D với thông báo. Tháo renderer sẽ hủy animation frame, observer/listener và giải phóng geometry/material/texture/context.

## Phase 3 — Hiệu năng, kiểm chứng và vận hành

- Three.js 0.186.1 (MIT), tải runtime bằng import động ở client; không gọi WebGL khi SSR. Không cần GPU cho máy chủ; trình duyệt cần WebGL2 cho chế độ 3D. Không thêm dịch vụ trả phí hay model/texture ngoài.
- Instancing cho công trình/cửa sổ/cây, mỗi phần cơ thể dùng chung một mesh. Giới hạn DPR 1 trên màn hình nhỏ, tối đa 1,5 trên desktop; render có giới hạn khoảng 30 fps, projection 10 Hz. Đây là ngân sách đặt ra, không phải cam kết fps trên điện thoại thật.
- `npm run test:unit` có thêm kiểm thử skyline tất định, hình học hữu hạn, mật độ, podium không chồng và khoảng trống quanh toàn bộ đường/địa điểm. Kiểm thử mô phỏng/học cũ tiếp tục chạy.
- Kiểm chứng: 12 suite unit, TypeScript, ESLint và build đạt. Cài lại frozen lockfile đạt với chính sách dependency hiện hành. Chromium/SwiftShader WebGL2 chạy trên desktop 1440×960 và mobile 390×844: canvas toàn viewport, kéo chuột/chạm để xoay và ngừng follow, zoom/follow/skyline/overview, chọn Bình, focus bệnh viện, bảng học, H/Ẩn, đổi renderer, OSM/attribution, mất context và không có WebGL đều đạt; không có page error hoặc tràn ngang.
- Đã kiểm tra cả Vite dev và bundle Workers chạy local bằng Wrangler riêng trên port 4176, dùng SQLite online backup sang `/tmp/xom-three-build-qa`; không ghi sửa DB nguồn. Lưu ý khởi động Wrangler mới sau build để manifest/asset cache trỏ đúng bundle mới.
- Ảnh desktop/mobile tại [thư mục screenshots](screenshots/) với tên `three-*-preview.png` là local preview. Không có bằng chứng deploy production hoặc hiệu năng GPU/điện thoại thật. Google Fonts có lỗi chứng chỉ trong trình duyệt thử, nên dùng font fallback; không tắt kiểm tra TLS. Build còn cảnh báo chunk Three.js lớn hơn 500KB (đã tách tải động) và phân loại route của Vinext beta.

### Chạy lại browser QA

Dùng Chromium có sẵn (`CHROMIUM_BIN` có thể chỉ đường dẫn khác). Playwright chỉ là công cụ QA ngoài dependency production:

```bash
npm install --prefix /tmp/xom-browser --no-save playwright-core@1.64.1
PLAYWRIGHT_MODULE=/tmp/xom-browser/node_modules/playwright-core/index.mjs QA_BASE=http://127.0.0.1:4176 node scripts/qa-three.mjs
```

Chạy server local trước; `QA_BASE` mặc định port 5173. Script đọc API/UI, không lưu wardrobe hoặc pause vào DB. Nó kiểm tra thêm xoay bằng kéo chuột/chạm, ghi lại sáu ảnh và đóng browser trong `finally` khi thất bại.

Chạy lại sau `pnpm install --frozen-lockfile` bằng quy trình local hiện có. Nếu Corepack muốn ghi vào HOME không tồn tại trong cloud, đặt riêng `COREPACK_HOME="$PWD/.sites-runtime/corepack"` trước lệnh Corepack; không cần đổi HOME hay bỏ chính sách xác minh dependency. Thiết lập này đã được dùng để cài Three.js trong phiên.

Việc tiếp theo: đánh giá hiệu năng trên thiết bị thật, LOD hình học, môi trường bên trong công trình, đa dạng mô hình xe và hiệu ứng thời tiết 3D dùng nguồn realtime đã xác minh. Cơ chế học vẫn là policy nhỏ hiện có; đổi renderer không huấn luyện lại Qwen.
