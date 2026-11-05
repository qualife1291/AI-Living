"""Compiled loopback UI/a11y and actual GPU draw counters. No remote writes.

Download pinned axe-core4.11.0 to QA_AXE_PATH; the digest is checked before
injection. Browser tests are development tools, never shipped in the app.
"""
import datetime, hashlib, json, os, subprocess
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
base=os.environ.get('QA_BASE','http://127.0.0.1:5342')
assert urlparse(base).hostname in ('127.0.0.1','localhost')
axe=Path(os.environ.get('QA_AXE_PATH','/tmp/ai-living-axe-4.11.0.min.js'))
assert hashlib.sha256(axe.read_bytes()).hexdigest()=='e9e5863c33a874f09bc01acd9234b7e3c871479f5eef8802fa582544465e6d01'
out=Path(os.environ.get('QA_OUT','work/ui-review/final'));out.mkdir(parents=True,exist_ok=True)
report=[]
fixture=json.loads(subprocess.check_output(['node','scripts/social-preview-fixture.mjs','--detail=read'],cwd=root,text=True))
def save():
 (out/'metrics.json').write_text(json.dumps({'production':False,'source':os.environ.get('QA_SOURCE_SHA') or subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'renderer':'Chromium SwiftShader','axe':'4.11.0','fixture':'Synthetic world; intercepted API writes; no remote D1','cases':report},ensure_ascii=False,indent=2)+'\n')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for label,w,h,dpr in [('desktop',1440,900,2),('mobile',390,844,3),('compact',320,568,2),('landscape',844,390,2)]:
   page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=dpr,is_mobile=w<700,has_touch=True);errors=[];writes=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def api(r):
    if r.request.method!='GET':writes.append(r.request.url)
    r.fulfill(status=200,content_type='application/json',body='{"ok":true,"views":1,"duplicate":true}')
   page.route('**/api/**',api)
   def world(r):
    assert r.request.method=='GET','UI review cannot change world state'
    fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat()
    r.fulfill(status=200,content_type='application/json',body=json.dumps(fixture))
   page.route('**/api/world*',world)
   def audit(scene):
    page.add_script_tag(path=str(axe))
    result=page.evaluate('''async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return {version:axe.version,violations:r.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)})),incomplete:r.incomplete.length};}''')
    assert result['version']=='4.11.0';assert not result['violations'],(scene,label,result)
    assert not errors,(scene,label,errors)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(scene,label,'horizontal overflow')
    page.screenshot(path=str(out/(scene+'-'+label+'.png')))
    report.append({'scene':scene,'viewport':label,'a11y':result,'pageErrors':errors.copy()});save();print('PASS',scene,label,flush=True)
   def in_view(selector):
    boxes=page.locator(selector).evaluate_all('(els)=>els.filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height).map(e=>({name:e.getAttribute("aria-label")||e.textContent.trim(),x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}))')
    assert boxes
    for b in boxes:assert b['x']>=0 and b['y']>=0 and b['x']+b['w']<=w+1 and b['y']+b['h']<=h+1,(label,b)
   page.goto(base,wait_until='domcontentloaded',timeout=60000)
   city=page.locator('.three-canvas[data-ready=true]');city.wait_for(timeout=90000)
   in_view('.urban-camera button,.urban-vehicle-camera button')
   assert city.locator('canvas').evaluate('(e)=>e.width*e.height')<=2000000
   audit('city')
   page.evaluate('window.__cityCanvas=document.querySelector(".three-canvas canvas")')
   page.get_by_role('button',name='Địa điểm',exact=True).click()
   page.wait_for_function('document.querySelector(".three-canvas").dataset.renderState==="suspended"')
   before=city.get_attribute('data-frame');page.wait_for_timeout(900)
   assert city.get_attribute('data-frame')==before,'Hidden city must stop GPU draws'
   page.locator('.venue-grid button').filter(has_text='Thư viện').click()
   room=page.locator('.interior-canvas');room.scroll_into_view_if_needed()
   page.wait_for_function('JSON.parse(document.querySelector(".interior-canvas")?.dataset.interiorModels||"[]").length===3',timeout=60000)
   page.evaluate('window.__roomCanvas=document.querySelector(".interior-canvas canvas")')
   for name,mode in [('Theo cư dân','follow'),('Góc trên cao','overhead'),('Toàn phòng','wide')]:
    before=int(room.get_attribute('data-interior-frames'));page.get_by_role('button',name=name,exact=True).click();room.scroll_into_view_if_needed()
    page.wait_for_function('([mode,before])=>{const e=document.querySelector(".interior-canvas");return e.dataset.interiorCamera===mode&&Number(e.dataset.interiorFrames)>before}',arg=[mode,before])
    assert page.evaluate('window.__roomCanvas===document.querySelector(".interior-canvas canvas")')
   page.get_by_role('button',name='Tầng 2',exact=True).click();room.scroll_into_view_if_needed()
   page.wait_for_function('document.querySelector(".interior-canvas").dataset.interiorFloor==="1"&&document.querySelector(".interior-canvas").dataset.interiorModels==="[]"')
   page.get_by_role('button',name='Tầng trệt',exact=True).click();room.scroll_into_view_if_needed()
   page.wait_for_function('JSON.parse(document.querySelector(".interior-canvas").dataset.interiorModels).length===3')
   assert page.evaluate('window.__roomCanvas===document.querySelector(".interior-canvas canvas")')
   assert room.locator('canvas').evaluate('(e)=>e.width*e.height')<=2000000
   page.locator('.live-drawer').evaluate('(e)=>{e.scrollTop=e.scrollHeight}')
   page.wait_for_function('document.querySelector(".interior-canvas").dataset.renderState==="suspended"')
   before=room.get_attribute('data-interior-frames');page.wait_for_timeout(900);assert room.get_attribute('data-interior-frames')==before
   room.scroll_into_view_if_needed();page.wait_for_function('document.querySelector(".interior-canvas").dataset.renderState==="active"')
   if label=='desktop':
    room.locator('canvas').evaluate('(c)=>c.getContext("webgl2").getExtension("WEBGL_lose_context").loseContext()')
    page.get_by_role('button',name='Thử lại 3D nội thất',exact=True).click();room.scroll_into_view_if_needed()
    page.wait_for_function('JSON.parse(document.querySelector(".interior-canvas").dataset.interiorModels).length===3',timeout=60000)
    assert room.locator('canvas').count()==1
   audit('interior')
   report.append({'scene':'render-budget','viewport':label,'cityDrawsBehindModal':0,'offscreenInteriorDraws':0,'cameraAndFloorKeepCanvas':True,'pixelsCapped':True});save()
   page.keyboard.press('Escape');page.wait_for_function('document.querySelector(".three-canvas").dataset.renderState==="active"')
   assert page.evaluate('window.__cityCanvas===document.querySelector(".three-canvas canvas")')
   page.goto(base+'/studio',wait_until='domcontentloaded',timeout=60000);studio=page.locator('.studio-canvas[data-ready=true]');studio.wait_for(timeout=90000)
   page.get_by_role('button',name='Phân cảnh 4',exact=True).click();page.wait_for_function('document.querySelector(".studio-canvas").dataset.beat==="3"')
   in_view('.studio-timeline button,.studio-timeline input')
   assert studio.locator('canvas').evaluate('(e)=>e.width*e.height')<=2000000
   page.wait_for_timeout(500);frames=studio.get_attribute('data-frames');page.wait_for_timeout(500);assert studio.get_attribute('data-frames')==frames
   page.locator('.studio-person').first.click();page.wait_for_function('JSON.parse(document.querySelector(".studio-canvas").dataset.camera).mode==="actor"')
   distance=json.loads(studio.get_attribute('data-camera'))['distance'];page.mouse.move(w*.55,h*.5);page.mouse.wheel(0,-400)
   page.wait_for_function('(distance)=>Math.abs(JSON.parse(document.querySelector(".studio-canvas").dataset.camera).distance-distance)>.1',arg=distance)
   page.emulate_media(reduced_motion='reduce');page.wait_for_function('document.querySelector(".studio-canvas").dataset.reducedMotion==="true"')
   if label=='desktop':
    studio.locator('canvas').evaluate('(c)=>c.getContext("webgl2").getExtension("WEBGL_lose_context").loseContext()')
    page.get_by_role('button',name='Thử lại 3D Studio',exact=True).click();page.locator('.studio-canvas[data-ready=true]').wait_for(timeout=90000)
    assert page.locator('.studio-canvas canvas').count()==1
   page.get_by_role('button',name='Góc quay theo kịch bản',exact=True).click()
   audit('studio')
   if label in ('desktop','mobile'):
    page.goto(base+'/assets',wait_until='domcontentloaded',timeout=60000);asset=page.locator('.asset-canvas')
    page.wait_for_function('document.querySelector(".asset-canvas")?.dataset.renderedModel==="supplied/office"',timeout=60000)
    page.locator('[data-model-id="supplied/props/book"]').click()
    page.wait_for_function('document.querySelector(".asset-canvas")?.dataset.renderedModel==="supplied/props/book"',timeout=60000)
    asset.scroll_into_view_if_needed();page.wait_for_timeout(500)
    frames=int(asset.get_attribute('data-frames'));box=asset.bounding_box();page.mouse.move(box['x']+box['width']*.55,box['y']+box['height']*.4);page.mouse.wheel(0,-200)
    page.wait_for_function('(before)=>Number(document.querySelector(".asset-canvas").dataset.frames)>before',arg=frames)
    audit('assets')
    page.get_by_role('link',name='Trở về xóm',exact=True).click();page.wait_for_url(base+'/');page.locator('.three-canvas[data-ready=true]').wait_for(timeout=90000)
   assert not errors,errors
   assert not any('/api/living/' in url for url in writes),'Review cannot mutate personal learning or plans'
   page.close()
 except BaseException:
  try:page.screenshot(path=str(out/'failure.png'));(out/'failure.json').write_text(json.dumps({'errors':errors,'body':page.locator('body').inner_text()[-2500:]},ensure_ascii=False,indent=2))
  except Exception:pass
  raise
 finally:save();browser.close()
