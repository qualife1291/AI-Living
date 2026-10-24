"""Read/write this private Site. Input JSON via hidden stdin; never store credentials."""
import sys,json,urllib.request,urllib.error
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs): return None
opener=urllib.request.build_opener(NoRedirect())
config=json.loads(sys.stdin.readline())
origin=config['origin'].rstrip('/')
if not origin.startswith('https://') or '/' in origin[8:]: raise ValueError('HTTPS origin required')
headers={'OAI-Sites-Authorization':'Bearer '+config['token'],'Content-Type':'application/json'}
def call(path,body=None):
 if path not in ['/api/world','/api/events','/api/instructions']: raise ValueError('Unsupported path')
 request=urllib.request.Request(origin+path,data=json.dumps(body).encode() if body is not None else None,headers=headers)
 try:
  with opener.open(request,timeout=30) as r: return r.status,json.loads(r.read())
 except urllib.error.HTTPError as e:return e.code,{'error':e.read().decode()[:300]}
status,result=call(config.get('path','/api/world'),config.get('body'))
print(json.dumps({'status':status,'result':result},ensure_ascii=False))
