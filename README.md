# Xóm AI

Thành phố 3D mô phỏng đời sống của An, Bình, Chi và các cư dân, với ký ức, nhu cầu, quan hệ và học lựa chọn hoạt động. Three.js/React/Vinext chạy trên Cloudflare Worker + D1. Tiếng Việt, owner-private, không dùng API tính phí.

**Agent bắt đầu:** [AGENTS](AGENTS.md) → [CODEX_HANDOFF](CODEX_HANDOFF.md). Không cần đọc toàn bộ tài liệu. Việc tiếp theo chỉ ghi tại [ROADMAP](ROADMAP.md).

## Chạy local

Node ≥22.18, pnpm 11.25.0; môi trường đã kiểm dùng Node 24.19. Chạy từ thư mục repo:

```bash
bash scripts/sites-env.sh -- corepack pnpm install --frozen-lockfile --prefer-offline --store-dir .sites-runtime/pnpm-store
npm run build
node scripts/setup-local.mjs
npm start
```

Setup chỉ áp dụng D1 local, giữ dữ liệu đã có. `npm run dev` dùng khi phát triển; sau build, restart Worker mới trước browser QA. `npm run living:up` là model/relay/daemon **local opt-in**, không phải scheduler production. Credential và runtime files không commit.

## Tra cứu đúng chủ đề

| Khi cần | Tài liệu |
|---|---|
| Context hiện tại, blocker, bước kế | [CODEX_HANDOFF](CODEX_HANDOFF.md) · [ROADMAP](ROADMAP.md) |
| Luồng chạy và module | [ARCHITECTURE](docs/ARCHITECTURE.md) |
| D1, snapshot, bất biến, migration | [DATA_MODEL](docs/DATA_MODEL.md) |
| Endpoint, quyền, pause/CAS/pulse | [API](docs/API.md) |
| Learning, memory, context, hội thoại | [LEARNING](docs/LEARNING.md) |
| Ground, camera, rigs, pet/bike/tag, flora/audio | [RENDERING](docs/RENDERING.md) |
| Asset/OSM, license, import/hash/budget | [ASSETS](docs/ASSETS.md) |
| Bốn cảnh studio và phạm vi đã kiểm | [SCENARIOS](docs/SCENARIOS.md) |
| Quyết định kiến trúc/sản phẩm | [DECISIONS](docs/DECISIONS.md) |
| Test và bằng chứng | [TESTING](docs/TESTING.md) |
| Backup, deploy, automation, phục hồi | [PRODUCTION_RUNBOOK](docs/PRODUCTION_RUNBOOK.md) |

[CHANGELOG](CHANGELOG.md) ghi mốc sản phẩm; Git lưu lịch sử review/WIP đã gộp. [candidate.json](docs/releases/candidate.json) là gói chuẩn bị, [latest.json](docs/releases/latest.json) là deploy đã xác minh cuối. Push GitHub không chứng minh đang chạy production.

Chuyển động/rules, kịch bản biên tập và lượt LLM có nguồn riêng. Kết quả học theo kế hoạch mô phỏng chưa chứng minh đến nơi bằng ground. Không fine-tune tự động, xuất video hoặc mở public trong phạm vi hiện tại.
