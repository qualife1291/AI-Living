import sys,json,urllib.request,urllib.error
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):return None
opener=urllib.request.build_opener(NoRedirect());c=json.loads(sys.stdin.readline());origin=c['origin'];token=c['token']
def call(path,data=None,extra=None):
 h={'OAI-Sites-Authorization':'Bearer '+token,'Content-Type':'application/json'};h.update(extra or {})
 try:
  with opener.open(urllib.request.Request(origin+path,data=json.dumps(data).encode() if data is not None else None,headers=h),timeout=40) as r:return r.status,json.loads(r.read())
 except urllib.error.HTTPError as e:return e.code,{'error':e.read().decode()[:200]}
status,s=call('/api/world');assert status==200,(status,s)
event=c['event'];event['revision']=s['revision'];status,r=call('/api/events',event);assert status==200,(status,r)
_,a=call('/api/world');assert any(e['id']==event['id'] for e in a['events']);assert a['revision']==s['revision']+(0 if r.get('duplicate') else 1)
status,r=call('/api/events',event);assert status==200 and r.get('duplicate');assert call('/api/world')[1]['revision']==a['revision']
status,_=call('/api/events',{**event,'id':event['id']+'-stale'});assert status==409
bad={**event,'id':event['id']+'-bad','revision':a['revision'],'changes':[{**event['changes'][0],'moneyDelta':-999999}]};assert call('/api/events',bad)[0]==400
assert call('/api/world',{'revision':a['revision'],'paused':True})[0]==200
_,b=call('/api/world');assert call('/api/events',{**event,'id':event['id']+'-paused','revision':b['revision']})[0]==409
assert call('/api/world',{'revision':b['revision'],'paused':False})[0]==200
assert call('/api/world',{'revision':0,'paused':True},{'Origin':'https://example.invalid'})[0]==403
print(json.dumps({'verified':['authenticated read','AI event write and readback','retry idempotency','stale revision 409','invalid effects 400','pause blocks writes','resume','cross-origin rejection'],'event_id':event['id'],'state':call('/api/world')[1]},ensure_ascii=False))
