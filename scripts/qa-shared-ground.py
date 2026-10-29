"""Two fresh local viewers, synthetic shared server frames; actual D1 verified separately."""
import os,json,subprocess,time,datetime
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
base=os.environ.get('QA_BASE','http://127.0.0.1:5332');assert urlparse(base).hostname in ['127.0.0.1','localhost']
out=Path(os.environ.get('QA_OUT',str(root/'docs/screenshots/gnd2')));out.mkdir(parents=True,exist_ok=True)
fixture=json.loads(subprocess.check_output(['node','scripts/shared-preview-fixture.mjs'],cwd=root,text=True))
fixed=int(fixture['sharedGround']['cursorRealMs']);server_real_ms=fixed
report=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  pages=[];errors=[];telemetry=[]
  def serve(route):
   if route.request.method=='POST':
    patch=route.request.post_data_json;fixture['world']['paused']=patch.get('paused',False);fixture['sharedGround']['paused']=fixture['world']['paused'];route.fulfill(status=200,content_type='application/json',body='{"ok":true}')
   else:
    fixture['serverNow']=datetime.datetime.fromtimestamp(server_real_ms/1000,datetime.timezone.utc).isoformat()
    route.fulfill(status=200,content_type='application/json',body=json.dumps(fixture))
  for name,width,height in [('desktop',1280,800),('mobile',390,844)]:
   page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1,is_mobile=name=='mobile',has_touch=name=='mobile')
   page.add_init_script(f'window.__sharedNow={fixed};Date.now=()=>window.__sharedNow;')
   page.on('pageerror',lambda e:errors.append(str(e)))
   def diagnostic(route):
    telemetry.extend(route.request.post_data_json.get('logs',[]));route.fulfill(status=200,content_type='application/json',body='{"ok":true}')
   page.route('**/api/diagnostics',diagnostic)
   page.route('**/api/world*',serve);page.route('**/api/living/pulse',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"coalesced":true}'))
   page.route('**/api/visits',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"views":1}'))
   page.goto(base+'/?ground=shared',wait_until='domcontentloaded',timeout=60000)
   host=page.locator('.three-canvas[data-ready="true"]');host.wait_for(timeout=90000)
   page.wait_for_function('document.querySelector(".three-canvas")?.dataset.sharedGround?.startsWith("{")',timeout=30000)
   data=json.loads(host.get_attribute('data-shared-ground'));assert len(data['cars'])==12;assert len(data['positions'])==len(fixture['sharedGround']['frames'][-1]['poses'])
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   page.screenshot(path=str(out/f'shared-{name}-preview.png'))
   report.append({'viewport':name,'checkpoint':data['checkpoint'],'sampledRealMs':data['realMs'],'actors':len(data['positions']),'cars':len(data['cars'])});pages.append(page)
   time.sleep(2)
  def roots(page):
   d=json.loads(page.locator('.three-canvas').get_attribute('data-shared-ground'));return {'realMs':d['realMs'],'simMs':d['simMs'],'positions':d['positions'],'cars':d['cars']}
  assert roots(pages[0])==roots(pages[1]),'Late-opened viewers must sample the same roots'
  pages[1].get_by_role('button',name='Toàn cảnh thành phố',exact=True).click();pages[1].wait_for_timeout(700)
  assert roots(pages[0])==roots(pages[1]),'Camera never changes occupancy/poses'
  pages[1].reload(wait_until='domcontentloaded');pages[1].wait_for_function('document.querySelector(".three-canvas")?.dataset.sharedGround?.startsWith("{")',timeout=90000)
  assert roots(pages[0])==roots(pages[1]),'F5 never respawns local physics'
  pages[0].get_by_role('button',name='Tạm nghỉ',exact=True).click();pages[0].wait_for_function('document.querySelector(".three-canvas")?.dataset.paused==="true"')
  for page in pages:page.wait_for_function('document.querySelector(".three-canvas")?.dataset.paused==="true"',timeout=20000)
  before=roots(pages[0]);pages[0].wait_for_timeout(1200);assert roots(pages[0])==before
  # Missing frames hold the last committed pose instead of extrapolating physical motion.
  # Move the mock server and both clients together; a frozen server timestamp would
  # instead test offset correction on different polling phases.
  server_real_ms+=10000
  for page in pages:page.evaluate('window.__sharedNow+=10000')
  for page in pages:page.wait_for_function('(t)=>JSON.parse(document.querySelector(".three-canvas")?.dataset.sharedGround??"{}").realMs===t',arg=fixture['sharedGround']['cursorRealMs'],timeout=20000)
  pages[0].wait_for_timeout(1200);a=roots(pages[0]);b=roots(pages[1]);assert a==b, {'leftTime':[a['realMs'],a['simMs']],'rightTime':[b['realMs'],b['simMs']],'firstMismatch':next(((x,y) for x,y in zip(a['positions'],b['positions']) if x!=y),None)}
  pages[0].wait_for_timeout(700);assert roots(pages[0])==a
  assert not errors,errors
  result={'production':False,'browser':'Chromium SwiftShader','source':'synthetic shared frames; D1 separate','cases':report,'lateOpenSameTimeSameRoots':True,'cameraIndependent':True,'reloadNoRespawn':True,'pauseStable':True,'noExtrapolation':True,'noHorizontalOverflow':True,'errors':errors}
  (out/'metrics.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result),flush=True)
 except BaseException:
  diagnostics=[]
  for i,p in enumerate(browser.contexts):
   for j,page in enumerate(p.pages):
    try:
     diagnostics.append({'context':i,'page':j,'state':page.evaluate("()=>({canvas:!!document.querySelector('.three-canvas'),retry:!![...document.querySelectorAll('button')].find(e=>e.textContent?.includes('Thử lại 3D')),text:document.body.innerText.slice(-600)})")})
     page.screenshot(path=str(out/f'failure-{i}-{j}.png'))
    except Exception as error:diagnostics.append({'context':i,'page':j,'diagnosticError':str(error)[:150]})
  (out/'failure.json').write_text(json.dumps({'pages':diagnostics,'errors':errors,'telemetry':telemetry[-40:]},ensure_ascii=False,indent=2))
  raise
 finally:browser.close()
