"""Local browser regression: actual per-frame locomotion, no crossing solid footprints."""
import json,subprocess,os,datetime
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
base=os.environ.get('QA_BASE','http://127.0.0.1:5177');assert urlparse(base).hostname in ['127.0.0.1','localhost']
out=root/'docs/screenshots/motion';out.mkdir(parents=True,exist_ok=True)
fixture=json.loads(subprocess.check_output(['node','scripts/social-preview-fixture.mjs','--motion'],cwd=root,text=True))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  page=b.new_page(viewport={'width':1280,'height':800},device_scale_factor=1.5);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def respond(route):
   fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat()
   route.fulfill(status=200,content_type='application/json',body=json.dumps(fixture))
  page.route('**/api/world*',respond);page.route('**/api/living/pulse',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"duplicate":true}'))
  page.goto(base,wait_until='domcontentloaded',timeout=60000);host=page.locator('.three-canvas[data-ready="true"]');host.wait_for(timeout=90000)
  samples=page.evaluate('''async()=>{const samples=[],end=performance.now()+9000;let oldFrame='';while(performance.now()<end){await new Promise(requestAnimationFrame);const e=document.querySelector('.three-canvas');if(e?.dataset.frame!==oldFrame){oldFrame=e.dataset.frame;samples.push({at:performance.now(),position:e.dataset.position.split(',').map(Number),camera:e.dataset.camera,walking:e.dataset.walking==='true',animals:JSON.parse(e.dataset.animalPositions??'[]')})}}return samples}''')
  assert len(samples)>=10,len(samples)
  moving=[(a,b) for a,b in zip(samples,samples[1:]) if a['walking'] and b['walking']]
  assert len(moving)>=8,len(moving)
  stationary=sum(a['position']==b['position'] for a,b in moving)
  assert stationary/len(moving)<.2,{'staleFrames':stationary,'motionFrames':len(moving)}
  for sample in samples:
   x,z=sample['position']
   assert len(sample['animals'])==3
   for animal in sample['animals']:assert sum((animal['position'][i]-sample['position'][i])**2 for i in [0,1])**.5>=9.9, 'Animal overlaps the main character'
   for rect in fixture['obstacles']:assert not(abs(x-rect['x'])<rect['width']/2+4.75 and abs(z-rect['z'])<rect['depth']/2+4.75),(sample,rect)
  jumps=[sum((a['position'][i]-b['position'][i])**2 for i in [0,1])**.5 for a,b in moving]
  assert max(jumps)<=2.5,max(jumps)
  page.screenshot(path=str(out/'walking-desktop-preview.png'))
  assert not errors,errors
  metrics={'renderer':'Chromium SwiftShader','fixture':'local synthetic An room→Bình room','frames':len(samples),'movingFrames':len(moving),'staleFrameRatio':stationary/len(moving),'maximumStepUnits':max(jumps),'collisionCount':0,'stats':host.evaluate('(e)=>({...e.dataset})')}
  (out/'metrics.json').write_text(json.dumps(metrics,indent=2,ensure_ascii=False));print(json.dumps(metrics),flush=True)
 finally:b.close()
