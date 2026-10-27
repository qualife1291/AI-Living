# An và khu phố mở rộng — 25/10/2026

## Những gì đã triển khai trong checkout cloud

An là cư dân chính. Bình, Chi và lịch sử cũ được giữ nguyên. Thêm 24 cư dân phụ ban đầu, tăng ba người mỗi ngày theo ngày TP.HCM, tối đa 240 người. Danh tính, ngày đến, vai trò, mức quen thuộc và ký ức được giữ trong snapshot D1. Bản đồ vẽ tối đa 60 cư dân phụ cùng lúc, luôn ưu tiên người đang có cuộc hẹn với An.

Bộ chọn hoạt động cân nhắc giờ thật Việt Nam, cuối tuần/ngày lễ có dữ liệu, mưa khi dữ liệu còn mới, nhu cầu của An và những cơ hội gặp người mới. Có đi làm, đi học, nghỉ ngơi, khám sức khỏe **hư cấu**, đi chợ/ăn uống và đi chơi. Đây là mô phỏng nhân vật, không phải tư vấn sức khỏe hay giao dịch thật.

Nghề/vai trò mới được thêm bằng giao diện hoặc `POST /api/living/catalog`, không cần viết thêm mã cho từng cư dân. AI local có thể đề xuất một vai trò mới mỗi ngày, qua schema có giới hạn. Nội dung mới dùng các loại hành động và 15 điểm đến hiện có; cơ chế vật lý mới, địa hình mới hoặc một loại hoạt động hoàn toàn mới vẫn cần phát triển engine.

## Hai đồng hồ khác nhau

- `RealContext`: luôn lấy ngày/giờ hiện tại `Asia/Ho_Chi_Minh`; không dùng thời gian tua nhanh để giả lập ngày thật. Nguồn thời tiết được kiểm tra mốc cập nhật. Lịch sự kiện dùng khoảng ngày thực của nguồn, không suy diễn trạng thái đang mở cửa từ ngày trong lịch.
- Đồng hồ mô phỏng: điều khiển đường đi và thời lượng kế hoạch; pause/resume và đổi tốc độ vẫn giữ liên tục. Nhu cầu nội tại là mô phỏng theo thời gian đã trôi qua, với catch-up tối đa sáu giờ để tránh trừng phạt khi vắng mặt.
- Cuối tuần không đồng nghĩa tất cả cơ quan nghỉ; lịch riêng của trường/lớp/cơ sở chưa được kết nối.

## Nguồn dữ liệu thật và giới hạn

| Thành phần | Nguồn và phạm vi | Trạng thái đã xác minh |
| --- | --- | --- |
| Giờ/ngày | Đồng hồ server, UTC+7 | Chuyển ngày đúng lúc 17:00 UTC |
| Thời tiết | [Open-Meteo](https://open-meteo.com/), tọa độ 10.7769,106.7009, dữ liệu mô hình cập nhật | Đọc qua ứng dụng: 26,5°C, độ ẩm 89%, 0 mm mưa, mốc 00:00 ngày 25/10/2026 |
| Ngày lễ | [Nager.Date](https://date.nager.at/) API VN theo năm | Nguồn hiện trả 4 ngày lễ dương lịch; thiếu Tết âm lịch/nghỉ bù, không diễn giải danh sách rỗng thành khẳng định không có ngày nghỉ |
| Kẹt xe | Chưa có feed có thể xác minh | Hai trang giao thông TP.HCM đã thử trả HTTP 503 trong phiên này; xe trên bản đồ vẫn là mô phỏng |
| Lễ hội/sự kiện | [VisitHCMC](https://visithcmc.vn/festivals-events/), lịch công khai của Trung tâm Xúc tiến Du lịch TP.HCM | Đã xác minh adapter với tháng 5/2026 (3 mục có khoảng ngày) và tháng 10/2026 (danh sách rỗng). Không suy diễn lịch rỗng thành toàn thành phố không có sự kiện |
| Năng lượng/đói/kết nối | Mô hình nhu cầu của An | Không phải dữ liệu đo ngoài đời |

Cache thời tiết 15 phút, lịch ngày lễ một ngày và lịch VisitHCMC sáu giờ. Adapter VisitHCMC chỉ đọc lịch công khai bằng cùng action AJAX mà trang dùng, không lưu nonce công khai hoặc chạy JavaScript từ trang. Chỉ chấp nhận URL HTTPS của VisitHCMC và khoảng ngày được kiểm chứng; mục không rõ ngày bị loại, thay đổi cấu trúc trang trở thành lỗi nguồn thay vì lịch rỗng. Không dùng ngày đăng bài làm ngày diễn ra sự kiện. An có thể tìm hiểu một sự kiện đang nằm trong khoảng ngày của nguồn; đó vẫn là tình huống hư cấu trong bản đồ, không khẳng định An hiện diện tại địa điểm thật. Đầu vào được kiểm tra schema, có timeout. Khi nguồn lỗi, dữ liệu cũ có giới hạn tuổi và ghi `stale`; dữ liệu quá cũ ghi `unavailable`. Chỉ thời tiết `fresh`, mốc không quá 90 phút, được áp dụng như dữ liệu thành phố hiện tại. Độ phân giải là vùng trung tâm thành phố, không phải mọi con đường.

Open-Meteo free API dành cho phạm vi sử dụng phi thương mại và có hạn mức; giữ attribution trong UI. Nếu mục đích sử dụng thay đổi cần kiểm tra điều khoản hiện hành, không mặc định miễn phí vô hạn.

## AI không dùng API tính phí

- Một instance [llama.cpp](https://github.com/ggml-org/llama.cpp) MIT, bản `b11856`, dùng chung cho mọi nhân vật.
- [Qwen2.5-1.5B-Instruct GGUF](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF), Apache-2.0, lượng tử Q4_K_M, chạy CPU ba luồng. Model và binary nằm trong `.sites-runtime/ai`, không commit trọng số vào Git.
- `data/living/ai-artifacts.json` pin URL/commit và SHA-256. Script cài đặt giữ TLS, kiểm tra hash, không ghi đè executable đang chạy; đã chạy lặp hai lần.
- Đã thử sinh cảnh tiếng Việt hợp schema: khoảng 16 giây, 180 token. Đã thử toàn luồng daemon + model tạo hội thoại và vai trò mới bằng fixture, không ghi dữ liệu fixture vào DB. Sau đó daemon tự ghi lượt local-llm thực trong DB local (`living-2026-10-25-30`), có lastExpansionOn và vai trò/cư dân mới; đây vẫn là dữ liệu mô phỏng, không phải production. Đây là mô hình nhỏ: hội thoại có thể còn khuôn mẫu hoặc lệch sắc thái.
- Prompt chỉ đưa ký ức gần nhất của An và người đang gặp, cùng bối cảnh có nguồn. JSON output được giới hạn speaker, độ dài và kiểm tra dấu tiếng Việt. Đây là heuristic ngôn ngữ, không phải thước đo toàn diện chất lượng.
- Mô hình chỉ đề xuất nội dung và vai trò; quy tắc kiểm soát di chuyển, chỉ số, tiền, dữ kiện và lưu trữ. Output lỗi, quá hạn hoặc model tắt sẽ dùng planner bằng luật.
- Không mua dịch vụ, không gọi API LLM trả phí. CPU/RAM vẫn tiêu thụ tài nguyên của môi trường hiện có. Không cài hàng loạt provider miễn phí có hạn mức hoặc điều kiện tài khoản chưa rõ.
- Tiến triển là ký ức, mức quen thuộc và kỹ năng từ hoạt động mô phỏng đã hoàn tất. Không có quá trình fine-tune/tự huấn luyện trọng số model.

## Tính liên tục và lưu trữ

`worlds.data.living` giữ cư dân/danh mục/nhu cầu/kỹ năng; `worlds.data.livingTurn` giữ cảnh gần nhất. Migration append-only `0002` thêm `context_cache` và `living_turns`; bảng cũ không bị reset. Cảnh, snapshot và tick audit được ghi cùng một D1 batch có revision guard. ID ổn định mỗi khung 15 phút giúp retry không tăng chỉ số/ghi lịch sử trùng.

An và người gặp cùng có kế hoạch tới điểm hẹn từ vị trí đang đi; chỉ hiện bóng thoại khi cả hai đã dừng, cùng địa điểm và đủ gần, bắt đầu ở giây mô phỏng 120. Kế hoạch mới chưa hoàn tất không được cấp thu nhập hay ghi ký ức hoàn thành. Khi đủ thời lượng và kế hoạch vẫn khớp, lượt sau cập nhật trải nghiệm/kỹ năng có giới hạn. NPC chỉ có ký ức cuộc gặp nếu đã có kế hoạch tham gia tương ứng.

API mới (vẫn dựa vào lớp owner-private của hosting phía trước, không được public trực tiếp):

- `GET /api/living`: cư dân, nhu cầu, bối cảnh có nguồn và 24 lượt gần nhất.
- `POST /api/living/tick`: một lượt, hỗ trợ proposal có kiểm tra schema.
- `GET/POST /api/living/catalog`: đọc/cập nhật danh mục có revision; không được xóa vai trò đang có cư dân.

## Khởi động cloud local

Node 24.19.0 và Python 3.12 đã kiểm tra; máy phiên này có quota CPU bốn lõi và 32 GiB RAM. Không cần GPU.

```bash
cd /workspace/AI-Living
corepack pnpm install --frozen-lockfile
npm run build
node scripts/setup-local.mjs
python3 scripts/setup-local-ai.py
npm run living:up
```

`living:up` khởi động relay 8091, model 8090, ứng dụng 5173 và daemon, tất cả chỉ trên loopback. Script giữ tiến trình sống, có kiểm tra readiness, xử lý signal cho các child do nó tạo; không tự kill dịch vụ khác. Chạy một supervisor/daemon cho mỗi checkout để tránh lãng phí CPU.

Trong cloud sandbox, Miniflare không tự sử dụng proxy HTTPS của phiên. `context-relay.mjs` chỉ cho phép các đường dữ liệu thời tiết, ngày lễ và lịch VisitHCMC cố định, dùng Node `--use-env-proxy` và trust mặc định; không mở proxy tùy ý. `setup-local.mjs` chỉ thêm binding relay không bí mật vào `.dev.vars` nếu chưa có, giữ nguyên cấu hình người dùng. Khi deploy Workers thật, bỏ binding relay local để native fetch dùng Internet của Workers.

Daemon kiểm tra mỗi phút và chỉ sinh tối đa một lượt mỗi 15 phút, dừng khi thế giới pause. Khi process/máy cloud dừng thì daemon cũng dừng; Publish không tạo một scheduler 24/7 trên production. Chưa tạo Cloudflare Cron hay tác vụ ChatGPT trùng với lịch cũ.

## Kiểm chứng

- Tám bộ test thuần: mạng đường đi, schema, chuyển động, dữ liệu AI, continuity, lịch ngày và living engine. Bộ mới kiểm tra đổi ngày Việt Nam, cache/mất nguồn/stale, tăng dân số ổn định, giới hạn, vai trò mới được chọn, đồng vị trí trước thoại, NPC không nhảy vị trí, ưu tiên nghỉ/ăn và không thưởng trước khi hoàn thành.
- TypeScript, ESLint, build đạt trong đợt triển khai; xem commit tương ứng để tái chạy.
- D1 tách riêng tại `/tmp/xom-living-d1-qa`: tám request đồng thời thành công, chỉ một lượt mới; schema/origin/revision/catalog/readback và API cũ đạt. Một lượt test ban đầu gặp HTTP 503 ở local runtime sau nhóm request chưa consume body; helper đã consume response body và lượt kiểm tra đầy đủ sau đó đạt. Không xem đó là bằng chứng production ổn định.
- Chromium desktop 1440×1000 và mobile 390×844: 24 NPC ban đầu, lượt kiểm tra cuối có 26 NPC sau khi vai trò mới xuất hiện, context thật, roster, pause/resume; không pageerror hay tràn ngang. [Ảnh bối cảnh desktop](screenshots/living-desktop-preview.png), [mobile](screenshots/living-mobile-preview.png), (ảnh 2D cũ đã gỡ; xem THREE_ONLY_AND_PETS.md), (ảnh 2D cũ đã gỡ; xem THREE_ONLY_AND_PETS.md). Tất cả là local preview.
- Đã dừng các dịch vụ do tác vụ này tạo và khởi động lại cả nhóm bằng `living:up`; relay, model, web, daemon đều trở lại trạng thái hoạt động.

## Chưa hoàn tất yêu cầu tổng thể

1. Kẹt xe thời gian thực vẫn thiếu nguồn đáng tin cậy/có quyền truy cập; lịch VisitHCMC chỉ là những sự kiện nguồn có công bố, không bảo đảm đủ mọi hoạt động của thành phố; không tự thay bằng dữ liệu giả hoặc tin đăng lại.
2. Lịch âm, lịch nghỉ bù và giờ mở cửa từng cơ sở chưa đầy đủ.
3. Chưa triển khai bản này lên Site hiện hữu vì phiên không có công cụ Sites/credential deploy. Không suy luận đã deploy web từ việc Publish môi trường cloud.
4. Chưa tạo lịch production chạy liên tục. Cần kết nối đúng project, xác minh lịch ChatGPT cũ, backup D1 và áp dụng migration 0002 trước deploy; giữ owner-private.
5. Sinh thái động vật/cây trồng, giao thông có nguồn và nhiều cơ chế sống phức tạp vẫn là các phase sau. Không gọi toàn bộ thành phố là tự vận hành từ dữ liệu thật.
