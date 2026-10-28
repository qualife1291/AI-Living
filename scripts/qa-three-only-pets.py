"""Local synthetic browser QA for the 3D-only UI and pet walks; no DB writes."""
import json, os, subprocess, datetime, time
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
base=os.environ.get('QA_BASE','http://127.0.0.1:5182');assert urlparse(base).hostname in ['127.0.0.1','localhost']
out=Path(os.environ.get('QA_OUT',str(root/'docs/screenshots/three-only-pets')));out.mkdir(parents=True,exist_ok=True)
report=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for name,width,height in [('desktop',1280,800),('mobile',390,844)]:
   fixture=json.loads(subprocess.check_output(['node','scripts/social-preview-fixture.mjs','--pet-walk'],cwd=root,text=True));fixture['world']['living']['residents']=[]
   page=b.new_page(viewport={'width':width,'height':height},device_scale_factor=1,is_mobile=name=='mobile',has_touch=name=='mobile');errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   def world_route(r):
    fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat()
    if r.request.method=='POST':
     data=r.request.post_data_json;now=int(time.time()*1000);clock=fixture['world']['clock']
     if data.get('paused'):clock['pausedAt']=now
     elif clock['pausedAt'] is not None:clock['anchors'][-1]['realMs']+=now-clock['pausedAt'];clock['pausedAt']=None
     fixture['world']['paused']=data.get('paused',False)
    r.fulfill(status=200,content_type='application/json',body=json.dumps({'ok':True} if r.request.method=='POST' else fixture))
   page.route('**/api/world*',world_route)
   page.route('**/api/living/pulse',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"duplicate":true}'))
   def pet_route(r):
    data=r.request.post_data_json;assert data['revision']==fixture['revision']
    owners=fixture['world']['living']['petOwners']
    if data['owner']:owners[data['pet']]=data['owner']
    else:owners.pop(data['pet'],None)
    fixture['revision']+=1;r.fulfill(status=200,content_type='application/json',body='{"ok":true}')
   page.route('**/api/living/pets',pet_route)
   page.goto(base,wait_until='domcontentloaded',timeout=60000)
   host=page.locator('.three-canvas[data-ready="true"]');host.wait_for(timeout=90000)
   page.get_by_role('button',name='Ẩn giao diện',exact=True).click()
   assert page.locator('.world-overlays').evaluate('(e)=>getComputedStyle(e).visibility==="hidden"')
   page.get_by_role('button',name='Hiện giao diện',exact=True).click()
   page.set_viewport_size({'width':320,'height':640});page.wait_for_timeout(400)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   page.set_viewport_size({'width':width,'height':height})
   page.wait_for_function('JSON.parse(document.querySelector(".three-canvas")?.dataset.petWalks??"[]").some(a=>a.id==="cun"&&a.ownerId==="an")',timeout=30000)
   samples=page.evaluate('''async()=>{const s=[],end=performance.now()+12000;let prev='';while(performance.now()<end){await new Promise(requestAnimationFrame);const e=document.querySelector('.three-canvas');if(e?.dataset.frame!==prev){prev=e.dataset.frame;s.push({owner:e.dataset.position.split(',').map(Number),pets:JSON.parse(e.dataset.petWalks??'[]')})}}return s}''')
   (out/f'pet-samples-{name}.json').write_text(json.dumps(samples,indent=2))
   page.screenshot(path=str(out/f'pet-framing-{name}-preview.png'))
   assert len(samples)>=10;assert any(a['walking'] for s in samples for a in s['pets'])
   assert sum(all(a['onScreen'] and a['clearSightline'] for a in s['pets']) for s in samples)/len(samples)>.8,('Camera must keep the companion in view',sum(all(a['onScreen'] and a['clearSightline'] for a in s['pets']) for s in samples),len(samples))
   for row in samples:
    dog=next(a for a in row['pets'] if a['id']=='cun');gap=sum((dog['position'][i]-row['owner'][i])**2 for i in [0,1])**.5
    assert gap>=9.9,'Pet overlaps its caretaker';assert gap<55,('Companion stays with caretaker',gap)
   for a,c in zip(samples,samples[1:]):
    assert sum((a['pets'][0]['position'][i]-c['pets'][0]['position'][i])**2 for i in [0,1])**.5<=2.401,'Pet never teleports'
   page.screenshot(path=str(out/f'walk-{name}-preview.png'))
   page.get_by_role('button',name='Tạm nghỉ',exact=True).click();page.wait_for_function('document.querySelector(".three-canvas")?.dataset.paused==="true"')
   frozen=host.get_attribute('data-pet-walks');page.wait_for_timeout(1000);assert host.get_attribute('data-pet-walks')==frozen
   page.get_by_role('button',name='Tiếp tục',exact=True).click();page.wait_for_function('document.querySelector(".three-canvas")?.dataset.paused==="false"')
   page.get_by_role('button',name='Cư dân',exact=True).click()
   page.locator('.pet-care summary').click();page.get_by_label('Người chăm sóc Cún',exact=True).select_option('binh')
   page.get_by_text('Đã lưu người chăm sóc.',exact=True).wait_for();assert fixture['world']['living']['petOwners']['cun']=='binh'
   page.wait_for_function('JSON.parse(document.querySelector(".three-canvas")?.dataset.petWalks??"[]").length===0')
   page.locator('.wardrobe-details summary').click();preview=page.locator('.appearance-preview canvas');preview.wait_for(timeout=30000)
   assert preview.bounding_box()['width']>0;assert page.locator('.wardrobe-preview svg').count()==0
   page.get_by_label('Trang phục',exact=True).select_option('police');page.screenshot(path=str(out/f'wardrobe-{name}-preview.png'))
   page.keyboard.press('Escape');page.get_by_role('button',name='Địa điểm',exact=True).click()
   assert page.get_by_role('button',name='Bản đồ 2D · nhẹ',exact=True).count()==0
   page.get_by_role('button',name='Tái dựng từ OpenStreetMap',exact=True).click()
   page.wait_for_function('Number(document.querySelector(".osm-three")?.dataset.buildings)>500',timeout=60000)
   page.get_by_role('button',name='Địa điểm',exact=True).click();page.get_by_role('button',name='Thành phố sống',exact=True).click();host.wait_for(timeout=90000)
   host.locator('canvas').evaluate('(c)=>c.getContext("webgl2").getExtension("WEBGL_lose_context").loseContext()')
   page.get_by_role('button',name='Thử lại 3D',exact=True).wait_for();assert page.locator('.three-canvas canvas').count()==0
   page.get_by_role('button',name='Thử lại 3D',exact=True).click();host.wait_for(timeout=90000)
   assert page.locator('.urban-map').count()==0;assert not errors,errors
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   report.append({'viewport':name,'frames':len(samples),'petFollow':True,'pause':True,'persistedAssignmentMock':True,'wardrobe3D':True,'OSM3D':True,'contextRetry':True,'hideReveal':True,'resize320':True,'no2D':True,'errors':errors})
   print(name,'PASS',report[-1],flush=True);page.close()
  page=b.new_page(viewport={'width':800,'height':600});page.add_init_script('''window.allowGL=false;const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){if(t.includes('webgl')&&!window.allowGL)return null;return original.call(this,t,...a)}''')
  page.route('**/api/world*',world_route);page.route('**/api/living/pulse',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"duplicate":true}'))
  page.goto(base);page.get_by_role('button',name='Thử lại 3D',exact=True).wait_for(timeout=60000)
  assert page.locator('.urban-map').count()==0
  page.evaluate('window.allowGL=true');page.get_by_role('button',name='Thử lại 3D',exact=True).click();page.locator('.three-canvas[data-ready="true"]').wait_for(timeout=90000)
  print('PASS unavailable WebGL recovers after explicit retry without a second renderer',flush=True)
  page.close();(out/'metrics.json').write_text(json.dumps({'production':False,'renderer':'Chromium SwiftShader','cases':report,'noWebGLRetry':True},ensure_ascii=False,indent=2))
 finally:b.close()
