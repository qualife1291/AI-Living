# Bàn giao work — 27/10/2026
- Đọc docs/PAIRED_TAG.md cho phần đuổi bắt theo cặp mới trong phiên 3D và kết quả test. Source/checkpoint141971c,71859cb; ảnh/metrics QA cuối được push cùng tài liệu sau đó. Không lặp lại phần đã hoàn tất. Review trước đó: docs/WORK_REVIEW_2026-10-27.md.
- Còn: đồng bộ vai/tag qua nhiều viewer hoặc 2D; hiện reload/đổi renderer/tập actor sẽ khởi tạo cặp lại. Không tự tuyển người chưa chọn tag; chưa có xác nhận completion vật lý ở backend hoặc reward cho lượt bắt.
- Backlog kế tiếp: xe đạp di chuyển có collision toàn thân, thú theo chủ, density/household/traffic graph, LinUCB/skill gates, durable dialogue history/model A-B. Chưa hoàn tất C/D; chọn từng phần với tiêu chí nghiệm thu rõ ràng.
- Chưa nghiệm thu điện thoại/GPU thật, soak30phút/24giờ,150người/80xe/p95<33ms; zero collision trong fixture không chứng minh mọi tình huống hết kẹt.
- Main vẫn a5b7c5a; chỉ push work. Production ledger vẫn version11/c1ddea1, chưa deploy hoặc xác minh live trong các lượt này. Trước release cần backup mới, kiểm tra migration0006 thực tế và giữ owner-private. Không reset DB/test fixture trên production.
- Luôn push checkpoint và cập nhật bàn giao trước test lâu; không commit .dev.vars/DB/cache hoặc tạo automation trùng/API tính phí. Cài: bash scripts/sites-env.sh -- corepack pnpm install --frozen-lockfile --prefer-offline --store-dir .sites-runtime/pnpm-store.

# WIP yêu cầu chỉ 3D, tiếp tục phase B
- Đã gỡ UrbanMap/CityMap/Robot/Animal/Vehicle/SVG wardrobe và route dashboard cũ (redirect về /). Chỉ giữ OSM3D, tọa độ XZ/graph/ground và canvas texture dùng cho3D. Chuyển wardrobe sang AppearancePreview3D; lỗiWebGL córetry, khôngfallbackrenderer. Đã bỏ lib/traffic2D, cameraView/bubbleOffset/wrapSpeech không còn dùng, CSS2D/ảnhSVG cũ, manifestZIPstale; sửa QA cũ.
- WIP: checkđạt, cần lint/fullsuite/build/browser saucleanup. Tiếp theo ownership và companionfollow cho walk-pet, không coi đã hoàn tấtcycle/C/D. Khôngdeploy/main merge; pushcode checkpoints.
- WIP phaseBpets: petOwners dansnapshot, /api/living/pets POST cóownerguard/revisionCAS/schema/2KiB; UI chọn người chămCún/Mướp. PetWalkDirector yêu cầugoal gần chủ, chủchờ nếu>40unit, tiếptục khi<25; groundcollision shared. Unit1600framesđạt100framechờ/200unitdichuyển/0collision, pause/cancel/unassign. Đã bắt/sửa petspawn cạnhchủ thayvịtríthật. Cần build/API/browser và fullsuite cuối trướcchốt.
