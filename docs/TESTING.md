# Kiểm thử và bằng chứng

`npm run test:unit` chạy danh sách trong scripts/unit-suites.json bằng scripts/run-unit-tests.mjs. Có49suite ở mốc nguồn tích hợp hiện tại (38suite ở c83a5e3); `node scripts/run-unit-tests.mjs --list` là danh sách hiện hành. Mỗi process độc lập, mặc định tối đa4worker, chạy đủ các suite và trả mã lỗi nếu bất kỳ suite thất bại. `XOM_TEST_JOBS=1` dùng khi cần tuần tự hoặc máy ít tài nguyên. Không hứa tỷ lệ tăng tốc chưa đo.

## Các nhóm kiểm tra

| Nhóm | Suite tiêu biểu |
|---|---|
| Core/schema/time | life, events, animation, training, continuity, daily-routines, living, festivals |
| Learning/autonomy/social | learning, social, autonomy, phase-b, scenario-benchmarks, tag-game, pet-walk, identities, households, linucb, memory-records, role-expansion, dialogue-pool, policy-store, daemon-fallback, domain-skills, context-cards, prompt-memories, plan-completion |
| Ground/traffic/camera | city, three-city, walkability, personal-space, traffic, cinematography, cycle, home-anchors |
| Geometry/assets/lifecycle | appearance, human-visuals, visual-upgrade, maintain-assets self-test, model-assets, resource-packs, city-rigs |
| Security/operations | hardening, map-release, liveness, context-deadline, diagnostics-fixes, quality-budget, overlay-layout |

Unit dùng bộ nhớ/fixture hoặc D1 cô lập cho policy transaction, không truy cập production. Geometry parser Node thay material để không cần image decoder; không thay thế kiểm thử texture/browser. Synthetic240người không là bằng chứng đang bật density240live.

## Gate local

```bash
npm run test:unit
npm run check
npm run lint
npm run assets:check
npm run build
npm run test:api:local
```

API test dùng Worker build + D1 cô lập, kiểm tra owner/origin/body/schema, pulse, petassignment, CASrace, backfillhome/identity, normalized policies, structured memories, model editorial guard và giữhistory. Không reset DB thật. Đọc docs/PRODUCTION_RUNBOOK.md cho migration/release; push thành công không là deploy.

Sau build phải khởi động Worker mới từ dist/server/wrangler.json; tránh dùng process đang giữ bundle cũ. QA_BASE bắt buộc loopback, ví dụ http://127.0.0.1:5194 (chỉ nội bộ, không gửi làm publicpreview).

| Browser harness | Bất biến chính |
|---|---|
| qa-social.py | Desktop/mobile đủ6lượt, luân phiên, polling, sourcebadge, chọn Bình/followAn/zoom |
| qa-overlays-households.py | Pillcompact/click/occlusion layout, câu240ký tự/tên dài/320px, householdprofile |
| qa-cycle.py | Fullbike9,2unit di chuyển, fullbodyportrait, pause, dismount/noTeleport |
| qa-three-only-pets.py | Companion/caretaker UI, pause, hide/reveal, resize320, wardrobe3D/OSM, loss/retry/noWebGL, không2D |
| qa-domain-skills.py | Tám nhóm, bốn gate, legacy compatibility và 320px |
| qa-home-anchors.py | 60 cửa, đích nhà riêng, hồ sơ/địa chỉ, Xem nhà desktop/mobile |
| qa-soundscape.py | Web Audio thật opt-in, pause/hidden/OSM/off/unmount, 320px và unsupported |
| qa-resource-gallery.py | 19model mẫu/15packs, texture/clip, mobile, pause dừngdraw, clipchange, selectionrace, context/loadretry |

Ảnh thật fixture preview ở docs/screenshots, kèm metrics. Phải gửi ảnh thực cho người dùng và ghi rõ preview hay production. SwiftShader không chứng minh FPS/pin/nhiệt trên điện thoại thật; cần đo hardware và soak riêng. Không tự đưa fixture/test-world/verify-live lên production. Chi tiết kết quả/giới hạn của nguồn đã merge nằm trong MEMORY_LONG và ASSET_EXPANSION.

`npm run benchmark:policies` chạy synthetic holdout bằng runtime thật và báo cả hai phía; không phải benchmark LLM hoặc dữ liệu production. Chi tiết và kết quả ở PHASE_D_LEARNING.
