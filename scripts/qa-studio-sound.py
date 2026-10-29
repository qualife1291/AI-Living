"""Actual Chromium AudioContext decoding/output, timeline seeking and cleanup, loopback only."""
import json,os
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
base=os.environ.get('QA_BASE','http://127.0.0.1:5340');assert urlparse(base).hostname in ('127.0.0.1','localhost')
out=Path(os.environ.get('QA_OUT','work/studio-sound'));out.mkdir(exist_ok=True,parents=True)
report=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-back-forward-cache'])
 try:
  page=b.new_page(viewport={'width':1280,'height':850});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.add_init_script("""window.__documentId=crypto.randomUUID();window.__audioContexts=[];const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(...args){super(...args);window.__audioContexts.push(this)}}""")
  page.goto(base+'/studio',wait_until='domcontentloaded');host=page.locator('.studio-canvas[data-ready="true"]');host.wait_for(timeout=90000)
  assert page.evaluate('window.__audioContexts.length')==0,'No autoplay or context before gesture'
  page.get_by_role('button',name='Bật âm thanh',exact=True).click();page.wait_for_function('JSON.parse(document.querySelector(".studio-canvas").dataset.audio||"{}").decoded===21',timeout=90000)
  def state():return json.loads(host.get_attribute('data-audio'))
  def seek(t):
   page.get_by_label('Thời gian kịch bản',exact=True).evaluate("(e,t)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,String(t));e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}",t)
   page.wait_for_function('(t)=>Math.abs(Number(document.querySelector(".studio-canvas").dataset.time)-t)<.001',arg=t)
  for scenario,at in [('wallet-return',54),('sanitation-gratitude',31),('kitten-care',25),('bakery-courtesy',60)]:
   page.get_by_label('Chọn kịch bản',exact=True).select_option(scenario);page.wait_for_function('(s)=>document.querySelector(".studio-canvas").dataset.scenario===s',arg=scenario)
   seek(at+.3);page.get_by_role('button',name='Phát kịch bản',exact=True).click()
   page.wait_for_function('(id)=>{const a=JSON.parse(document.querySelector(".studio-canvas").dataset.audio||"{}");return a.voiceId===id&&a.rms>.001}',arg=f'{scenario}-{at}',timeout=20000)
   audible=state();assert audible['offset']>=.3-.02 and audible['offset']<1.5,audible
   page.get_by_role('button',name='Tạm dừng kịch bản',exact=True).click();page.wait_for_function('JSON.parse(document.querySelector(".studio-canvas").dataset.audio).active===0');paused=state();assert paused['rms']==0 and paused['voiceId']==''
   # Seeking to silence and replaying must not deliver the old line.
   seek(15);page.get_by_role('button',name='Phát kịch bản',exact=True).click();page.wait_for_timeout(350);assert state()['voiceId']=='',state()
   page.get_by_role('button',name='Tạm dừng kịch bản',exact=True).click();print('voice/seek/pause PASS',scenario,flush=True);report.append({'scenario':scenario,'audible':audible,'pauseStopsAllSources':True,'seekDropsOldVoice':True})
  page.get_by_label('Chọn kịch bản',exact=True).select_option('wallet-return');seek(25);before=state()['effects'];page.get_by_role('button',name='Phát kịch bản',exact=True).click()
  page.wait_for_function('(n)=>JSON.parse(document.querySelector(".studio-canvas").dataset.audio).effects>n',arg=before,timeout=15000)
  page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
  page.wait_for_function('JSON.parse(document.querySelector(".studio-canvas").dataset.audio).active===0');hidden=host.get_attribute('data-time');page.wait_for_timeout(300);assert host.get_attribute('data-time')==hidden
  page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))")
  page.get_by_role('button',name='Tắt âm thanh',exact=True).click();page.wait_for_function('JSON.parse(document.querySelector(".studio-canvas").dataset.audio).active===0')
  # Real native navigation replaces the old audio-owning document; no autoplay in the new one.
  old_document=page.evaluate('window.__documentId');page.route(base+'/',lambda r:r.fulfill(status=200,content_type='text/html',body='<title>Studio teardown fixture</title>'));page.get_by_role('link',name='Trở về xóm',exact=True).click();page.wait_for_url(base+'/');assert page.evaluate('window.__documentId')!=old_document;assert page.evaluate('window.__audioContexts.length')==0,'New document starts without an AudioContext'
  assert not errors,errors;page.close()
  # A failed clip keeps captions and ambient output, with an explicit partial state.
  partial=b.new_page();partial.route('**/audio/studio/wallet-return-54.ogg',lambda r:r.abort());partial.goto(base+'/studio',wait_until='domcontentloaded');partial.locator('.studio-canvas[data-ready="true"]').wait_for(timeout=90000);partial.get_by_role('button',name='Bật âm thanh',exact=True).click();partial.wait_for_function('JSON.parse(document.querySelector(".studio-canvas").dataset.audio||"{}").status==="partial"',timeout=90000);a=partial.locator('.studio-canvas').get_attribute('data-audio');assert json.loads(a)['failures']==1;assert json.loads(a)['decoded']==20;partial.close()
  unsupported=b.new_page();unsupported.add_init_script('window.AudioContext=undefined');unsupported.goto(base+'/studio',wait_until='domcontentloaded');unsupported.locator('.studio-canvas[data-ready="true"]').wait_for(timeout=90000);unsupported.get_by_role('button',name='Bật âm thanh',exact=True).click();unsupported.wait_for_function('JSON.parse(document.querySelector(".studio-canvas").dataset.audio||"{}").status==="unavailable"');assert unsupported.get_by_role('button',name='Bật âm thanh',exact=True).count()==1;unsupported.close()
  (out/'sound-metrics.json').write_text(json.dumps({'renderer':'Chromium SwiftShader','production':False,'cases':report,'footsteps':True,'hiddenStops':True,'visibilityFixture':'document.hidden override exercises real visibilitychange handler','navigationDestroysOldDocument':True,'explicitDispose':'separate strict API lifecycle unit test','navigationDestination':'intercepted local HTML fixture; unload callbacks are not reliably observable','partialFetch':json.loads(a),'unsupportedGraceful':True,'unverified':['human listening/MOS','device speaker volume']},ensure_ascii=False,indent=2));print('PASS all four actual voice outputs, footsteps, seek/pause/hidden/mute/teardown and failures',flush=True)
 except Exception:
  print('PAGE ERRORS',errors,flush=True)
  try:
   page.screenshot(path=str(out/'failure.png'),timeout=5000)
   print('BODY',page.locator('body').inner_text(timeout=5000)[:2500],flush=True)
  except Exception as e:print('FAILURE CAPTURE',str(e)[:150],flush=True)
  raise
 finally:b.close()
