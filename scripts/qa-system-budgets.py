"""Loopback compiled UI: polling, request coalescing and recovery controls.
All API traffic is intercepted; no D1 or real world is modified.
"""
import datetime,json,os,subprocess
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
base=os.environ.get('QA_BASE','http://127.0.0.1:5350')
u=urlparse(base)
assert u.scheme=='http' and u.hostname in {'localhost','127.0.0.1','::1'}, 'Loopback QA only'
out=Path(os.environ.get('QA_OUT','/tmp/system-opt-ui-after'));out.mkdir(parents=True,exist_ok=True)
legacy=os.environ.get('QA_EXPECT_LEGACY')=='1'
fixture=json.loads(subprocess.check_output(['node','scripts/social-preview-fixture.mjs','--detail=read'],text=True))
reports=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for label,w,h in ([('desktop',1365,900)] if legacy else [('desktop',1365,900),('mobile',390,844)]):
   page=browser.new_page(viewport={'width':w,'height':h});errors=[];state={'world':0,'pulse':0,'fail':False,'hold':False,'pending':[]}
   page.on('pageerror',lambda e:errors.append(str(e)))
   def world(r):
    assert r.request.method=='GET'
    state['world']+=1
    if state['hold']:state['pending'].append(r);return
    if state['fail']:r.fulfill(status=503,content_type='application/json',body='{"error":"temporary"}');return
    fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat();r.fulfill(status=200,content_type='application/json',body=json.dumps(fixture))
   def api(r):
    if '/pulse' in r.request.url:state['pulse']+=1
    r.fulfill(status=200,content_type='application/json',body='{"ok":true,"views":1}')
   page.route('**/api/**',api);page.route('**/api/world*',world)
   page.clock.install();page.goto(base,wait_until='domcontentloaded');page.locator('.three-canvas[data-ready=true]').wait_for(timeout=90000)
   page.get_by_role('button',name='Cư dân',exact=True).click()
   page.clock.fast_forward(30000);page.wait_for_timeout(300)
   state['world']=0;state['pulse']=0
   for _ in range(60):page.clock.fast_forward(1000);page.wait_for_timeout(30)
   world_reads,pulses=state['world'],state['pulse']
   page.keyboard.press('Escape')
   def hud():return page.locator('.live-world').evaluate("e=>e.classList.contains('hud-hidden')")
   initial=hud();page.evaluate("document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'h',ctrlKey:true,bubbles:true}))")
   ctrl_changed=hud()!=initial
   if not legacy:
    for modifiers in [{'metaKey':True},{'altKey':True},{'repeat':True},{'isComposing':True}]:
     page.evaluate("m=>document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'h',bubbles:true,...m}))",modifiers);assert hud()==initial
    page.evaluate("()=>{const e=document.createElement('input');e.id='qa-editor';document.body.append(e);e.focus();e.dispatchEvent(new KeyboardEvent('keydown',{key:'h',bubbles:true}));}");assert hud()==initial
    page.evaluate("document.getElementById('qa-editor').remove()")
   if hud()!=initial:page.evaluate("document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'h',bubbles:true}))")
   page.evaluate("document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'h',bubbles:true}))");assert hud()!=initial
   page.evaluate("document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'h',bubbles:true}))");assert hud()==initial
   state['fail']=True;page.clock.fast_forward(15000);page.wait_for_timeout(300)
   retry=page.get_by_role('button',name='Thử kết nối lại',exact=True);retry.wait_for()
   state['fail']=False;state['hold']=True;before=state['world']
   retry.evaluate('(e)=>{for(let i=0;i<25;i++)e.click()}');page.wait_for_timeout(300)
   max_pending=len(state['pending']);state['hold']=False
   for r in state['pending']:
    fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat();r.fulfill(status=200,content_type='application/json',body=json.dumps(fixture))
   page.wait_for_timeout(300);forced_reads=state['world']-before
   state['fail']=True;page.clock.fast_forward(15000);page.wait_for_timeout(300)
   banner=page.locator('.live-alert');banner.wait_for();box=retry.bounding_box();text=banner.inner_text()
   page.screenshot(path=str(out/(label+'-connection.png')))
   result={'viewport':label,'worldGetsPerSimulatedMinute':world_reads,'pulsePostsPerSimulatedMinute':pulses,'ctrlHChangedHud':ctrl_changed,'retryBurst':25,'maxPendingWorldReads':max_pending,'forcedWorldReads':forced_reads,'retrySize':box,'cachedStateExplained':'trạng thái gần nhất' in text,'pageErrors':errors};reports.append(result)
   (out/'metrics.json').write_text(json.dumps({'legacy':legacy,'source':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'transport':'intercepted API, synthetic fixture, no D1 writes','clock':'Playwright30s warm-up +60s steady foreground','cases':reports},ensure_ascii=False,indent=2)+'\n')
   if not legacy:
    assert not errors,result
    assert 4<=world_reads<=6 and pulses==1,result
    assert not ctrl_changed and max_pending==1 and forced_reads<=2,result
    assert result['cachedStateExplained'] and box['width']>=44 and box['height']>=44,result
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),result
   print(json.dumps(result,ensure_ascii=False),flush=True);page.close()
 finally:browser.close()
