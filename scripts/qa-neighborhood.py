"""Compiled local city/gallery, synthetic transport; no production writes."""
import os,json,subprocess,datetime
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
base=os.environ.get('QA_BASE','http://127.0.0.1:5340');assert urlparse(base).hostname in ('127.0.0.1','localhost')
out=Path(os.environ.get('QA_OUT','work/neighborhood-2026-10-29/browser'));out.mkdir(parents=True,exist_ok=True);report=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for label,w,h in [('desktop',1440,900),('mobile',390,844)]:
   for count in [48,120,240]:
    page=b.new_page(viewport={'width':w,'height':h},is_mobile=w<700,has_touch=True);errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' and ('Shader Error' in m.text or 'THREE.WebGL' in m.text) else None)
    fixture=json.loads(subprocess.check_output(['node','scripts/neighborhood-preview-fixture.mjs',str(count)],text=True))
    page.route('**/api/**',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"views":1}'))
    def world(r):
     fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat();r.fulfill(status=200,content_type='application/json',body=json.dumps(fixture))
    page.route('**/api/world*',world);page.goto(base,wait_until='domcontentloaded',timeout=60000);host=page.locator('.three-canvas[data-ready="true"]');host.wait_for(timeout=90000)
    page.wait_for_function('Object.keys(JSON.parse(document.querySelector(".three-canvas").dataset.animalModels||"{}")).length===8',timeout=60000);page.wait_for_timeout(800)
    stats=host.evaluate('(h)=>({...h.dataset})');assert not errors,errors
    assert int(stats['actors'])==min(72,count+3);rigs=json.loads(stats['modelActors']);crowd=json.loads(stats['crowdModels']);assert crowd['instances']+len(rigs)==int(stats['actors']);assert len(rigs)<=8
    assert all(v['modelId'].startswith('supplied/') for v in rigs.values());new=json.loads(stats['neighborhoodProps']);assert new['plants']>=300 and len(new['models'])>=10,new
    assert int(stats['failedAssets'])==0,stats
    page.screenshot(path=str(out/f'city-{count}-{label}.png'))
    # Zoom repeatedly through full-city to close range; no shader/context error.
    for _ in range(5):page.get_by_role('button',name='Thu nhỏ',exact=True).click()
    page.wait_for_timeout(300)
    for _ in range(5):page.get_by_role('button',name='Phóng to',exact=True).click()
    page.wait_for_timeout(300);assert not errors,errors
    report.append({'scene':'city','viewport':label,'population':count+3,'errors':errors,'stats':stats});print('PASS city',count,label,flush=True);page.close()
  page=b.new_page(viewport={'width':1280,'height':900});page.route('**/api/**',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"views":1}'));page.goto(base+'/assets',wait_until='domcontentloaded');host=page.locator('.asset-canvas');host.locator('canvas').wait_for(timeout=60000)
  for key in ['book','chair','chessboard','plant','monitor']:
   model='supplied/props/'+key;page.locator(f'[data-model-id="{model}"]').click();page.wait_for_function('(id)=>document.querySelector(".asset-canvas")?.dataset.renderedModel===id&&document.querySelector(".asset-canvas")?.dataset.ready==="true"',arg=model,timeout=60000);page.screenshot(path=str(out/f'prop-{key}.png'));report.append({'scene':'gallery','model':model,'stats':host.evaluate('(h)=>({...h.dataset})')});print('PASS prop',key,flush=True)
  page.close();page=b.new_page(viewport={'width':1440,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  fixture=json.loads(subprocess.check_output(['node','scripts/neighborhood-preview-fixture.mjs','48','--animals'],text=True));page.route('**/api/**',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"views":1}'))
  def animals_world(r):
   fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat();r.fulfill(status=200,content_type='application/json',body=json.dumps(fixture))
  page.route('**/api/world*',animals_world);page.goto(base,wait_until='domcontentloaded',timeout=60000);host=page.locator('.three-canvas[data-ready="true"]');host.wait_for(timeout=90000)
  for _ in range(3):page.get_by_role('button',name='Thu nhỏ',exact=True).click()
  page.wait_for_function('(()=>{const d=JSON.parse(document.querySelector(".three-canvas")?.dataset.animalDraws||"{}");return Object.keys(d).length===8&&Object.values(d).every(n=>n>0)})()',timeout=60000)
  assert not errors,errors;page.screenshot(path=str(out/'animals-park-desktop.png'));report.append({'scene':'animals','errors':errors,'stats':host.evaluate('(h)=>({...h.dataset})')});print('PASS all 8 native animals have actual render callbacks',flush=True)
  (out/'metrics.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 finally:b.close()
