# Bản11 — source và QA đã chốt, chưa phát hành

- Người dùng yêu cầu nâng đồ họa/nhân vật/sự kiện/chuyển động/nhiều đồ vật. XemVISUAL_DETAIL_REVIEW/MEMORY_LONG.24suite/check/lint/build + finalbrowserdesktop/mobile6lượt/controls/motion29frames9s0collision +4activitydetail đạt. Ảnhlocal đãgửi, khôngproduction. Sourceđãcheckpoint70a1044; sẽcommitảnh/doc cuối trước releasebuild.
- Cần source sạch→releasebuild/package/pushSites/save_version_and_deploy_private, nativeversion/readback. Sau đó cập nhậtlatest.json/newledger27/10/README/MEMORY_SHORT +Gitpush. Prod vẫn10source7a7871f,1owner0external; khôngnhầm sourcepush vớideploy.
- Pre11backup pre-v11-20261027-visual.json gitignored SHA256fc7b3cfe1c571a28c32680c0cda62c38433a4bf8636aa6e0e5ec835a4a394206,revision81/13events/memories32,10,11. KhôngpaidAPI/migration/reset. Cần GETpostbackup vàsofile đểxácnhậnhistory/memorycũ giữđủ. Credentialc11 cóthểhếthạn, xinnative mới; khôngđọctokenfiles.

# Việc còn lại sau production version10

Source đang chạy `7a7871f8c04967521b9fff3e2cbf06ae75b8ed7e`; IDs/readback/backuphash ở docs/releases/latest.json và ledger26/10. Luôn push checkpoint nhánhwork trước bước lâu; commit nhật ký saudeploy khácSHA source là bình thường. KhôngpaidAPI/DBreset, giữowner-private.

- Cần benchmarkGPU/điệnthoạithật vàsoak dài. SwiftShader cuối20frame/9s, mẫu trước29; chưahếtlag/60FPS. Cần tiếp tục tốiưu geometry/fillrate theo profiling.
- Ground3D đãtránh279nhà+507props/cây/người/xe; cần indoorgraph/elevator/animalcollision/IK vàserve/clean/props cótrạngthái. Backend ghi hoàn tất còn theo simulationtime, chưaoccupancy vật lý;2D chưa cùngcollision3D.
- Playbackthoại viewer-local chưađồngbộ giữa người xem. Visitorchat vẫnrules, Qwenlocal1.5B chấtlượngsemantic yếu; needs/experience/cohort nhanh hơn khôngphải nângmodel/fine-tune.
- Visiblepulse30giây/slotliving-v2 5phút; khiđóngtrang phụthuộcautomationhourly cũ. ID6adcbdcc81cc819188a4a2ae65392369; latestrecorded01:00UTC26/10completed, chưapeekrunmới tronglượt10; khôngtạotrùng. Theo dõi quota vàđộbền, khônghứachạyLLM24/7.
- Xe12car/1vòng đãtest; bus/metro chưaboarding/tuyếnquayđầu thật. OSM912footprints vớiheightước lượng, riêngthànhphốmôphỏng/10units/m.
- ChưaownerbrowserQAproduction; API/nativeverified. Ảnhsyntheticlocal đãgửi; localpreview/relay đãdừng. Trướcpublic phải gỡXOM_OWNER_PRIVATE_ORIGIN vàtáchquyền/rate limit.
