"""Real compiled loopback WebGL evidence; synthetic API only, no remote writes."""
import datetime,io,json,os,subprocess,time
from pathlib import Path
from urllib.parse import urlparse
from PIL import Image
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
base=os.environ.get('QA_BASE','http://127.0.0.1:5340')
assert urlparse(base).hostname in ('127.0.0.1','localhost')
out=Path(os.environ.get('QA_OUT','work/interior-native/browser'));out.mkdir(parents=True,exist_ok=True)
reports=[]
def models(host):return json.loads(host.get_attribute('data-interior-models') or '[]')
def ready(page):
    page.wait_for_function('''() => {
      const h=document.querySelector('.interior-canvas');
      const a=JSON.parse(h?.dataset.interiorModels||'[]');
      return a.length===3&&a.every(x=>x.modelId.startsWith('supplied/')&&x.draws>0&&x.prop==='read/native');
    }''',timeout=60000)
    return page.locator('.interior-canvas')
def capture(page,host,label):
    png=host.screenshot(timeout=20000)
    pixels=list(Image.open(io.BytesIO(png)).convert('RGB').resize((48,32)).getdata())
    bright=sum(r+g+b>270 for r,g,b in pixels)/len(pixels)
    assert bright>=.08,(label,'blank frame',bright)
    stats=host.evaluate('(h)=>({...h.dataset})')
    assert 0<int(stats['interiorDrawCalls'])<160,(label,stats['interiorDrawCalls'])
    assert 0<int(stats['interiorMaterials'])<100
    (out/(label+'.png')).write_bytes(png)
    return {'case':label,'brightFraction':bright,'stats':stats}
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    try:
      for name,width,height in [('desktop',1440,900),('mobile',390,844)]:
        fixture=json.loads(subprocess.check_output(['node','scripts/social-preview-fixture.mjs','--detail=read'],cwd=root,text=True))
        page=browser.new_page(viewport={'width':width,'height':height},is_mobile=name=='mobile',has_touch=name=='mobile')
        errors=[];held=[];state={'hold':False}
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('console',lambda m:errors.append(m.text) if m.type=='error' and ('Shader Error' in m.text or 'THREE.WebGL' in m.text) else None)
        page.route('**/api/**',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"views":1,"duplicate":true}'))
        def world(route):
            if route.request.method!='GET':
                value=route.request.post_data_json
                real=int(time.time()*1000);clock=fixture['world']['clock'];a=clock['anchors'][-1]
                sim=a['simMs']+max(0,(clock.get('pausedAt') or real)-a['realMs'])*a['scale']
                fixture['world']['paused']=value['paused'];clock['pausedAt']=real if value['paused'] else None
                clock['anchors']=[{'realMs':real,'simMs':sim,'scale':1}];fixture['revision']+=1
                route.fulfill(status=200,content_type='application/json',body='{"ok":true}');return
            fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat()
            route.fulfill(status=200,content_type='application/json',body=json.dumps(fixture))
        page.route('**/api/world*',world)
        if name=='mobile':
            page.add_init_script('window.DecompressionStream=undefined')
            def asset(route):
                if state['hold']:held.append(route)
                else:route.continue_()
            page.route('**/models/supplied/**',asset)
        page.goto(base,wait_until='domcontentloaded',timeout=60000)
        page.locator('.three-canvas[data-ready="true"]').wait_for(timeout=90000)
        # Open the actual venue control; the fixture's three residents already
        # have library plans. No occupants are inserted by renderer or test DOM.
        page.get_by_role('button',name='Địa điểm',exact=True).click()
        state['hold']=name=='mobile'
        page.locator('.venue-grid button').filter(has_text='Thư viện').click()
        host=page.locator('.interior-canvas');host.locator('canvas').wait_for(timeout=30000)
        if state['hold']:
            page.wait_for_timeout(4500)
            assert int(host.get_attribute('data-interior-native-count') or '0')==0
            assert held,'Expected actual pending model downloads'
            state['hold']=False
            for route in held:route.continue_()
        host=ready(page)
        page.wait_for_function('''() => JSON.parse(document.querySelector('.interior-canvas').dataset.interiorFurniture||'[]').every(x=>x.loaded&&x.draws>0)''',timeout=30000)
        assert {x['modelId'] for x in models(host)}=={'supplied/office','supplied/waistcoat','supplied/service'}
        reports.append(capture(page,host,'wide-'+name))
        for button,mode in [('Theo cư dân','follow'),('Góc trên cao','overhead')]:
            page.locator('.interior-view').get_by_role('button',name=button,exact=True).click()
            host=ready(page);reports.append(capture(page,host,mode+'-'+name))
        # Owner pause through the existing button and mocked acknowledgement.
        page.get_by_role('button',name='Tạm nghỉ',exact=True).evaluate('(b)=>b.click()')
        page.get_by_role('button',name='Tiếp tục',exact=True).wait_for(timeout=20000)
        page.wait_for_timeout(500)
        pose=lambda:[{k:v for k,v in a.items() if k!='draws'} for a in models(host)]
        a=pose();page.wait_for_timeout(1200);assert pose()==a,'Paused interior pose drift'
        page.get_by_role('button',name='Tiếp tục',exact=True).evaluate('(b)=>b.click()')
        page.get_by_role('button',name='Tạm nghỉ',exact=True).wait_for(timeout=20000)
        page.wait_for_timeout(600);assert pose()!=a,'Resume must animate again'
        page.locator('.interior-view').get_by_role('button',name='Tầng 2',exact=True).click()
        page.wait_for_function('document.querySelector(".interior-canvas")?.dataset.interiorFrames>=3')
        assert models(host)==[] and host.get_attribute('data-interior-visible')=='0'
        reports.append(capture(page,host,'upper-empty-'+name))
        page.locator('.interior-view').get_by_role('button',name='Tầng trệt',exact=True).click();ready(page)
        page.wait_for_timeout(300)
        assert page.locator('.interior-canvas canvas').count()==1
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        assert not errors,errors
        reports.append({'case':'lifecycle-'+name,'pauseStable':True,'resume':True,'floorRemount':True,'slowLoadBeyond4s':name=='mobile','errors':errors,'apiWrites':'mocked only'})
        print('PASS native interior',name,flush=True);page.close()
      (out/'metrics.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2))
    except BaseException:
      for context in browser.contexts:
        for i,page in enumerate(context.pages):
          try:page.screenshot(path=str(out/('failure-'+str(i)+'.png')),timeout=10000)
          except Exception:pass
      raise
    finally:browser.close()
