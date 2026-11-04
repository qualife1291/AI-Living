"""Actual local WebGL night/home/cinema frames. Synthetic API, no DB writes."""
import json,os,subprocess,datetime,io,time
from pathlib import Path
from urllib.parse import urlparse
from PIL import Image
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
base=os.environ.get('QA_BASE','http://127.0.0.1:5340');assert urlparse(base).hostname in ('127.0.0.1','localhost')
out=Path(os.environ.get('QA_OUT','work/evening-life/browser'));out.mkdir(parents=True,exist_ok=True);report=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for label,w,h in [('desktop',1440,900),('mobile',390,844)]:
   page=b.new_page(viewport={'width':w,'height':h},is_mobile=w<700,has_touch=w<700);errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('console',lambda m:errors.append(m.text) if m.type=='error' and ('Shader Error' in m.text or 'THREE.WebGL' in m.text) else None)
   fixture={}
   page.route('**/api/**',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"views":1,"duplicate":true}'))
   def respond(r):
    fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat()
    r.fulfill(status=200,content_type='application/json',body=json.dumps(fixture))
   page.route('**/api/world*',respond)
   for scene in ['night','sleep','tv','fridge','cinema']:
    fixture=json.loads(subprocess.check_output(['node','scripts/evening-preview-fixture.mjs',scene],cwd=root,text=True))
    page.goto(base,wait_until='domcontentloaded',timeout=60000)
    city=page.locator('.three-canvas[data-ready="true"]');city.wait_for(timeout=90000)
    if scene=='night':
     assert int(city.get_attribute('data-actors'))>=40
     assert 'sạc pin' not in page.locator('body').inner_text().lower()
     page.screenshot(path=str(out/('night-'+label+'.png')))
     report.append({'scene':scene,'viewport':label,'cityActors':int(city.get_attribute('data-actors')),'nightLabel':fixture['weatherState']['label']});continue
    place='Rạp phim' if scene=='cinema' else 'Phòng An'
    page.get_by_role('button',name='Địa điểm',exact=True).click()
    page.locator('.venue-grid button').filter(has_text=place).click()
    host=page.locator('.interior-canvas')
    expected={'sleep':'bed-','tv':'sofa-seat-','cinema':'cinema-seat-'}.get(scene)
    page.wait_for_function('''({scene,expected})=>{
      const e=document.querySelector('.interior-canvas'),a=JSON.parse(e?.dataset.interiorModels||'[]').find(a=>a.id==='an');
      return a?.draws>0&&(scene==='fridge'?a.action==='fridge':a.support?.startsWith(expected));
    }''',arg={'scene':scene,'expected':expected},timeout=60000)
    if scene in ('tv','cinema','fridge'):
     page.wait_for_function('''scene=>{const a=JSON.parse(document.querySelector('.interior-canvas')?.dataset.interiorAppliances||'{}');return scene==='fridge'?a.fridgeOpen:a.screenOn}''',arg=scene,timeout=15000)
    for attempt in range(12):
     png=host.screenshot(timeout=20000);im=Image.open(io.BytesIO(png)).convert('RGB').resize((48,32))
     bright=sum(r+g+b>270 for r,g,b in im.getdata())/(48*32)
     if bright>=.06:break
     page.wait_for_timeout(700)
    assert bright>=.06,(scene,'blank screenshot')
    (out/(scene+'-'+label+'.png')).write_bytes(png)
    stats=host.evaluate('(e)=>({...e.dataset})');an=next(a for a in json.loads(stats['interiorModels']) if a['id']=='an')
    if scene=='sleep':assert 1.13<=an['head'][1]<2.2,'Head must lie above mattress, not upright or below floor'
    assert int(stats['interiorDrawCalls'])<180
    assert not errors,errors
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    report.append({'scene':scene,'viewport':label,'brightFraction':bright,'stats':stats})
    print('PASS',scene,label,flush=True)
   page.close()
  (out/'metrics.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 except BaseException:
  for ctx in b.contexts:
   for i,page in enumerate(ctx.pages):
    try:
     page.screenshot(path=str(out/f'failure-{i}.png'),timeout=10000)
     (out/f'failure-{i}.json').write_text(json.dumps(page.evaluate('()=>({text:document.body.innerText.slice(-1500),stats:document.querySelector(".interior-canvas")?.dataset})'),ensure_ascii=False,indent=2))
    except Exception:pass
  raise
 finally:b.close()
