"""Actual model/texture/animation browser checks on the local resource gallery."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
catalog=json.loads(Path('public/models/resources/catalog.json').read_text());samples=[]
for pack in catalog['packs']:
 sample=next(a for a in catalog['assets'] if a['pack']==pack['id'] and a['kind']!='animation-library');samples.append(sample['id'])
for id in ['gobkit-human002/it-engineer','gobkit-human002/receptionist','gobkit-animal/corgi','gobkit-birds/eagle','kaykit-adventurers/knight']:
 if id not in samples:samples.append(id)
out=Path('docs/screenshots/resources');out.mkdir(parents=True,exist_ok=True);report=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':1360,'height':900},device_scale_factor=1.25);errors=[];warnings=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:warnings.append(m.text) if 'No target node' in m.text else None)
 try:
  page.goto('http://127.0.0.1:5177/assets',wait_until='domcontentloaded',timeout=60000);host=page.locator('.asset-canvas');host.locator('canvas').wait_for(timeout=30000)
  for id in samples:
   page.locator(f'[data-model-id="{id}"]').click();page.wait_for_function('(id)=>document.querySelector(".asset-canvas")?.dataset.model===id&&document.querySelector(".asset-canvas")?.dataset.loading==="false"',arg=id,timeout=90000)
   page.wait_for_function('(id)=>document.querySelector(".asset-canvas")?.dataset.renderedModel===id',arg=id,timeout=30000)
   assert int(host.get_attribute('data-triangles'))>100;assert not page.locator('.asset-error').count();assert not errors,errors
   if id in ['gobkit-human002/it-engineer','gobkit-human002/receptionist','gobkit-animal/corgi','gobkit-birds/eagle','kaykit-adventurers/knight']:page.screenshot(path=str(out/(id.replace('/','-')+'-preview.png')))
   options=page.get_by_label('Chọn chuyển động').locator('option');values=options.evaluate_all('(els)=>els.map(e=>e.value).filter(Boolean)');walk=next((v for v in values if 'walk' in v.lower()),None)
   if walk:page.get_by_label('Chọn chuyển động').select_option(walk);page.wait_for_function('(v)=>document.querySelector(".asset-canvas")?.dataset.clip===v',arg=walk,timeout=30000)
   report.append({'id':id,'stats':host.evaluate('(e)=>({...e.dataset})')});print(id,'PASS real model and clip',flush=True)
  assert not warnings,warnings
  page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/'gallery-mobile-preview.png'))
  (out/'metrics.json').write_text(json.dumps({'production':False,'renderer':'Chromium SwiftShader','cases':report,'pageErrors':errors,'bindingWarnings':warnings},indent=2))
 finally:b.close()
