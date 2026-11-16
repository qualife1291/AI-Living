---
name: linter-typecheck
description: Linting, formatting and static type checking setup and use - ESLint v10 flat config, Biome, Oxlint, Prettier, Ruff for Python, mypy or pyright, TypeScript strict mode, golangci-lint, pre-commit hooks, CI quality gates, and a safe way to adopt rules in legacy code without suppressing problems. Use when configuring or fixing lint, format or type-check failures, adding a linter to a repo, or deciding which tool to use.
---

# Linter and Typecheck

## Mốc công cụ (kiểm chứng 2026-11-16)
- ESLint v10 (ra tháng 2/2026) chỉ hỗ trợ flat config (`eslint.config.js` hoặc `.mjs`). Không còn `.eslintrc`, `.eslintignore`, hay `/* eslint-env */`. Yêu cầu Node.js 20.19 trở lên. ESLint v9 đã hết hỗ trợ vào 6/8/2026.
- Biome 2.x: một công cụ vừa lint vừa format, có type-aware rule không cần TypeScript compiler. Phù hợp dự án mới muốn cấu hình tối thiểu.
- Oxlint: linter Rust nhanh, đọc được cấu hình kiểu ESLint flat. Phù hợp làm lớp kiểm tra nhanh trước ESLint.
- Ruff: linter và formatter Python thống nhất, thay thế nhiều công cụ cũ.
- TypeScript: bật `strict: true` và các cờ liên quan (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` khi phù hợp). Kiểm tra phiên bản trong repo trước khi nâng.
- Với mọi công cụ: đọc phiên bản đang dùng trong lockfile và đối chiếu tài liệu của đúng phiên bản.

## Operating contract
1. Đọc `AGENTS.md`, cấu hình lint/format/type hiện có, `package.json` scripts hoặc `pyproject.toml`, và CI workflow.
2. Tách **evidence**, **assumption**, **recommendation**.
3. Chạy công cụ để có baseline trước khi sửa. Báo PASS/FAIL/NOT RUN kèm số lỗi.

## Chọn công cụ
- Repo đã có công cụ: giữ nguyên, trừ khi có lý do rõ ràng và được phê duyệt để chuyển.
- Repo mới JavaScript/TypeScript: Biome (đơn giản) hoặc ESLint v10 + typescript-eslint + Prettier (khi cần plugin đặc thù như React hooks, a11y, hoặc rule tuỳ biến).
- Python: Ruff (lint và format) + mypy hoặc pyright.
- Go: golangci-lint, `go vet`, và `gofmt`.
- Không chạy song song hai formatter. Một công cụ quyết định định dạng, công cụ kia (nếu có) chỉ lint không format.

## ESLint v10 flat config (mẫu tối thiểu)
```js
// eslint.config.mjs
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "build", "coverage"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
);
```
- Di chuyển từ cấu hình cũ: `npx @eslint/migrate-config .eslintrc.json`, rồi review file sinh ra.
- Lưu ý: v10 tìm cấu hình từ thư mục của file đang lint, không từ thư mục làm việc. Trong monorepo, kiểm tra từng package.
- Plugin cần hỗ trợ flat config. Kiểm tra trước khi thêm.

## Biome (mẫu tối thiểu)
- Một file `biome.json` cho lint và format. Bật rule theo nhóm có chủ đích, không bật toàn bộ mà không xem từng rule.
- Với project đang dùng ESLint đầy đủ plugin, cân nhắc giữ ESLint và chỉ dùng Biome cho format nếu có lợi về tốc độ.

## Python: Ruff và type checker
```toml
# pyproject.toml (trích)
[tool.ruff]
line-length = 100
target-version = "py312"   # đặt theo requires-python thực tế
[tool.ruff.lint]
select = ["E", "F", "I", "B", "UP", "S", "SIM"]   # S = bandit-style security rules
[tool.mypy]
strict = true
```
- Chọn tập rule có chủ đích, không bật `ALL` ngay từ đầu.
- Với legacy code: bật strict theo từng module (`[[tool.mypy.overrides]]`) thay vì toàn bộ repo cùng lúc.

## Quy trình áp dụng trong codebase cũ
1. Chạy công cụ, ghi baseline số lỗi theo rule.
2. Chỉ fail CI với lỗi mới (nhiều công cụ hỗ trợ baseline hoặc `--new-from-rev`). Không để lỗi cũ chặn mọi PR.
3. Sửa tự động những lỗi an toàn (`--fix`, format). Review diff vì auto-fix có thể đổi hành vi (đặc biệt rule về async, equality, hoặc unused variable có side effect).
4. Sửa dần theo module khi chạm vào. Đặt lịch giảm nợ.
5. Nâng mức rule theo bước, mỗi bước là một PR riêng.

## Không được làm
- Không thêm `eslint-disable`, `@ts-ignore`, `# type: ignore`, `// nolint`, hay `# noqa` để làm xanh CI mà không có lý do. Nếu bắt buộc, ghi lý do cụ thể ngay cạnh và giới hạn phạm vi (một dòng, một rule).
- Không dùng `any` hoặc `cast` để tắt lỗi kiểu. Sửa kiểu hoặc thu hẹp (narrow) bằng kiểm tra runtime.
- Không tắt rule ở mức toàn cục hoặc bỏ thư mục khỏi lint để đạt số liệu đẹp.
- Không đổi quy tắc lint để khớp với code vi phạm, trừ khi có thảo luận và phê duyệt của đội.
- Không chạy `--fix` trên toàn repo trong cùng PR với thay đổi logic. Tách thành PR riêng.

## Pre-commit và CI
- Pre-commit: chạy format và lint nhanh trên file thay đổi (lint-staged, lefthook, husky, hoặc pre-commit framework). Giữ thời gian dưới vài giây.
- CI: chạy đầy đủ `lint`, `format --check`, `typecheck`, và test. Đây là cổng chặn merge.
- Pin phiên bản công cụ trong lockfile hoặc `requirements` để kết quả nhất quán giữa máy dev và CI.
- Cache kết quả (ESLint cache, Ruff cache, mypy cache) trên CI để giảm thời gian chạy.

## Kiểm chứng
```bash
# JavaScript/TypeScript
npx eslint .          # hoặc npx biome check .
npx tsc --noEmit
# Python
ruff check . && ruff format --check .
mypy . # hoặc pyright
# Go
golangci-lint run ./...
```
- Ghi số lỗi trước và sau thay đổi, theo rule.
- Với thay đổi auto-fix: chạy test để xác nhận hành vi không đổi.

## Deliverables
- Cấu hình đã thêm hoặc sửa, kèm lý do chọn công cụ
- Baseline số lỗi và kết quả sau thay đổi (PASS/FAIL/NOT RUN)
- Danh sách suppression mới (nếu có) kèm lý do và phạm vi

## Stop conditions
- Chuyển công cụ lint hoặc formatter trên repo đang chạy ổn định: cần xác nhận của đội vì ảnh hưởng toàn bộ PR đang mở.
- Nâng major ESLint, TypeScript, hoặc Ruff: liệt kê breaking change và chờ xác nhận.
