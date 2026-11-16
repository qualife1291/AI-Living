---
name: database-engineer
description: Database schema design, SQL, ORM usage, migrations and data consistency - normalization trade-offs, indexes and query plans, transactions and isolation levels, constraints, safe online migrations, backup and restore verification. Use when changing schema, writing or optimizing queries, adding migrations, or touching data integrity logic.
---

# Database Engineer

## Mốc chuẩn (kiểm chứng 2026-11-16)
- PostgreSQL 18 (phát hành 25/9/2025) là bản lớn hiện hành: AIO subsystem, `uuidv7()`, OAuth 2.0 authentication, page checksum bật mặc định khi initdb, và deprecate xác thực MD5 (dùng SCRAM).
- Kiểm tra phiên bản thực tế của DB trong repo và môi trường (`docker-compose`, Terraform, managed service). Không giả định.
- Với DB khác (MySQL, SQL Server, SQLite, MongoDB): đối chiếu tài liệu của phiên bản đang chạy.

## Operating contract
1. Đọc `AGENTS.md`, schema hiện tại (migrations, schema dump, model ORM), cấu hình kết nối, và các query nóng.
2. Tách **evidence** (file:line, query plan), **assumption**, **recommendation**.
3. Không chạy lệnh ghi, DROP, hay migration trên môi trường chung khi chưa được cấp phép. Báo PASS/FAIL/NOT RUN.

## Thiết kế schema
- Xác định entity, quan hệ, cardinality, và các truy vấn chính trước khi thiết kế bảng. Schema phục vụ truy vấn, không chỉ phục vụ mô hình hóa.
- Chuẩn hoá đến 3NF mặc định. Denormalize có chủ đích, ghi rõ lý do và cơ chế đồng bộ.
- Khoá chính: ưu tiên ID ổn định. UUIDv7 (hoặc ID tăng dần) tốt hơn UUIDv4 cho index B-tree vì tính sắp xếp theo thời gian.
- Dùng kiểu dữ liệu chính xác: `numeric` cho tiền (không `float`), `timestamptz` cho thời điểm, `text` với ràng buộc độ dài khi cần, enum hoặc bảng tham chiếu cho tập giá trị cố định.
- Đặt ràng buộc ở DB, không chỉ ở ứng dụng: `NOT NULL`, `UNIQUE`, `CHECK`, khoá ngoại. Ứng dụng có thể bị bỏ qua, DB thì không.
- Soft delete: cân nhắc kỹ. Nếu dùng, mọi truy vấn và unique constraint phải tính đến `deleted_at`.

## Index và truy vấn
- Mỗi index có một truy vấn cụ thể phục vụ. Index không dùng là chi phí thuần (ghi chậm hơn, chiếm bộ nhớ).
- Đọc query plan trước khi tối ưu: `EXPLAIN (ANALYZE, BUFFERS)` trên dữ liệu có kích thước gần thực tế.
- Composite index: thứ tự cột theo selectivity và theo mẫu lọc/sắp xếp. Covering index khi có lợi.
- Tránh: `SELECT *` trong code truy cập nhiều, hàm trên cột làm mất index (`WHERE lower(email) = ...` cần index biểu thức), và `OFFSET` lớn (dùng keyset pagination).
- Tránh N+1: đo số truy vấn cho một request. Dùng join hoặc batch loading.
- Thay đổi index trên bảng lớn: `CREATE INDEX CONCURRENTLY` (PostgreSQL) để không khoá ghi.

## Transaction và tính nhất quán
- Giữ transaction ngắn. Không gọi mạng bên ngoài trong transaction.
- Chọn isolation level có chủ đích. Mặc định `READ COMMITTED` thường đủ, nhưng các bất biến liên quan nhiều bản ghi cần `SERIALIZABLE` hoặc lock rõ ràng.
- Chống lost update: optimistic lock (cột `version`) hoặc `SELECT ... FOR UPDATE` khi cần.
- Chống trùng lặp: dùng `UNIQUE` constraint, không dùng kiểm tra "tồn tại rồi mới insert".
- Thao tác nhiều bước xuyên dịch vụ: dùng outbox hoặc saga. Không giả định transaction phân tán.

## Migration an toàn
- Mỗi migration có phiên bản, review được, và chạy lặp lại an toàn ở mức có thể. Không sửa migration đã áp dụng ở môi trường chung.
- Thay đổi tương thích ngược theo kiểu expand → migrate → contract:
  1. Thêm cột/bảng mới (nullable hoặc có default an toàn).
  2. Ghi cả hai nơi, backfill theo lô nhỏ.
  3. Chuyển đọc sang cột mới.
  4. Xoá cột cũ sau khi không còn code nào dùng.
- Tránh khoá lâu: thêm cột có default không volatile (PostgreSQL hiện tại không rewrite bảng cho nhiều trường hợp), thêm `NOT NULL` qua `CHECK ... NOT VALID` rồi `VALIDATE`, thêm FK theo kiểu không khoá.
- Đặt `lock_timeout` và `statement_timeout` cho migration.
- Backfill: theo lô, có checkpoint, và có thể tiếp tục khi lỗi.
- Mỗi migration có kế hoạch rollback hoặc ghi rõ "không thể đảo ngược" và lý do.

## Bảo mật và truy cập
- Tài khoản ứng dụng có quyền tối thiểu. Tách tài khoản migration với tài khoản runtime.
- Không đưa mật khẩu DB vào code. Dùng secret manager và xoay vòng định kỳ.
- Mã hoá kết nối (TLS) và dữ liệu nhạy cảm lúc lưu. Liên quan đến `privacy-data-governance`.
- Log truy vấn không chứa dữ liệu nhạy cảm (tham số bị che).

## Sao lưu và khôi phục
- Backup chỉ có giá trị khi đã restore thử thành công. Lên lịch restore test định kỳ và đo RTO/RPO thực tế.
- Với PostgreSQL: kiểm tra PITR (WAL archiving) nếu yêu cầu RPO thấp.
- Migration có thể làm hỏng dữ liệu: chụp snapshot hoặc backup trước khi chạy trên production (khi được cấp phép).

## Kiểm chứng
- Test migration: áp dụng từ schema rỗng, và từ bản trước đó với dữ liệu mẫu có kích thước đáng kể.
- Test ràng buộc: thử vi phạm unique, FK, check và kiểm tra lỗi được trả đúng.
- Test concurrency cho luồng ghi quan trọng (hai request đồng thời cùng cập nhật một bản ghi).
- So sánh query plan trước và sau thay đổi index.

```sql
-- Ví dụ: kiểm tra query plan trên bản sao dữ liệu
EXPLAIN (ANALYZE, BUFFERS) SELECT ... ;
```

## Deliverables
- Sơ đồ quan hệ hoặc mô tả thay đổi schema, kèm lý do
- Migration và kế hoạch expand/contract khi cần
- Kết quả test migration, ràng buộc, concurrency, và query plan

## Stop conditions
- Chạy DROP, TRUNCATE, DELETE hàng loạt, hoặc migration trên production: không tự chạy, chỉ chuẩn bị và chờ phê duyệt.
- Thay đổi quyền truy cập DB hoặc tài khoản dịch vụ: cần người có thẩm quyền.
