# Main mới đã tích hợp — chờ kiểm thử
- origin/main a5b7c5a có code Gemini/phaseA+B, thaycolormaps+ảnhthamchiếu, telemetrymigration0006+NPCplans/actions. Không còn blocker ZIP32MiB. Đã merge cùngWIP Studioabort/dispose/playbackelapsed/Node22.18/CIlintbuild/LODcamera8units. Chưa deploy12;prod11/latest.json nguồntruth.
- Đọc docs/FIXES_PHASE_A.md, PHASE_B_ACTIONS.md, GRAPHICS_3D_PACK.md. Chưa hoàn tấtC/D: tagtheocặp/cyclephysics/petowner/density/household/trafficgraph/LinUCB/durablehistory. Cần phân biệt featurebacklog với lỗi thật; review/runtests/browsertrênmainmới trướcpháthành.
- Ảnhdocsscreenshots bịGemini thay bằngảnhgen, giữpublic/renders-3d làmreference; đangrestoreảnhQAthậtđãlưu trongGit. Localpreview5177 vẫnbuildcũ, phải dừng/rebuild saumerge. Unit27suite/check/lint/build củasourcecũđạt, 8studio×5shot/desktopmobile +live6line vàmotion26frames9s, khôngápdụngthaychoGemini.
- Pre12backupgitignored revision94/16events/mem38,12,13 hash2e554fd296f8c9e05bd1f74dd7169a9e4055415f0f707b4f9b8b214a00a13b7b. Siteownerprivate1owner0external. Khôngđãápdụng0006prod;backupmới trướcmigration. Source/ledgerkhácSHA làbìnhthường.
- Autoapproval từngbácCI contents:write/autopush; cuốiđãgỡvàpushđượcreadonly. CI hiệncontents:read, khôngtựpush/deploy. LocalassetsmaintainghibindingschỉworkspacetheoapprovedCC0,khôngselftraining.

# Bugfix checkpoint sau merge main
- Đã bắt/sửa bag không có whitelist (shop crash), procedural rotations cộng lặp cùng timestamp, props/bike mồ côi khiactorẩn; test-phase-b mới đạt. Telemetry chỉxóa pending sau JSONok:true, giữkhiHTMLlogin200/okfalse; testsđạt. Studioabort/dispose/playbackelapsed và on-demanddraw đangcode, cần QA lại.
- Migration0006 chưa prod thiếu statement-breakpoint, schemaindex và snapshot: đã táchDDL, addschemaindex, snapshot6 từDrizzlegenerate xácnhận12tablecũ khôngđổi. Cầnreal D1migration/APItests. Khôngsửa migration0–5.
- Shadowbudget eco0/balanced512mobile1024desktop/sharp2048, shadowfrustumtheonhânvật36m thay190m, LOD8unit; render-errorfallback2D cótelemetry. Cầnbrowser/perf. pnpm audit prod đã cóadvisory, cầnphânloạivàpinpatchtrướcrelease. Check/lint đangrunwork/main-*-final.log. Prod11 chưađổi.

- Dependency patch đã cài bằngpnpm policy nguyênvẹn: Next/eslint-config-next16.4.1, Zod4.6.6; compatibleoverrides Babel7.29.6/browserlist4.28.7/baseline2.11/source-map-js1.2.2/fast-uri3.1.9/sharp.35.5. Chưa xác minh app sauZodmajor; tiếpcheck/lint/full29suite/build/API/browser/audit. Reviewdocdocs/MAIN_REVIEW_2026-10-27.md cófindingsvàbacklog trungthực; finalmetriccònchờ.

# Browser regression bắt thêm thoại/FPS
- StudioGemini8cases×5shot đạt; pauseidle khôngvẽGPU. API mớiD1/migrationindex/pulse ownerguard/limits/retry đều đạt. Nhưngsocialbrowser chỉ5/6 câu; motion12frames9s/442445triangles/67calls/0collision. ĐãsửaSocialDirector giữlineindex/lineStartedAt, mỗi lateframechỉtiếpmộtlượt; thêmtest4.7sframe thấyđủ6(29socialcaseđạt). Grammar giữtopicchung, test800câu/50history+topicđạt.
- GiữGeminiqualitycao cho sharp, crowd balanced/eco geometrynhẹ lại,6batch/ID khôngđổi; test switchquality/finereturn/vertexbudget. Cầnbuildvàretestbrowser. Healthmới checkclientlogs để0006thiếu khôngbáoready. NativeDBoverviewprod12tables chưaclientlogs xácnhận0006chưaápdụng; prod11.

- Saufixcursor, browserđãthấyđủ6 nhưngQAharnessso sánhcurrentbubbleđãlàB vớiline[1]B bịfalsefail; sửa so sánhfirstObservedline[0]. ThêmackHUDsaurender đểGPUstartup3s khôngăn thờigianđọc. Socialtests30caseđạt. Cầnrebuild/rerunfinalsocial/motion/actions, khôngcoi trướcbuildQA làfinal. Nguồncurrentecfdd4c+WIP.

- Browserfinalđãđủ6câu+alternating, cònfaildrawcallbudget90 doGeministaticmeshtạoshadowpasscho từngmodel. Đãđểbalanced dùngGPUshadowchoactors+contactstatic;sharp giữstaticfullshadow. Newunitasserttogglecastkhôngcầnđổicamera. Cầnrebuild+finalQA. Pre12mainbackuprev108/17events/mem39,13,14 hash3bc5b7eb5100bfa1e082025994e0e4d59ada53bf7c09b2f8803575140efd7dcf. NativeDB12tables0006chưaapplied.
