"""Real UI lost-ACK test; optional real Worker/D1 on a dedicated loopback fixture."""
import datetime,json,os,subprocess,sqlite3
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent;base=os.environ.get('QA_BASE','')
assert urlparse(base).hostname in ('localhost','127.0.0.1')
out=Path(os.environ.get('QA_OUT',str(root/'docs/screenshots/phase-verification')));out.mkdir(parents=True,exist_ok=True)
results=[]
db_path=os.environ.get('QA_DB')
db=None
if db_path:
 path=Path(db_path);assert str(path).startswith('/tmp/xom-phase-verification-') and path.resolve()==path and path.stat().st_nlink==1
 marker=next((parent/'.chat-verification-fixture.json' for parent in path.parents if (parent/'.chat-verification-fixture.json').exists()),None)
 assert marker and json.loads(marker.read_text())['purpose']=='chat-verification-only'
 db=sqlite3.connect('file:'+str(path)+'?mode=ro',uri=True)
 assert db.execute('select count(*) from visitor_exchanges').fetchone()[0]==0,'Fresh dedicated fixture required'
 def protected_snapshot():
  # Not every protected table has an `id` column. Sort the full serialized rows
  # so the comparison covers every column without assuming a shared key shape.
  return [sorted(json.dumps(row,ensure_ascii=False) for row in db.execute('select * from '+table).fetchall()) for table in ['worlds','episodes','memories','learning_policies','agent_experiences']]
 protected_before=protected_snapshot()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for name,w,h in [('desktop',1365,900),('mobile',390,844),('narrow',320,740)]:
   page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1,is_mobile=w<700,has_touch=w<700)
   fixture=json.loads(subprocess.check_output(['node','scripts/social-preview-fixture.mjs','--motion'],cwd=root,text=True));state={'mode':'lost-ack','requests':[],'stored':{},'errors':[],'pending':None}
   page.on('pageerror',lambda e:state['errors'].append(str(e)))
   page.route('**/api/**',lambda r:r.fulfill(status=200,content_type='application/json',body='{"ok":true,"views":1}'))
   def world(route):
    assert route.request.method=='GET';fixture['serverNow']=datetime.datetime.now(datetime.timezone.utc).isoformat();route.fulfill(status=200,content_type='application/json',body=json.dumps(fixture))
   def chat(route):
    body=route.request.post_data_json;state['requests'].append(body)
    if db:
     response=route.fetch();assert response.status==200,(response.status,response.text());saved=response.json()
     state['stored'].setdefault(body['id'],saved)
    else:saved=state['stored'].setdefault(body['id'],{**body,'reply':'Đã nhận lời nhắn của bạn.','source':'rules'})
    if state['mode']=='lost-ack':
     if db:state['lostAckGate']=db.execute("select data,expires_at from context_cache where id='internal:visitor-chat:v1'").fetchone()
     route.abort('failed')
    elif state['mode']=='invalid-ack':route.fulfill(status=200,content_type='application/json',body=json.dumps({**saved,'id':'00000000-0000-4000-8000-000000000000'}))
    elif state['mode']=='held':state['pending']=route
    else:route.fulfill(status=200,content_type='application/json',body=json.dumps(saved))
   page.route('**/api/world*',world);page.route('**/api/living/interact',chat)
   try:
    page.goto(base,wait_until='domcontentloaded',timeout=60000);page.locator('.three-canvas[data-ready="true"]').wait_for(timeout=90000)
    page.get_by_role('button',name='Cư dân',exact=True).click();field=page.locator('#visitor-message')
    text='Lời nhắn giữ nguyên sau khi mất xác nhận';field.fill('   '+text+'   ');field.press('Enter');page.get_by_role('alert').filter(has_text='Mất kết nối').wait_for(timeout=15000)
    first=state['requests'][-1]['id'];assert len(state['stored'])==1;assert field.input_value()=='   '+text+'   '
    page.wait_for_timeout(1000);assert len(state['requests'])==1,'No automatic write retry'
    page.screenshot(path=str(out/f'{name}-lost-ack-preview.png'))
    state['mode']='success';field.fill(text);field.press('Enter');page.locator('.conversation blockquote').wait_for()
    assert state['requests'][-1]['id']==first,'Manual lost-ACK retry must reuse UUID'
    assert len(state['stored'])==1,'Lost-ACK retry must not consume a second exchange/quota slot'
    if db:
     assert db.execute('select count(*) from visitor_exchanges where id=?',(first,)).fetchone()[0]==1
     assert db.execute("select data,expires_at from context_cache where id='internal:visitor-chat:v1'").fetchone()==state['lostAckGate'],'Durable retry must leave the exact quota row unchanged'
    assert field.input_value()==''
    field.fill(text);field.press('Enter');page.wait_for_function('document.querySelector(".conversation form").getAttribute("aria-busy")==="false" && document.querySelector("#visitor-message").value===""')
    assert state['requests'][-1]['id']!=first,'An intentional new message after success needs a fresh UUID';assert len(state['stored'])==2
    state['mode']='invalid-ack';field.fill('Chưa được xác nhận đúng UUID');field.press('Enter');page.get_by_role('alert').filter(has_text='Chưa xác nhận').wait_for()
    invalid=state['requests'][-1]['id'];assert field.input_value()=='Chưa được xác nhận đúng UUID'
    state['mode']='success';field.press('Enter');page.wait_for_function('document.querySelector(".conversation form").getAttribute("aria-busy")==="false" && document.querySelector("#visitor-message").value===""');assert state['requests'][-1]['id']==invalid
    # The server commits, but its ACK remains held beyond the real 10s UI deadline.
    state['mode']='held';state['pending']=None;field.fill('Giữ lời nhắn khi hết thời gian');field.press('Enter')
    page.get_by_role('alert').filter(has_text='Mất kết nối').wait_for(timeout=15000)
    timed_out=state['requests'][-1]['id'];held=state['pending'];assert held is not None
    assert field.input_value()=='Giữ lời nhắn khi hết thời gian' and not field.get_attribute('readonly')
    requests_before=len(state['requests']);page.wait_for_timeout(500);assert len(state['requests'])==requests_before
    timeout_gate=db.execute("select data,expires_at from context_cache where id='internal:visitor-chat:v1'").fetchone() if db else None
    try:held.abort('failed')
    except Exception:pass # the browser deadline may already have aborted this route
    state['mode']='success';field.press('Enter');page.wait_for_function('document.querySelector(".conversation form").getAttribute("aria-busy")==="false" && document.querySelector("#visitor-message").value===""')
    assert state['requests'][-1]['id']==timed_out
    if db:assert db.execute("select data,expires_at from context_cache where id='internal:visitor-chat:v1'").fetchone()==timeout_gate
    state['mode']='held';field.fill('Đợi An trả lời');field.press('Enter');page.wait_for_function('document.querySelector(".conversation form").getAttribute("aria-busy")==="true"')
    before=len(state['requests']);page.locator('.conversation form').evaluate('(f)=>{f.requestSubmit();f.requestSubmit()}');page.wait_for_timeout(100);assert len(state['requests'])==before
    old=state['pending'];page.locator('.people-grid button').filter(has_text='Bình').click()
    # Choosing a resident intentionally closes the panel; reopen it for Bình.
    page.get_by_role('button',name='Cư dân',exact=True).click();field=page.locator('#visitor-message');field.fill('Chào Bình')
    try:old.fulfill(status=200,content_type='application/json',body=json.dumps({**state['stored'][state['requests'][-1]['id']],'reply':'Câu cũ của An'}))
    except Exception:pass # expected if cleanup already aborted the unmounted request
    page.wait_for_timeout(300);assert page.locator('.conversation blockquote').count()==0,'No old actor response in the new actor panel'
    state['mode']='success';field.fill(text);field.press('Enter');page.locator('.conversation blockquote').wait_for();assert state['requests'][-1]['actorId']=='binh'
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not state['errors'],state['errors']
    results.append({'viewport':name,'lostAckStableUuid':True,'noExtraStoredExchange':True,'newIntentNewUuid':True,'wrongAckRejected':True,'deadlineMs':10000,'deadlineKeepsDraftAndUuid':True,'inflightDuplicateBlocked':True,'actorSwitchIsolated':True,'pageErrors':state['errors']})
    print(name,'PASS stable UUID, valid ACK binding, actor isolation',flush=True)
   except Exception:
    page.screenshot(path=str(out/f'{name}-failure-preview.png'));(out/f'{name}-failure.json').write_text(json.dumps(state,ensure_ascii=False,indent=2,default=str));raise
   finally:page.close()
 finally:browser.close()
if db:
 assert protected_snapshot()==protected_before,'Real browser chat must not alter world/history/memories/policy'
 actual_rows=db.execute('select count(*) from visitor_exchanges').fetchone()[0]
 gate_count=json.loads(db.execute("select data from context_cache where id='internal:visitor-chat:v1'").fetchone()[0])['count']
 db.close()
else:actual_rows=gate_count=None
(out/'metrics.json').write_text(json.dumps({'productionAccess':False,'uiWritesMocked':not bool(db_path),'realWorkerD1':bool(db_path),'actualRows':actual_rows,'gateCount':gate_count,'protectedStateUnchanged':bool(db_path),'results':results},ensure_ascii=False,indent=2)+'\n')
