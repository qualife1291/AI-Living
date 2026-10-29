"""Two actual viewers; replay-based presentation fixtures. Durable D1 tested separately."""
import os,json,subprocess,copy
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
base=os.environ.get('QA_BASE','http://127.0.0.1:5340');assert urlparse(base).hostname in ('127.0.0.1','localhost')
out=Path(os.environ.get('QA_OUT','work/gnd3-browser'));out.mkdir(parents=True,exist_ok=True)
fixtures=json.loads(subprocess.check_output(['node','scripts/authority-preview-fixture.mjs'],cwd=root,text=True));stage='before';broken=False;pages=[];errors=[];posts=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  def set_stage(value):
   global stage
   stage=value
   now=int(__import__('datetime').datetime.fromisoformat(fixtures[stage]['serverNow'].replace('Z','+00:00')).timestamp()*1000)
   for page in pages:page.evaluate('(t)=>window.__groundNow=t',now)
  def serve(route):
   global stage
   if route.request.method=='POST':
    posts.append({'path':urlparse(route.request.url).path,'body':route.request.post_data_json})
    set_stage('paused' if route.request.post_data_json.get('paused') else 'after');route.fulfill(status=200,content_type='application/json',body='{"ok":true}')
   else:
    packet=copy.deepcopy(fixtures[stage])
    if broken:packet['sharedGround']['sequence']+=100;packet['sharedGround']['checkpoint']='0'*64;packet['revision']+=100
    route.fulfill(status=200,content_type='application/json',body=json.dumps(packet))
  def roots(page):
   d=json.loads(page.locator('.three-canvas').get_attribute('data-shared-ground'));return {'simMs':d['simMs'],'positions':d['positions'],'cars':d['cars']}
  def utterances(page):return json.loads(page.locator('.three-canvas').get_attribute('data-shared-authority'))['utterances']
  def wait_stage(page,value):page.wait_for_function('(s)=>JSON.parse(document.querySelector(".three-canvas")?.dataset.sharedGround??"{}").checkpoint===s',arg=fixtures[value]['sharedGround']['checkpoint'],timeout=30000)
  for name,width,height in [('desktop',1280,850),('mobile',390,844)]:
   page=browser.new_page(viewport={'width':width,'height':height});page.on('pageerror',lambda e:errors.append(str(e)));now=int(__import__('datetime').datetime.fromisoformat(fixtures['before']['serverNow'].replace('Z','+00:00')).timestamp()*1000)
   page.add_init_script(f"window.__groundNow={now};Date.now=()=>window.__groundNow;window.__dialogueWrites=[];const old=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){{if(k.startsWith('xom-ai-dialogue-hashes:'))window.__dialogueWrites.push(k);return old.call(this,k,v)}};")
   page.route('**/api/world*',serve);page.route('**/api/living/pulse',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"coalesced":true}'));page.route('**/api/visits',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"views":1}'));page.route('**/api/diagnostics',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true}'))
   page.goto(base+'/?ground=shared',wait_until='domcontentloaded',timeout=60000);page.locator('.three-canvas[data-ready="true"]').wait_for(timeout=90000);pages.append(page);wait_stage(page,'before');assert utterances(page)==[];assert page.locator('.three-speech').count()==0,'Planned text cannot appear as speech'
  set_stage('active')
  for page in pages:
   wait_stage(page,'active');page.wait_for_function('JSON.parse(document.querySelector(".three-canvas")?.dataset.sharedAuthority??"{}").utterances?.length===1',timeout=20000)
  assert roots(pages[0])==roots(pages[1]);assert utterances(pages[0])==utterances(pages[1]);line=utterances(pages[0])[0]
  for page in pages:
   page.locator('.three-speech').wait_for(timeout=20000);assert line['text'] in page.locator('.three-speech').inner_text();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   physical=roots(page);bodies=json.loads(page.locator('.three-canvas').get_attribute('data-model-actors'))
   for actor,snapshot in bodies.items():
    pose=next((p['position'] for p in physical['positions'] if p['id']==actor),None)
    if pose:assert abs(snapshot['position'][0]-pose[0])<.001 and abs(snapshot['position'][2]-pose[1])<.001,(actor,snapshot['position'],pose)
   assert page.evaluate('window.__dialogueWrites.length')==0,'Presentation ACK never writes viewer dialogue memory in shared mode'
  pages[0].screenshot(path=str(out/'authority-desktop.png'));pages[1].screenshot(path=str(out/'authority-mobile.png'))
  saved=roots(pages[1]);pages[1].get_by_role('button',name='Toàn cảnh thành phố',exact=True).click();pages[1].wait_for_timeout(600);assert roots(pages[1])==saved;assert utterances(pages[1])==utterances(pages[0]);pages[1].reload(wait_until='domcontentloaded');pages[1].locator('.three-canvas[data-ready="true"]').wait_for(timeout=90000);wait_stage(pages[1],'active');assert roots(pages[0])==roots(pages[1]);assert utterances(pages[0])==utterances(pages[1])
  # Reject a mismatched authority/parent response before it can poison watermarks.
  broken=True;pages[0].wait_for_timeout(1700)
  for page in pages:assert json.loads(page.locator('.three-canvas').get_attribute('data-shared-ground'))['checkpoint']==fixtures['active']['sharedGround']['checkpoint']
  broken=False;pages[0].get_by_role('button',name='Tạm nghỉ',exact=True).click()
  for page in pages:wait_stage(page,'paused');page.wait_for_function('document.querySelector(".three-canvas")?.dataset.paused==="true"')
  before=roots(pages[0]);pages[0].wait_for_timeout(800);assert roots(pages[0])==before;assert roots(pages[0])==roots(pages[1]);assert utterances(pages[0])==utterances(pages[1]);assert fixtures['paused']['__fixture']['counts']['heard']==0
  pages[0].get_by_role('button',name='Tiếp tục',exact=True).click()
  for page in pages:wait_stage(page,'after');page.wait_for_function('JSON.parse(document.querySelector(".three-canvas")?.dataset.sharedAuthority??"{}").utterances?.length===0');assert page.locator('.three-speech').count()==0
  assert fixtures['after']['__fixture']['counts']['heard']==4
  # A separate branch starts an emission then cancels its plan; no delivery follows.
  set_stage('active')
  for page in pages:page.reload(wait_until='domcontentloaded');page.locator('.three-canvas[data-ready="true"]').wait_for(timeout=90000);wait_stage(page,'active')
  set_stage('cancelled')
  for page in pages:wait_stage(page,'cancelled');page.wait_for_function('JSON.parse(document.querySelector(".three-canvas")?.dataset.sharedAuthority??"{}").utterances?.length===0');assert page.evaluate('window.__dialogueWrites.length')==0
  assert fixtures['cancelled']['__fixture']['counts']['heard']==0;assert roots(pages[0])==roots(pages[1]);assert not errors,errors
  result={'source':'real GND2 replay/accounting with synthetic browser transport heads; not durable D1 receipts','production':False,'renderer':'Chromium SwiftShader','viewports':2,'plannedNotShown':True,'sameAuthoritativeLineAndRoots':True,'cosmeticPosePreservesRoots':True,'cameraAndReloadIndependent':True,'mismatchedParentRejected':True,'pauseNoCredit':True,'cancelledAndEndedHidden':True,'presentationAckNoMemoryWrites':True,'speech':line,'worldControlPosts':posts,'errors':errors}
  (out/'metrics.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False),flush=True)
 except BaseException:
  for i,page in enumerate(pages):
   try:page.screenshot(path=str(out/f'failure-{i}.png'));print('FAILURE',i,page.locator('body').inner_text()[-1000:],errors,flush=True)
   except Exception:pass
  raise
 finally:browser.close()
