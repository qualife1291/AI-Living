"""Actual local rendered evidence from synthetic world responses; no real-world writes."""
import json,subprocess,time,os,datetime
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
base=os.environ.get('QA_BASE','http://127.0.0.1:5177');assert urlparse(base).hostname in ['127.0.0.1','localhost']
out=root/'docs/screenshots/social';out.mkdir(parents=True,exist_ok=True)
report=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for name,width,height,dpr in [('desktop',1440,900,1.5),('mobile',390,844,3)]:
   fixture=json.loads(subprocess.check_output(['node','scripts/social-preview-fixture.mjs'],cwd=root,text=True))
   page=b.new_page(viewport={'width':width,'height':height},device_scale_factor=dpr,is_mobile=name=='mobile',has_touch=name=='mobile')
   page.add_init_script('''window.__socialQA={lines:[],firstAt:null};new MutationObserver(()=>{const e=document.querySelector('.three-speech');if(e&&/^(An → Bình|Bình → An)/.test(e.innerText)&&!window.__socialQA.lines.includes(e.innerText)){window.__socialQA.lines.push(e.innerText);window.__socialQA.firstAt??=performance.now()}}).observe(document,{subtree:true,childList:true,characterData:true})''')
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   def respond(route):
    fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat()
    route.fulfill(status=200,content_type='application/json',body=json.dumps(fixture))
   page.route('**/api/world*',respond)
   page.route('**/api/living/pulse',lambda route:route.fulfill(status=200,content_type='application/json',body='{"ok":true,"duplicate":true}'))
   page.goto(base,wait_until='domcontentloaded',timeout=60000)
   host=page.locator('.three-canvas[data-ready="true"]');host.wait_for(timeout=90000)
   bubble=page.locator('.three-speech');bubble.wait_for(timeout=20000)
   assert 'Kịch bản' in bubble.inner_text()
   before=bubble.inner_text();first_cast=json.loads(host.get_attribute('data-social-cast'))
   assert len(first_cast)>=2
   a=next(a for a in first_cast if a['id']=='an');buddy=next(b for b in first_cast if b['id']==a['peerId']);assert buddy['peerId']==a['id']
   assert 13.9<=sum((a['position'][i]-buddy['position'][i])**2 for i in [0,1])**.5<=30
   assert sum(1 for a in [a,buddy] if a['speaking'])==1
   page.screenshot(path=str(out/f'workshop-{name}-preview.png'))
   page.wait_for_function('(before)=>{const e=document.querySelector(".three-speech");return e&&e.innerText!==before}',arg=before,timeout=10000)
   page.screenshot(path=str(out/f'reply-{name}-preview.png'))
   page.wait_for_function('window.__socialQA.firstAt!==null && performance.now()-window.__socialQA.firstAt>=26000',timeout=35000)
   lines=page.evaluate('window.__socialQA.lines')
   assert len(lines)==6,lines
   speakers=[line.split('→')[0].strip() for line in lines]
   assert all(speakers[i]!=speakers[i-1] for i in range(1,len(speakers))),speakers
   after=lines[1];assert before.split('→')[0]!=after.split('→')[0],(before,after)
   assert int(host.get_attribute('data-draw-calls'))<90
   assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
   assert not errors,errors
   report.append({'viewport':name,'renderer':'Chromium SwiftShader','fixture':'synthetic-workshop-no-world-writes','first':before,'reply':after,'fullDialogue':lines,'pollingCoveredSeconds':24,'stats':host.evaluate('(e)=>({...e.dataset})')})
   print(name,'PASS complete dialogue through polling, paired speakers, 1.4m personal space, source label, responsive/no errors',len(lines),'lines',flush=True)
   page.close()
  (out/'metrics.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
 finally:b.close()
