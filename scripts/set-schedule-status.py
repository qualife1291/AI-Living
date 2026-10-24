import sys,json,urllib.request
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):return None
c=json.loads(sys.stdin.readline());opener=urllib.request.build_opener(NoRedirect())
def call(body=None):
 req=urllib.request.Request(c['origin']+'/api/world',data=json.dumps(body).encode() if body else None,headers={'OAI-Sites-Authorization':'Bearer '+c['token'],'Content-Type':'application/json'})
 with opener.open(req,timeout=40) as r:return json.loads(r.read())
s=call();result=call({'revision':s['revision'],'schedule':'08:00 · 14:00 · 20:00 giờ Việt Nam — tác vụ đã bật; chờ xác minh lượt chạy theo lịch'});readback=call();print(json.dumps({'ok':result.get('ok'),'schedule':readback['world']['schedule'],'paused':readback['world']['paused']},ensure_ascii=False))
