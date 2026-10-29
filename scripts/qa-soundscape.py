"""Real Web Audio lifecycle on loopback fixtures; does not claim acoustic/device QA."""
import json,os,subprocess,datetime
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent;base=os.environ.get('QA_BASE','http://127.0.0.1:5292');assert urlparse(base).hostname in ['localhost','127.0.0.1']
out=Path(os.environ.get('QA_OUT',str(root/'docs/screenshots/soundscape')));out.mkdir(parents=True,exist_ok=True);report=[]
instrument='''window.__soundQA={contexts:[],voices:0};const NativeAudioContext=window.AudioContext;window.AudioContext=class extends NativeAudioContext{constructor(...args){super(...args);window.__soundQA.contexts.push(this)}createGain(){const g=super.createGain();(this.qaGains??=[]).push(g);return g}createOscillator(){window.__soundQA.voices++;return super.createOscillator()}};'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for viewport,width,height in [('desktop',1280,800),('mobile',390,844)]:
   fixture=json.loads(subprocess.check_output(['node','scripts/social-preview-fixture.mjs'],cwd=root,text=True));fixture['weatherState']={'kind':'clear','label':'Cảnh thử nghiệm · mô phỏng','intensity':.2,'tempC':28}
   page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1,is_mobile=viewport=='mobile',has_touch=viewport=='mobile');errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.add_init_script(instrument)
   def world(route):
    if route.request.method=='POST':
     data=route.request.post_data_json
     if 'paused' in data:fixture['world']['paused']=data['paused']
     fixture['revision']+=1;route.fulfill(status=200,content_type='application/json',body='{"ok":true}');return
    fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat();route.fulfill(status=200,content_type='application/json',body=json.dumps(fixture))
   page.route('**/api/visits',lambda route:route.fulfill(status=200,content_type='application/json',body='{"views":0}'));page.route('**/api/living',lambda route:route.fulfill(status=503,content_type='application/json',body='{"error":"fixture intentionally unavailable"}'));page.route('**/api/world*',world);page.route('**/api/living/pulse',lambda route:route.fulfill(status=200,content_type='application/json',body='{"ok":true}'))
   page.goto(base,wait_until='domcontentloaded',timeout=60000);page.locator('.three-canvas[data-ready="true"]').wait_for(timeout=90000)
   sound=page.get_by_role('button',name='Âm thanh thiên nhiên',exact=True);assert sound.get_attribute('aria-pressed')=='false';assert page.evaluate('window.__soundQA.contexts.length')==0
   sound.click();page.wait_for_function('window.__soundQA.contexts.length===1&&window.__soundQA.contexts[0].state==="running"');page.wait_for_function('window.__soundQA.voices>0',timeout=10000)
   page.evaluate('window.__soundQA.analyser=window.__soundQA.contexts[0].createAnalyser();window.__soundQA.contexts[0].qaGains[0].connect(window.__soundQA.analyser)')
   page.wait_for_timeout(150);peak=page.evaluate('(()=>{const a=new Float32Array(2048);window.__soundQA.analyser.getFloatTimeDomainData(a);return Math.max(...a.map(Math.abs))})()');assert .000001<peak<.25,peak
   page.screenshot(path=str(out/f'enabled-{viewport}-preview.png'))
   page.get_by_role('button',name='Tạm nghỉ',exact=True).click();page.wait_for_function('window.__soundQA.contexts[0].state==="suspended"');voices=page.evaluate('window.__soundQA.voices');page.wait_for_timeout(6000);assert page.evaluate('window.__soundQA.voices')==voices
   page.get_by_role('button',name='Tiếp tục',exact=True).click();page.wait_for_function('window.__soundQA.contexts[0].state==="running"')
   page.evaluate('Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"))');page.wait_for_function('window.__soundQA.contexts[0].state==="suspended"')
   page.evaluate('Object.defineProperty(document,"hidden",{configurable:true,get:()=>false});document.dispatchEvent(new Event("visibilitychange"))');page.wait_for_function('window.__soundQA.contexts[0].state==="running"')
   page.get_by_role('button',name='Địa điểm',exact=True).click();page.get_by_role('button',name='Tái dựng từ OpenStreetMap',exact=True).click();page.wait_for_function('window.__soundQA.contexts[0].state==="suspended"')
   page.get_by_role('button',name='Địa điểm',exact=True).click();page.get_by_role('button',name='Thành phố sống',exact=True).click();page.wait_for_function('window.__soundQA.contexts[0].state==="running"')
   sound.click();page.wait_for_function('window.__soundQA.contexts[0].state==="closed"');assert sound.get_attribute('aria-pressed')=='false'
   sound.click();page.wait_for_function('window.__soundQA.contexts.length===2&&window.__soundQA.contexts[1].state==="running"')
   page.set_viewport_size({'width':320,'height':720});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert sound.evaluate('(e)=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth}')
   page.screenshot(path=str(out/f'compact-{viewport}-preview.png'))
   page.get_by_role('button',name='Bối cảnh',exact=True).click();page.get_by_role('button',name='Khám phá model & chuyển động 3D',exact=True).click();page.wait_for_url('**/assets');page.wait_for_function('window.__soundQA.contexts.every(c=>c.state==="closed")')
   assert not errors,errors;report.append({'viewport':viewport,'defaultNoContext':True,'explicitOptIn':True,'realOscillator':True,'measuredPeak':peak,'pause':True,'hidden':True,'osmSilent':True,'toggleCloses':True,'unmountCloses':True,'responsive320':True,'errors':errors});print('PASS',report[-1],flush=True);page.close()
  page=browser.new_page();page.add_init_script('Object.defineProperty(window,"AudioContext",{value:undefined})');page.route('**/api/world*',lambda route:route.fulfill(status=200,content_type='application/json',body=json.dumps(fixture)));page.route('**/api/living/pulse',lambda route:route.fulfill(status=200,content_type='application/json',body='{"ok":true}'));page.goto(base,wait_until='domcontentloaded');sound=page.get_by_role('button',name='Âm thanh thiên nhiên',exact=True);sound.click();page.get_by_text('Trình duyệt chưa hỗ trợ âm thanh môi trường.',exact=True).wait_for();assert sound.get_attribute('aria-pressed')=='false';page.close()
  (out/'metrics.json').write_text(json.dumps({'production':False,'renderer':'Chromium SwiftShader; real Web Audio API','limits':'Graph/lifecycle assertions, no claim of acoustic quality or hardware latency','unsupportedGraceful':True,'cases':report},ensure_ascii=False,indent=2))
 finally:browser.close()
