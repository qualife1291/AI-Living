"""Local synthetic cycling QA; no database or production mutation."""
import os,json,subprocess,time,datetime
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
base=os.environ.get('QA_BASE','http://127.0.0.1:5185');assert urlparse(base).hostname in ['localhost','127.0.0.1']
out=root/'docs/screenshots/cycle';out.mkdir(parents=True,exist_ok=True);report=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for name,width,height in [('desktop',1280,800),('mobile',390,844)]:
   fixture=json.loads(subprocess.check_output(['node','scripts/social-preview-fixture.mjs','--cycle'],cwd=root,text=True));fixture['world']['living']['residents']=[]
   page=b.new_page(viewport={'width':width,'height':height},device_scale_factor=1,is_mobile=name=='mobile',has_touch=name=='mobile');errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   polls=[0]
   def respond(r):
    polls[0]+=1;fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat()
    if r.request.method=='POST':
     now=int(time.time()*1000);clock=fixture['world']['clock'];paused=r.request.post_data_json.get('paused',False)
     if paused:clock['pausedAt']=now
     elif clock['pausedAt'] is not None:clock['anchors'][-1]['realMs']+=now-clock['pausedAt'];clock['pausedAt']=None
     fixture['world']['paused']=paused
    r.fulfill(status=200,content_type='application/json',body=json.dumps({'ok':True} if r.request.method=='POST' else fixture))
   page.route('**/api/world*',respond);page.route('**/api/living/pulse',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"duplicate":true}'))
   page.goto(base,wait_until='domcontentloaded',timeout=60000);host=page.locator('.three-canvas[data-ready="true"]');host.wait_for(timeout=90000)
   page.wait_for_function('JSON.parse(document.querySelector(".three-canvas")?.dataset.cyclists??"[]").some(a=>a.id==="an")',timeout=30000)
   samples=page.evaluate('''async()=>{const samples=[],end=performance.now()+12000;let frame='';while(performance.now()<end){await new Promise(requestAnimationFrame);const e=document.querySelector('.three-canvas');if(e?.dataset.frame!==frame){frame=e.dataset.frame;samples.push({cyclists:JSON.parse(e.dataset.cyclists??'[]'),models:JSON.parse(e.dataset.modelActors??'{}'),animals:JSON.parse(e.dataset.animalPositions??'[]')})}}return samples}''')
   assert len(samples)>=15,len(samples);ride=[next(a for a in s['cyclists'] if a['id']=='an') for s in samples]
   assert all(s['models']['an']['clip']=='drive' for s in samples),'Moving rider uses the seated clip'
   assert sum(a['inFrame'] for a in ride)/len(ride)>.9,'Whole bicycle and rider must remain in frame'
   assert ride[-1]['distance']-ride[0]['distance']>30,'The bicycle must travel instead of pedalling in place'
   for a,c in zip(ride,ride[1:]):
    step=sum((a['position'][i]-c['position'][i])**2 for i in [0,1])**.5
    assert step<=3.301,('Discontinuous bicycle movement',step)
    assert c['distance']>=a['distance']
   for s,a in zip(samples,ride):
    for pet in s['animals']:assert sum((a['position'][i]-pet['position'][i])**2 for i in [0,1])**.5>=14.34,'Bicycle envelope overlaps an animal'
   page.screenshot(path=str(out/f'ride-{name}-preview.png'))
   page.get_by_role('button',name='Tạm nghỉ',exact=True).click();page.wait_for_function('document.querySelector(".three-canvas")?.dataset.paused==="true"')
   frozen=host.get_attribute('data-cyclists');rig=host.get_attribute('data-model-actors');page.wait_for_timeout(1200)
   assert host.get_attribute('data-cyclists')==frozen;assert host.get_attribute('data-model-actors')==rig
   page.get_by_role('button',name='Tiếp tục',exact=True).click();page.wait_for_function('document.querySelector(".three-canvas")?.dataset.paused==="false"')
   fixture['world']['people'][0]['plan']['transport']='walk';fixture['world']['people'][0]['plan']['steps'][0]['kind']='read'
   page.wait_for_function('!JSON.parse(document.querySelector(".three-canvas")?.dataset.cyclists??"[]").some(a=>a.id==="an")',timeout=30000)
   assert not errors,errors;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   report.append({'viewport':name,'frames':len(samples),'travel':ride[-1]['distance']-ride[0]['distance'],'polls':polls[0],'bodyRadius':9.2,'driveClip':True,'wholeBodyFramed':True,'pauseFreezesRig':True,'dismount':True,'noTeleport':True,'errors':errors})
   print(name,'PASS',report[-1],flush=True);page.close()
  (out/'metrics.json').write_text(json.dumps({'production':False,'renderer':'Chromium SwiftShader','cases':report},ensure_ascii=False,indent=2))
 finally:b.close()
