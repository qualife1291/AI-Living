# Xóm AI — khu phố của những trí tuệ nhỏ

Dự án mô phỏng một khu phố 2D có ba robot AI An, Bình, Chi, cùng mèo Mướp, chó Cún và đàn sẻ. Nhân vật có mục tiêu, ký ức, quan hệ; đi lại qua đường phố, làm việc và gặp nhau. Mục tiêu dài hạn là một thế giới có câu chuyện tiếp nối, đủ thú vị để theo dõi và sau này làm nội dung mạng xã hội.

**Bản cuối cập nhật thiết kế:** có robot khớp tay/chân, xưởng xem trước, lời thoại đầy đủ, môi trường/động vật và xe chuyển động riêng; xem [docs/ANIMATION_SOURCES.md](docs/ANIMATION_SOURCES.md) và [docs/CHARACTER_DESIGN.md](docs/CHARACTER_DESIGN.md).

**Đọc đầu tiên khi chuyển sang Codex: [CODEX_HANDOFF.md](CODEX_HANDOFF.md).**

## Trạng thái của bản ZIP

- Mã nguồn gồm bản robot/khu phố đã xuất bản và lớp sinh hoạt mới đang phát triển.
- Bản live đã biết: https://xom-ai-long.bouncyslug18.chatgpt.site (owner-private).
- Lớp sinh hoạt mới có đường đi, công việc, động vật, camera theo nhân vật và kế hoạch AI. Đã chạy unit checks, TypeScript và build; có browser smoke test. **Chưa xuất bản lớp sinh hoạt mới trong lần bàn giao này.**
- Lịch ChatGPT độc lập đã được tạo/bật; chưa có kết quả chạy theo lịch được xác minh.
- Không tích hợp API AI trả phí, không triển khai video. Miễn phí phụ thuộc hạn mức tài khoản và nền tảng; không cam kết quota vô hạn.
- ZIP chứa nguồn và tài liệu, không chứa production DB, lịch sử Git, credentials hoặc node_modules.

## Chạy ở môi trường Codex mới

Node.js 24 trở lên để chạy trực tiếp các kiểm thử `.mjs` nhập module `.ts`. Package manager được pin trong `package.json`: pnpm 11.25.0.

```bash
corepack pnpm install --frozen-lockfile
node node_modules/vinext/dist/cli.js build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_deep_firebird.sql
npm run dev
```

Nếu Corepack không có, cài pnpm đúng phiên bản từ registry chính thức theo quy trình của môi trường rồi dùng `pnpm install --frozen-lockfile`. Không dùng `npm ci`: lockfile chuẩn là pnpm, installer `install:ci` kế thừa dành cho managed Linux cũ có Bash.

Clean clone không có `.sites-runtime/execution-profile.json` sẽ mặc định portable; không copy runtime settings của máy cũ. `npm run dev` portable dùng cổng 5173; lấy URL thật từ terminal. Trong ChatGPT Work managed Linux, đọc Sites skill và dùng `sites-preview start <checkout>` thay vì tự mở server khác.

Lệnh migration ở trên chỉ chạy **một lần trên database local mới**, không chạy lặp trên DB đã có bảng. Xem [docs/OPERATIONS.md](docs/OPERATIONS.md).

## Kiểm tra

```bash
node scripts/test-life.mjs
node scripts/test-events.mjs
node scripts/test-animation.mjs
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vinext/dist/cli.js build
```

Hai bộ test đầu không ghi production. `scripts/verify-live.py` và `scripts/test-world.mjs` là kiểm thử có ghi, chưa đạt chuẩn an toàn cho production; xem docs/TESTING.md trước khi dùng.

## Tài liệu

- [Tầm nhìn và nguyên tắc sản phẩm](docs/VISION.md)
- [Kiến trúc, dữ liệu và công nghệ](docs/ARCHITECTURE.md)
- [Cơ chế AI và sinh hoạt](docs/AI_BEHAVIOR.md)
- [Nguồn tập tính động vật](docs/ANIMAL_BEHAVIOR.md)
- [Vận hành, local DB, deploy và giới hạn](docs/OPERATIONS.md)
- [Kiểm thử, bằng chứng và rủi ro](docs/TESTING.md)
- [Roadmap theo phase](ROADMAP.md)
- [Bộ nhớ dài hạn](MEMORY_LONG.md), [ngắn hạn](MEMORY_SHORT.md), [changelog](CHANGELOG.md)

Không có giấy phép open-source mới được tự cấp cho mã ứng dụng. Giữ nguyên notices/license của vendor và starter đi kèm; xác minh quyền trước khi phát hành công khai.
