"""Read-only release evidence/backup. Credential JSON arrives on hidden stdin only."""
import sys,json,termios,urllib.request,hashlib,time
from pathlib import Path
if sys.stdin.isatty():
 settings=termios.tcgetattr(sys.stdin);settings[3]&=~termios.ECHO;termios.tcsetattr(sys.stdin,termios.TCSANOW,settings)
print('Ready for production access JSON on stdin (input is hidden).',flush=True)
config=json.loads(sys.stdin.readline())
origin='https://xom-ai-long.bouncyslug18.chatgpt.site'
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):return None
opener=urllib.request.build_opener(NoRedirect())
def get(path):
 request=urllib.request.Request(origin+path,headers={'OAI-Sites-Authorization':'Bearer '+config['token']})
 with opener.open(request,timeout=30) as response:return response.read()
started=time.monotonic();raw=get('/api/world');latency=round((time.monotonic()-started)*1000);snapshot=json.loads(raw)
health=json.loads(get('/api/health'))
instructions=get('/api/instructions').decode()
result={'revision':snapshot['revision'],'event_count':len(snapshot['events']),'event_ids':[e['id'] for e in snapshot['events']],'memory_counts':{p['id']:len(p['memories']) for p in snapshot['world']['people']},'health':health,'read_sample_ms':latency,'director_instructions_present':'CHỈ ĐẠO CẢNH ĐỜI THƯỜNG' in instructions}
if config.get('backup_name'):
 name=config['backup_name']
 if not name.replace('-','').replace('_','').isalnum():raise ValueError('Invalid backup name')
 path=Path('backups')/(name+'.json');path.parent.mkdir(exist_ok=True)
 with path.open('xb') as f:f.write(raw)
 result['backup_sha256']=hashlib.sha256(raw).hexdigest();result['backup_path']=str(path)
print(json.dumps(result,ensure_ascii=False))
