"""Actual WebGL garden UI on loopback fixtures; HTTP persistence has separate D1 tests."""
import json,os,subprocess,datetime,time
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent;base=os.environ.get('QA_BASE','http://127.0.0.1:5310');assert urlparse(base).hostname in ['localhost','127.0.0.1']
plots=json.loads((root/'data/city/garden-plots.json').read_text())['plots'];out=Path(os.environ.get('QA_OUT',str(root/'docs/screenshots/gardens')));out.mkdir(parents=True,exist_ok=True);report=[];day=86400000
water_js="import fs from 'node:fs';import{waterGarden}from'./lib/living/flora.ts';const x=JSON.parse(fs.readFileSync(0,'utf8'));process.stdout.write(JSON.stringify(waterGarden(x.state,x.id,x.simMs)))"
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for viewport,width,height in [('desktop',1280,800),('mobile',390,844)]:
   fixture=json.loads(subprocess.check_output(['node','scripts/social-preview-fixture.mjs'],cwd=root,text=True));sim=fixture['world']['clock']['anchors'][0]['simMs'];fixture['world']['clock']['weatherOverride']='clear'
   fixture['world']['living']['flora']={'version':1,'plots':{a['id']:{'growthSimMs':10.5*day,'anchoredSimMs':sim,'moisture':20} for a in plots}}
   state={'waterCalls':0,'rejectNext':False,'badContract':False}
   def sim_now():
    clock=fixture['world']['clock'];anchor=clock['anchors'][0];real=clock.get('pausedAt') if clock.get('pausedAt') is not None else int(time.time()*1000)
    return anchor['simMs']+(real-anchor['realMs'])*anchor['scale']
   page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1,is_mobile=viewport=='mobile',has_touch=viewport=='mobile');errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.route('**/api/**',lambda route:route.fulfill(status=200,content_type='application/json',body='{"ok":true,"views":0}'))
   def world(route):
    if route.request.method=='POST':
     value=route.request.post_data_json;at=sim_now();real=int(time.time()*1000)
     if 'paused' in value:fixture['world']['paused']=value['paused'];fixture['world']['clock']['pausedAt']=real if value['paused'] else None;fixture['world']['clock']['anchors']=[{'realMs':real,'simMs':at,'scale':1}]
     fixture['revision']+=1;route.fulfill(status=200,content_type='application/json',body='{"ok":true}');return
    fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat();route.fulfill(status=200,content_type='application/json',body=json.dumps(fixture))
   def water(route):
    state['waterCalls']+=1
    if state['badContract']:state['badContract']=False;route.fulfill(status=200,content_type='text/html',body='<html>Unconfirmed</html>');return
    if state['rejectNext']:state['rejectNext']=False;route.fulfill(status=409,content_type='application/json',body='{"error":"Thành phố vừa cập nhật. Hãy thử lại."}');return
    body=route.request.post_data_json;assert body['revision']==fixture['revision'];assert body['id'] in fixture['world']['living']['flora']['plots']
    result=json.loads(subprocess.check_output(['node','--input-type=module','-e',water_js],input=json.dumps({'state':fixture['world']['living']['flora'],'id':body['id'],'simMs':sim_now()}),cwd=root,text=True))
    fixture['world']['living']['flora']=result['state'];fixture['revision']+=1;route.fulfill(status=200,content_type='application/json',body=json.dumps({'ok':True,'changed':result['changed']}))
   page.route('**/api/world*',world);page.route('**/api/living/flora',water)
   page.goto(base,wait_until='domcontentloaded',timeout=60000);host=page.locator('.three-canvas[data-ready="true"]');host.wait_for(timeout=90000)
   assert host.get_attribute('data-garden-plots')=='5';assert host.get_attribute('data-garden-plants')=='30';assert host.get_attribute('data-garden-batches')=='2'
   page.get_by_role('button',name='Địa điểm',exact=True).click();cards=page.locator('.garden-card');assert cards.count()==5
   page.get_by_role('button',name='Tưới cây tại Sân chung',exact=True).click();page.get_by_text('Đã bổ sung nước cho khóm hoa.',exact=True).wait_for();assert state['waterCalls']==1
   first=cards.first;assert float(first.locator('meter').get_attribute('value'))>99.9;first.scroll_into_view_if_needed();page.screenshot(path=str(out/f'care-{viewport}-preview.png'))
   page.get_by_role('button',name='Xem cây ở Sân chung',exact=True).click();page.wait_for_function('(id)=>document.querySelector(".three-canvas")?.dataset.gardenFocus===id',arg=plots[0]['id']);page.wait_for_function('document.querySelector(".three-canvas")?.dataset.gardenFramed==="true"',timeout=20000)
   assert page.get_by_role('button',name='Theo nhân vật',exact=True).get_attribute('aria-pressed')=='false'
   page.get_by_role('button',name='Tạm nghỉ',exact=True).click();page.get_by_role('button',name='Tiếp tục',exact=True).wait_for();page.wait_for_timeout(500);updates=host.get_attribute('data-garden-updates');page.wait_for_timeout(1000);assert host.get_attribute('data-garden-updates')==updates
   page.get_by_role('button',name='Địa điểm',exact=True).click();assert page.get_by_role('button',name='Tưới cây tại Vườn nhỏ',exact=True).is_disabled();page.get_by_role('button',name='Đóng bảng thông tin',exact=True).click();page.get_by_role('button',name='Tiếp tục',exact=True).click()
   phases=[]
   for phase,days in [('sprout',1),('young',4),('bud',7.5),('bloom',10.5),('rest',13)]:
    at=sim_now()
    for record in fixture['world']['living']['flora']['plots'].values():record.update(growthSimMs=days*day,anchoredSimMs=at,moisture=65)
    fixture['revision']+=1
    page.wait_for_function('(phase)=>{const s=JSON.parse(document.querySelector(".three-canvas")?.dataset.gardenStates??"[]");return s.length===5&&s.every(x=>x.phase===phase)}',arg=phase,timeout=25000)
    assert host.get_attribute('data-garden-state-error')=='false';assert host.get_attribute('data-garden-framed')=='true';page.screenshot(path=str(out/f'{phase}-{viewport}-preview.png'));phases.append(phase)
   page.get_by_role('button',name='Địa điểm',exact=True).click();state['rejectNext']=True;page.get_by_role('button',name='Tưới cây tại Vườn nhỏ',exact=True).click();page.get_by_text('Thành phố vừa cập nhật. Hãy thử lại.',exact=True).wait_for();assert state['waterCalls']==2
   state['badContract']=True;page.get_by_role('button',name='Tưới cây tại Vườn nhỏ',exact=True).click();page.get_by_text('Chưa xác nhận được lần tưới. Hãy thử lại.',exact=True).wait_for();assert state['waterCalls']==3
   page.set_viewport_size({'width':320,'height':720});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert cards.first.evaluate('(e)=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth}')
   assert not errors,errors;report.append({'viewport':viewport,'plots':5,'plants':30,'batches':2,'phases':phases,'careMutationMock':True,'pause':True,'cameraFramed':True,'conflictAndBadContract':True,'responsive320':True,'drawCalls':host.get_attribute('data-draw-calls'),'errors':errors});print('PASS',report[-1],flush=True);page.close()
  (out/'metrics.json').write_text(json.dumps({'production':False,'renderer':'Chromium SwiftShader','fixture':'Synthetic world; watering model reused in mock; persistence separately tested in real local D1','cases':report},ensure_ascii=False,indent=2))
 finally:browser.close()
