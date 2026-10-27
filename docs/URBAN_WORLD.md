# Thành phố live, tạo hình và việc học từng nhân vật — 25/10/2026

> Tài liệu lịch sử ngày25/10. Hiện dùng duy nhất renderer3D; xem [THREE_ONLY_AND_PETS](THREE_ONLY_AND_PETS.md). Thư viện SVG, mode2D và ảnh của chúng đã được gỡ.

Bản này tiếp nối [LIVING_REALTIME](LIVING_REALTIME.md). Các kết quả bên dưới là cloud local và source Git; không suy luận đã deploy Site.

## Phase 1 — Nguồn và bối cảnh

Đã đọc trang giấy phép chính thức của OpenStreetMap, Kenney City Kit Commercial/Roads/Car Kit và ambientCG; PettingZoo có giấy phép MIT trên repository chính thức. Registry ở `data/city/sources.json` ghi nguồn nào đã dùng và nguồn nào chỉ là tài nguyên nhập trong tương lai. Một số URL Quaternius đã thử trả 404, Poly Haven/Mesa trả 403; không coi đó là tài sản đã tải/xác minh.

- 2.106 đường/công trình OSM được trích xuất từ một vùng nhỏ trung tâm TP.HCM, giữ attribution ODbL và timestamp cơ sở dữ liệu. Chế độ khảo sát tái dựng footprint/đường bằng SVG; tải dataset bằng chunk riêng khi người dùng mở chế độ này.
- Thành phố sinh hoạt hư cấu có 33 điểm đến nối vào graph đường đi: xóm cũ, trường nghề, bệnh viện, rạp phim, công an, nhà máy, văn phòng, hướng nghiệp, xe buýt, metro, sân bay, nhà hàng, siêu thị, thể thao, xưởng xe, nhà văn hóa, bưu điện, cứu hỏa và khu dân cư.
- Hai không gian không bị đánh đồng: nhân vật chưa được map-match vào mạng đường OSM thật. Nền OSM không phải nguồn kẹt xe hoặc công trình đang mở cửa.
- Thư viện SVG tự vẽ dùng loại công trình, dấu hiệu nghề nghiệp, mái, cửa sổ và ánh sáng để tạo nhiều bối cảnh. Xe máy, xe đạp, ô tô, buýt, metro và máy bay có mẫu hiển thị riêng; không dùng asset 3D thương mại không rõ giấy phép.

## Phase 2 — Không gian gần toàn màn hình

Trang `/` mở thẳng vào live canvas, mặc định theo An. Diện tích SVG bằng viewport trên desktop và mobile; không còn sidebar hoặc dashboard che mặc định.

- HUD nhỏ: giờ/thời tiết/pause, nhân vật đang theo, thanh tác vụ và camera.
- Kéo để pan, cuộn/nút để zoom; theo nhân vật, toàn cảnh vừa toàn thành phố theo tỷ lệ màn hình. Phím H hoặc nút Ẩn giấu HUD; có nút hiện lại.
- Bảng modal chứa cư dân, địa điểm, học hỏi, bối cảnh và nguồn; Escape đóng, focus trở lại control mở bảng.
- Chọn địa điểm di chuyển camera. Cư dân ngoài ngân sách 60 sprite vẫn giữ state; khi chọn họ sẽ được ưu tiên hiển thị mà không đổi phase chỉ vì đổi thứ tự culling.
- Hoạt động dưới tên nhân vật được lấy từ projection hiện tại, không từ mô tả snapshot cũ.
- Dashboard cũ được giữ ở `/dashboard` để truy cập các công cụ chi tiết; giao diện quan sát chính vẫn là canvas.

## Phase 3 — Trang phục và nhân vật khối

Tham khảo hướng tạo hình đồ chơi lắp ghép trên trang [LEGO City](https://www.lego.com/en-us/themes/city), [Minifigures](https://www.lego.com/en-us/themes/minifigures) và [video LEGO Kids](https://www.lego.com/en-us/kids/videos), đều truy cập được trong phiên. Nhân vật/SVG là hình tự vẽ của dự án; không sao chép logo, model hay video từ các trang đó.

14 bộ cơ bản: An khám phá, cảnh sát mô phỏng, tài xế công nghệ áo xanh, người chú, giáo viên, công nhân, bác sĩ, văn phòng/quần tây, phi công, metro, đầu bếp, cứu hỏa, thường ngày và thể thao. Màu áo/quần/tông da, tóc, kính/râu có thể chỉnh riêng. Áo xanh là theme tài xế công nghệ, không gắn logo hoặc tự nhận thuộc Grab.

Tạo hình mặc định suy từ nghề và ID ổn định. Custom appearance nằm trong snapshot, không thay danh tính, ký ức hoặc policy. API `/api/living/appearance` kiểm tra schema, actor ID, Origin và revision. Nhân vật đã lưu tạo hình vẫn giữ lựa chọn qua lượt sinh hoạt sau.

## Phase 4 — Học hành vi thực sự có cập nhật tham số

Mỗi cư dân có một contextual bandit riêng: giá trị hành động được fit từ phản hồi sau hoạt động hoàn tất, cùng cơ chế khám phá và ưu tiên theo năng lượng/đói/sức khỏe/nghề. Đây là mô hình hành vi nhỏ; **chưa fine-tune trọng số Qwen**.

- Tất cả cư dân được khởi tạo policy; An/Bình/Chi và một nhóm xoay vòng tối đa 12 NPC được lập kế hoạch mỗi lượt. Không cần một instance LLM cho từng sprite.
- Phản hồi chỉ được học khi đã đủ thời gian mô phỏng và kế hoạch vẫn khớp. Hủy/thay thế sớm không được cấp trải nghiệm; retry không học hai lần.
- Hiệu ứng được giới hạn: học nghề/kỹ năng, nghỉ/ăn, đổi trạng thái việc làm, va vấp nhẹ/phục hồi, nhắc nhở quy tắc mô phỏng và giao tiếp. Tình huống hẹn gặp là lời mời giữa nhân vật trưởng thành, không tự giả định mối quan hệ đã được chấp nhận.
- Mướp/Cún/Sẻ có policy nhỏ theo loài riêng; phản hồi điều chỉnh lựa chọn nghỉ/kiếm ăn/chơi/trú mưa. Không nhân cách hóa bằng thoại người hoặc tuyên bố có model sinh học chuyên biệt.
- Daemon kiểm tra các trải nghiệm hoàn tất mỗi phút qua `POST /api/living/learning`, tách khỏi slot sinh chuyện 15 phút. Có thể học sau ba phút hoạt động mà không chờ đến câu chuyện tiếp theo.
- Trong runtime local đã thấy 45 policy cư dân, 15 phản hồi người và ba phản hồi động vật được lưu. Đây là quan sát tại một thời điểm, không phải khẳng định mọi policy đã có cùng lượng học.

Mô hình phản hồi hiện tại do quy tắc tiện ích của mô phỏng tạo ra. Nó không thay thế đánh giá con người, hiểu biết y khoa/luật hay bằng chứng model ngôn ngữ đã thông minh hơn. Mục tiêu lớn hơn là dùng trải nghiệm đã kiểm chứng để đánh giá, chọn dữ liệu, rồi mới huấn luyện adapter/model nếu có tài nguyên phù hợp; không tự dùng toàn bộ output của LLM làm đáp án đúng.

## Di chuyển nhiều phương thức

Kế hoạch có thể đi bộ, xe đạp, xe máy, xe buýt hoặc metro trong mạng mô phỏng. Có đường tiếp cận điểm đón, đoạn di chuyển trên phương tiện và đường đi bộ cuối; tốc độ/hiển thị đổi theo pha, giữ liên tục khi bắt đầu/thay kế hoạch. Máy bay hiện là đối tượng bối cảnh và hoạt động tìm hiểu sân bay; chưa có hành trình bay thật hoặc dữ liệu chuyến bay trực tiếp.

Không coi mạng này là định tuyến ngoài đời, lịch metro/buýt thật hoặc chỉ dẫn giao thông. Các tình huống bệnh/vi phạm luật là dữ liệu mô phỏng với hiệu ứng giới hạn, không phải tư vấn hay mức phạt thực tế.

## Dataset và tính toàn vẹn

Migration append-only `0003_agent_experiences.sql` thêm nhật ký trải nghiệm đã hoàn tất. Snapshot policy và bản ghi dataset được cập nhật trong một D1 batch có guard revision/nonce; ID trải nghiệm là duy nhất. Snapshot giữ 200 mẫu gần đây để đọc nhanh, bảng archive giữ thêm các mẫu đã ghi, không chỉ là vòng đệm đó. Các trải nghiệm cũ còn trong snapshot được backfill idempotent khi setup.

- `GET /api/living/learning`: policy/mẫu gần đây và phạm vi học.
- `GET /api/living/learning?format=jsonl&after=0&limit=1000`: phân trang archive bằng sequence, header `X-Next-Cursor`.
- `npm run training:export`: đọc hết các trang từ instance local, ghi `.sites-runtime/training`, giữ nhãn `source=simulation`. Export không tự phê duyệt dữ liệu cho SFT/DPO.
- Hiện archive JSONL chứa trải nghiệm cư dân; policy và số phản hồi động vật được lưu riêng trong snapshot, chưa xuất thành dataset huấn luyện ngôn ngữ.

Đã backup SQLite local nhất quán, kiểm tra integrity rồi mới áp dụng migration. `python3 scripts/backup-local.py` là helper backup bằng SQLite online backup API, bao gồm WAL. Wrangler 4.92 `d1 export` không hỗ trợ `--persist-to`; không dùng lệnh không được hỗ trợ từ runbook cũ để suy luận đã có backup.

## Kiểm chứng và giới hạn

- 11 bộ test thuần: các bộ trước cộng thêm learning/city/appearance. Kiểm tra lựa chọn thay đổi khi fit phản hồi, cách ly model, không thưởng sớm/trùng/hủy, chuyển việc/khôi phục, phủ cohort toàn dân số, cả người/động vật học qua tám slot, ranh giới camera, đường metro liên tục, 33 địa điểm/32 tình huống và input trang phục.
- TypeScript, ESLint và build được chạy cho đợt thay đổi. Một cảnh báo Vinext về phân loại tĩnh route vẫn còn; dev từng có cảnh báo context renderer khi HMR, không thay bằng tuyên bố không có mọi cảnh báo framework.
- Chromium desktop 1440×960 và mobile 390×844 xác minh viewport, panel mặc định đóng, camera, chọn địa điểm, hide/show, Escape/focus, lazy OSM, attribution và không tràn ngang/pageerror. Ảnh `city-*-preview.png`, `osm-*-preview.png` là local preview.
- Chưa đo trên điện thoại vật lý, chưa có benchmark hàng nghìn cư dân, chưa có render 3D hoặc fine-tune Qwen.
- Site production, audience công khai, studio xuất clip và tài khoản đa người dùng chưa được bật. Định hướng được chốt tại [ADR-0009](DECISIONS/ADR-0009-shared-world-three-product-directions.md).

## Khởi động

Quy trình `npm run living:up` giữ nguyên. Sau cập nhật source, build rồi chạy `node scripts/setup-local.mjs` để thêm migration 0003/backfill, không reset dữ liệu. Dataset OSM đã nằm trong Git; không cần gọi Overpass khi khởi động. Chỉ dùng `npm run map:import` khi chủ động cập nhật snapshot nguồn.

### Bằng chứng bổ sung cuối đợt

- API trên D1 fixture tách riêng: tám yêu cầu học đồng thời chỉ ghi một bộ kết quả; retry trả updated=0; policy và archive khớp, phân trang JSONL đủ mẫu/không trùng. Các API living/world cũ và origin/revision guards vẫn đạt.
- Wardrobe API xác minh lưu/đọc lại, revision cũ/actor lạ/màu sai bị từ chối; sửa trang phục không làm thay đổi model hoặc lịch sử trải nghiệm.
- Browser thật đổi An sang cảnh sát/quần tây màu tùy chọn, lưu và reload vẫn giữ; sau test khôi phục tạo hình ban đầu. (ảnh 2D cũ đã gỡ; xem THREE_ONLY_AND_PETS.md) là local preview.
- `/api/health.weather` là dữ liệu đồng hồ mô phỏng chẩn đoán, có `weatherSource` nói rõ; bối cảnh TP.HCM quan sát thật lấy từ `/api/world.realContext`.
