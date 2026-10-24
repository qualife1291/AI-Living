# ADR-0007: Chiến lược kiểm thử cô lập và an toàn cho Production

- **Trạng thái:** Đã chấp nhận (24/10/2026)
- **Bối cảnh:** Các script kiểm thử có ghi (`scripts/test-world.mjs`, `scripts/verify-live.py`) nếu chạy nhầm lên môi trường thật sẽ tạo ra sự kiện rác trong nhật ký.
- **Quyết định:**
  1. Duy trì 4 bộ kiểm thử đơn vị thuần (`test-life.mjs`, `test-events.mjs`, `test-animation.mjs`, `test-training.mjs`) chạy hoàn toàn trong bộ nhớ, không gọi mạng và không đụng DB.
  2. Giữ chốt chặn hostname (`localhost`, `127.0.0.1`, `::1`, `terminal.local`) trong `test-world.mjs` và `verify-live.py`, từ chối mọi URL từ xa theo mặc định.
- **Hệ quả:** Mọi tác nhân AI hay lập trình viên đều có thể chạy `npm run test:unit` an toàn 100% ở bất kỳ môi trường nào.
