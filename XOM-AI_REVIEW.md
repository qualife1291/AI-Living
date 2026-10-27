# Xóm AI — Báo cáo review tổng quát, đánh giá công nghệ và trạng thái khắc phục

> Ngày review gốc: 24/10/2026 · Cập nhật trạng thái khắc phục mã nguồn & tài liệu: 24/10/2026
> Phần 2 (thiết kế mở rộng hoàn chỉnh §0–§8): xem [docs/DESIGN_PROPOSALS.md](docs/DESIGN_PROPOSALS.md)
> Bộ tổng hợp bối cảnh & AI tự training: xem [docs/AI_TRAINING_AND_CONTEXTS.md](docs/AI_TRAINING_AND_CONTEXTS.md)

---

## 0. Tóm tắt điều hành & Trạng thái cập nhật

**Nhận định chung.** Xóm AI là một nguyên mẫu có tầm nhìn rõ và kỷ luật tài liệu rất tốt: phân biệt trung thực giữa "mô phỏng theo luật" và "lượt LLM", có idempotency key, optimistic revision, pause clock, test thuần cho phần mô phỏng.

**Trạng thái sau đợt cập nhật mã nguồn & cơ cấu lại tài liệu ngày 24/10/2026:**
- **Đã định dạng sạch toàn bộ mã nguồn** (`app/page.tsx`, `components/world/CityMap.tsx`, `lib/life.ts`, `app/globals.css`, v.v.) — loại bỏ hoàn toàn các tệp nén 1 dòng dài 12.765 ký tự.
- **Đã sửa toàn bộ 20 lỗi ESLint và 6 cảnh báo** (loại bỏ `any`, sửa `react-hooks/refs`, `react-hooks/set-state-in-effect`, `react-hooks/purity`, `@next/next/no-html-link-for-pages`, `prefer-const`, `no-unused-vars`).
- **Đã khắc phục các lỗi logic và kiến trúc L1–L10** trong `lib/apply-event.ts`, `lib/life.ts`, `lib/store.ts`, `app/api/events/route.ts`, `components/world/CityMap.tsx` và `app/globals.css`.
- **Đã bổ sung `.gitignore` và `.npmrc`** (kèm bản sao dự phòng `gitignore.txt`, `npmrc.txt`) vào gói bàn giao và cập nhật `scripts/package-handoff.py` để luôn kiểm tra sự tồn tại của dotfile.
- **Đã tích hợp Đồng hồ thế giới (`lib/clock.ts`), Danh mục 16 hoạt cảnh (`data/scenes.json`), 24 bối cảnh tổng hợp (`data/contexts/neighborhood-contexts.json`) và Bộ dữ liệu AI tự training (`data/training/` + `lib/training.ts`).**

---

## 1. Bảng đối chiếu các lỗi L1–L10 và cách đã xử lý trong mã

| Mã lỗi | Mô tả vấn đề ban đầu | Mức độ | Trạng thái & Giải pháp đã áp dụng trong mã |
|---|---|---|---|
| **L1** | Kế hoạch AI mới dùng `p.location` đã lưu từ lần trước làm `plan.from` trước khi cập nhật → robot bị "nhảy" vị trí (teleport) khi đang đi giữa routine | P0 | **Đã sửa (`lib/life.ts`, `lib/apply-event.ts`):** Thêm hàm `resolveTransitionOrigin(world, personId, now)` tính vị trí mô phỏng thực tế của robot tại thời điểm nhận event để gán cho `plan.from` |
| **L2** | `INSERT INTO episodes` chỉ lưu `{title, summary, dialogue, changes}`, bỏ sót `input.relationship` | P1 | **Đã sửa (`lib/apply-event.ts`):** Lưu đầy đủ `relationship`, `contextId`, `revisionBefore` và `revisionAfter` vào `episodes.data` |
| **L3** | Khe race condition khi hai request trùng `id` đến đồng thời qua bước `SELECT exists` và gây lỗi UNIQUE 500 | P1 | **Đã sửa (`app/api/events/route.ts`):** Bọc `db.batch` trong `try/catch`, bắt lỗi `UNIQUE`/`PRIMARY KEY`, kiểm tra lại bản ghi và trả `200 { ok: true, duplicate: true, id }` |
| **L4** | Giới hạn kích thước body chỉ kiểm tra header `content-length` (bị lọt nếu dùng chunked transfer) | P2 | **Đã sửa (`app/api/events/route.ts`):** Đọc `await req.text()` và kiểm tra kích thước byte UTF-8 thực tế (`new TextEncoder().encode(rawBody).length > 20000`), kèm trả chi tiết đường dẫn lỗi Zod an toàn |
| **L5** | `readWorld()` thực thi 2 câu lệnh ghi (`INSERT OR IGNORE` và `UPDATE ... 1970`) trên mọi lần `GET` | P2 | **Đã sửa (`lib/store.ts`):** Đọc `SELECT` trước; chỉ chạy `INSERT` khi DB mới tinh chưa có dòng `'home'`, và chỉ `UPDATE` nếu `born` rỗng hoặc bằng `'1970-01-01T00:00:00.000Z'` |
| **L6** | `useLifeClock` gọi `setNow` ~13 lần/giây làm render lại toàn bộ cây SVG tĩnh trong `CityMap.tsx` | P1 | **Đã sửa (`components/world/CityMap.tsx`):** Tách toàn bộ nền đất, đường phố, nhà cửa, cây cối, ghế đá, đèn đường vào `StaticScene` bọc `React.memo` |
| **L7** | Lệch đồng hồ giữa máy khách (`Date.now()`) và máy chủ (`born`/`pausedAt`) | P2 | **Đã sửa (`lib/store.ts`, `app/page.tsx`, `useLife.ts`):** `GET /api/world` trả thêm `serverNow`; client tính `clockOffsetMs` truyền vào `useLifeClock` |
| **L8** | Đọc `cameraRef.current` khi render (`react-hooks/refs`), gọi `setNow` đồng bộ trong effect (`set-state-in-effect`), gọi `Date.now()` khi render (`purity`) | P2 | **Đã sửa (`CityMap.tsx`, `useLife.ts`, `app/page.tsx`):** Loại bỏ đọc ref trong render, chuyển cập nhật state vào callback bất đồng bộ của `requestAnimationFrame`/`setTimeout` |
| **L9** | `<svg role="img">` làm trình đọc màn hình bỏ qua các nút `role="button"` của từng robot bên trong bản đồ | P2 | **Đã sửa (`components/world/CityMap.tsx`):** Đổi thành `<svg role="group">` kèm thẻ `<title>` động theo pha ngày và thời tiết |
| **L10** | `seed` còn ghi `"24 tuổi · ..."` phải dùng regex thay ở UI; `instructions` lệch số câu thoại so với `eventSchema` | P3 | **Đã sửa (`lib/world.ts`):** Cập nhật trực tiếp `bio` trong `seed` thành `"Robot AI · ..."` (vẫn giữ `.replace` tương thích snapshot cũ) và đồng bộ hướng dẫn `1–12 câu đối thoại (khuyến nghị 3–8 câu)` |

---

## 2. Đánh giá `.gitignore` và `.npmrc`

### 2.1 Khắc phục lỗi thiếu dotfile trong gói bàn giao
- Đã đưa `.gitignore` và `.npmrc` vào thư mục gốc của dự án, đồng thời tạo sẵn bản sao `gitignore.txt` và `npmrc.txt`.
- Đã cập nhật `scripts/package-handoff.py` để luôn ép kiểm tra `.gitignore` và `.npmrc` nằm trong danh sách đóng gói và trong `TRANSFER_MANIFEST.json`.

### 2.2 Các mục đã bổ sung vào `.gitignore`
- Cho phép commit tệp mẫu `!.env.example` (trong khi vẫn chặn `.env*` chứa bí mật).
- Chặn `*.zip`, `*.log`, `/playwright-report/`, `/test-results/`, `/.vitest/`, `/backups/`, `*.sqlite`, `*.sqlite3`.

### 2.3 Cải tiến `.npmrc` và `package.json`
- Thêm `engine-strict=true` vào `.npmrc`.
- Gỡ khối `overrides` trùng lặp trong `package.json` để giữ một nguồn sự thật duy nhất tại `pnpm-workspace.yaml`.

---

## 3. Đánh giá công nghệ & Kiến trúc mở rộng

| Thành phần | Hiện trạng sau cập nhật | Khuyến nghị vận hành tiếp theo |
|---|---|---|
| **TypeScript 5.9 + React 19** | Mã nguồn sạch, tường minh kiểu dữ liệu, không còn `any` | Duy trì kiểm tra `pnpm check` và `pnpm lint` trước mọi commit |
| **Cloudflare D1 + Drizzle** | Giữ nguyên `0000_deep_firebird.sql`, bổ sung `0001_living_world_and_training.sql` (`memories`, `tick_runs`, `commitments`, `nudges`) | Chạy migration `0001` trên local D1 trước, backup production trước khi áp dụng |
| **Đồng hồ thế giới (`lib/clock.ts`)** | Tính toán tất định pha ngày/đêm, ánh sáng, mùa mưa/khô TP.HCM và thời tiết Markov theo hạt giống | Dùng chung giữa client render và server context synthesis |
| **Tổng hợp bối cảnh & AI Training (`lib/training.ts`)** | 24 bối cảnh đa chiều + 6 Golden Episodes (SFT) + 6 cặp DPO + 8 cấp độ Self-Play Curriculum + hàm chấm điểm tự động | Dùng `evaluateCandidateEvent()` để kiểm tra chất lượng cảnh mới trước khi ghi |

---

## 4. Lộ trình Sprint (Đã hoàn thành Sprint 0 & Sprint 1, sẵn sàng cho Sprint 2–4)

| Sprint | Mục tiêu | Trạng thái |
|---|---|---|
| **Sprint 0 — Vệ sinh mã & Tài liệu** | Định dạng lại toàn bộ mã nguồn, sửa hết lỗi ESLint, bổ sung `.gitignore`/`.npmrc`, cơ cấu lại tài liệu | **Đã hoàn thành (24/10/2026)** |
| **Sprint 1 — Tính đúng đắn & Đồng hồ thế giới** | Sửa L1–L10, tách `apply-event.ts`, thêm `lib/clock.ts`, `data/scenes.json`, migration `0001`, `/api/health` | **Đã hoàn thành (24/10/2026)** |
| **Sprint 2 — Tổng hợp bối cảnh & Bộ AI tự training** | Xây dựng 24 bối cảnh, bộ SFT Golden Episodes, DPO Preference Pairs, Self-Play Curriculum và bộ chấm điểm Reflexion | **Đã hoàn thành (24/10/2026)** |
| **Sprint 3 — Vận hành Tick tự động & QA trình duyệt** | Xác minh lượt chạy thực tế trên host, áp dụng migration `0001` và chụp ảnh QA đa viewport | **Bước tiếp theo khi triển khai** |
