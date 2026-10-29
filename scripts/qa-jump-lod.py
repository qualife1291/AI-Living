"""Pause a real jump, remove/reinstall its native controller, preserve lift."""
import json,subprocess,datetime,time,os
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
base=os.environ.get('QA_BASE','http://127.0.0.1:5340');assert urlparse(base).hostname in ('127.0.0.1','localhost')
out=Path(os.environ.get('QA_OUT','work/graphics-interactions/jump-lod'));out.mkdir(parents=True,exist_ok=True);report=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for viewport,w,h in [('desktop',1440,900),('mobile',390,844)]:
   page=b.new_page(viewport={'width':w,'height':h},is_mobile=w<700,has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   fixture=json.loads(subprocess.check_output(['node','scripts/social-preview-fixture.mjs','--detail=jump'],text=True));world=fixture['world'];resident=world['living']['residents'][0];id=resident['id'];resident['plan']=json.loads(json.dumps(world['people'][0]['plan']));resident['plan']['from']='Ga metro';resident['plan']['steps'][0]['location']='Ga metro';world['livingTurn']={**world.get('livingTurn',{}),'residentId':id,'title':'QA jump fixture'}
   page.route('**/api/**',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"views":1}'))
   def route(r):
    if r.request.method=='POST':
     real=int(time.time()*1000);value=r.request.post_data_json;world['paused']=value['paused'];world['clock']['pausedAt']=real if value['paused'] else None;fixture['revision']+=1;r.fulfill(status=200,content_type='application/json',body='{"ok":true}');return
    fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat();r.fulfill(status=200,content_type='application/json',body=json.dumps(fixture))
   page.route('**/api/world*',route);page.goto(base,wait_until='domcontentloaded');host=page.locator('.three-canvas[data-ready="true"]');host.wait_for(timeout=90000);page.get_by_role('button',name='Cư dân',exact=True).click();button=page.locator('.people-grid button').filter(has=page.get_by_text(resident['name'],exact=True));button.click();page.wait_for_function('(id)=>JSON.parse(document.querySelector(".three-canvas").dataset.modelActors)[id]!==undefined',arg=id)
   sample=json.loads(host.get_attribute('data-model-actors'))[id]['position'];floor=float(subprocess.check_output(['node','--input-type=module','-e',f"import {{groundElevation}} from './lib/city/ground.ts';console.log(groundElevation({sample[0]},{sample[2]}))"],text=True))
   for attempt in range(4):
    page.wait_for_function('(a)=>JSON.parse(document.querySelector(".three-canvas").dataset.modelActors)[a.id].position[1]>a.floor+2.5',arg={'id':id,'floor':floor},timeout=20000);page.get_by_role('button',name='Tạm nghỉ',exact=True).click();page.get_by_role('button',name='Tiếp tục',exact=True).wait_for();page.wait_for_timeout(250);before=json.loads(host.get_attribute('data-model-actors'))[id]
    if before['position'][1]>floor+1:break
    page.get_by_role('button',name='Tiếp tục',exact=True).click();page.get_by_role('button',name='Tạm nghỉ',exact=True).wait_for()
   assert before['position'][1]>floor+1,before
   clock=host.get_attribute('data-pose-clock');page.get_by_role('button',name='Cư dân',exact=True).click();page.locator('.people-grid button').first.click();page.wait_for_function('(id)=>JSON.parse(document.querySelector(".three-canvas").dataset.modelActors)[id]===undefined&&JSON.parse(document.querySelector(".three-canvas").dataset.crowdModels).assignments[id]!==undefined',arg=id,timeout=20000)
   far=json.loads(host.get_attribute('data-crowd-models'))['assignments'][id];assert far==before['modelId']
   page.get_by_role('button',name='Cư dân',exact=True).click();button.click();page.wait_for_function('(id)=>JSON.parse(document.querySelector(".three-canvas").dataset.modelActors)[id]!==undefined',arg=id);after=json.loads(host.get_attribute('data-model-actors'))[id];assert abs(before['position'][1]-after['position'][1])<.001,(before,after);assert after['modelId']==before['modelId'];assert host.get_attribute('data-pose-clock')==clock
   page.keyboard.press('Escape');page.screenshot(path=str(out/f'{viewport}.png'));assert not errors,errors;report.append({'viewport':viewport,'actor':id,'model':far,'lift':before['position'][1]-floor,'nativeBefore':before['position'],'nativeAfter':after['position'],'clockFrozen':True,'crowdSkinSame':True,'errors':errors});page.close();print('PASS paused jump native/crowd/native',viewport,flush=True)
  (out/'metrics.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
 except Exception:
  try:page.screenshot(path=str(out/'failure.png'));(out/'failure.json').write_text(json.dumps({'errors':errors,'stats':host.evaluate('(h)=>({...h.dataset})')},indent=2,ensure_ascii=False))
  except Exception:pass
  raise
 finally:b.close()
