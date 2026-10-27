"""Actual local Chromium QA; synthetic tag plans, no database writes."""
import json, os, subprocess, datetime, time
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
base=os.environ.get('QA_BASE','http://127.0.0.1:5180')
assert urlparse(base).hostname in ['127.0.0.1','localhost']
out=root/'docs/screenshots/tag';out.mkdir(parents=True,exist_ok=True)
report=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for name,width,height in [('desktop',1280,800),('mobile',390,844)]:
   fixture=json.loads(subprocess.check_output(['node','scripts/social-preview-fixture.mjs','--detail=tag'],cwd=root,text=True))
   fixture['world']['living']['residents']=[]
   fixture['world']['people'][2]['plan']['steps'][0]['kind']='read'
   page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1,is_mobile=name=='mobile',has_touch=name=='mobile')
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   polls=[0]
   def respond(route):
    polls[0]+=1
    fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat()
    if route.request.method=='POST':
     body=route.request.post_data_json
     if 'paused' in body:
      now=int(time.time()*1000)
      if body['paused']:fixture['world']['clock']['pausedAt']=now
      else:
       clock=fixture['world']['clock'];clock['anchors'][-1]['realMs']+=now-clock['pausedAt'];clock['pausedAt']=None
      fixture['world']['paused']=body['paused']
    route.fulfill(status=200,content_type='application/json',body=json.dumps(fixture))
   page.route('**/api/world*',respond)
   page.route('**/api/living/pulse',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"duplicate":true}'))
   page.goto(base,wait_until='domcontentloaded',timeout=60000)
   host=page.locator('.three-canvas[data-ready="true"]');host.wait_for(timeout=90000)
   page.wait_for_function('JSON.parse(document.querySelector(".three-canvas")?.dataset.tagCast??"[]").length===2',timeout=60000)
   samples=page.evaluate('''async()=>{const s=[],end=performance.now()+14000;let prev='';while(performance.now()<end){await new Promise(requestAnimationFrame);const e=document.querySelector('.three-canvas');if(e?.dataset.frame!==prev){prev=e.dataset.frame;s.push(JSON.parse(e.dataset.tagCast??'[]'))}}return s}''')
   assert len(samples)>=15,len(samples)
   by_id=lambda row:{a['id']:a for a in row}
   assert all(len(row)==2 and {a['id'] for a in row}=={'an','binh'} for row in samples),'Stable pair through polling'
   assert all({a['role'] for a in row}=={'chaser','runner'} for row in samples)
   assert max(a['swaps'] for row in samples for a in row)>=1,'Actual rendered catch must switch roles'
   assert all(sum((row[0]['position'][i]-row[1]['position'][i])**2 for i in [0,1])**.5>=9.94 for row in samples)
   for before,after in zip(samples,samples[1:]):
    before=by_id(before)
    for a in after:assert sum((a['position'][i]-before[a['id']]['position'][i])**2 for i in [0,1])**.5<=4.201,'No teleport on catch/poll'
   page.screenshot(path=str(out/f'paired-{name}-preview.png'))
   page.get_by_role('button',name='Tạm nghỉ',exact=True).click()
   page.wait_for_function('document.querySelector(".three-canvas")?.dataset.paused==="true"')
   frozen=host.get_attribute('data-tag-cast');page.wait_for_timeout(1200)
   assert host.get_attribute('data-tag-cast')==frozen,'Pause freezes positions and role state'
   page.get_by_role('button',name='Tiếp tục',exact=True).click()
   page.wait_for_function('document.querySelector(".three-canvas")?.dataset.paused==="false"')
   # A new plan delivered through the real polling path cancels the game.
   fixture['world']['people'][1]['plan']['steps'][0]['kind']='read'
   page.wait_for_function('JSON.parse(document.querySelector(".three-canvas")?.dataset.tagCast??"[]").length===0',timeout=30000)
   assert not errors,errors
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   report.append({'viewport':name,'frames':len(samples),'swaps':max(a['swaps'] for row in samples for a in row),'pollRequests':polls[0],'pause':True,'planCancellation':True,'noTeleport':True,'collisionCount':0,'errors':errors})
   print(name,'PASS paired catch/roles, polling, pause/resume, plan cancellation',report[-1],flush=True)
   page.close()
  (out/'metrics.json').write_text(json.dumps({'production':False,'renderer':'Chromium SwiftShader','fixture':'synthetic tag plans; no DB writes','cases':report},ensure_ascii=False,indent=2))
 finally:browser.close()
