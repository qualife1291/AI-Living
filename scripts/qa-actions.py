"""Render phase B actions against local synthetic plans; never writes world history."""
import json,subprocess,datetime,os
from urllib.parse import urlparse
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.environ.get('QA_BASE','http://127.0.0.1:5177');assert urlparse(base).hostname in ('localhost','127.0.0.1')
out=Path(os.environ.get('QA_OUT',str(Path('docs/screenshots/actions'))));out.mkdir(parents=True,exist_ok=True)
expected={'drink':'holding-right','run':'sprint','jump':'idle','tag':'sprint','cycle':'drive','exercise':'idle','walk-pet':'idle','shop':'holding-right','study':'holding-both'}
report=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  page=b.new_page(viewport={'width':1280,'height':800},device_scale_factor=1);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  fixture={}
  def respond(route):
   fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat();route.fulfill(status=200,content_type='application/json',body=json.dumps(fixture))
  page.route('**/api/world*',respond);page.route('**/api/living/pulse',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"duplicate":true}'))
  for kind,clip in expected.items():
   fixture=json.loads(subprocess.check_output(['node','scripts/social-preview-fixture.mjs',f'--detail={kind}'],text=True))
   # Measure the requested clip without unrelated ambient conversation overrides.
   if kind!='tag':
    fixture['world']['living']['residents']=[]
    for peer,place in zip(fixture['world']['people'][1:],['Phòng Bình','Phòng Chi']):
     peer['plan']['from']=place;peer['plan']['steps'][0]['location']=place
   page.goto(base,wait_until='domcontentloaded',timeout=60000);host=page.locator('.three-canvas[data-ready="true"]');host.wait_for(timeout=90000)
   frame=int(host.get_attribute('data-frame'));page.wait_for_function('(f)=>Number(document.querySelector(".three-canvas")?.dataset.frame)>f+5',arg=frame,timeout=30000)
   if kind=='tag':clip='sprint' if host.get_attribute('data-walking')=='true' else 'idle'
   assert json.loads(host.get_attribute('data-model-actors'))['an']['clip']==clip,(kind,host.get_attribute('data-model-actors'))
   assert host.get_attribute('data-failed-assets')=='0';assert host.get_attribute('data-shadow-map') in ['0','1024'];assert host.get_attribute('data-effective-quality') in ['eco','balanced'];assert host.is_visible();assert not errors,errors
   if kind in ['shop','jump','cycle']:page.screenshot(path=str(out/f'{kind}-desktop-preview.png'))
   if kind=='shop':
    for size in ['2048','0','1024']:
     page.get_by_role('button',name='Chất lượng đồ họa',exact=True).click();page.wait_for_function('(s)=>document.querySelector(".three-canvas")?.dataset.shadowMap===s',arg=size,timeout=30000)
   report.append({'kind':kind,'clip':clip,'stats':host.evaluate('(e)=>({...e.dataset})')});print(kind,'PASS actual GLB and props; no fallback/errors',flush=True)
  (out/'metrics.json').write_text(json.dumps({'production':False,'renderer':'Chromium SwiftShader','cases':report},indent=2,ensure_ascii=False))
 finally:b.close()
