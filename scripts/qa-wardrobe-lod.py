"""Compiled loopback graphics acceptance; synthetic API fixture, never production writes."""
import json,subprocess,datetime,time,os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('QA_OUT','work/graphics-interactions/wardrobe'));out.mkdir(parents=True,exist_ok=True);report=[]
base=os.environ.get('QA_BASE','http://127.0.0.1:5340');assert __import__('urllib.parse',fromlist=['urlparse']).urlparse(base).hostname in ('127.0.0.1','localhost')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for viewport,w,h in [('desktop',1440,900),('mobile',390,844)]:
   page=b.new_page(viewport={'width':w,'height':h},is_mobile=w<700,has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('console',lambda m:errors.append(m.text) if m.type=='error' and 'THREE.WebGL' in m.text else None)
   fixture=json.loads(subprocess.check_output(['node','scripts/social-preview-fixture.mjs','--detail=read'],text=True));fixture['world']['paused']=True;fixture['world']['clock']['pausedAt']=int(time.time()*1000)
   page.route('**/api/**',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"views":1}'))
   def world(r):fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat();r.fulfill(status=200,content_type='application/json',body=json.dumps(fixture))
   def appearance(r):value=r.request.post_data_json;fixture['world']['living'].setdefault('appearances',{})[value['id']]=value['appearance'];fixture['revision']+=1;r.fulfill(status=200,content_type='application/json',body='{"ok":true}')
   page.route('**/api/world*',world);page.route('**/api/living/appearance',appearance);page.goto(base,wait_until='domcontentloaded');host=page.locator('.three-canvas[data-ready="true"]');host.wait_for(timeout=90000)
   page.get_by_role('button',name='Cư dân',exact=True).click();page.locator('.wardrobe-details summary').click();preview=page.locator('.appearance-preview[data-ready="true"]');preview.wait_for(timeout=30000)
   assert preview.get_attribute('data-model')==json.loads(host.get_attribute('data-model-actors'))['an']['modelId']
   page.screenshot(path=str(out/f'before-{viewport}.png'));page.get_by_label('Màu áo',exact=True).fill('#ff2255');page.get_by_label('Quần tây',exact=True).fill('#22ccff');page.get_by_role('button',name='Lưu tạo hình',exact=True).click();page.get_by_role('status').filter(has_text='Đã lưu tạo hình.').wait_for();page.screenshot(path=str(out/f'after-{viewport}.png'))
   frozen=host.get_attribute('data-pose-clock');page.wait_for_timeout(500);assert host.get_attribute('data-pose-clock')==frozen
   for _ in range(3):page.locator('.wardrobe-details summary').click();page.locator('.wardrobe-details summary').click()
   assert preview.locator('canvas').count()==1
   # Select a resident, then zoom far enough to use crowd batches and return.
   button=page.locator('.people-grid button').nth(3);name=button.locator('b').inner_text() if button.locator('b').count() else button.inner_text();button.click();page.wait_for_timeout(250)
   selected=host.get_attribute('data-selected');near=json.loads(host.get_attribute('data-model-actors'))[selected]['modelId']
   for _ in range(14):page.get_by_role('button',name='Thu nhỏ',exact=True).click()
   page.wait_for_timeout(500);crowd=json.loads(host.get_attribute('data-crowd-models'));assignments=crowd['assignments'];assert all(v.startswith('supplied/') for v in assignments.values())
   for _ in range(14):page.get_by_role('button',name='Phóng to',exact=True).click()
   page.get_by_role('button',name='Theo nhân vật',exact=True).click();page.wait_for_timeout(350);assert json.loads(host.get_attribute('data-model-actors'))[selected]['modelId']==near
   page.screenshot(path=str(out/f'resident-{viewport}.png'));assert not errors,errors;report.append({'viewport':viewport,'previewModel':'supplied/office','savePaused':True,'clockFrozen':True,'singlePreviewCanvas':True,'resident':selected,'residentModel':near,'crowd':crowd,'errors':errors});page.close();print('PASS wardrobe/zoom',viewport,flush=True)
  (out/'metrics.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
 finally:b.close()
