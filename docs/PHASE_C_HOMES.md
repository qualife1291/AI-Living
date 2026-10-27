# Phase C — cửa nhà riêng cho các nhóm ở

Bản source đã kiểm thử local, chưa deploy. Household vẫn là nhóm ở, không phải quan hệ huyết thống. Không tăng dân số live hoặc tạo thêm người.

60 cửa được sinh offline từ các nhà thấp tầng đã có trong cityBuildings, kiểm tra cùng footprint của nhà/cây/đạo cụ. File data/city/home-anchors.json lưu building coordinates, ID cửa và điểm XZ; API chỉ đọc JSON nhỏ, không phải khởi tạo Three.js hay A* mỗi khi gán nhà. Prebuild cập nhật file; --check phát hiện dữ liệu cũ khi geometry thay đổi.

HomeAssignment thêm anchorId/address. Backfill chỉ thêm trường còn thiếu, tôn trọng nhà/địa chỉ đã lưu, ID/người/thành viên/ký ức/kế hoạch. Mỗi nhóm mới tối đa4 người có cùng cửa; nhóm cũ quá4 người không bị giải tán. Không tự chuyển một anchor custom/retired chưa nhận diện; nhóm vượt ngân sách60cửa hoặc ở nơi khác vẫn dùng fallback cũ. Không sửa migration hoặc reset snapshot.

Khi NPC đi về Khu dân cư để nghỉ, crowdAt đính kèm điểm cửa; WalkDirector nhận nó làm đích thay vì district center/social slot. Đường đi và vị trí tiếp tục từ ground hiện tại, cùng static/dynamic sweep, nhường người/xe, full-bike9,2unit. Bốn thành viên vẫn đứng tách nhau quanh cửa nhờ reservation, không chồng vào cùng điểm. Projection theo địa điểm vẫn là Khu dân cư; chưa có indoor routing/phòng bên trong hoặc occupancy authoritative đa viewer.

Cửa có vòng sơn mỏng trên mặt đất (một InstancedMesh), không phải vật cản rắn mới. Hồ sơ có địa chỉ và nút Xem nhà mở camera ở đúng cửa. Mã ID/đường đi kỹ thuật không đưa vào giao diện sản phẩm.

## Kiểm chứng đang có

- Test thuần dựng240cư dân/60nhóm,60cửa khác nhau; legacy additive/idempotent/reorder giữ ổn định mọi nhà và history.
- 1.980 tuyến từ33địa điểm đến60cửa và60tuyến full-bike từ khu nhà đạt clearance; không chọn cửa chỉ đi bộ được nhưng xe đạp không tiếp cận được.
- Ground2400frame đi2932,64unit, đến đúng cửa, bước<=2,4unit/150ms, không xuyên static geometry, pause và rời nhà không teleport. Không ghi world.
- Full 43/43 suite, check/lint/build và compiled Worker/D1 API đạt. API xác nhận home anchor/address backfill giữ lịch sử. Browser desktop/mobile đạt 60 cửa, 6 đích nhà riêng cho 24 cư dân, hồ sơ 4 thành viên, địa chỉ, Xem nhà, không overflow/lỗi JavaScript.
- Góc camera chọn hướng ra ngoài căn nhà với segment clearance; fallback từ trên cao nếu không có hướng ngang an toàn. Ảnh thật ở docs/screenshots/homes là preview fixture local. Hồi quy social 6 lượt/poll/F5, pet/wardrobe/OSM/context retry và cycle full-body/pause/dismount đều đạt desktop/mobile.

Còn phase C: tăng density có budget/LOD, đồ thị giao thông nhiều tuyến, bus/tram geometry/boarding và nội thất. Chỉ tăng mật độ sau nghiệm thu hiệu năng, không suy từ synthetic240 rằng ứng dụng live đã chạy240 người.
