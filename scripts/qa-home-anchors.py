"""Local synthetic household-door QA. Browser mutations are mocked, no D1 writes."""
import json,os,subprocess,datetime
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent;base=os.environ.get('QA_BASE','http://127.0.0.1:5291');assert urlparse(base).hostname in ['localhost','127.0.0.1']
anchors=json.loads((root/'data/city/home-anchors.json').read_text());by_id={a['id']:a for a in anchors['anchors']};out=Path(os.environ.get('QA_OUT',str(root/'docs/screenshots/homes')));out.mkdir(parents=True,exist_ok=True);report=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for viewport,width,height in [('desktop',1280,800),('mobile',390,844)]:
   fixture=json.loads(subprocess.check_output(['node','scripts/social-preview-fixture.mjs'],cwd=root,text=True));sim=fixture['world']['clock']['anchors'][0]['simMs']
   for r in fixture['world']['living']['residents']:
    r['plan']={'createdAt':fixture['serverNow'],'simStartedAt':sim-60000,'pausedMs':0,'from':'Khu dân cư','generator':'rules','steps':[{'location':'Khu dân cư','kind':'rest','activity':'Nghỉ ở nhà của nhóm','duration':3600}]}
   resident=fixture['world']['living']['residents'][0];anchor=by_id[resident['home']['anchorId']]
   page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1,is_mobile=viewport=='mobile',has_touch=viewport=='mobile');errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
   def respond(route):
    fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat();route.fulfill(status=200,content_type='application/json',body=json.dumps(fixture))
   page.route('**/api/world*',respond);page.route('**/api/living/pulse',lambda route:route.fulfill(status=200,content_type='application/json',body='{"ok":true,"duplicate":true}'))
   page.goto(base,wait_until='domcontentloaded',timeout=60000);host=page.locator('.three-canvas[data-ready="true"]');host.wait_for(timeout=90000)
   assert host.get_attribute('data-home-doors')=='60'
   page.wait_for_function('(id)=>JSON.parse(document.querySelector(".three-canvas")?.dataset.homeTargets??"[]").some(a=>a.id===id)',arg=resident['id'],timeout=30000)
   targets=json.loads(host.get_attribute('data-home-targets'));target=next(a for a in targets if a['id']==resident['id']);assert target['target']==anchor['point']
   assert sum((target['position'][i]-target['target'][i])**2 for i in [0,1])**.5<60
   assert len({tuple(a['target']) for a in targets})==len({r['home']['householdId'] for r in fixture['world']['living']['residents']})
   page.get_by_role('button',name='Cư dân',exact=True).click();page.locator('.people-grid button').filter(has=page.get_by_text(resident['name'],exact=True)).click()
   page.get_by_role('button',name='Cư dân',exact=True).click();profile=page.locator('.resident-home');profile.wait_for();assert resident['home']['address'] in profile.inner_text();assert '4 người ở chung' in profile.inner_text()
   profile.scroll_into_view_if_needed();page.screenshot(path=str(out/f'profile-{viewport}-preview.png'))
   page.get_by_role('button',name='Xem nhà',exact=True).click()
   page.wait_for_function('(id)=>document.querySelector(".three-canvas")?.dataset.homeFocus===id',arg=anchor['id'])
   page.wait_for_function('document.querySelector(`[aria-label="Theo nhân vật"]`)?.getAttribute("aria-pressed")==="false"')
   page.wait_for_timeout(500);page.screenshot(path=str(out/f'door-{viewport}-preview.png'))
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
   report.append({'viewport':viewport,'doors':60,'visibleHouseholdTargets':len({tuple(a['target']) for a in targets}),'householdMembers':4,'assignedGoal':True,'addressProfile':True,'cameraLink':True,'errors':errors});print(viewport,'PASS',report[-1],flush=True);page.close()
  (out/'metrics.json').write_text(json.dumps({'production':False,'renderer':'Chromium SwiftShader','cases':report},ensure_ascii=False,indent=2))
 finally:browser.close()
