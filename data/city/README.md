# Dữ liệu bối cảnh thành phố

- `hcm-district1.json`: trích đoạn cơ sở dữ liệu OpenStreetMap tại bbox `[10.770,106.692,10.782,106.707]`, đã chuyển tọa độ sang không gian SVG. © OpenStreetMap contributors, [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/), [attribution](https://www.openstreetmap.org/copyright). Giấy phép áp dụng cho dataset dẫn xuất này; không tự áp đặt giấy phép của nó lên toàn bộ source ứng dụng.
- Script `python3 scripts/import-osm.py` có query/bbox cố định, dùng proxy/TLS mặc định, giữ timestamp nguồn và attribution, loại metadata người đóng góp. Chỉ chạy khi muốn cập nhật snapshot, không fetch dữ liệu/tile trong mỗi frame.
- `venues.json`: 33 địa điểm hư cấu dùng trong mô phỏng, độc lập với vị trí công trình thật trong snapshot OSM.
- `scenarios.json`: 32 tình huống mô phỏng có hiệu ứng được giới hạn. Không phải luật, lịch chuyến xe, bệnh án hay giao dịch thật.
- `sources.json`: registry nguồn tham khảo có URL, giấy phép và phạm vi đã dùng. Tài sản Kenney/ambientCG được ghi nhận là nguồn nhập tương lai; renderer hiện tại dùng SVG tự vẽ, chưa bundle các model/texture 3D đó.

Không xóa attribution khi phân phối dataset OSM. Đọc metadata `source`, `license`, `fetchedAt`, `osmBaseTime` để phân biệt snapshot với dữ liệu trực tiếp.
