"""Actual model/texture/animation browser checks on the local resource gallery."""
import json, os
from urllib.parse import urlparse
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.environ.get('QA_BASE','http://127.0.0.1:5191');assert urlparse(base).hostname in ['127.0.0.1','localhost']
catalog=json.loads(Path('public/models/resources/catalog.json').read_text());citizens=json.loads(Path('public/models/citizens/catalog.json').read_text());catalog['assets']+=citizens['assets'];samples=['citizens/an','citizens/binh','citizens/chi','citizens/senior','citizens/cardigan']
for pack in catalog['packs']:
 sample=next(a for a in catalog['assets'] if a['pack']==pack['id'] and a['kind']!='animation-library');samples.append(sample['id'])
for id in ['gobkit-human002/it-engineer','gobkit-human002/receptionist','gobkit-animal/corgi','gobkit-birds/eagle','kaykit-adventurers/knight']:
 if id not in samples:samples.append(id)
out=Path(os.environ.get('QA_OUT',str(Path('docs/screenshots/resources'))));out.mkdir(parents=True,exist_ok=True);report=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':1360,'height':900},device_scale_factor=1.25);errors=[];warnings=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:warnings.append(m.text) if 'No target node' in m.text else None)
 try:
  page.goto(base+'/assets',wait_until='domcontentloaded',timeout=60000);host=page.locator('.asset-canvas');host.locator('canvas').wait_for(timeout=30000)
  for id in samples:
   page.locator(f'[data-model-id="{id}"]').click();page.wait_for_function('(id)=>document.querySelector(".asset-canvas")?.dataset.model===id&&document.querySelector(".asset-canvas")?.dataset.loading==="false"',arg=id,timeout=90000)
   page.wait_for_function('(id)=>document.querySelector(".asset-canvas")?.dataset.renderedModel===id&&document.querySelector(".asset-canvas")?.dataset.ready==="true"',arg=id,timeout=30000)
   expected=next(a['triangles'] for a in catalog['assets'] if a['id']==id);assert int(host.get_attribute('data-triangles'))>=expected+48,(id,host.get_attribute('data-triangles'),expected);assert not page.locator('.asset-error').count();assert not errors,errors
   if id in ['gobkit-human002/it-engineer','gobkit-human002/receptionist','gobkit-animal/corgi','gobkit-birds/eagle','kaykit-adventurers/knight']:page.screenshot(path=str(out/(id.replace('/','-')+'-preview.png')))
   options=page.get_by_label('Chọn chuyển động').locator('option');values=options.evaluate_all('(els)=>els.map(e=>e.value).filter(Boolean)');walk=next((v for v in values if 'walk' in v.lower()),None)
   if walk:page.get_by_label('Chọn chuyển động').select_option(walk);page.wait_for_function('(v)=>document.querySelector(".asset-canvas")?.dataset.clip===v',arg=walk,timeout=30000)
   report.append({'id':id,'stats':host.evaluate('(e)=>({...e.dataset})')});print(id,'PASS real model and clip',flush=True)
  assert not warnings,warnings
  # Pausing must freeze actual bones and stop GPU draws after damping settles.
  page.locator('[data-model-id="gobkit-human002/it-engineer"]').click()
  page.wait_for_function('document.querySelector(".asset-canvas")?.dataset.model==="gobkit-human002/it-engineer"&&document.querySelector(".asset-canvas")?.dataset.ready==="true"')
  page.get_by_label('Chọn chuyển động').select_option('Walk')
  page.wait_for_timeout(400);a=host.get_attribute('data-pose');page.wait_for_timeout(400);assert host.get_attribute('data-pose')!=a
  page.get_by_role('button',name='Tạm dừng model',exact=True).click();page.wait_for_timeout(1200)
  frozen=host.get_attribute('data-pose');frames=host.get_attribute('data-frames');page.wait_for_timeout(700)
  assert host.get_attribute('data-pose')==frozen;assert host.get_attribute('data-frames')==frames
  page.get_by_label('Chọn chuyển động').select_option('Talk');page.wait_for_function('document.querySelector(".asset-canvas")?.dataset.clip==="Talk"')
  assert host.get_attribute('data-pose')!=frozen,'A paused clip change must render the new pose'
  page.screenshot(path=str(out/'engineer-desktop-preview.png'))
  # Rapid selections must never let an old load replace the current model.
  ids=['gobkit-human001/cashier','gobkit-farm/bull','kaykit-adventurers/knight']
  page.evaluate('async(ids)=>{for(const id of ids){document.querySelector(`[data-model-id="${id}"]`).click();await new Promise(requestAnimationFrame)}}',ids)
  page.wait_for_function('(id)=>document.querySelector(".asset-canvas")?.dataset.renderedModel===id&&document.querySelector(".asset-canvas")?.dataset.ready==="true"',arg=ids[-1],timeout=60000)
  page.wait_for_timeout(500);assert host.get_attribute('data-model')==ids[-1]
  # Lost contexts have an explicit recovery control and exactly one live canvas afterward.
  host.locator('canvas').evaluate('(canvas)=>canvas.getContext("webgl2").getExtension("WEBGL_lose_context").loseContext()')
  page.get_by_role('button',name='Thử lại 3D',exact=True).wait_for()
  page.get_by_role('button',name='Thử lại 3D',exact=True).click()
  page.wait_for_function('(id)=>document.querySelector(".asset-canvas")?.dataset.renderedModel===id&&document.querySelector(".asset-canvas")?.dataset.ready==="true"',arg=ids[-1],timeout=60000)
  assert host.locator('canvas').count()==1
  # A failed fetch is retryable without navigating away or resetting any world data.
  # A recoverable load failure must reject compressed and canonical transports.
  transfer=json.loads((Path(__file__).resolve().parent.parent/'data/assets/city-transfer-manifest.json').read_text())
  target=next(a for a in transfer['assets'] if a['id']=='citizens/an')
  failed=[False];rejecting=[True]
  def fail_once(route):
   if rejecting[0]:failed[0]=True;route.abort()
   else:route.continue_()
  page.route('**'+target['url'],fail_once)
  page.route('**/citizens/an.glb*',fail_once)
  page.locator('[data-model-id="citizens/an"]').click()
  page.get_by_role('button',name='Thử lại 3D',exact=True).wait_for(timeout=20000)
  rejecting[0]=False
  page.get_by_role('button',name='Thử lại 3D',exact=True).click()
  page.wait_for_function('document.querySelector(".asset-canvas")?.dataset.renderedModel==="citizens/an"&&document.querySelector(".asset-canvas")?.dataset.ready==="true"',timeout=60000)
  assert failed[0] and not page.locator('.asset-error').count()
  page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/'gallery-mobile-preview.png'))
  (out/'metrics.json').write_text(json.dumps({'production':False,'renderer':'Chromium SwiftShader','cases':report,'pageErrors':errors,'bindingWarnings':warnings,'pauseStopsDraws':True,'pausedClipChange':True,'selectionRace':True,'contextLossRetry':True,'loadFailureRetry':True},indent=2))
 finally:b.close()
