"""Compiled loopback graphics acceptance; synthetic API fixture, never production writes."""
import json,subprocess,datetime,os,time
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
base=os.environ.get('QA_BASE','http://127.0.0.1:5340');assert urlparse(base).hostname in ('127.0.0.1','localhost');out=Path(os.environ.get('QA_OUT','work/graphics-interactions/activities'));out.mkdir(parents=True,exist_ok=True)
report=[]
flags=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=flags)
 try:
  for viewport,w,h,kinds in [('desktop',1440,900,['read','drink','eat','garden','shop','study','exercise','jump','cycle','cook','soccer','swim']),('mobile',390,844,['read','cycle','cook'])]:
   for kind in kinds:
    page=b.new_page(viewport={'width':w,'height':h},is_mobile=w<700,has_touch=True);errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' and any(s in m.text for s in ['THREE.WebGL','Shader Error']) else None)
    fixture=json.loads(subprocess.check_output(['node','scripts/social-preview-fixture.mjs','--detail='+kind]+(['--cycle'] if kind=='cycle' else []),text=True))
    if kind in ['cook','soccer','swim']:
     for person in fixture['world']['people']:
      person['plan']['from']='Công viên';person['plan']['steps']=[{'location':'Công viên','kind':'work' if kind=='cook' else 'social','activity':{'cook':'Nấu ăn','soccer':'Đá bóng','swim':'Bơi'}[kind],'duration':3600}]
    page.route('**/api/**',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"views":1}'))
    def world(r):fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat();r.fulfill(status=200,content_type='application/json',body=json.dumps(fixture))
    page.route('**/api/world*',world);page.goto(base,wait_until='domcontentloaded');host=page.locator('.three-canvas[data-ready="true"]');host.wait_for(timeout=90000)
    page.wait_for_timeout(1700)
    page.screenshot(path=str(out/f'{kind}-{viewport}.png'))
    stats=host.evaluate('(h)=>({...h.dataset})');assert not errors,errors
    rigs=json.loads(stats['modelActors']);assert all(r['profile']=='xom-supplied-v1' for r in rigs.values())
    crowd=json.loads(stats['crowdModels']);assert crowd['instances']+len(rigs)==int(stats['actors']),(crowd,rigs,stats['actors']);assert all(i.startswith('supplied/') for i in crowd['modelIds']);assert len(rigs)<=8
    report.append({'viewport':viewport,'kind':kind,'errors':errors,'stats':stats});print('PASS',kind,viewport,'crowd',crowd['instances'],'triangles',stats['triangles'],flush=True);page.close()
  (out/'metrics.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
 finally:b.close()
