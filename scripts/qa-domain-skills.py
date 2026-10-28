"""Loopback UI fixture; D1 domain persistence is tested separately by test:api:local."""
import json,os,subprocess,datetime
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent;base=os.environ.get('QA_BASE','http://127.0.0.1:5300');assert urlparse(base).hostname in ['localhost','127.0.0.1']
out=root/'docs/screenshots/domain-skills';out.mkdir(parents=True,exist_ok=True);report=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for viewport,width,height in [('desktop',1280,800),('mobile',390,844)]:
   fixture=json.loads(subprocess.check_output(['node','scripts/social-preview-fixture.mjs'],cwd=root,text=True))
   agent={'adult':True,'energy':80,'health':100,'hunger':20,'skill':12,'samples':6,'employment':'employed','actions':{},'memories':['Một ghi chú từ kế hoạch mô phỏng.'],'domainSkills':{'learning':7,'technical':4,'mobility':1}}
   fixture['world']['living']['learning']={'an':agent}
   page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1,is_mobile=viewport=='mobile',has_touch=viewport=='mobile');errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.route('**/api/**',lambda route:route.fulfill(status=200,content_type='application/json',body='{"ok":true,"views":0}'))
   def world(route):
    assert route.request.method=='GET','Unexpected world mutation in read-only drawer QA';fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat();route.fulfill(status=200,content_type='application/json',body=json.dumps(fixture))
   page.route('**/api/world*',world)
   page.goto(base,wait_until='domcontentloaded',timeout=60000);page.locator('.three-canvas[data-ready="true"]').wait_for(timeout=90000)
   page.get_by_role('button',name='Học hỏi',exact=True).click();card=page.locator('.domain-skills');card.locator('summary').click()
   assert card.locator(':scope > ul:not(.domain-skill-gates) > li').count()==8;assert card.get_by_text('7/100',exact=True).is_visible();assert card.get_by_text('4/100',exact=True).is_visible()
   gates=card.locator('.domain-skill-gates');assert gates.locator('li').count()==4;assert gates.get_by_text('Đã mở',exact=True).count()==2;assert gates.get_by_text('Đang học',exact=True).count()==2
   card.scroll_into_view_if_needed();page.screenshot(path=str(out/f'domains-{viewport}-preview.png'))
   page.set_viewport_size({'width':320,'height':720});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert card.evaluate('(e)=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth}');assert 'NaN' not in card.inner_text()
   del agent['domainSkills'];page.reload(wait_until='domcontentloaded');page.get_by_role('button',name='Học hỏi',exact=True).click();card.locator('summary').click();assert 'Các hoạt động đã mở vẫn được giữ.' in card.inner_text();assert gates.get_by_text('Đã mở',exact=True).count()==4
   card.scroll_into_view_if_needed();page.screenshot(path=str(out/f'legacy-{viewport}-preview.png'))
   assert not errors,errors;report.append({'viewport':viewport,'domains':8,'gates':4,'earnedOpen':2,'domainLocked':2,'legacyOpen':4,'responsive320':True,'errors':errors});print('PASS',report[-1],flush=True);page.close()
  (out/'metrics.json').write_text(json.dumps({'production':False,'renderer':'Chromium SwiftShader','fixture':'synthetic skills; no writes','cases':report},ensure_ascii=False,indent=2))
 finally:browser.close()
