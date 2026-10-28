# Dữ liệu thành phố

- `hcm-district1.json`: snapshot OpenStreetMap bbox `[10.770,106.692,10.782,106.707]`, tọa độ phẳng phục vụ dựng3D. © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), [ODbL1.0](https://opendatacommons.org/licenses/odbl/1-0/); không áp license dataset lên toàn app.
- `venues.json`:33 địa điểm hư cấu, tách khỏi công trình thật/actor map-matching. `scenarios.json`:41 scenario mô phỏng, không phải giao dịch/lịch xe/bệnh án thật.
- `home-anchors.json`, `garden-plots.json`: generated offline từ footprint hiện có, prebuild cập nhật; không tự dời actor hoặc tạo receipt đến nơi.
- `sources.json`: registry tham khảo. Manifest asset và [ASSETS](../../docs/ASSETS.md) mới là căn cứ file đã nhập/license/hash; không dùng mô tả cũ trong registry để suy runtime.

`python3 scripts/import-osm.py` chỉ chạy khi chủ đích cập nhật snapshot, không fetch mỗi frame. Giữ attribution/source/license/fetchedAt/osmBaseTime; đừng gọi snapshot là dữ liệu trực tiếp.
