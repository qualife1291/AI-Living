# Mô hình Dữ liệu, Bất biến Hệ thống & Kế hoạch Migration (`DATA_MODEL.md`)

---

## 1. Các bảng cơ sở dữ liệu D1 (`db/schema.ts`)

### 1.1 Bảng gốc (Migration `0000_deep_firebird.sql`)
- **`worlds`**:
  - `id` (`TEXT PRIMARY KEY`): Luôn dùng `'home'` cho khu phố chính.
  - `revision` (`INTEGER NOT NULL DEFAULT 0`): Số thứ tự phiên bản tăng đơn điệu mỗi lần cập nhật.
  - `data` (`TEXT NOT NULL`): Chuỗi JSON lưu đối tượng `World`.
- **`episodes`**:
  - `id` (`TEXT PRIMARY KEY`): Khóa chống trùng (Idempotency Key), khớp biểu thức `/^[a-zA-Z0-9_-]{1,100}$/`.
  - `created_at` (`TEXT NOT NULL`): Thời điểm ghi sự kiện (ISO-8601 UTC).
  - `source` (`TEXT NOT NULL`): `'ai'` hoặc `'opening'`.
  - `data` (`TEXT NOT NULL`): Chuỗi JSON lưu toàn bộ nội dung sự kiện `{ title, summary, dialogue, changes, relationship?, contextId?, revisionBefore, revisionAfter }` (đã sửa **L2** để không mất `relationship`).

### 1.2 Bảng mở rộng (Migration `0001_living_world_and_training.sql`)
- **`memories`**: Lưu ký ức có cấu trúc (`id`, `person_id`, `event_id`, `text`, `kind`, `importance` 1..5, `witnessed_with` JSON, `created_at`) kèm chỉ mục `idx_memories_person_time`.
- **`tick_runs`**: Ghi nhật ký vận hành các lượt chạy tự động (`id`, `started_at`, `finished_at`, `status`, `model`, `event_id`, `neurons_est`, `error`).
- **`commitments`**: Lưu lời hứa và việc dang dở (`id`, `from_id`, `to_id`, `text`, `due_at`, `status`, `event_id`).
- **`nudges`**: Lưu gợi ý của chủ dự án cho đạo diễn AI (`id`, `hint`, `created_at`, `consumed_by_event_id`).

---

## 2. Kiểu dữ liệu Domain (`lib/world.ts` & `lib/event-schema.ts`)

- **Danh sách nhân vật hợp lệ (`RESIDENT_IDS`):** `'an' | 'binh' | 'chi'`.
- **Danh sách 12 địa điểm hợp lệ (`PLACES`):** `'Sân chung'`, `'Phòng An'`, `'Phòng Bình'`, `'Phòng Chi'`, `'Bếp chung'`, `'Vườn nhỏ'`, `'Công viên'`, `'Quán cà phê'`, `'Thư viện'`, `'Xưởng sáng tạo'`, `'Quảng trường'`, `'Phố đi bộ'`.
- **Danh sách 7 loại hành động (`STEP_KINDS`):** `'work' | 'eat' | 'rest' | 'social' | 'garden' | 'read' | 'play'`.
- **Biên độ thay đổi mỗi sự kiện (`PersonChange`):**
  - `moneyDelta`: số nguyên trong `[-30000, 30000]`.
  - `energyDelta`, `hungerDelta`: số nguyên trong `[-20, 20]`.
  - `skillDelta`: số nguyên trong `[0, 3]`.
  - `memory`: chuỗi `1..240` ký tự.
  - `plan`: mảng `1..8` bước, mỗi bước có `duration` nguyên trong `[30, 180]` giây.

---

## 3. Các bất biến bắt buộc của hệ thống (System Invariants)

1. **Không âm tiền:** `person.money + change.moneyDelta >= 0` với mọi nhân vật; nếu vi phạm, toàn bộ sự kiện bị từ chối với mã `400`.
2. **Chỉ số trong biên `[0, 100]`:** `energy`, `hunger`, `skill` và `relationship.trust` luôn được kẹp trong đoạn `[0, 100]`.
3. **Mỗi nhân vật tối đa 1 mục thay đổi/sự kiện:** Mảng `changes` không được chứa hai phần tử có cùng `id`.
4. **Tính bất biến khi Tạm nghỉ (`paused = true`):** Mọi lệnh `POST /api/events` (trừ retry trùng `id` đã có) đều bị chặn với mã `409` khi `world.paused === true`.
5. **Chuyển tiếp không nhảy vị trí (No-Teleport Invariant — L1):** Khi gán `p.plan`, trường `plan.from` luôn được tính từ `resolveTransitionOrigin(world, p.id, nowMs)` thay vì lấy vị trí tĩnh cũ.
6. **Ký ức gắn người chứng kiến:** Nhân vật không được ghi nhận ký ức về cuộc hội thoại mà mình không tham gia hoặc chưa được nghe kể lại.
