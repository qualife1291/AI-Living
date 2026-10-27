> Các ảnh `public/renders-3d` là ảnh AI tham chiếu do chủ dự án cung cấp, không phải screenshot WebGL hay bằng chứng test. Xem [review main](MAIN_REVIEW_2026-10-27.md).

# Bộ Đồ Họa 3D Toàn Diện — Xóm AI (`graphics-pack-3d`)

Tài liệu này hướng dẫn AI Coding Agent hoặc lập trình viên gắn toàn bộ hệ thống đồ họa 3D (nhân vật, biểu cảm, chuyển động, công việc, động vật, cây cối, đạo cụ, phương tiện, tòa nhà, nội thất, sự kiện) vào môi trường thực tế của `AI-Living`.

## 1. Cấu trúc File & Manifest Đã Chuẩn Hóa

- **Manifest & Bindings cho AI Agent**:
  - `data/assets/graphics-pack-3d.json`: Danh mục toàn diện tất cả model GLB, 27 clip animation, 12 cử chỉ xã hội, 14 bộ trang phục nghề nghiệp, 24 vai trò công việc, 3 loài động vật, 18 đạo cụ cầm tay, 7 loại đạo cụ đường phố, 23 loại công trình/địa điểm, 3 mẫu nội thất mặt cắt và 12 bảng render 3D chuẩn.
  - `data/assets/kenney-manifest.json` & `public/models/kenney/catalog.json`: Đã cập nhật SHA-256 cho toàn bộ 41 model `.glb`, 12 texture atlas (`Textures/*.png`) đã nâng cấp ánh sáng/bề mặt đất sét mờ (matte clay), và 41 ảnh preview 3D isometric (`Previews/*.png`) có đổ bóng studio.
  - `data/assets/runtime-bindings.json`: Ánh xạ trực tiếp từ semantic key (`character-a`, `car-taxi`, `display-fruit`, `wallet`, `phone`, `crutch`, `cup`, `bread`, `kitten`, v.v.) sang GLB hoặc công thức procedural 3D.

## 2. Cách AI Agent Gắn Nhân Vật, Chuyển Động, Action & Biểu Cảm

### 2.1. Nhân vật GLB có Rig (`AssetAvatar` trong `components/city/three/assets.ts`)
- Hỗ trợ 27 animation clip sẵn có trong GLB:
  - Di chuyển: `idle`, `walk`, `sprint`, `jump`, `fall`, `crouch`, `sit`, `drive`, `wheelchair-sit`
  - Tương tác & Cầm nắm: `pick-up`, `holding-right`, `holding-left`, `holding-both`, `interact-right`, `interact-left`
  - Biểu cảm & Giao tiếp: `emote-yes` (gật đầu), `emote-no` (lắc đầu), `wheelchair-look-left`, `wheelchair-look-right`
- Đổi màu trang phục & da theo thời gian thực:
  ```ts
  const avatar = new AssetAvatar(library.get("characters/character-a")!, 17.5, 4.4);
  avatar.tint({ shirt: "#d99b6c", trousers: "#6f8496", skin: "#efd6a7" });
  avatar.pose("walk", animationTime, presentationTime, [x, 0, z], yaw, groundY);
  avatar.aimHands({ right: [targetX, targetY, targetZ] }); // Hướng bàn tay tới đạo cụ
  ```

### 2.2. Cư dân Instanced 3D & Biểu cảm (`people.ts` & `humans.ts`)
- Dùng 6 batch hình học bo tròn (`box`, `round`, `head`, `hair`, `limb`, `shoe` — mỗi primitive `<= 300` tam giác, chuẩn kích thước `1x1x1` unit bounds).
- Hỗ trợ 14 trang phục nghề nghiệp (`data/characters/themes.json`): `an`, `police`, `delivery`, `elder`, `teacher`, `worker`, `doctor`, `office`, `pilot`, `metro`, `chef`, `firefighter`, `casual`, `sport`.
- Hỗ trợ cử chỉ xã hội tự động qua `humanPose(actor, seconds, index, social, gait)`:
  - `wave` / `greet` / `cheer`: Vẫy tay chào theo nhịp.
  - `point` / `show` / `direct`: Chỉ hướng đường hoặc giới thiệu địa điểm.
  - `open` / `offer` / `explain` / `give`: Mở hai tay giải thích hoặc trao vật phẩm.
  - `bow` / `thank` / `respect`: Hơi cúi đầu cảm ơn lịch sự.
  - `listen`: Người nghe giữ tư thế điềm tĩnh và gật đầu nhẹ mỗi ~4 giây.
  - Biểu cảm mắt & miệng: Tự động chớp mắt (`pose.blink`) mỗi 4.4s và mấp máy miệng (`pose.mouth`) khi `social.speaking === true`.

## 3. Động Vật, Cây Cối, Sự Vật & Đạo Cụ (`fauna.ts`, `model-actors.ts`, `streetscape.ts`)

- **Động vật (`createFauna`)**:
  - `dog` (chó chạy bộ, vẫy đuôi nhanh), `cat` (mèo đi dạo, nằm nghỉ, mèo con `kitten()` trong kịch bản cứu hộ), `bird` (đàn chim sẻ đậu trên mặt đất và bay lên độ cao `altitude = 24` khi di chuyển).
- **18 Đạo cụ cầm tay (`simpleProp(kind)` trong `model-actors.ts`)**:
  - `book` / `read` (sách bìa cứng có gáy và trang giấy), `wallet` (ví da có khóa đồng), `phone` (điện thoại thông minh màn hình sáng), `note` (mảnh giấy ghi chú), `crutch` (nạng gỗ có đệm vai và chân cao su), `leaf` (lá rụng), `cup` / `drink` / `eat` (tách sứ cà phê có quai), `garden` / `can` (bình tưới cây), `broom` (chổi quét phố), `bread` (ổ bánh mì Sài Gòn có khía), `blanket` / `cloth` (khăn ủ ấm), `tool` / `work` (búa/dụng cụ sửa chữa).
- **7 Đạo cụ đường phố (`streetModel(prop)` trong `streetscape.ts`)**:
  - `produce` (quầy trái cây & bánh mì có mái hiên sọc), `books` (kệ sách cộng đồng), `workbench` (bàn thợ mộc/cơ khí), `bicycle` (xe đạp), `flowers` (bồn hoa giấy/cây cảnh), `notice` (bảng tin khu phố), `bin` (thùng rác phân loại).

## 4. Phương Tiện, Tòa Nhà, Nội Thất & Sự Kiện (`runtime.ts`, `interior.ts`, `osm.ts`)

- **Phương tiện**: Xe sedan, hatchback thể thao, taxi vàng (`cars/*.glb`), tàu điện & tram (`trains/*.glb`), thuyền đánh cá, thuyền chèo, nhà thuyền (`watercraft/*.glb`), cùng hệ thống xe buýt/xe tải nhẹ tại các nút giao thông.
- **Tòa nhà & Địa điểm**: 23 loại địa điểm (`home`, `cafe`, `restaurant`, `market`, `hospital`, `clinic`, `school`, `library`, `cinema`, `factory`, `office`, `workshop`, `police`, `fire`, `post`, `culture`, `metro`, `bus`, `airport`, `park`, `square`, `garden`, `sport`) kết hợp GLB (`commercial/*`, `suburban/*`) và kiến trúc mặt tiền có mái hiên, bậc tam cấp, cửa sổ phát sáng ban đêm.
- **Nội thất mặt cắt 3D (`createInterior` trong `interior.ts`)**:
  - Hỗ trợ xoay/zoom 360°, đổ bóng mềm `PCFSoftShadowMap` `2048x2048`, sàn gỗ lát ván, bàn ghế theo công năng (`dining`, `study`, `general`), kệ sách, quầy bếp, chậu cây và thang máy kính chuyển động giữa các tầng.
- **Bản đồ 3D Quận 1 TP.HCM (`createOsm` trong `osm.ts`)**:
  - Dựng khối 3D có vát cạnh (`bevelEnabled: true`) từ dữ liệu footprint thực tế `data/city/hcm-district1.json`.
- **Bộ 15 ảnh AI tham chiếu (`public/renders-3d/*.jpg`)**:
  - Dùng làm tài liệu tham chiếu trực quan, splash screen, hoặc preview card cho từng khu vực, nhân vật, phương tiện và sự kiện lễ hội.
