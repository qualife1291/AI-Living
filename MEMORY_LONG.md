# Xóm AI — Bộ nhớ dài hạn

## Sản phẩm và yêu cầu đã chốt
- Chủ dự án: Hoang Long. Ngôn ngữ: tiếng Việt; múi giờ Asia/Ho_Chi_Minh.
- Ba nhân vật trưởng thành An, Bình, Chi sống trong khu trọ Việt Nam; tính cách, mục tiêu, ký ức và quan hệ riêng.
- Phong cách 2D nhìn chéo từ trên xuống, dịu mắt, không pixel art.
- Website riêng chỉ chủ sở hữu truy cập. Không thay đổi audience khi sửa nguồn.
- Không phát sinh phí hạ tầng, AI; không đăng ký dịch vụ trả phí. Giới hạn tài khoản vẫn áp dụng.
- Xuất video đã tạm hoãn theo yêu cầu. Không tự đăng mạng xã hội.
- Tuổi đời xóm tăng theo ngày thật. Kỹ năng/quan hệ/kinh nghiệm thay đổi theo sự kiện; không tự huấn luyện model.

## Nguồn và triển khai
- Checkout: /workspace/sites/xom-ai
- Site project_id: appgprj_6adc7dc364d48191a09202c5b43309e4
- Slug: xom-ai-long
- Git source được quản lý bởi Sites; credential ngắn hạn chỉ truyền qua stdin.
- Đọc .openai/hosting.json trước mọi thao tác; không create_site lần nữa.
- Dùng Sites workflow để commit/push/package và deploy owner-private.

## Stack
- TypeScript, React 19, Vinext/Vite, Cloudflare Workers qua Sites.
- D1 binding DB; Drizzle schema và migrations trong drizzle/.
- SVG vẽ bản đồ và nhân vật, CSS responsive; lucide-react icons.
- Zod kiểm tra schema các sự kiện.
- Không có API LLM tính phí. Dự kiến dùng scheduled ChatGPT task đọc/ghi world qua private service access, cần kiểm chứng trước khi bật.

## Cấu trúc và dữ liệu
- app/page.tsx: bản đồ, cư dân, nhật ký, quản lý nhịp sống.
- lib/world.ts: hồ sơ ban đầu và hướng dẫn lượt AI.
- lib/store.ts: đọc world + 80 sự kiện gần nhất, không cache.
- GET /api/world: trạng thái, revision, events.
- POST /api/world: pause hoặc mô tả lịch; optimistic revision guard.
- POST /api/events: sự kiện có id chống trùng; kiểm tra giới hạn và cập nhật world + episode bằng D1 batch transaction.
- GET /api/instructions: hướng dẫn cho tác nhân chạy độc lập.
- DB worlds lưu snapshot; episodes lưu lịch sử sự kiện. Ký ức gần nhất tối đa 60/nhân vật; lịch sử sự kiện vẫn nằm trong DB.
- Tiền trong thế giới là số mô phỏng; không có giao dịch ngoài đời.
- Chuyển động nhân vật là hoạt cảnh SVG, không phải bằng chứng LLM đang suy nghĩ.

## Theme và style
- Nền kem #f7f8f3; xanh sage #8ba17b; giấy #fdfef9; chữ #36453b.
- Màu An terracotta #ed9e6f, Bình lavender #8f9bc4, Chi sage #98b789.
- Font Be Vietnam Pro / Manrope, sans-serif fallback. Góc bo 10–14px, đường viền mảnh, nhiều khoảng thở.
- Desktop sidebar + bản đồ + hồ sơ; mobile bottom navigation, một cột.
- Tôn trọng prefers-reduced-motion; controls có focus-visible và nhãn.

## Chuẩn kiểm thử bắt buộc
1. TypeScript noEmit và production build thành công.
2. Migration schema-only; không sửa migration đã áp dụng, tạo migration mới.
3. Đọc ghi world tồn tại qua refresh; thiếu/không hợp lệ schema bị từ chối.
4. Retry cùng event id không tăng revision/trạng thái lần nữa.
5. Revision cũ bị 409, pause chặn lượt ghi AI.
6. Không có số tiền âm, chỉ số trong giới hạn 0–100.
7. Desktop/mobile kiểm tra điều hướng, hồ sơ, nhật ký, controls.
8. Writer phải được kiểm tra qua intended unattended service access trước khi tạo schedule.
9. Không báo schedule đã chạy chỉ từ việc tạo schedule thành công.
10. Không credentials, .env, runtime DB hay token trong Git/artifact.

## Kết quả xác minh
- Đang triển khai; chưa xác nhận build, publication hoặc schedule. Cập nhật phần này sau mỗi kết quả thực tế.

## Quy tắc bộ nhớ
- MEMORY_SHORT.md: chỉ việc chưa xong, context mới và blockers; xóa mục khi xong, xóa file khi trống.
- MEMORY_LONG.md: quyết định, kiến trúc, chuẩn test, kết quả, giới hạn; không lưu bí mật.
- CHANGELOG.md: thay đổi sản phẩm theo ngày, đi cùng commit.

## Checkpoint 2026-10-24
- Phase 1 đã xuất bản owner-private: https://xom-ai-long.bouncyslug18.chatgpt.site
- Production build và TypeScript đã qua; migration D1 đã được áp dụng khi deploy.
- Đã xác minh private service access đọc world; một cảnh AI đã ghi thành công và readback thấy ký ức, kỹ năng, quan hệ thay đổi.
- Phát hiện ngày khởi tạo 1970 do Date ở module scope của Worker; đã chuyển ngày khởi tạo vào request và thêm sửa snapshot cũ có đúng epoch này.
- Browser QA: điều hướng cư dân/bản đồ, chọn nhân vật, xem hồ sơ thành công. Ảnh desktop đã gửi người dùng. Mobile chưa QA bằng viewport thật.
- Bộ kiểm thử live đang chạy; chưa công bố toàn bộ đã qua. Test stale ban đầu dùng revision còn hiện hành làm ghi thêm sự kiện lặp nội dung với id hậu tố -stale; đã sửa test dùng revision-1. Cần dọn bản ghi test này có kiểm soát ở phase tiếp theo, không gọi là sinh hoạt AI tự phát.
- Sites create_schedule thất bại 2 lần cùng request_id với INVALID_ARGUMENT/invalid_project. Không có lịch được xác nhận; chưa có tự chạy khi đóng web.
- Người dùng yêu cầu chia phase, triển khai tuần tự và gửi ảnh mỗi lần test giao diện. ROADMAP.md là kế hoạch hiện hành.

## Phase hình ảnh — robot và khu phố mở rộng
- Thay toàn bộ avatar và nhân vật bản đồ bằng robot SVG đồng nhất; An cam mắt LED, Bình xanh đầu vuông, Chi xanh lá mắt cười và mầm cây.
- components/world/Robot.tsx dùng chung cho avatar, bản đồ và nhật ký. components/world/CityMap.tsx chứa cảnh và điều khiển góc nhìn.
- Bản đồ viewBox 1200×780 có hai đường chính, phố đi bộ, quảng trường, công viên hồ nước, quán cà phê, thư viện, xưởng sáng tạo, khu nhà và vườn cộng đồng.
- UI chọn khu nhà/phố cà phê/công viên/toàn cảnh; zoom và reset. Vị trí robot tiếp tục lấy world thật; chọn khu vực chỉ thay góc nhìn, không tự di chuyển robot.
- API và hướng dẫn AI chấp nhận 6 địa điểm mới. Không reset world hoặc sửa ký ức cũ.
- TypeScript và build qua. Browser QA đã xác minh chuyển phố cà phê bằng viewBox, reset toàn cảnh, avatar robot hiển thị. Ảnh đã gửi người dùng.
- Chưa kiểm thử viewport mobile thật; CSS có layout responsive và thao tác chọn khu vực để phóng cảnh.
