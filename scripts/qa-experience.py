"""Local fixture QA: motion, DPR, input, persistence, renderer lifecycle and resilience.
Requires Python Playwright and Chromium; no production writes. Evidence is local preview.
"""
import os,json,time,subprocess,datetime
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
base=os.environ.get('QA_BASE','http://127.0.0.1:5177');assert urlparse(base).hostname in ['127.0.0.1','localhost']
out=Path(os.environ.get('QA_OUT',str(Path(__file__).resolve().parent.parent/'docs/screenshots/experience')));out.mkdir(parents=True,exist_ok=True)
report=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for name,width,height,dpr in [('desktop',1280,800,1.5),('mobile',390,844,3)]:
   fixture=json.loads(subprocess.check_output(['node','scripts/social-preview-fixture.mjs','--motion'],text=True));state={'offline':False}
   page=b.new_page(viewport={'width':width,'height':height},device_scale_factor=dpr,is_mobile=name=='mobile',has_touch=name=='mobile');errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   def respond(route):
    if state['offline']:route.abort();return
    real=int(time.time()*1000);fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat()
    if route.request.method=='POST':
     paused=route.request.post_data_json['paused'];clock=fixture['world']['clock'];anchor=clock['anchors'][0]
     sim=anchor['simMs']+((clock.get('pausedAt') or real)-anchor['realMs'])*anchor['scale']
     clock['anchors']=[{'realMs':real,'simMs':sim,'scale':1}];clock['pausedAt']=real if paused else None;fixture['world']['paused']=paused;fixture['revision']+=1
    route.fulfill(status=200,content_type='application/json',body=json.dumps({'ok':True} if route.request.method=='POST' else fixture))
   page.route('**/api/world*',respond)
   page.route('**/api/living/pulse',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"duplicate":true}'))
   page.route('**/api/living/interact',lambda r:r.fulfill(status=200,content_type='application/json',body=json.dumps({**r.request.post_data_json,'message':r.request.post_data_json['message'].strip(),'reply':fixture['world']['people'][0]['goal'],'source':'rules'})))
   page.goto(base,wait_until='domcontentloaded',timeout=60000);host=page.locator('.three-canvas[data-ready="true"]');host.wait_for(timeout=90000)
   before=host.get_attribute('data-position');page.wait_for_function('(p)=>document.querySelector(".three-canvas")?.dataset.position!==p',arg=before,timeout=20000)
   assert float(host.get_attribute('data-person-height'))<float(host.get_attribute('data-car-length'))/2
   assert int(host.get_attribute('data-draw-calls'))<90
   canvas=host.locator('canvas');assert canvas.evaluate('(c)=>c.width>0&&c.width*c.height<=2000000')
   page.get_by_role('button',name='Chất lượng đồ họa',exact=True).click()
   page.wait_for_function('document.querySelector(".three-canvas")?.dataset.effectiveQuality==="sharp"',timeout=20000)
   assert canvas.evaluate('(c)=>c.width*c.height<=6000000');assert float(host.get_attribute('data-pixel-ratio'))<=min(dpr,2.5)
   page.get_by_role('button',name='Chất lượng đồ họa',exact=True).click();page.wait_for_function('document.querySelector(".three-canvas")?.dataset.effectiveQuality==="eco"');assert canvas.evaluate('(c)=>c.width*c.height<=1000000')
   page.get_by_role('button',name='Chất lượng đồ họa',exact=True).click()
   page.get_by_role('button',name='Trò chuyện với An',exact=True).click();page.get_by_role('button',name='Bạn có dự định gì?',exact=True).click()
   page.locator('.conversation blockquote').wait_for(timeout=15000);assert 'quầy nước' in page.locator('.conversation blockquote').inner_text()
   page.screenshot(path=str(out/f'conversation-{name}-preview.png'))
   page.get_by_role('button',name='Đóng bảng thông tin',exact=True).click()
   page.get_by_role('button',name='Tạm nghỉ',exact=True).click();page.get_by_role('button',name='Tiếp tục',exact=True).wait_for(timeout=15000);page.wait_for_function('document.querySelector(".three-canvas")?.dataset.paused==="true"',timeout=20000);paused_frame=int(host.get_attribute('data-frame'));page.wait_for_function('(f)=>Number(document.querySelector(".three-canvas")?.dataset.frame)>f+5',arg=paused_frame,timeout=30000);paused=host.get_attribute('data-position');paused_frame=int(host.get_attribute('data-frame'));page.wait_for_function('(f)=>Number(document.querySelector(".three-canvas")?.dataset.frame)>f+5',arg=paused_frame,timeout=30000);assert paused==host.get_attribute('data-position')
   page.get_by_role('button',name='Tiếp tục',exact=True).click();page.get_by_role('button',name='Tạm nghỉ',exact=True).wait_for(timeout=15000)
   page.screenshot(path=str(out/f'city-{name}-preview.png'))
   state['offline']=True;page.context.set_offline(True);page.get_by_role('button',name='Tạm nghỉ',exact=True).click();page.get_by_role('alert').wait_for(timeout=10000);assert host.count()==1
   state['offline']=False;page.context.set_offline(False);page.get_by_role('button',name='Thử kết nối lại',exact=True).click();page.get_by_role('alert').wait_for(state='hidden',timeout=20000)
   # Browser performance samples are software-rendered evidence, not hardware FPS claims.
   cdp=page.context.new_cdp_session(page);cdp.send('Performance.enable');before_metrics=cdp.send('Performance.getMetrics');page.wait_for_timeout(6000);after_metrics=cdp.send('Performance.getMetrics')
   metrics={m['name']:m['value'] for m in after_metrics['metrics']};stats=host.evaluate('(e)=>({...e.dataset})')
   assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
   assert not errors,errors
   report.append({'viewport':name,'production':False,'fixture':'synthetic world/chat; persistence tested separately on compiled D1','stats':stats,'jsHeapBytes':metrics.get('JSHeapUsedSize'),'taskDurationSeconds':metrics.get('TaskDuration')})
   canvas=host.locator('canvas')
   # Context loss must show an explicit retry action.
   canvas.evaluate('(c)=>c.getContext("webgl2").getExtension("WEBGL_lose_context").loseContext()');page.get_by_role('button',name='Thử lại 3D',exact=True).wait_for(timeout=20000)
   assert page.locator('.three-canvas canvas').count()==0
   print(name,'PASS movement, proportions, DPR presets, conversation, pause/resume, layout, context-loss fallback',flush=True);page.close()
  page=b.new_page(viewport={'width':1024,'height':768},reduced_motion='reduce');page.add_init_script('''const orig=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...args){if(t.startsWith('webgl'))return null;return orig.call(this,t,...args)}''');page.route('**/api/world*',respond);page.route('**/api/living/pulse',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true}'));page.goto(base);page.get_by_role('button',name='Thử lại 3D',exact=True).wait_for(timeout=60000);page.close();print('PASS unavailable WebGL/reduced motion fallback',flush=True)
  (out/'metrics.json').write_text(json.dumps(report,indent=2))
 finally:b.close()
