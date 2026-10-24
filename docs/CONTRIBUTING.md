# Quy chuẩn Đóng góp & Phát triển (`CONTRIBUTING.md`)

---

## 1. Quy chuẩn Mã nguồn

1. **Định dạng dễ đọc (Không nén 1 dòng):** Mọi tệp `.ts`, `.tsx`, `.mjs`, `.css`, `.json` phải được xuống dòng và thụt lề rõ ràng (2 dấu cách), độ dài dòng hợp lý để dễ review diff và bảo trì.
2. **An toàn kiểu TypeScript (`strict: true`):**
   - Không sử dụng `any` tường minh (`@typescript-eslint/no-explicit-any`). Dùng kiểu miền cụ thể (`World`, `Person`, `EpisodeEvent`, `EventInput`, `ContextCard`) hoặc `unknown` kèm kiểm tra kiểu.
   - Không đọc `ref.current` trong quá trình render (`react-hooks/refs`), không gọi `setState` đồng bộ trong thân `useEffect` (`react-hooks/set-state-in-effect`), và không gọi `Date.now()` trực tiếp trong hàm render của component (`react-hooks/purity`).
3. **Quy tắc Database & Migration:**
   - Tuyệt đối không sửa migration đã phát hành (`0000_deep_firebird.sql`).
   - Mọi bảng hoặc chỉ mục mới phải được thêm qua tệp migration kế tiếp (như `0001_living_world_and_training.sql`).

---

## 2. Các lệnh kiểm tra bắt buộc trước khi bàn giao

Chạy lần lượt 4 bộ kiểm thử đơn vị (không cần mạng, không ghi vào DB production):

```bash
node scripts/test-life.mjs
node scripts/test-events.mjs
node scripts/test-animation.mjs
node scripts/test-training.mjs
```

Khi ở trong môi trường đã cài đặt `node_modules` từ `pnpm-lock.yaml`, chạy thêm:

```bash
pnpm lint
pnpm check
pnpm build
```

---

## 3. Đóng gói và Kiểm tra tính toàn vẹn của ZIP

Sử dụng `scripts/package-handoff.py` để tạo gói ZIP bàn giao. Script này tự động:
1. Đảm bảo có mặt `.gitignore` và `.npmrc` (cùng bản sao dự phòng `gitignore.txt`, `npmrc.txt`).
2. Quét toàn bộ tệp để chặn rò rỉ khóa bí mật hoặc thư mục build/runtime (`node_modules`, `dist`, `.wrangler`).
3. Cập nhật `TRANSFER_MANIFEST.json` với mã băm SHA-256 của từng tệp và đối chiếu lại toàn bộ nội dung trong file ZIP sau khi nén.
