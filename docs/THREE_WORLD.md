# Thành phố 3D

Hướng dẫn hiện hành: [chỉ dùng 3D và thú đi theo chủ](THREE_ONLY_AND_PETS.md). Báo cáo các mốc đồ họa trước nằm trong release ledger và MEMORY_LONG.md.

Trang `/` dùng Three.js/WebGL2 với model Kenney CC0 và hình học do dự án dựng. Cùng snapshot, đồng hồ, graph đường đi và ký ức được giữ qua các lần nâng cấp renderer; không cần reset DB. Kéo để xoay, chuột phải/hai ngón để dịch, cuộn/chụm để zoom. Các nút Theo nhân vật, Khu cao ốc, Toàn cảnh và danh sách địa điểm hỗ trợ quan sát/chọn bằng bàn phím.

Cân bằng tự giảm ngân sách geometry/shadow khi máy render chậm. Nhẹ/Nét giữ lựa chọn của người xem. Ngân sách frame/DPR là cấu hình, không phải cam kết FPS thiết bị thật. Trình duyệt cần WebGL2; nếu chưa mở được hoặc mất context, thông báo có nút Thử lại 3D. OSM cũng dùng 3D, giữ attribution ODbL, không đặt nhân vật lên mạng đường khảo sát thật hoặc giả làm nguồn traffic live.

Tủ đồ có preview WebGL3D theo appearance đã lưu. Tag theo cặp và pet-walk là điều khiển chuyển động theo luật trong phiên hiển thị, qua ground collision và khoảng cách cá nhân. Chúng không tự huấn luyện model hoặc tạo lịch sử đời sống giả. Các giới hạn nhiều viewer/occupancy/backend completion và thiết bị thật được ghi ở tài liệu từng tính năng.

Kiểm tra: `npm run test:unit`, `npm run check`, `npm run lint`, `npm run build`, `npm run test:api:local`. QA browser với dữ liệu local: `scripts/qa-three-only-pets.py`, `scripts/qa-social.py`, `scripts/qa-tag.py`. Không dùng ảnh sinh AI làm bằng chứng kiểm thử và không chạy test fixture lên production.
