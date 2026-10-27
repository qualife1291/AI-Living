"""Actual local UI evidence: overlays and household profiles, synthetic snapshot only."""
import os,json,subprocess,datetime
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
base=os.environ.get('QA_BASE','http://127.0.0.1:5187');assert urlparse(base).hostname in ['localhost','127.0.0.1']
out=root/'docs/screenshots/overlays-households';out.mkdir(parents=True,exist_ok=True);report=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for name,width,height in [('desktop',1280,800),('mobile',390,844)]:
   fixture=json.loads(subprocess.check_output(['node','scripts/social-preview-fixture.mjs'],cwd=root,text=True))
   r=fixture['world']['living']['residents'][0]
   r['plan']={'createdAt':fixture['serverNow'],'simStartedAt':fixture['world']['clock']['anchors'][0]['simMs']-60000,'pausedMs':0,'from':'Xưởng sáng tạo','generator':'rules','steps':[{'location':'Xưởng sáng tạo','kind':'work','activity':'Sắp xếp dụng cụ','duration':3600}]}
   page=b.new_page(viewport={'width':width,'height':height},device_scale_factor=1,is_mobile=name=='mobile',has_touch=name=='mobile');errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   def respond(route):
    fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat();route.fulfill(status=200,content_type='application/json',body=json.dumps(fixture))
   page.route('**/api/world*',respond);page.route('**/api/living/pulse',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"duplicate":true}'))
   page.goto(base,wait_until='domcontentloaded',timeout=60000);host=page.locator('.three-canvas[data-ready="true"]');host.wait_for(timeout=90000)
   bubble=page.locator('.three-speech');bubble.wait_for(timeout=30000)
   page.wait_for_timeout(800)
   labels=page.locator('.actor-name');assert 0<labels.count()<=16,labels.count()
   label_rects=[]
   for label in labels.all():
    rect=label.bounding_box();assert rect['width']<=116.1 and rect['height']<=26.1
    assert rect['x']>=0 and rect['x']+rect['width']<=width
    label_rects.append(rect)
   bounds=bubble.bounding_box();assert bounds['x']>=10 and bounds['x']+bounds['width']<=width-10
   assert bounds['y']>=80 and bounds['y']+bounds['height']<=height-100
   assert 'Kịch bản' in bubble.inner_text()
   assert bubble.locator('p').evaluate('(e)=>e.scrollWidth<=e.clientWidth'),'No horizontal text clipping'
   page.screenshot(path=str(out/f'dialogue-{name}-preview.png'))
   # Direct labels remain functional controls, not painted text textures.
   target=page.locator('.actor-name[aria-pressed="false"]').first if page.locator('.actor-name[aria-pressed="false"]').count() else labels.first
   target_id=target.get_attribute('data-actor-id');target.click();page.wait_for_function('(id)=>document.querySelector(".three-canvas")?.dataset.selected===id',arg=target_id)
   page.get_by_role('button',name='Cư dân',exact=True).click();page.locator('.people-grid button').filter(has=page.get_by_text(r['name'],exact=True)).click();page.get_by_role('button',name='Cư dân',exact=True).click()
   card=page.locator('.resident-home');card.wait_for();assert r['home']['label'] in card.inner_text()
   members=[x['name'] for x in fixture['world']['living']['residents'] if x['home']['householdId']==r['home']['householdId']]
   assert all(member in card.inner_text() for member in members)
   card.scroll_into_view_if_needed();page.screenshot(path=str(out/f'household-{name}-preview.png'))
   page.keyboard.press('Escape')
   # A long name uses a compact ellipsis with the full text available in title.
   fixture=json.loads(subprocess.check_output(['node','scripts/social-preview-fixture.mjs','--cycle'],cwd=root,text=True));fixture['world']['living']['residents']=[]
   long_name='Nguyễn Thị Ánh Phương Thành Viên';fixture['world']['people'][0]['name']=long_name
   page.reload(wait_until='domcontentloaded');host.wait_for(timeout=90000)
   named=page.locator('.actor-name[aria-pressed="true"]');named.wait_for(timeout=30000)
   assert named.get_attribute('title')==long_name;assert named.bounding_box()['width']<=116.1
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
   report.append({'viewport':name,'labels':len(label_rects),'maxLabelWidth':max(r['width'] for r in label_rects),'bubbleBounds':bounds,'sourceLabel':True,'householdMembers':len(members),'labelSelection':True,'longNameBounded':True,'errors':errors})
   print(name,'PASS',report[-1],flush=True);page.close()
  (out/'metrics.json').write_text(json.dumps({'production':False,'renderer':'Chromium SwiftShader','cases':report},ensure_ascii=False,indent=2))
 finally:b.close()
