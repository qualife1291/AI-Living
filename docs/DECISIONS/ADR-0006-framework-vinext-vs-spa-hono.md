# ADR-0006: Giữ nền tảng Vinext trên Cloudflare Workers và tách lớp render `StaticScene`

- **Trạng thái:** Đã chấp nhận (24/10/2026)
- **Bối cảnh:** Ứng dụng hiện chạy trên Vinext + Vite + Cloudflare Workers với 1 trang chính và 4 route API. Điểm nghẽn hiệu năng nằm ở việc `CityMap.tsx` render lại toàn bộ cây SVG tĩnh 13 lần/giây chứ không phải do bản thân SVG hay framework.
- **Quyết định:**
  1. Giữ nguyên cấu trúc Vinext hiện hành để tương thích 100% với môi trường Sites (`project_id` đã có).
  2. Tách toàn bộ cảnh nền tĩnh (nhà, cây, đường, ghế, đèn) vào component `StaticScene` bọc `React.memo` trong `components/world/CityMap.tsx` (sửa lỗi L6).
- **Hệ quả:** Giảm mạnh số lượng node SVG phải diff mỗi khung hình 75 ms mà không cần đổi framework hay viết lại bằng WebGL.
