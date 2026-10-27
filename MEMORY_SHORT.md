# Đang tạm dừng theo yêu cầu — 27/10/2026
- Đọc docs/WIP_OVERLAYS_HOUSEHOLDS.md trước khi tiếp tục. Người dùng đã yêu cầu dừng và push; không tự coi WIP đã phát hành.
- UI tên/thoại và household metadata đã có source trênwork (c0aee68/598c8ff/3e57abc + commitbàngiao). Browser overlay/longtext/profile desktopmobile cuối đạt; API D1 legacybackfill/CAS/preservehistory đạt.
- Việc bắt buộc còn: full35suite ởHEAD cuối và qa-social.py đủ6lượt/controls sau ACK DOM mới. Review ảnh/khoảng cáchhead-label, cảnhđông/resize/hide/pause/WebGL regression. Xemdocđểphânbiệt checksđãchạy vàchưachạy.
- Household mới phân nhóm snapshot, chưa individualhome routing/scene; chưa tăng densitylive. Còn phaseC density/trafficgraph, phaseD LinUCB/skillgates vàdurablehistory/modelA-B.
- Chỉ3D; khôngrestoreSVG/2D. Chỉpushwork, main vẫn a5b7c5a; productionledger vẫn11/c1ddea1, chưadeploy hoặc xácminhlive. KhôngresetDB/testfixture lênproduction/secrets/cache; giữownerprivate/no paidAPI.
- Luônpushcheckpointvàbàngiao trước testlâu. Cài nếu cần: bash scripts/sites-env.sh -- corepack pnpm install --frozen-lockfile --prefer-offline --store-dir .sites-runtime/pnpm-store.
