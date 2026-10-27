# Xóm AI — Khu phố của những trí tuệ nhỏ

> Review main/Gemini, stack và các bug thực tế: [báo cáo 27/10](docs/MAIN_REVIEW_2026-10-27.md).

> Chi tiết nhân vật, rig chuyển động, đạo cụ và hoạt cảnh: [review bản 11](docs/VISUAL_DETAIL_REVIEW.md).

> Vật cản nhỏ, khoảng riêng, camera điện ảnh theo An và sinh hoạt chủ động: [review bản10](docs/SPACE_CAMERA_AUTONOMY.md).

> Sửa phản hồi thực tế về thoại/lag/xuyên nhà: [bằng chứng và giới hạn bản9](docs/GROUND_AND_MOTION_REVIEW.md).

> Cập nhật nhân vật/đối thoại: [review và bằng chứng](docs/SOCIAL_REVIEW.md), [biên kịch bằng agent](docs/SOCIAL_SCRIPT_BIBLE.md), [prompt và chỉ đạo hình ảnh](docs/VISUAL_DIRECTION.md). Nguồn production đang chạy được ghi riêng trong docs/releases/latest.json.

> Production version11 (27/10/2026), owner-private: xem [nhật ký phát hành](docs/releases/2026-10-27-production.md), [quy trình phục hồi](docs/PRODUCTION_RUNBOOK.md) và [khảo sát nguồn map3D](docs/MAP_3D_SOURCES.md).

> Mới nhất: [Thành phố 3D và cao ốc](docs/THREE_WORLD.md) — renderer mặc định mới, điều khiển và bằng chứng local.

> Cập nhật Codex Cloud: xem [docs/CLOUD_REVIEW.md](docs/CLOUD_REVIEW.md) cho ba phase mới, bằng chứng local và các phần còn thiếu. Các trạng thái live trong tài liệu bàn giao dưới đây chưa được xác minh lại.

Dự án mô phỏng một thành phố 3D lấy bối cảnh TP.HCM có ba robot AI **An, Bình, Chi**, cùng mèo **Mướp**, chó **Cún** và **Đàn sẻ**. Nhân vật có mục tiêu, ký ức gắn người chứng kiến, lời hứa và quan hệ; đi lại qua mạng lưới đường phố, làm việc theo nhịp đồng hồ thế giới và gặp nhau trò chuyện.

- **Bản đồ toàn bộ hệ thống tài liệu (đã cơ cấu thành 6 mục chuyên đề):** xem [docs/INDEX.md](docs/INDEX.md).
- **Đọc đầu tiên khi tiếp nhận dự án:** [CODEX_HANDOFF.md](CODEX_HANDOFF.md) và [AGENTS.md](AGENTS.md).
- **Báo cáo kỹ thuật & Thiết kế mở rộng:** [docs/TECHNICAL_REVIEW.md](docs/TECHNICAL_REVIEW.md) và [docs/DESIGN_PROPOSALS.md](docs/DESIGN_PROPOSALS.md).
- **Kỹ thuật tổng hợp bối cảnh & Bộ dữ liệu cho AI tự training:** [docs/AI_TRAINING_AND_CONTEXTS.md](docs/AI_TRAINING_AND_CONTEXTS.md).

---

## 1. Điểm mới trong bản cập nhật toàn diện (24/10/2026)

1. **Mã nguồn định dạng sạch & sửa triệt để L1–L10 + 20 lỗi ESLint:**
   - Sửa lỗi **L1 (P0)** bằng `resolveTransitionOrigin()` (`lib/life.ts` + `lib/apply-event.ts`): khi kế hoạch AI mới đến giữa lúc robot đang đi theo routine, điểm xuất phát `plan.from` lấy đúng vị trí mô phỏng hiện tại thay vì nhảy lùi về vị trí cũ.
   - Sửa lỗi **L2–L5, L7, L9, L10**: lưu đầy đủ `relationship` vào `episodes`, xử lý race condition trùng `id` trả `duplicate: true`, kiểm tra kích thước byte UTF-8 thực tế của body, bỏ câu ghi thừa trên mỗi lần `GET /api/world`, trả `serverNow` chống lệch đồng hồ, tách `StaticScene` (`React.memo`) giảm tải render SVG, và đổi `<svg role="group">` để hỗ trợ trình đọc màn hình.
2. **Đồng hồ thế giới & Thời tiết tất định (`lib/clock.ts`) + Danh mục 16 hoạt cảnh (`data/scenes.json`):**
   - Chu kỳ 7 pha ngày/đêm (`dawn` → `night`) theo giờ Việt Nam (`Asia/Ho_Chi_Minh`), độ sáng `daylight`, mùa mưa/mùa khô TP.HCM và thời tiết tất định theo hạt giống (`mulberry32`).
3. **Kỹ thuật Tổng hợp Bối cảnh Đa chiều & Bộ AI Tự Training (`lib/training.ts`, `data/contexts/`, `data/training/`):**
   - **24 bối cảnh đa chiều** (`data/contexts/neighborhood-contexts.json`) thuộc 6 nhóm: Thời tiết & Mùa màng, Kinh tế vi mô, Lời hứa xã hội, Sinh thái động vật, Văn hóa Việt Nam và Thấu cảm.
   - **6 mẫu Golden Episodes chuẩn SFT** (`data/training/sft-golden-episodes.json`), **6 cặp đối chiếu ưu tiên DPO** (`data/training/dpo-preference-pairs.json`), **Giáo trình tự luyện 8 cấp độ** (`data/training/self-play-curriculum.json`) và **Hàm chấm điểm phản tư tự động `evaluateCandidateEvent()`** trên thang 100 điểm.
4. **Đầy đủ tệp cấu hình `.gitignore` & `.npmrc`:**
   - Có mặt trực tiếp tại thư mục gốc (`.gitignore`, `.npmrc`) kèm bản sao dự phòng (`gitignore.txt`, `npmrc.txt`) và được kiểm tra tự động trong `scripts/package-handoff.py`.

---

## 2. Chạy ở môi trường phát triển

Yêu cầu: **Node.js `>=22.18.0`** (khuyến nghị Node 22.18+ hoặc Node 24+ để chạy trực tiếp các kiểm thử `.mjs` nhập module `.ts`, đã xác minh cài sạch trên Node 22.22.2). Trình quản lý gói được pin trong `package.json`: **pnpm `11.25.0`**.

```bash
# Nếu công cụ giải nén của bạn ẩn dotfile, khôi phục từ bản dự phòng:
# cp -n gitignore.txt .gitignore && cp -n npmrc.txt .npmrc

npm run install:ci
npm run build
node scripts/setup-local.mjs # migration 0000–0003, không reset dữ liệu
npm run dev
```

---

## 3. Kiểm tra (Unit Tests, TypeScript, Lint & Build)

```bash
node scripts/test-life.mjs
node scripts/test-events.mjs
node scripts/test-animation.mjs
node scripts/test-training.mjs
node node_modules/typescript/bin/tsc --noEmit
npm run lint
node node_modules/vinext/dist/cli.js build
```

Cả bốn bộ kiểm thử đơn vị (`test-life`, `test-events`, `test-animation`, `test-training`) đều là kiểm thử thuần, không gọi mạng và không ghi vào production DB.

---

## 4. Hệ thống Tài liệu (Đã cơ cấu theo 6 mục chuyên đề)

Xem danh mục đầy đủ tại **[docs/INDEX.md](docs/INDEX.md)**:

- **Mục I — Tầm nhìn, Thiết kế Mở rộng & Sinh thái:** [VISION.md](docs/VISION.md) · [DESIGN_PROPOSALS.md](docs/DESIGN_PROPOSALS.md) · [CHARACTER_DESIGN.md](docs/CHARACTER_DESIGN.md) · [ANIMAL_BEHAVIOR.md](docs/ANIMAL_BEHAVIOR.md) · [ANIMATION_SOURCES.md](docs/ANIMATION_SOURCES.md)
- **Mục II — Kiến trúc, Hợp đồng API & Mô hình Dữ liệu:** [ARCHITECTURE.md](docs/ARCHITECTURE.md) · [API.md](docs/API.md) · [DATA_MODEL.md](docs/DATA_MODEL.md) · [GLOSSARY.md](docs/GLOSSARY.md)
- **Mục III — Trí tuệ Nhân tạo, Bối cảnh & Bộ AI Tự Training:** [AI_BEHAVIOR.md](docs/AI_BEHAVIOR.md) · [AI_TRAINING_AND_CONTEXTS.md](docs/AI_TRAINING_AND_CONTEXTS.md)
- **Mục IV — Hồ sơ Quyết định Kiến trúc (ADR):** `docs/DECISIONS/ADR-0001` → `ADR-0008`
- **Mục V — Vận hành, Bảo mật & Đóng góp:** [OPERATIONS.md](docs/OPERATIONS.md) · [RUNBOOK.md](docs/RUNBOOK.md) · [SECURITY.md](docs/SECURITY.md) · [CONTRIBUTING.md](docs/CONTRIBUTING.md) · [STARTER_REFERENCE.md](docs/STARTER_REFERENCE.md)
- **Mục VI — Kiểm thử & Báo cáo Đánh giá:** [TESTING.md](docs/TESTING.md) · [TECHNICAL_REVIEW.md](docs/TECHNICAL_REVIEW.md) · [ZIP_REVIEW.md](docs/ZIP_REVIEW.md)

## An và bối cảnh TP.HCM — bản mở rộng 25/10/2026

Đã thêm cư dân phụ tăng theo ngày, điểm học/khám/chợ, planner theo giờ Việt Nam, dữ liệu Open-Meteo/Nager.Date và AI local không gọi API tính phí. Xem [thiết kế, nguồn dữ liệu và kiểm chứng](docs/LIVING_REALTIME.md), gồm các giới hạn về kẹt xe, lịch âm, lễ hội và production.

```bash
corepack pnpm install --frozen-lockfile
npm run build
node scripts/setup-local.mjs
python3 scripts/setup-local-ai.py
npm run living:up
```

Cần Node 24+, Python 3.12 và khoảng 2 GiB đĩa cho model/binary/cache AI. Giữ `living:up` chạy để relay, model và daemon hoạt động. Đây là quy trình cloud local; Publish môi trường không phải deploy Site hoặc tạo scheduler production.

## Thành phố và tạo hình — cập nhật mới

Trang chủ nay là không gian live gần toàn màn hình: 33 địa điểm, 32 tình huống, di chuyển đi bộ/xe máy/buýt/metro trong mô phỏng, 14 bộ tạo hình khối có thể đổi màu và lưu riêng. Có chế độ khảo sát trung tâm TP.HCM từ 2.106 đường/công trình OpenStreetMap, giữ attribution ODbL.

Mỗi cư dân có mô hình hành vi học từ phản hồi đã hoàn tất; ba động vật có policy theo loài. Archive trải nghiệm có thể xuất bằng `npm run training:export`. Đây chưa phải fine-tune trọng số Qwen.

Đọc [báo cáo thành phố](docs/URBAN_WORLD.md) và [ba hướng sản phẩm](docs/DECISIONS/ADR-0009-shared-world-three-product-directions.md): quan sát An, phim trường giáo dục và nhân vật cá nhân. Các hướng public/video/multi-user chưa được mở trong đợt này.

## Độ tin cậy, nội thất và hồ sơ cuộc đời
Xem `docs/INTERIORS_AND_RELEASE.md` cho phạm vi đã làm, cách cấu hình quyền chủ sở hữu, scheduler opt-in và bằng chứng kiểm thử. Không mở public chỉ bằng đổi audience.

> Bản7 sửa tỷ lệ/độ nét, thêm chat và lượt mở theo phiên; xem [báo cáo trải nghiệm và kiểm thử](docs/EXPERIENCE_REVIEW.md). Lịchcloud mỗi giờ đã bật, lần chạy đầu cần theo dõi; không coi đây là SLA24/7.

## Source candidate phase B
Hành động và hậu thoại mới: xem [docs/PHASE_B_ACTIONS.md](docs/PHASE_B_ACTIONS.md) để biết cách test và giới hạn. Chưa hoàn tất mọi giai đoạn A–D.
