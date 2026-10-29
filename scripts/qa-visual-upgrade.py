"""Rendered activity details on local synthetic responses; never writes a live world."""
import json,subprocess,os,datetime
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
base=os.environ.get('QA_BASE','http://127.0.0.1:5177');assert urlparse(base).hostname in ['127.0.0.1','localhost']
out=Path(os.environ.get('QA_OUT',str(root/'docs/screenshots/detail')));out.mkdir(parents=True,exist_ok=True)
reports=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for activity in ['read','garden','eat','market']:
   fixture=json.loads(subprocess.check_output(['node','scripts/social-preview-fixture.mjs',f'--detail={activity}'],cwd=root,text=True))
   page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1.5);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   def respond(route):
    fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat()
    route.fulfill(status=200,content_type='application/json',body=json.dumps(fixture))
   page.route('**/api/world*',respond)
   page.route('**/api/living/pulse',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"duplicate":true}'))
   page.goto(base,wait_until='domcontentloaded',timeout=60000)
   host=page.locator('.three-canvas[data-ready="true"]');host.wait_for(timeout=90000)
   frame=int(host.get_attribute('data-frame'))
   page.wait_for_function('(frame)=>Number(document.querySelector(".three-canvas")?.dataset.frame)>frame+7',arg=frame,timeout=30000)
   assert host.get_attribute('data-human-batches')=='6'
   assert host.get_attribute('data-street-props')=='66'
   assert host.get_attribute('data-animal-batches')=='5'
   point=list(map(float,host.get_attribute('data-position').split(',')))
   pets=json.loads(host.get_attribute('data-animal-positions'));assert len(pets)==3
   assert all(sum((a['position'][i]-point[i])**2 for i in [0,1])**.5>=9.9 for a in pets), 'Animal overlaps An'
   assert int(host.get_attribute('data-draw-calls'))<90
   if activity=='market':
    for _ in range(3):page.get_by_role('button',name='Thu nhỏ',exact=True).click()
    before=int(host.get_attribute('data-frame'));page.wait_for_function('(f)=>Number(document.querySelector(".three-canvas")?.dataset.frame)>f+4',arg=before,timeout=30000)
   page.screenshot(path=str(out/f'{activity}-desktop-preview.png'))
   assert not errors,errors
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   reports.append({'activity':activity,'fixture':'local synthetic; no world writes','renderer':'Chromium SwiftShader','stats':host.evaluate('(e)=>({...e.dataset})')})
   print(activity,'PASS pooled characters, props, effects, no JS errors or overflow',flush=True)
   page.close()
  (out/'metrics.json').write_text(json.dumps(reports,indent=2,ensure_ascii=False))
 finally:browser.close()
