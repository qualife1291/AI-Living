"""Repeat cold-page loading measurements for two compiled loopback builds. No real API writes."""
import json,os,subprocess,statistics
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
bases=[('before',os.environ['QA_BEFORE']),('after',os.environ['QA_BASE'])]
assert all(urlparse(base).hostname in ('localhost','127.0.0.1') for _,base in bases)
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for viewport,w,h,dpr in [('desktop',1440,900,2),('mobile',390,844,3)]:
   for repeat in range(3):
    # Alternate order; a fresh page/context has no previous HTTP cache.
    for version,base in bases if repeat%2==0 else list(reversed(bases)):
     fixture=json.loads(subprocess.check_output(['node','scripts/social-preview-fixture.mjs'],cwd=root,text=True))
     page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=dpr,is_mobile=viewport=='mobile',has_touch=viewport=='mobile')
     errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
     page.route('**/api/**',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"views":1}'))
     page.route('**/api/world*',lambda r:r.fulfill(status=200,content_type='application/json',body=json.dumps(fixture)))
     cdp=page.context.new_cdp_session(page);cdp.send('Network.enable');cdp.send('Network.setCacheDisabled',{'cacheDisabled':True})
     cdp.send('Network.emulateNetworkConditions',{'offline':False,'latency':30,'downloadThroughput':2000000,'uploadThroughput':1000000,'connectionType':'wifi'})
     page.add_init_script('''new MutationObserver(()=>{const h=document.querySelector('.three-canvas[data-ready="true"]');if(h&&!window.__firstReady)window.__firstReady=performance.now()}).observe(document,{childList:true,subtree:true,attributes:true,attributeFilter:['data-ready']});''')
     page.goto(base,wait_until='domcontentloaded',timeout=60000);page.locator('.three-canvas[data-ready="true"]').wait_for(timeout=90000)
     r=page.evaluate('''()=>{const h=document.querySelector('.three-canvas'),c=h.querySelector('canvas'),rs=performance.getEntriesByType('resource').filter(x=>x.startTime<=window.__firstReady),models=rs.filter(x=>x.name.includes('/models/'));return{firstReadyMs:window.__firstReady,firstFrameMarkMs:+h.dataset.firstFrameMs||null,loadedAssets:+h.dataset.loadedAssets,failedAssets:+h.dataset.failedAssets,modelEncodedBytes:models.reduce((n,x)=>n+x.encodedBodySize,0),modelTransferBytes:models.reduce((n,x)=>n+x.transferSize,0),modelRequests:models.length,jsEncodedBytes:rs.filter(x=>x.name.includes('.js')).reduce((n,x)=>n+x.encodedBodySize,0),canvas:[c.width,c.height],css:[h.clientWidth,h.clientHeight],quality:h.dataset.effectiveQuality,drawCalls:+h.dataset.drawCalls}}''')
     r.update(version=version,viewport=viewport,repeat=repeat,errors=errors);results.append(r);print(json.dumps(r),flush=True);assert not errors;assert r['failedAssets']==0
     page.close()
 finally:browser.close()
summary=[]
for viewport in ('desktop','mobile'):
 for version,_ in bases:
  cases=[r for r in results if r['version']==version and r['viewport']==viewport]
  summary.append({'viewport':viewport,'version':version,'samples':len(cases),'medianFirstReadyMs':statistics.median(r['firstReadyMs'] for r in cases),'medianModelEncodedBytes':statistics.median(r['modelEncodedBytes'] for r in cases),'medianModelTransferBytes':statistics.median(r['modelTransferBytes'] for r in cases),'loadedAssets':[r['loadedAssets'] for r in cases]})
Path(os.environ['QA_LOADING_OUT']).write_text(json.dumps({'production':False,'renderer':'Chromium SwiftShader','network':{'latencyMs':30,'downloadBytesPerSecond':2000000,'uploadBytesPerSecond':1000000,'cacheDisabled':True},'fixture':'Synthetic, API mocked, three fresh-page repeats per viewport/build; alternating build order. Not a hardware/phone/production SLA.','cases':results,'summary':summary},ensure_ascii=False,indent=2)+'\n')
