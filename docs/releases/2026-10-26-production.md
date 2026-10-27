# Production version9 — 26/10/2026

- Native succeeded lúc01:14:56UTC (08:14giờ Việt Nam), URL https://xom-ai-long.bouncyslug18.chatgpt.site, giữowner-private1owner/0external.
- Source `287f2d837a830f56d7dc71c2013cf7748fa22464`, đãpush GitHubwork vàSitesmain trướcdeploy. Version `appgprj_6adc7dc364d48191a09202c5b43309e4~appgver_b06628b9dae88191ab265218f2e4474f`, deployment `appgdep_6adea97fc980819196a6a47bfa3b38d2`, envrevision1. Nativeget_site_version xác minh SHA/version9.
- Không migration/repair DB. Backup pre9 riêng/gitignored, SHA256 `331e1532845874a6120c64d84c0b56600a1513a0f52dd20afc781cd88bc580be`. Gói build từ đúngsource sạch, loạiDB/fixture/token; chỉ ledger/hash vàoGit.
- Postreadback healthready,revision37,5eventIDs trước còn đủ, memories17/6/5 so15/6/5 trướcdeploy. Living33/stale=false; tăngkýức từlượt sinhhoạtthật, khôngtestevent. APIreadsample2745ms qua serviceaccess, khôngSLA. Không thaywriter/schema nên không tạo writefixture mới.
-20suite/check/lint/build;28socialcases,8walkcases/1089routes,22740vehicle states vàactualsnapshotreplay30actors/1800frames khônggiaofootprintnhà/xe. Testđãbắt104routebug trước khi sửa.
- Browserlocal: đủ6lượt qua15spoll trên desktop/mobile, motionkhôngstale10Hz/khôngcrossfootprints, pause/offline/reconnect/lifecycle/contextloss/noWebGL/reducedmotion đạt. Ảnhsyntheticlocal đãgửi, khôngnhậnthànhproductionbrowserQA.
- ChunkLOD/vậtliệu nhẹ: sample369600→118418triangles;12→26drawnframes/9s cùngSwiftShader. VẫnkhôngbenchmarkGPUthật/60FPS/soak24h. Bốicảnhcáchđiệu, vậtlýnộithất/đồnhỏ và2Dcollision cònthiếu. XemGROUND_AND_MOTION_REVIEW.
- Automationcũhourlyenabled không đổi tronglượt này; peeklatest01:00UTCcompleted, khôngduplicateAIevent vàreadbackrevision35. Prompt3vai mới từ8 đãđượcchạy; không paidAPI/cron/modelCPUproduction.
- Commitnhật ký sauđây chỉghi kếtquả, không thay source production.


# Production version10 — 26/10/2026

- Native succeeded lúc17:06:40UTC (00:06giờ Việt Nam27/10), URL https://xom-ai-long.bouncyslug18.chatgpt.site. Xác minh lại1owner/0external, giữowner-private.
- Source `7a7871f8c04967521b9fff3e2cbf06ae75b8ed7e` đãpush GitHubwork vàSitesmain. Version `appgprj_6adc7dc364d48191a09202c5b43309e4~appgver_ae4d08f23fcc81919ef5fb6798b972f9`; deployment `appgdep_6adf888ea5e081918accfea668242c51`; envrevision1. Nativeget_site_version xác nhậnversion10 vàđúngSHA.
- Releasebuild/package từHEAD sạch. GzipSHA256 `9e0ac3b035905c332ec0d73a7e7bfdffcdabfbd3964ef3e7a6abb379de2a62ed`; native lưu tar contenthash `sha256:63e52adf4aa52cca97ee830700538c5740b6daf15ab83f42f246974c18dba5b6`,143file. Không migration/DBrepair/reset.
- Pre10backup riêng/gitignored: `c39c1ac9c401e207a9b9b82f8d6996a0d4022df74d365354f18cfee876346918`,revision65/12events/memories28,10,10. PostGETrevision67:đủ12eventIDs cũ vàmemories28,10,10; healthready/directorinstructions/stale=false, sample2478ms qua proxy (khôngSLA).
- Authenticatedpulse200duplicate, `living-v2-2026-10-27-1` đãpersist; readbackrevision68/33agents/371samples, learningupdated0 trênretry; assert history/memory giữ nguyên trước/sau. Không gửi fixture/testevent vào production. Simulationnight nên giữ yên tĩnh, không giả tạo học/thoại.
-23suite/check/lint/build:1089venue routes,507scenery +279building footprints,94trees;22740vehicle states0collision. Personal-space7/autonomy8/camera180projection cases đạt. ColdA*p9510,957ms, max49,668ms trênenv (khôngSLA).
- Browserlocal cuối:desktop/mobile đủ6lượt qua polling; chọnBình→TheoAn, zoom tay thoátfollow, speechkhôngclipngang. Motion20frame/9s/0stale/0collision/maxstep2,408units;111074triangles. Ảnhthựcpreview đãgửi, khôngQAownerbrowserproduction. SwiftShader vẫnchậm/biếnthiên; chưathiếtbịthật/soak24h.
- Vật cản ground/người ởrender3D; cònindoor/elevator/animalcollision/IK vàbackendcompletiontheooccupancy. Policyneeds/novelty/cohort/agenda nângcấp, khôngnhânđiểm/đổiLLM/paidAPI. Visiblepulse30s/slot5min khôngthayschedulehourly lúcđóngtrang. Chi tiết SPACE_CAMERA_AUTONOMY.
- Commitledger sauđây chỉghi kếtquả, khôngthaysourceproduction.
