# Xóm AI — Bộ nhớ dài hạn (`MEMORY_LONG.md`)

## Sản phẩm và yêu cầu đã chốt
- Chủ dự án: Hoang Long. Ngôn ngữ: tiếng Việt; múi giờ `Asia/Ho_Chi_Minh`.
- Ba robot AI **An, Bình, Chi** sống trong khu phố Việt Nam; tính cách, mục tiêu, ký ức gắn người chứng kiến và quan hệ riêng.
- Phong cách 2D nhìn chéo từ trên xuống, dịu mắt, không pixel art.
- Website riêng chỉ chủ sở hữu truy cập (`owner-private`). Không tự ý thay đổi audience khi sửa nguồn.
- Không phát sinh phí hạ tầng, AI; không đăng ký dịch vụ trả phí. Giới hạn tài khoản vẫn áp dụng.
- Xuất video đã tạm hoãn theo yêu cầu. Không tự đăng mạng xã hội.
- Tuổi đời xóm tăng theo ngày thật. Kỹ năng/quan hệ/kinh nghiệm thay đổi theo sự kiện đã lưu.

## Nguồn và triển khai
- Checkout chuẩn trên Sites: `/workspace/sites/xom-ai`
- Site `project_id`: `appgprj_6adc7dc364d48191a09202c5b43309e4`
- Slug: `xom-ai-long`
- Bản live đã biết: `https://xom-ai-long.bouncyslug18.chatgpt.site` (`owner-private`).
- Tác vụ ChatGPT độc lập: `Xóm AI sinh hoạt`, ID nội bộ: `6adcbdcc81cc819188a4a2ae65392369` (`enabled=true`, `Asia/Ho_Chi_Minh`, `08:00, 14:00, 20:00`). Kiểm tra qua `automations.peek`, không tạo trùng.

## Kiến trúc & Mô-đun cốt lõi (Sau đợt cập nhật 24/10/2026)
- `lib/clock.ts`: Đồng hồ thế giới phân đoạn (`WorldTime`, `DayPhase`, `Season`), PRNG có hạt giống `mulberry32` và hàm thời tiết tất định `weatherAt()`.
- `lib/life.ts`: Mạng lưới đường đi bộ 26 nút, Dijkstra có bộ nhớ đệm, nội suy tọa độ, lịch sinh hoạt (`routines`), ưu tiên kế hoạch AI (`plan`), và hàm `resolveTransitionOrigin()` (sửa lỗi L1 chống nhảy vị trí).
- `lib/apply-event.ts`: Hàm thuần áp dụng sự kiện dùng chung cho cả API `POST /api/events` và Server Tick, lưu đầy đủ `relationship` và `contextId` vào `episodes` (sửa lỗi L2).
- `lib/training.ts` + `data/contexts/` + `data/training/`:
  - 24 bối cảnh đa chiều (`data/contexts/neighborhood-contexts.json`).
  - 16 hoạt cảnh trong ngày (`data/scenes.json`).
  - 6 mẫu SFT Golden Episodes (`data/training/sft-golden-episodes.json`).
  - 6 cặp đối chiếu ưu tiên DPO (`data/training/dpo-preference-pairs.json`).
  - Giáo trình tự luyện 8 cấp độ (`data/training/self-play-curriculum.json`).
  - Hàm chấm điểm phản tư tự động `evaluateCandidateEvent()` trên thang 100 điểm.
- `components/world/CityMap.tsx`: Tách `StaticScene` (`React.memo`) khỏi lớp thực thể động (sửa lỗi L6), thêm lớp phủ ánh sáng ngày/đêm và mưa rào, dùng `<svg role="group">` (sửa lỗi L9).
- `db/schema.ts` & `drizzle/`: Giữ nguyên `0000_deep_firebird.sql`, bổ sung `0001_living_world_and_training.sql` (`memories`, `tick_runs`, `commitments`, `nudges`).
- `app/api/health/route.ts`: Endpoint kiểm tra trạng thái vận hành, đồng hồ thế giới và lượt tick gần nhất.

## Chuẩn kiểm thử bắt buộc
1. Bốn bộ unit test thuần (`test-life.mjs`, `test-events.mjs`, `test-animation.mjs`, `test-training.mjs`) đạt 100%.
2. `tsc --noEmit`, `eslint` và `vinext build` sạch lỗi.
3. Migration chỉ thêm mới (`0001`), không sửa migration đã áp dụng (`0000`).
4. Không có số tiền âm, chỉ số trong giới hạn `0–100`, retry trùng `id` an toàn kể cả khi gọi đồng thời (L3).
5. Không có credentials, `.env`, runtime DB hay token trong Git/ZIP (`scripts/package-handoff.py` tự động quét và kiểm tra `.gitignore`/`.npmrc`).

## Codex Cloud — kết quả đã kiểm chứng
- Checkout mới: `/workspace/AI-Living`, GitHub `qualife1291/AI-Living`, nhánh `main`; source ZIP gốc commit `702a7ba`.
- Node 24.19.0/pnpm 11.25.0. Six test suites, TypeScript, lint, build và API local đạt; Chromium desktop/mobile 390 px đạt, ảnh thật ở `docs/screenshots/cloud-*-preview.png`.
- Đồng hồ đổi tốc độ/pause/resume giữ liên tục; kế hoạch mới lưu `originPath` và `simStartedAt`, sự kiện mới đồng bộ thời gian thoại theo simulation clock. Không sửa SQL migration cũ.
- Lịch cư dân 24 giờ Việt Nam ở `lib/daily-routines.ts`; AI plan ưu tiên và nối về lịch nền không nhảy vị trí. Động vật chưa được nối lịch ngày đêm.
- `scripts/setup-local.mjs` khởi tạo D1 local lặp lại an toàn; startup dùng XDG trong `.sites-runtime`, không cần thay HOME.
- Nguồn sự thật của đợt này: `docs/CLOUD_REVIEW.md`. Không có bằng chứng mới về production, scheduler hay model training.

## An và thế giới mở rộng — 25/10/2026
- Đã xác minh môi trường được Publish (runtime source spec revision 4). Phát triển tiếp trong cùng checkout, không tạo worktree.
- Nguồn hiện hành: `docs/LIVING_REALTIME.md`. 24 NPC ban đầu, +3/ngày TP.HCM, tối đa 240; tối đa 60 hiển thị và ưu tiên người đang gặp An. Vai trò thêm qua dữ liệu/UI hoặc đề xuất local LLM tối đa một lần/ngày.
- Lớp RealContext tách giờ thực Việt Nam khỏi simulation clock. Open-Meteo và Nager.Date đã đọc thành công qua relay đi đúng session proxy; có cache, timestamp, stale/unavailable. Chưa có traffic/festival feed; lịch âm/nghỉ bù chưa đầy đủ.
- llama.cpp b11856 + Qwen2.5-1.5B-Instruct Q4_K_M CPU đã chạy và xác minh SHA-256. Fixture đầu-cuối sinh hội thoại tiếng Việt và vai trò mới đạt; model nhỏ, chất lượng có thể khuôn mẫu. Không fine-tune hoặc paid AI API.
- `npm run living:up` khởi động web, bounded context relay, model và daemon local. Daemon 15 phút/lượt có ID idempotent, không phải scheduler production.
- Migration append-only 0002 thêm context_cache/living_turns. Scene/snapshot/tick audit ghi nguyên tử; tiến triển chỉ cập nhật sau hoạt động đã hoàn tất trong mô phỏng. Không thay đổi SQL migration cũ hay dữ liệu production.
- Bảy bộ test thuần và kiểm thử API cũ/mới, Chromium desktop/mobile đạt trong đợt này; ảnh `docs/screenshots/living-*-preview.png` là local preview. Giữ các giới hạn trong báo cáo, không suy luận production hoạt động.

- Bổ sung nguồn VisitHCMC công khai: cache sáu giờ, kiểm tra khoảng ngày/URL, loại ngày không xác định. Đã xác minh tháng 5/2026 có 3 mục và tháng 10/2026 trả rỗng. Tổng tám bộ test thuần; không dùng lịch rỗng để khẳng định thành phố không có sự kiện.

- Daemon thực trong cloud local đã ghi lượt `living-2026-10-25-30` với generator=local-llm và mở vai trò mới ngày 25/10. Browser QA cuối có 26 NPC phụ, không dùng số cố định 24 để phủ nhận tăng dân số.

## Thành phố khối và ba hướng — 25/10/2026
- Giao diện / là live canvas toàn viewport; mặc định theo An, HUD nhỏ và panel modal ẩn. /dashboard giữ công cụ cũ. Có pan/zoom/follow, camera fit viewport và lazy OSM.
- 33 địa điểm/32 tình huống theo dữ liệu; graph mở rộng, hiển thị xe máy/buýt/metro/máy bay và cơ chế tiếp cận/đi phương tiện/đi bộ cuối trong mạng mô phỏng.
- OSM trung tâm HCMC: 2.106 feature, dataset ODbL + attribution/source/timestamp; không dùng bản đồ đó để giả báo cáo giao thông hay gán sai vị trí cư dân.
- 14 theme tạo hình khối do dự án tự vẽ; lấy cảm hứng đồ chơi lắp ghép, không nhập logo/model/video LEGO. Appearance từng actor có schema/Origin/revision và giữ qua tick.
- Từng cư dân có contextual bandit, ba động vật có policy nhỏ; phản hồi fit sau khi kế hoạch hoàn tất. Có cảnh theo dõi nghề/nghỉ/học/chấn thương nhẹ/việc làm. Đây là học policy, không phải fine-tune Qwen.
- Migration append-only 0003_agent_experiences lưu audit dataset cùng policy update theo CAS/nonce. Snapshot giữ 200 mẫu đọc nhanh; archive phân trang JSONL và CLI export toàn bộ. Backup SQLite online đã kiểm tra trước migration.
- Nguồn mới nhất docs/URBAN_WORLD.md. Kiểm thử: 11 suite thuần, TypeScript/lint/build, API học đồng thời/không trùng/archive/phân trang, wardrobe lưu/reload/không đổi model và Chromium desktop/mobile; ảnh city/osm/wardrobe là local preview.
- ADR-0009 ghi định hướng chủ dự án: live quan sát An; studio kịch bản giáo dục riêng timeline; nhân vật người dùng có ownership/memory riêng. Chưa mở public, chưa tạo multi-user, chưa render/upload video.

## Thành phố 3D — 25/10/2026
- Theo yêu cầu chuyển 2D sang 3D: `/` mặc định City3D, runtime Three.js 0.186.1/OrbitControls tải ở client. Không thêm backend GPU, dịch vụ trả phí, migration hoặc thay đổi dữ liệu lưu.
- 257 khối sinh tất định (151 cao ốc) + 25 nhà dịch vụ = 282; giữ 33 địa điểm và graph cũ. Unit kiểm tra tất cả đoạn đường/venue clearance, độ cao/mật độ, hình học hữu hạn và podium tách nhau.
- Body parts/công trình/cửa sổ/cây dùng instancing; cap DPR mobile1/desktop1.5, render mục tiêu ~30Hz/projection10Hz. Biển tên giới hạn kích thước và ẩn xa. Cư dân đọc appearance, projection/thoại/động vật hiện có; xe bối cảnh/rider đơn giản hóa, chưa có vật lý/nội thất.
- Camera orbit/pan/zoom/follow/skyline/overview, HUD/modal cũ, đổi 2D nhẹ, fallback không WebGL2/mất context, dispose context/resources khi tháo. OSM vẫn là khảo sát 2D, không map-match; skyline/chiều cao là hư cấu.
- Hướng dẫn tiếp nhận và kiểm chứng: docs/THREE_WORLD.md. Kiểm tra thiết bị thật/LOD/nội thất/thời tiết 3D tiếp tục là backlog; không tuyên bố fps hardware hay fine-tune Qwen.
- 12 suite thuần, TypeScript/lint/build và frozen-lockfile đạt. Chromium SwiftShader WebGL2 desktop/mobile chạy cả dev và Workers build local; kiểm tra chọn cư dân/địa điểm, camera/HUD/panel, 3D↔2D, OSM và fallback không/mất WebGL. Lưu browser QA có thể chạy lại ở scripts/qa-three.mjs; sáu ảnh three-*-preview.png là cloud local, không phải production. Font Google bị CA lỗi trong QA, dùng fallback; không bỏ TLS. Chunk Three >500KB đã tải động; chưa benchmark thiết bị thật.

## Hardening và nội thất — 25/10/2026
- Xem docs/INTERIORS_AND_RELEASE.md: collector archive giữ batch>200, bound proposal, fail-closed owner gate Worker, health503, context deadline/negative cache, scheduled rules opt-in.
- Nội thất Three.js mặt cắt với furniture/cabin minh họa; hồ sơ tuổi mô phỏng/ký ức. Chưa indoor graph hay vận chuyển NPC bằng cabin. Nhân vật hiển thị lấy occupancy thật; không giả tạo cuộc sống để làm ảnh.
- Unit/check/lint/build và API isolated local240 samples/admin403 đạt; Chromium SwiftShader desktop/mobile390 city/profile/interior/floor không lỗi/tràn. Ảnh thật docs/screenshots/hardening. Chưa production hoặc benchmark điện thoại vật lý.
- Người dùng yêu cầu chủ động push checkpoints và memory để tránh mất context; làm theo AGENTS.md mục13. Nhánh `work`; không tự merge/deploy bằng sự có mặt của source.

## Production version6 và OSM3D — 25/10/2026
- Đã phát hành Sites native succeeded lúc17:30 giờ Việt Nam, giữ owner-private. IDs/SHA/kết quả ở docs/releases/latest.json; quy trình phục hồi docs/PRODUCTION_RUNBOOK.md. Source đang chạy71d657f; các commit nhật ký sau đó không phải thay source đang chạy.
- Backup đầy đủ world+2events trước additive migration; DB từ2 lên9 bảng qua0004 schema-only/idempotent, không sửa SQL0000–0003. Journal trước đây chỉ0000; snapshot0004 nối snapshot0000. Healthready/worldrevision3/lịch sử/nhân vật giữ nguyên; writer service POSTlearning200/updated0.
- Runtime XOM_OWNER_PRIVATE_ORIGIN khớp Site được native xác nhận chỉowner; cần gỡ trước đổi audience và chuyển owner ID cụ thể. Local flags không lên production.
- OSM khảo sát3D912 polygon kín, mergegeometry <=8drawcalls, không hiển thị cư dân chưa mapmatch. Snapshot cũ height không có: tất cảước lượng12m, không gán chiều cao đo đạc. Importer giữ height/levels cho lần cập nhật sau. Tài liệu nghiên cứu nguồn chính thức tại MAP_3D_SOURCES.
- Frozen/check/lint/unit/build đạt; migration4 lặp trên old/extendedDB không mấtworld. Chromium desktop/mobile390 OSM912/estimated/noJS/nooverflow đạt; ảnh local docs/screenshots/map3d. Production API/native verified, chưa browser owner login.
- Automation cũ paused đã xác minh qua peek; giữpaused, không duplicate. Chưa cron/paidAI/video. Source Sites main có lịch sử riêng đã giữ bằng merge ancestry; checkpoint GitHub nhánhwork và Site source được phân biệt trong runbook.

## Production version7 — độ nét, tỷ lệ và nhịp sống
- Người dùng yêu cầu review chuyên sâu: code/v6 xác nhận không persisted livingTurn,3D bỏ speechAt, người40units còn xe19. Đã sửa người17.5/car44 (10units/m), bánhđènxe/đạo cụ, DPR3preset, HUDbỏblur và hồ sơcollapse, sửa responsecũ saupause bằngforcedrefresh+revision/timeguard.
- Thêm views session30min khôngIP và visitorconversation có lưu/rules,3table migration0005 generatedappendonly. Clientpulsevisible60s tickslot15min idempotent. WorldGETcached-only/compact8events; refresh có harddeadline. Không gọi rulechat làLLM.
- Nativeproductionv7succeeded21:46giờVN25/10/2026, source18350eb; metadata đầy đủ latest.json. DB12table, healthready/revision4,2eventcũ/kýức giữ nguyên; livingTurnđầu persist,stale=false,pulse200duplicate,viewsGET200,worldreadsample288ms. Không đưa fixture hoặc testvisitor vào prod.
-16suite/check/lint/build đạt;16viewretry+8unique/8pulseconcurrency/durablechat/pauseguardsAPI đạt.64worldread0error,p95~357ms so với13.3scoldoldcontext trongenv. Thực tếWorkerdlocalDNScầnrelayNode theo policy; không bypassproxy.
- Chromiumdesktop/mobileDPRcao: movement/scale/presets/chat/pause/offline/contextloss/noWebGL/reducedmotion đạt.3renderer-cycle không tănggeometry; sample36/33drawcalls,10geometries,6–7textures,JSheap12–13MB. Ảnhfixturetrưa/slowmotion và metrics trongdocs/screenshots/experience; chưaphysicalGPU/24hsoak.
- Đã update/reuse automation cũ6adcbdcc81cc819188a4a2ae65392369, enabledtrue/hànggiờ/AsiaHoChiMinh. Prompt serviceaccess mới/pulse+AIevent/readback,khôngpausedwrite/paidAPI/video/reset. Chưa có recordedrun tại bàn giao; không coi bật lịch là bằng chứng uptime24/7.

## Review nhân vật và xã hội — nguồn chờ phát hành8
- Người dùng cho phép dùngAIagents để biên kịch. Hai agent phát triển đã viết/review12cảnh/56lượt và8prompt/bàiđăng thực từyihui-dev/awesome-opus5-5-videos commit92aee2f; không nhậpvideo/ảnh/modelcủarepo. Nguồn/ýápdụng ởVISUAL_DIRECTION, SOCIAL_SCRIPT_BIBLE.
- Runtime bo góc/sphere/capsule dùng chunggeometry, thở/chớpmắt/taynói/nghegật vàfaceRoot. Sửa vaihở/giàyđi ngược/tóctáchđầu/biểntênto thấy trongQA, cameragầnvàpropsngoàihiên. Giữ10units/m; khôngrig/IK/physics.
- Crowd theo lịch24h/role/ID xen kẽ ăn/nghỉ/đi làm thayvòng8phútchung. socialFrame sửaoffsetcũởlớpvisual, slot14units easearrival, reservedlate63..71 tránhngười240bịđẩy47m. Ambient4–6turn/cooldown>=180/quiet22–06/privatequiet/latearrivalwaitnextopening. AIeventưu tiên, exacteventkey, đúngco-speaker; không chọnbystander cứu cảnh.
- Ruleslivingturn dùngthưviệnagentauthored/ghi scriptId, khônggánlocal-llm; overrideLLM gỡscriptId. Cloudinstructions thêm3vai đạo diễn/nhân vật/phảnbiện; localdaemon narrativeguard vàCLI3passlocal. Qwen1.5Bthật đãchạy3passnhưngcriticchấpnhậnlặpý; deterministicguardmới bácđúngsample, khôngghiworld. Không thêmpaidAPI/productionCPUdaemon.
-18suite/check/lint/build đạt, social20cases +60792poses,63cùngvenue/240population/continuity/pause/night/AIpriority/partner/metadata/repeatguards. Broadbrowserdesktop/mobilemove/DPR/chat/pause/offline/lifecycle/fallbackđạt trướcfixhair/name; targetedbrowser saufixđạt2speakerturn/1.4m/source/noJS/nooverflow.34/32drawcalls,416k triangles,14geometries trênSwiftShader; khônghardwareFPS/longsoak.
- Ảnhthựcsyntheticnoonlocal ởdocs/screenshots/social đãgửi, khôngbằngchứngproduction. QAmockresponsebịthiếuweatherStateđãsửa; nhiều cặp khácnhau đượcphépnóicùnglúcnênasserttheopair.
- Automationhourly córecordedruncompleted15:00UTC25/10, outputrevision7/living88/eventai22readback. Pre8read16:14UTChealthready/revision12/3events/memories5,4,4; snapshotbackupgitignoredhashtrongMEMORY_SHORT. Giữownerprivate1owner0external.

## Production version 8 — đã phát hành
- Native succeeded16:19:02UTC25/10/2026, sourcec9c41676b7f947cb631831ee804aa27f50c2b7bb. IDs/env1/backuphash nằm latest.json và ledger. Owner-private1owner0external không đổi; không migration.
- Post readback healthready/revision13/3eventscũ/memories6,4,4, instructions3vai đã lên. Authenticatedpulse200duplicate/living93/learning0; GET xác minh không mất history/memory, stale=false. Browserảnh vẫn local, không nhận thànhproductionQA.
- Automationcũhourlyenabled,2recordedruns15:00+16:00UTCcompleted trước promptmới. Đã update/readback prompt3vai, dùngworldTime.hourquiet22–06, không duplicate schedule/paidAPI. Chưa có run dùngpromptmới, tiếp tục theo dõi. ModelCPU/preview/relay lượt này đãdừng, production không phụ thuộcenv.

## Sửa phản hồi thực tế sau8 — đang kiểm thử bản9
- User báo1–2câu/chậm, lagdi chuyển, xuyênnhà/xe vàbốicảnhkém. Test2lượt trướcchưa đủ. Đã dùnglại2agent theoủyquyềntrước; sourcecheckpoint4b1400b GitHubwork.
- SocialDirector statefulpresentation2.4–4s+gap.3, cooldown20–45, khóa cặp/fullscene qua polling/slowclock, actualAI/fullstoredliving. Runtime giữinstance vàdùnggroundactorpositions;2D cũnggiữdirector.
- WalkDirector shared279bodyfootprints, A*/circle4.8sweeps, routesởlạiquapoll; traffic12car vòngthật/rightlane/brake/yield/follow,4apron42units. Dời bodyvenue khỏiroad, geometrymọilớpchung. Backendhistorykhôngđổi. Navreconstructionlỗi104routes đãbịtestbắt+sửa.
-20suite/check/lint/build đạt; social28,walk8/1089routes+5401frames,traffic22740states0collision. Replayprivateworld30actors/1800frames0house/caroverlap khôngghi. ColdA*p9511–15ms/cache256; khôngSLA.
- Browserđãthấy6lượt đầy đủ desktop/mobilequapolling. MẫuchuyểnđộngtrướcLOD khôngstale10HznhưngSwiftShaderchỉ12frames/9s; khôngcoilàhếtlag. ThêmchunkLOD vàLambert/Phongchoenvironment, giảmfill/roofwindowdetails/contactshadow. Đangđolạicùngfixture, metrics/ảnhlocalkhôngprod.
- Backup trước9:pre-v9-20261026-ground.json hash331e1532845874a6120c64d84c0b56600a1513a0f52dd20afc781cd88bc580be,revision33,5events,memories15/6/5; giữgitignored. Prod8sourcec9c4167chođếnnativebảnsau.

## Production version9 — hoàn tất
- NativeSucceeded01:14:56UTC26/10, source287f2d837a830f56d7dc71c2013cf7748fa22464; version/deployment/env1 tronglatest.json vàledger26/10. Giữownerprivate1owner0external; khôngmigration/DBrepair.
- PostAPIhealthready/revision37, đủ5eventcũ/memories17,6,5, living33/stalefalse. ChưaownerbrowserQAprod; ảnh/testsyntheticlocal đãgửi. ModelCPUkhôngbật, preview/relaytest đãdừng.
- Source/QAbundle cuối đủ6lượtquapoll desktop/mobile, motion26frames9s/stale0/0footprintcollision,118418triangles vs369600/12frames trướcLOD. Hơn2xsoftwarethroughput nhưngvẫnchậm vàchưaphysicalGPU; khôngquảngcáohếtlag/60FPS.
- Cloudtasklatest01:00UTCcompleted, promptmới đượcchạy; khôngtạotrùngcảnhAIgiờ07, readbackrevision35. Khôngđổi schedule/paidAPI tronglượt9. Chưađồngbộviewerplayback hoặcbackendoccupancyphysical.


## Va chạm, camera và hoạt động — source bản10
- Shared scenery94 cây/507 footprint +279 công trình; renderer dùng venueSceneryPose/sceneryTrees/sceneryLamps. Shelter bus dịch50units về sân,13 đèn duy nhất ngoài làn/nút quay. Foliage cao khỏi đầu, trunk chắn; thêm model phải cập nhật footprint tương ứng.
- WalkDirector dùng disc4,8units, khoảng riêng9,95; swept collision với người, sidepass/yield/replan, goal đứng cách20,4 để không tạo vòng chặn người đến sau. ID/reorder/poll ổn định, chỉ tìm spawn riêng khi khởi tạo; không dịch chuyển đẩy chồng giữa frame. Grid12/cached256,1.089venue routes đạt.
- Camera FOV38, tracking gần An, target lệch30% tới listener, chọn góc không xuyên nhà, lùi theo aspect dọc; initial shot đúng ngay, eased movement. Theo chọn lạiAn; zoom thoátfollow/min42, bubble clamp theo viewport, chunkLOD cập nhật khi camera di chuyển.
- Needs drift có anchor riêng; policy xem nhu cầu/reward/novelty/related-tag/role, loại tai nạn/vi phạm khỏi ý định thường. Giữ pending chưa hoàn tất, cohort12–24 luân phiên cả callers5min/hourly. NPC agenda3–7min, lệchID/quietnight/cache512. Không nhân skill/reward, không nâng model/fine-tune.
- living-v2 slot5phút tránh ID lịch sử15phút; visiblepulse30giây. Không cron/paidAPI; lúc đóng trang phụ thuộc automationhourly. Backend completion vẫn tính simulationtime, không occupancy vật lý renderer.
-23suite/check/lint/build đạt; personal-space7, autonomy8, camera180 projection/aspect; traffic22.740states với786obstacles0collision. Browserdesktop/mobile6lượt qua polling/selectBình→followAn/zoom/bubbleclamp đạt; motion20frame/9s,0stale,0collision,stepmax2,408units. SwiftShader chậm/biến thiên20–29frames giữa lượt, chưahardwareGPU/24hsoak. Ảnh thực local synthetic đã gửi; không browserproduction.
- Backup pre10 gitignored hashc39c1ac9c401e207a9b9b82f8d6996a0d4022df74d365354f18cfee876346918,revision65/12events/memories28,10,10. Khôngmigration/reset/repair. Trạng thái phát hành ởlatest.json/ledger.


## Production version10 — hoàn tất
- Native succeeded17:06:40UTC26/10, source7a7871f8c04967521b9fff3e2cbf06ae75b8ed7e; đúngversion10/env1/1owner0external. Version/deployment/archivehash/latestreadback đầy đủ tronglatest.json/ledger26/10. Giữprivate, khôngmigration.
- PostGETrevision67/12events/28,10,10memories cònđủ; pulse200duplicate/living-v2-2026-10-27-1 đãpersist/revision68/learningupdated0,healthready/stalefalse. Khôngfixture/testevent/DBrepair. Sourcepush kháccommitledger saudeploy.
- Localpreview/relay đãdừng; prodkhôngphụthuộcenvlocal. Browserảnh đãgửivàghi rõpreview; chưaownerbrowserprod hoặchardwareFPS. MemorySHORT chỉgiữbacklog/blocker.


## Chi tiết đồ họa và rig — source bản 11 (27/10)
- Hướng giữ thành phố hoạt hình vui, màu xanh ngọc/vàng/san hô, model thủ tục nguyên gốc. Không đổi dependency/model AI/migration/schedule hay appearance đã lưu.
- People6batch thay19partmeshes; vai/khuỷu/cổtay vàhông/gối/cổchân nối liên tục, geometrylimb36triangle, blendpose/gait theo actualdistance, headyaw cungngắn. Thêm mặt/cổáo/cúc/giày/mũchef, book/cup/wateringcan/tool nốitay; LODchi tiết240units vàselected. GroundElevation khớpmặt cỏ/pad/road/path đểchân/bóng khônghover.
-66streetProps/7loại/833parts ở33venues, modeltrongsharedfootprint; tổng573scenery+279body=852.94cây nhiều tán/thân nối tán,3bậc cửa thấp. Ambience16tia/128hạt nước+18cloudlobes pooled/simclock, pausekhônguploadbuffer.
- Thêm6script, tổng18scene/88line gắnsourceKịchbản; không tự tạo inventory/transaction. Mèo/chó/chim dựngriêng5batch, 3policies cũ; sẻ3con làflockvisual. Rawanimalprojections dùngcompanions direct trongWalkDirector, vịtrí nhường người/xe/cùng staticnav; modelnằm trongdisc4,8. Chim lên/xuống vàcánh cóeasing, đuôi/chân/cánh đóngbăng khi pause.
- Full24suite/check/lint/build đạt; visualtest72nearactors/4230instances/600poseframes/1800mixedhumananimalframes/actualfootheight/matrixfinite/footprintmodelbounds/pause/3policies. Traffic22740states với852obstacles0collision;1089routes, coldA*p957,6ms/max26,246ms trongenv (khôngSLA).
- Browsercuối desktop/mobile6lượt/polling/controls; motion29frames9s/28moving/0stale/0static&animalcollision/maxstep2,409units,136920triangles/35drawcalls/21geometries.4activitydetailread/garden/eat/market đạt, ảnhlocalsynthetic đãgửi. KhônghardwareGPU/FPSclaim/productionbrowser; vẫncầnsoak/indoorIK/serve-clean/inventory/physicstoànthân.
- Backup pre11gitignored fc7b3cfe1c571a28c32680c0cda62c38433a4bf8636aa6e0e5ec835a4a394206;revision81/13events/memories32,10,11. Phát hành/readbackxemlatest.json/ledger; sourcepush khôngđồngnghĩa deploy.


## Production version11 — hoàn tất
Native succeeded08:39giờ Việt Nam27/10, sourcec1ddea15e5b59631600796ea49d76bae9c49ddcb/env1/ownerprivate. Latest.json vàledger27/10 cóIDs/hash/test/readback. PostGETrevision83/14events/33,11,11memories; offlinecomparehai backup xácnhận13eventcũ/từngmemory/world.born/3animalpolicy giữnguyên. Khôngmigration/reset/fixtures. Preview/relay đãdừng. Tiếp nhận8ZIPKenney+KịchBản.md cho đợtnângcấpasset tiếp theo; cần đọc scenario/license/metadata trước tíchhợp.

## 27/10/2026 — local ZIP diagnostics/route foundation
Bản sửa một phần giai đoạnA, chưadeploy. Chi tiết scope, regression và giới hạn ở docs/FIXES_PHASE_A.md; không coi đã hoàn tất gói0–8.

## 27/10/2026 — source candidate phase B
Thêm enum/scenarios hành động và5bước hậu thoại, schedulerNPC simulation20s/pulse10s/CAS, shared kindtyping và mapping GLB/2D. Không phải model AI mới; còn tagpair/cyclephysics/petowner, C/D và nghiệm thuđiệnthoại. Chi tiết trong docs/PHASE_B_ACTIONS.md.

## 27/10/2026 — tiếp nhận work từ GitHub và sửa UTF-8 telemetry
GitHub main a5b7c5a đã nằm trong work5d50e17 (10commit hơnmain); checkoutlocal tênwork banđầu ởmain, đãfastforwardorigin/work. Regression32log Unicode hợp lệ làmrequestvượt16KiB táihiện hàngđợikhôngtiếntriển; batching byteUTF-8 gồmJSONenvelope+comma, chuẩn hóa tốiđa8field/32key/100string, bỏnonfinite. Testfailtrước/passsau, giữACK/retry; checkpoint20c7152 đãpushwork. Khôngmergemain/deploy/resetDB. CácbacklogfeatureC/D vẫnphânbiệtbugfix; xemMEMORY_SHORT vàreviewmain choQAđangchạy.

QA cuối lượt tiếp nhận work: full30suite/check/lint/build/API đạt. Browser desktop/mobile đủ6lượt và camera controls;9actions GLB/props/preset đạt; motion64frames/9s,63moving,0stale/0collision,maxstep2.4053unit,155796triangles/46drawcalls,eco. Ảnh thật local synthetic đã hiển thị cho người dùng, không phải production. Kết quả và backlog tiếp nối: docs/WORK_REVIEW_2026-10-27.md. Không benchmark điện thoại hoặc soak; không deploy/main merge.

## 27/10/2026 — đuổi bắt theo cặp trong phiên 3D
- TagDirector cấp goal/speed cho WalkDirector từ vị trí ground thật, ghép hai người cùng chọn tag tại Công viên/Sân thể thao. Catch<=13,6unit có segment clearance, grace1,6s và rearm sau tách thêm3unit; không teleport hoặc đổi vai liên tục khi kẹt. Chaser28/runner20unit/s; giữ tránh vật cản, xe và personal space.
- Pause/cancel/poll/reorder/world replacement/rewind có regression. Người thứ ba chờ; tag không sprint tại chỗ khi không di chuyển. Tag plan mới giữ cùng địa điểm180s. SocialDirector/NPC scheduler không tạo ambient meeting cắt ngang tag; microActivity chỉ đổi social/play, giữ activity đã chọn. Không đổi DB/dependency/migration, không ghi world/reward/nhớ giả.
- Full31lệnh suite/check/lint/build và API D1 local đạt. Navigation thật3600frame:28 lần đổi vai ở Công viên,6 ở Sân thể thao,0collision mẫu; park maxstep1,4unit ở50ms. Test lịch NPC thật bắt lỗi microActivity mất tag trước sửa và đạt sau sửa.
- Final Chromium SwiftShader trên Worker build mới: desktop129frame/2swap, mobile202frame/1swap trong14s, polling8requests mỗi case, roles ổn định, pause/resume/plan cancel/noTeleport/no JSerror đạt. Social regression desktop/mobile đủ6lượt/camera/poll đạt. Ảnh thật local synthetic đã gửi, lưu docs/screenshots/tag và social; không phải production, FPS điện thoại hoặc soak.
- Checkpoint141971c WIP và71859cb đã push work. Quyết định/phạm vi/QA: docs/PAIRED_TAG.md. Chưa multiviewer/2D tag, backend completion vật lý, cycle physics/pet owner và C/D. Production/main không đổi.

## 27/10/2026 — chỉ 3D và pet-walk
- Theo yêu cầu mới, gỡ các renderer SVG2D (UrbanMap/CityMap, Robot/Animal/Vehicle/workshop/venue/OSM SVG), wardrobeSVG, dashboard cũ (redirect/), traffic/camera/bubble helper chỉ dùng2D và CSS không còn dùng. Gỡ10ảnhSVG cũ và manifestZIPstale. Giữ lịch sử phát hành, tọa độXZ/graph/ground, OSM3D, canvastexture/icon còn dùng; không restore2D từ tài liệu cũ. Wardrobe dùng previewWebGL on-demand/dispose; WebGL/contextloss córetry, không fallbackrenderer.
- PetCare + /api/living/pets POST lưu snapshot.petOwners bằngowner/origin/schema/2KiB/CAS. Fallback legacy mặc địnhAn chămCún,Chi chămMướp; explicitunassignment được giữ. Không migration/dependency/resetDB. PetWalkDirector chỉcấpgoal, groundcollisionshared. Thúđitừvịtríthật, chủchờ>40unit/tiếptục<25; hai thú cóhai bên. Pause/cancel/reassign/offscreen trả vềroutine liên tục. Không dây/IK/physicalcompletionshared; không giảtạo modelAI.
- Backend không thưởng forage/play pending bịwalk ngắt; pending cancelled/done không tăngsamples/trials. Giữhistories/actions. Cập nhật animal learning từ world chứa kế hoạch người mới để không bỏ lỡ walk vừa được planner chọn. Đây là mô phỏng theo luật, chưa occupancy authoritative đa viewer.
- Full32unitcommands/check/lint/build đạt. Pet1600frame:100framechờ,đi200unit,0collisionmẫu,maxgap24.507unit saucatchup, pause/cancel/unassign/firstspawn; thêm1200frame hai thú/reorder/collision/đếnđích đạt. API D1 thật riêng đạtguard/schema/stream/origin/assignment/unassign/CASrace/preservepersonmemory+animallearning; khôngproduction.
- Final camera QA: desktop87frame/mobile160frame trong12s, pet follow/pause/assignmentUI(mock)/wardrobe3D/OSM/contextloss/retry/noWebGL→bật→retry/no2D/noJSerror đều đạt; assert thú trong khung>80%frame. Camera dùng thú làmpeer, HUDghiđidạocùngtênthú. Ảnh local synthetic đã gửi; docs/screenshots/three-only-pets và social là bằng chứng browser, khônghardwareFPS/production.
- Source checkpoints582586c/5acd55b/87d03af/5cedad0 đãpushwork, main/prod không đổi. Tiếp tục cyclefullbody, C/D, durablehistory/modelA-B theo từngphần có nghiệmthu; docs/THREE_ONLY_AND_PETS.md là hướng dẫn hiện hành.

## 27/10/2026 — xe đạp di chuyển với vùng bao toàn thân
- Cycle và commute transport=bicycle dùng groundmovement với metadata mounted/distance/yaw/radius. Speed22/accel12unit, brakingnearend, safe mount/dismount khôngteleport; projectionarrivalsớm khônggỡxe khi cònđiground. Walker cũgiữspacingcũ; mới dùng2clearance4.8/9.2, gridtheoradius/routesLRU1024, chỉ dùngprecomputewalk cho4.8. Static/dynamic sweep và trafficforecast theo bodyradius. Spawn tránhcars; livebody chỉlớnlên khi đủclearance.
- ActualGLB+bike36pose vàinstancedNPC16pose maxradius8.85<disc9.2. Bánh/pedal theodistance, stop/pause khôngtiếpquay. GLBclipdrivekhôngkeymọibone từngbịcộngdồnoffset; regressionthựcđãbắt, restorebasequaterniontrướcmixer vàteststableepsilon1e-9 đạt. Khôngcầmtaskprop khi cònmounted. Không gọi làrigidbodyphysics; chưanghiêng/lốp/té/IK.
- Unit1200frames đi249.91unit/maxstep1.1 ở50ms, hẹpmountkhôngjump; mixedped1600frames/sweep0collision/251.63unit; spatialoracle4000checks; cooperativecrossing1400frames vớiTrafficDirectorfullbody, commute giữxe đếnarrivalrồidismount đạt. Full33commands/check/lint/build vàAPI D1local đạt, gồm regressionspeople/pet/tag/traffic; không DBreset/migration/dependency.
- Browserfinal trênWorkerbuildmới: desktop99frames/227.88unit, mobile168frames/244.56unit trong12s;poll8requests,driveclip,pausefreezesrig,dismount,noTeleport/noJSerror đạt. QAđầu đãbắt mobilecropxe; sửacharacterShotrộngtheoaspectvàassertfulldisc+height25trongkhung>90%frame. Ảnhthựcsyntheticlocal đãgửi,docs/screenshots/cycle; socialregression đủ6lượt/camera/poll cảdesktopmobile. KhônghardwareFPS/soak/productionQA.
- Checkpoint1c1e17f/00112d6/facacf7/294774c đãpushwork; sourcepháttriểnkhông phải deploy. HướngtiếpC/D/history/modelA-B, occupancycompletioncònthiếu. Tài liệuhiệnhànhdocs/CYCLING.md, khôngrestore2D.

## 27/10/2026 — WIP UI tên/thoại và nhóm ở chung, dừng theo yêu cầu
Checkpointc0aee68 thayselectednamespritebằngDOMpill/speechcardvàACKDOM;598c8ff thêmResident.home/assignHomes additive;3e57abc tinhchỉnhwidth/anchor+harness. Full35suite/check/lint/build đạt trước tinhchỉnhcuối; overlaytest/check/lint/build lạiđạt sau đó. API D1homebackfill qua catalogCAS/repeat/giữhistoryđạt. Browser cuối desktopmobile/320longtext/longname/selectlabel/4memberprofile/sourcebadge đạt, ảnh local synthetic ởdocs/screenshots/overlays-households. Chưa qa-social full6lượt saubridgeACK, chưa chốt release. Household chỉmetadata, khôngindividualhomegraph hoặc bật240người live. Người dùng yêu cầu tạm dừng vàpush; trạng thái/todo/chứng cứ đầy đủ ởdocs/WIP_OVERLAYS_HOUSEHOLDS.md. Khôngdeploy/mainmerge/DBreset.

## 28/10/2026 — tiếp nhận tài nguyên, hoàn thiện rig và QA trước release

Đã fetch explicit ref work a14e939 từ agent khác (15pack239model/rig/gallery WIP); remote ban đầu chỉ fetch main nên origin/work cũ không phản ánh GitHub. Source checkpoints6b18c89/fc4f9fe/e398b79/79f1383/85eca26 đã push. User merge PR#2 thành main c83a5e3; work đã fast-forward merge đó.

Core dùng Human002 skin độc lập + tối đa1focused NPC, Talk/Listen và surfacehead/hand thật; source/memory/appearance/home/petOwners giữ nguyên. Bỏ đảo phụ kiện source trôi chỉ trong cityHuman002, gallery giữ bản gốc. Review ảnh bắt kéo méo do scaleXZkhácY; đã fit đồng nhất, camera/heldprops theo chiều cao chibi thực, không thay navigation radius. Test actual3core180frames maxradius3,887unit/disc4,8 và fullbike9,2; grounderror0,0123unit, sourceimmutable/pause/dispose/focusbudget đạt.

Tên mới dùng họ/tên đệm thay số; legacy backfill chỉ đúng mẫu tự sinh, previousNames giữalias; customnames/IDs/plans/memories không đổi. Tuổi legacy20–44 giữ baseline, giới NPC chưa khai báo; profile có agegroup/addresshelper, chưa tự tạo trẻ em/quan hệ gia đình hoặc rewrite scripts. Synthetic240unique names/60households không bật thêm densitylive.

Gỡ32referencePNG không dùng/atlas trùng12.442.522byte, giữ239canonicalGLTF/15license/mọitextureBINdependencies; còn386files42.764.728bytes. Importer --prune-references kiểm tra hash trước khi dọn và lần hai xóa0; ZIPgốc không còn trongenv nhưng checkout đủQA model.

Full38unit/check/lint/build/API local đạt sau uniform; saucleanup chạy lạicheck/lint/all239parse/hash/API đạt, binaries model không đổi. Browser cuối trên freshWorker5194: social desktop/mobile đủ6lượt/poll/camera; overlay fulltext/namebounds/sourcebadge/selectNPC/4memberhousehold; cycle desktop88frames217,27unit/mobile162frames243,39unit trong12s, fullbikeframed/pause/dismount/noTeleport; pet desktop89/mobile146frames follow/pause/assignmentmock/wardrobe/OSM/contextretry/hide/reveal/resize320/no2D và noWebGL→retry đạt. Gallery19mẫu của15packs, texture/clip thật, mobile screenshot, pause ngừngdraw/đổiclipkhidừng/selectionrace/contextloss/loadretry đạt. API riêng D1 thật xác minh legacyhome+identity CAS/retry/historypreserved; browserworldmutations dùngmock. Ảnh actual localSwiftShader trong docs/screenshots; không GPUvật lý/soak30min/productionQA.

Worker5191 từng exit1 giữa desktop→mobile; freshWorker saubuild hoàn tất đủregressions. Hai lỗi harness gallery trước đã sửa: arrow52tri +floor48=100không thỏa >100, giờ so với catalogtriangles+floor; retry phải đợi readytrue thay vì renderedModel cũ. Không bỏ assertion chất lượng. GEMINI_REVIEW_2026-10-28 phân biệt đề xuất/bằng chứng và các mục được nhận/chỉnh/tạm hoãn.

Runner mới chạy độc lập38suite qua tối đa4process workers, không shell và không fail-fast. Lượt đã chạy38/38pass trong9,85s; đây là mẫu môi trường hiện tại, chưa so cùng điều kiện để công bố%tăngtốc. Đã cập nhật ARCHITECTURE/DATA_MODEL/TESTING/ADR0006 và gom README/handoff về snapshothiệnhành; bàn giao24/10 chuyểnhistory có cảnh báo khôngrestore2D. Xác minh thực tế41scenario (không phải32trong báo cáoGemini),33venues,24roles,13SQLtables.

## 28/10/2026 — Phase D, Disjoint LinUCB và skill gates
WIP5990549 đãpushwork. Posteriorridge6D packedinverse21+b6; 1.200update đối chiếu bộ giải dense độc lập sai số5,83e-16, context-sensitive ranking/gate4scenario/unlock/needspriority/context-at-choice/noearly/noDouble/cancel/legacy đạt. Giữtabular/memories/IDs. PendingNPC sửa duration bằng tổng mọi bước, không180s cốđịnh; không nhận làphysicalcompletion.

Full39suite4workers đạt10,16s/check/lint/build đạt. CompiledWorker/D1 riêng ghi posterior và archive disjoint-linucb-v1/context đúng lựa chọn, retrypostupdated0/1archive; giữhomes/petOwners/memory, khôngproduction. Còn policy storage tách snapshot, hierarchy/P2P/provenance, skillvector và fullbrowser cuối. Candidate168861b/main217c888 là mốc trướcphaseD, chưadeploy vì không có nativeSites trong phiên; userđãủyquyềnmerge/push/prod, đangchờbậtkếtnốikhônghỏilạiquyền.

Role-expansion guard đã nối server,40/40unit/check/lint/build đạt. API thật compiledWorker/D1 với cachefixture xác minh duplicateRoleID bị422 trướcdateSuffix, world.data/revision nguyênvẹn. DùngroleSchemahiệnhành, khônglấyaccepted3/3củaharnesslàlýdotựthêmnghề; Jaccard làintersection/union vàchỉlọctrùngtừ, khôngclaimsemanticquality. CodekhôngbậtmodelAPI/cron/paidservices.

## 28/10/2026 — structured memory và giảm số câu SQL
Nối memories0001 hiện có vào eventCAS và outcomearchive: event-report chỉrecipientchange, khôngtựcoiđối thoạitươnglàđãchứngkiến; simulation-plan-outcome ghi rõcompletiontheokếhoạch. StableIDs+INSERTORIGNORE+revision/nonce guard trongtransaction giữretry/actorprivacy. GET/api/living/memories owner-only, topK từ100rowđúngactor; instructioncontext lấy4memory/core, gắnnguồnvàcoichuỗilàdữliệu. Legacyrows chuyểnnhãnlegacy-recordkhiđọc, khôngxóalịchsử.
ArchiveStatements đổi NINSERTexperiences thành một INSERTSELECTjson_each, memoryoutcomes cũng mộtSQL, giữđủcontext/model vàhistoryarchive. Full41suite4workers9,79s/check/lint/build đạt. CompiledWorker+D1riêng kiểmowner/private topK, eventvàoutcomepersist, retrynoduplicate, staleCASkhôngghi vàkhôngcross-actor leak đạt. Môi trường restart ngay sautest nhưng filesystem/log/sourcegiữđủ; processsessionscũkhôngcòn, khônggiảđịnhpreviewcũcònsống. KhôngnativeSites mới saurestart; candidate168vẫnprepared-not-deployed, productionledger11khôngđổi.

## 28/10/2026 — dialoguepool và xưnghô hai chiều
1590704 WIP đãpushwork, sauđófull42suite4workers10,88s/check/lint/build/API D1 đạt. Serverliving.dialoguePool giữ64cảnhhashes, rulestrùngcảnhgầnđây chuyểngrammar; LLMtrùngsceneđãpersist trả422trướcCAS, finalLLM pool không đưa rules draft vào pool cuối. Kindgenerated chỉchốnglặp, khôngngụýđãnghe/earnedreward. Ambientbrowserlưu64scenehashes localStoragetheoworldborn, khôngrawtext/names/credential; blocked/quota cósessionfallback. Node500scene/reload/serialization/storagefault/pronounreciprocity/budget đạt.
Grammar/ruletemplate mới dùngcháu-bác/cô/chú, ngườilớntựxưngtươngứng hoặcdefaultmình-bạn nếuunknown; khôngrewritehistorical/LLMspeech. turn.addressing vàoJSONscene choLLM; staticdirector nhắcdùngdữliệu, khôngsuổi/giớitheotên/model. Fewshotdaemon4lượtthay2khớpguard4–6. ChưaclaimđãđolạichấtlượngQwenreal.
BrowserfreshWorker5290source159: desktop/mobile đủ6lượt/poll/controls +F5chốnglặpcâuvừagenerated; ảnhreloadthựctrongdocs/screenshots/social. Readingtime/movementcònviewer-local, localStoragekhônglàauthoritychung. NativeSiteschưakhảdụng; khôngdeployed/bậtcron/public/paidAPI.

## 28/10/2026 — Phase C, cửa nhà riêng và camera
60 cửa thấp tầng sinh offline, ID/địa chỉ additive giữ home custom/retired và nhóm cũ; crowdAt/WalkDirector dùng cửa làm goal khi nghỉ ở Khu dân cư. Một batch vòng sơn mặt đất, hồ sơ có địa chỉ/Xem nhà với góc nhìn tránh nhà. Không indoor/occupancy authoritative hoặc tăng density live.
Synthetic 240 người/60 nhóm, 1.980 đường đi bộ + 60 full-bike, ground 2.400 frame đi 2.932,64 unit đến cửa/noTeleport/pause đạt. Full 43 suite/check/lint/build và D1 API đạt; desktop/mobile home profile/camera/60 doors/6 distinct targets, social6/poll/F5, pet/context/wardrobe/OSM/no2D và full-bike đều đạt. Ảnh local SwiftShader fixtures trong docs/screenshots/homes đã gửi người dùng; không phải production/hardware GPU. Checkpoint 75dc288 WIP đã push trước QA; candidate f0d2312 chưa chứa phần nhà.

## 28/10/2026 — policy storage và benchmark thật
Checkpoint 424275d WIP đã push. Full 44/44 unit (17,47s trong mẫu env)/check/lint/build/API Worker D1 đạt. Migration 0007 additive lưu posterior per actor; ordinary world polling không hydrate matrices, learning API giữ đầy đủ. 240 × 41 model được chia 11 chunks, snapshot fixture giảm 5.131.102→57.982 byte; CAS/stale/retry/corrupt/missing refs và rollback nguyên batch được kiểm tra. Không production migration hoặc lời hứa SLA. Harness API ban đầu thiếu context_cache trong fixture cho GET world mới; đã tạo schema đúng trước đọc và chạy lại đạt.
Benchmark mới dùng runtime thật, chung 820 training/seed và 160 frozen holdout/seed, 8 seed. Tabular reward0,560713/MSE0,003851; LinUCB reward0,550357/MSE0,003062. Không nhận demo3,71× hoặc score98. Chi tiết/giới hạn ở PHASE_D_LEARNING và docs/validation/policy-holdout.json.

## 28/10/2026 — âm thanh opt-in và review proposal
Checkpoint b0373b2 đã push trước build. Audio synth wind/rain/daytime chirp, mặc định off/no context trước gesture, pause/hidden/OSM suspend và off/unmount dispose. Browser actual Web Audio desktop/mobile/320px/unsupported đạt, measured peak khoảng0,0061/0,0042 trong sample; không kiểm chứng chất lượng nghe hoặc latencyhardware. Build/check/lint/API source audio đạt; ảnh preview local đã gửi. Chi tiết PHASE_E_AMBIENCE.
Review thêm phát hiện daemon gán proposal trước review và catch không xóa, có thể log fallback nhưng vẫn gửi bản bị bác. Đã assign sau review và clear trong catch; server chạy cùng reviewNarrative trước world write. Test daemon mock cả4request path: 3bản JSON hợp lệ nhưng review lỗi phải gửi {}, bản valid giữ basis. Không gọi model hoặc mạng ngoài, không đánh giá chất lượng LLM thật. Full compiled source cuối cần chạy lại sau checkpoint.

## 28/10/2026 — tiếp tục sau môi trường unavailable
Checkout/dependencies/dist còn nguyên, /tmp cũ không còn; fetch không thấy commit agent khác. Checkpoint 9f60f5b push phần fixture negative-cache còn dở để clock advance không gọi upstream. Fresh full 45/45 suite (15,56s)/check/lint/build/assets hash/API đạt. Server đã xác minh busy/night không nhận proposal hoặc ghi world/policy; tất cả fixture HTTP dùng clock cố định chỉ trong test entry, không có route chỉnh giờ trong artifact production.
Bảy browser harness trên UI cuối trước đó đã đạt desktop/mobile: social6/poll/F5, overlays/long text/320px, cycle/pet/3D recovery, home/profile/camera, gallery19mẫu15pack và audio opt-in/lifecycle. Source mới sau đó chỉ đổi server guards/test fixtures/docs, không đổi renderer/UI. Bằng chứng ảnh/metrics vẫn tracked. Không tuyên bố production readback/hardware FPS hoặc mọi phase hoàn tất; đang chốt main/candidate đúng SHA.

Main và work đã fast-forward lên source e90021b72806c780d385111b846f30bb1de6460e. Release exact-SHA build/package đạt; gói work/production-e90021b.tar.gz, SHA256 2f2461830b98887f7512cee8c46e640cb18b781077e68104c8099cf6edf6e5da, kiểm tra đủ migration0007/không secrets/DB/test-entry. Candidate ledger đã đổi, latest deploy ledger không đổi vì chưa có native Sites/deployment/readback.

## 28/10/2026 — domain practice
7274635 WIP đã push. Tám domain skill, minDomainSkill cho bốn scenario, cùng actual skillGain trong archive; chỉ completed matching plan một lần. Legacy giữ gate cũ bằng danh sách compat, không tạo proficiency hoặc tăng sample từ scalar; core progress trước khi có policy cũng được giữ. Không migration/history reset.
Full46 suite (18,71s)/check/lint/build/API đạt; domain UI desktop/mobile/320px earned2/locked2 và legacy4 open đạt; social6/poll/F5 regression đạt. Ảnh actual preview đã gửi; không production/GPU thật. Benchmarkv2 explicit one-domain synthetic history, reward/MSE tabular0,561797/0,003588 và LinUCB0,559612/0,002683; v1 lưu riêng. Candidate e90021b/main0992549 vẫn là mốc trước domain, chưa có native Sites.

## 28/10/2026 — context cards 33 nơi
c6f1f69 WIP đã push. 49 thẻ/33places, strict schema/source editorial/phase/weather/location, weekend và festival/date/source gating; daemon nhận tối đa2thẻ đúng scene. Full47/check/lint/build/API đạt;40weather-phase cases + pure/deterministic/festival fresh date origin. Không coi gợi ý là observed event; không có scene props/occupancy context thật. Chi tiết CONTEXT_AND_MEMORY. Tiếp RAG private cho daemon, targeted tests đạt nhưng chưa full48 ở checkpoint.

## 28/10/2026 — RAG daemon có quyền và provenance
5d9f682 WIP đã push. Helper retrievePromptMemories chỉ loopback, tối đa2actor/3record mỗi người/400char, timeout2,5s song song. Kiểm lại owner/witness/kind/date và giữid/event/kind; denied không fallback, unavailable chỉ own summaries. System instructions phân biệt editorial/owned memory/simulation outcome và phần truncated; không tự tăng trial/skill hoặc ghi heard-from-peer.
Full48unit (16,77s)/check/lint/build/API đạt. Integration helper gọi compiled Worker/D1: owner403 returns denied/empty, An record không vào Bình. Targeted tests scope/filter/bounds/invalidJSON/network/defaultfallback/requestpayload đều đạt. Chưa model inference thật hoặc semantic quality guarantee. DomainUI/social preview trước đó vẫn là evidence, UI không đổi trong context/RAG. Đang chốt fresh preview và main/candidate mới; không có native Sites.

Fresh browser source48 trên Worker5301: domain UI/legacy/320px desktop/mobile đạt, social6/poll/controls/F5 đạt, không lỗi JS. Ảnh actual local preview được cập nhật; UI không đổi trong context/RAG. Kiểm tra lại policy storage khi thêm domain metadata: fixture240×41 inline5.135.422B→snapshot62.302B,11chunks, CAS/rollback/legacy/corrupt đạt; số57.982B ở milestone cũ là trước metadata domain.
