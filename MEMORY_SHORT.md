# Bản11 — WIP nâng đồ họa, chưa phát hành

- User yêu cầu chi tiết/nhân vật/sự kiện/chuyển động/nhiều đồ vật. Source đang làm: People6batch thay19partmeshes, khớp khuỷu/gối, mắt/mũi/tai/cổ áo/giày, props cầm đúng tay, gait theo quãng đường và transitiondamping. Thêm66streetProps/7loại cùng footprint;6socialscripts, cloud/fountain động theo simclock; cây đa tán, sửa bậc cửa quá cao.
- LượtQAđầu:24suite/check/lint/build đạt;72nhânvật stress trong6batch,600frame joints/stop/pause/reorder và833detailparts của66props đạt. Traffic852obstacles/22740states0collision;1089venue routes đạt. Browserdesktop/mobile6lượt+controls/motion26frames9s0collision và4activitydesktop đạt; ảnhlocal đãgửi. Thấy khe gối/táncây rời nên sửa joint nối/mũcheftròn/thâncây dài; thêmgroundElevation đểchân/bóng khớppaving, giữuốn sách cân2tay. Đangbuildlại, cần finalbrowserQA saufix. Cần chốt docs/sourcepush/build/package/native deploy/readback. Chưa được gọi prod11. Nativeconfirmedprod10/1owner0external; Sites source fetched fastforward.
- Backup pre11gitignored pre-v11-20261027-visual.json SHA256fc7b3cfe1c571a28c32680c0cda62c38433a4bf8636aa6e0e5ec835a4a394206;revision81/13events/memories32,10,11. Khôngmigration/paidAPI/reset.

# Việc còn lại sau production version10

Source đang chạy `7a7871f8c04967521b9fff3e2cbf06ae75b8ed7e`; IDs/readback/backuphash ở docs/releases/latest.json và ledger26/10. Luôn push checkpoint nhánhwork trước bước lâu; commit nhật ký saudeploy khácSHA source là bình thường. KhôngpaidAPI/DBreset, giữowner-private.

- Cần benchmarkGPU/điệnthoạithật vàsoak dài. SwiftShader cuối20frame/9s, mẫu trước29; chưahếtlag/60FPS. Cần tiếp tục tốiưu geometry/fillrate theo profiling.
- Ground3D đãtránh279nhà+507props/cây/người/xe; cần indoorgraph/elevator/animalcollision/IK vàserve/clean/props cótrạngthái. Backend ghi hoàn tất còn theo simulationtime, chưaoccupancy vật lý;2D chưa cùngcollision3D.
- Playbackthoại viewer-local chưađồngbộ giữa người xem. Visitorchat vẫnrules, Qwenlocal1.5B chấtlượngsemantic yếu; needs/experience/cohort nhanh hơn khôngphải nângmodel/fine-tune.
- Visiblepulse30giây/slotliving-v2 5phút; khiđóngtrang phụthuộcautomationhourly cũ. ID6adcbdcc81cc819188a4a2ae65392369; latestrecorded01:00UTC26/10completed, chưapeekrunmới tronglượt10; khôngtạotrùng. Theo dõi quota vàđộbền, khônghứachạyLLM24/7.
- Xe12car/1vòng đãtest; bus/metro chưaboarding/tuyếnquayđầu thật. OSM912footprints vớiheightước lượng, riêngthànhphốmôphỏng/10units/m.
- ChưaownerbrowserQAproduction; API/nativeverified. Ảnhsyntheticlocal đãgửi; localpreview/relay đãdừng. Trướcpublic phải gỡXOM_OWNER_PRIVATE_ORIGIN vàtáchquyền/rate limit.
