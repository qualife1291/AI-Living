"""Real local GLB render and controls. No world writes; no content quality score."""
import json,os,time
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
base=os.environ.get('QA_BASE','http://127.0.0.1:5177');assert urlparse(base).hostname in ('localhost','127.0.0.1')
out=Path(os.environ.get('QA_OUT',str(Path('docs/screenshots/assets'))));out.mkdir(parents=True,exist_ok=True)
report=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for name,w,h in [('desktop',1440,900),('mobile',390,844)]:
   page=b.new_page(viewport={'width':w,'height':h},device_scale_factor=1.25);errors=[];failures=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('response',lambda r:failures.append(r.url) if '/models/' in r.url and r.status>=400 else None)
   page.goto(base+'/studio',wait_until='domcontentloaded',timeout=60000);host=page.locator('.studio-canvas[data-ready="true"]');host.wait_for(timeout=90000)
   for scenario in ['wallet-return','sanitation-gratitude','kitten-care','bakery-courtesy']:
    page.get_by_label('Chọn kịch bản',exact=True).select_option(scenario);page.wait_for_function('(id)=>document.querySelector(".studio-canvas")?.dataset.scenario===id',arg=scenario)
    for shot in range(1,6):
     page.get_by_role('button',name=f'Phân cảnh {shot}',exact=True).click();page.wait_for_function('(n)=>Number(document.querySelector(".studio-canvas")?.dataset.beat)===n',arg=shot-1)
     assert host.get_attribute('data-asset-failures')=='0';assert int(host.get_attribute('data-triangles'))<25000;assert int(host.get_attribute('data-draw-calls'))<150
    page.get_by_role('button',name='Phân cảnh 4',exact=True).click();page.wait_for_function('document.querySelector(".studio-canvas")?.dataset.beat==="3"')
    page.screenshot(path=str(out/f'{scenario}-{name}-preview.png'))
    before=float(host.get_attribute('data-time'));page.get_by_role('button',name='Phát kịch bản',exact=True).click();page.wait_for_function('(t)=>Number(document.querySelector(".studio-canvas")?.dataset.time)>t+.3',arg=before,timeout=15000);page.get_by_role('button',name='Tạm dừng kịch bản',exact=True).click();page.wait_for_timeout(500);paused=host.get_attribute('data-time');cast=host.get_attribute('data-cast');frozen_frames=host.get_attribute('data-frames');page.wait_for_timeout(500);assert host.get_attribute('data-frames')==frozen_frames,'A paused, unchanged studio must stop GPU draws';assert host.get_attribute('data-time')==paused;assert host.get_attribute('data-cast')==cast
    # Exercise actual rendering at the end and seek backward, not only shot buttons.
    slider=page.get_by_label('Thời gian kịch bản',exact=True)
    for second in [0,24,48,72,96,119.9,120,37.5]:
     slider.fill(str(second));page.wait_for_function('(t)=>Math.abs(Number(document.querySelector(".studio-canvas")?.dataset.time)-t)<.001',arg=second)
     assert host.get_attribute('data-asset-failures')=='0'
    slider.fill('119.9');page.get_by_role('button',name='Phát kịch bản',exact=True).click()
    page.wait_for_function('document.querySelector(".studio-canvas")?.dataset.time==="120.000"',timeout=15000)
    frames=host.get_attribute('data-frames');page.wait_for_timeout(400);assert host.get_attribute('data-time')=='120.000';assert host.get_attribute('data-frames')==frames,'Completed scene stops drawing'
    page.get_by_role('button',name='Phát kịch bản',exact=True).click()
    page.wait_for_function('Number(document.querySelector(".studio-canvas")?.dataset.time)<2',timeout=15000)
    page.get_by_role('button',name='Xem lại từ đầu',exact=True).click();page.wait_for_function('document.querySelector(".studio-canvas")?.dataset.time==="0.000"')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');rect=page.locator('.scenario-studio').bounding_box();assert abs(rect['x'])<1 and abs(rect['width']-w)<1
    report.append({'viewport':name,'scenario':scenario,'shots':5,'controls':'play/pause/restart/seek/end/replay-after-completion','renderedTimeProbes':[0,24,48,72,96,119.9,120,37.5],'stats':host.evaluate('(e)=>({...e.dataset})')});print(name,scenario,'PASS',flush=True)
   assert not errors,errors;assert not failures,failures;page.close()
  (out/'studio-metrics.json').write_text(json.dumps({'renderer':'Chromium SwiftShader','production':False,'cases':report},indent=2,ensure_ascii=False))
 finally:b.close()
