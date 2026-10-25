# Nhật ký phát hành production 25/10/2026

- Project: appgprj_6adc7dc364d48191a09202c5b43309e4; giữ owner-private (access revision1), URL https://xom-ai-long.bouncyslug18.chatgpt.site.
- Bản live trước phát hành: version5. Git phát triển: qualife1291/AI-Living, nhánh work; source Sites có lịch sử riêng, main được fetch và đối chiếu trước cập nhật.
- Quy trình: checkpoint Git -> kiểm tra -> build có SHA -> package Worker -> push đúng source Sites -> save/deploy private -> ghi version/deployment/status vào Git.
- Migration: giữ nguyên 0000–0003, thêm 0004 reconciliation schema-only/idempotent. Journal trước đó chỉ có0000. Không reset, xóa hay backfill dữ liệu thật.
- Native database overview trước phát hành: DB chỉ có worlds/episodes; tổng 1 world và2 episodes. Native projection bị cắt giá trị, không được coi là full backup. Backup đầy đủ được lấy qua private /api/world server-side vào backups/ (gitignored), đối chiếu đủ2 episodes trước migration. Không lưu token.
- Runtime dự kiến: XOM_OWNER_PRIVATE_ORIGIN đúng origin đã được Sites xác nhận owner-private; chỉ dựa vào dispatch boundary cho shared-world operations. Phải xóa cấu hình này TRƯỚC khi mở audience. XOM_LOCAL_ADMIN không lên production. Không cấu hình Qwen/cron trả phí.
- Automation cũ 6adcbdcc81cc819188a4a2ae65392369 hiện paused, giữ paused; không tạo bản trùng. Chưa cam kết AI24/7.
- Phạm vi bản mới: hardening, nội thất, hồ sơ tuổi mô phỏng, OSM3D snapshot và registry nghiên cứu nguồn.
- Trạng thái hiện tại: đang chuẩn bị; chỉ ghi thành công khi native deployment trả succeeded. Metadata phiên bản cuối được ghi bổ sung sau publish.
