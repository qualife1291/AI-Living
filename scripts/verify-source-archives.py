"""Read-only integrity check for large original ZIPs kept outside the app/Git tree."""
import argparse,hashlib,json,stat,sys
from pathlib import Path
repo=Path(__file__).resolve().parent.parent
manifest=json.loads((repo/'data/assets/source-archives.json').read_text())
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--directory',type=Path,default=repo/manifest['localDirectory'])
args=parser.parse_args();failed=False
for entry in manifest['archives']:
 name=entry['file']
 if Path(name).name!=name or not name.endswith('.zip'):raise ValueError('Invalid archive basename')
 path=args.directory/name;result={'file':name,'expectedBytes':entry['bytes']}
 try:
  info=path.lstat()
  if not stat.S_ISREG(info.st_mode):raise ValueError('Expected a regular archive file')
  if info.st_size!=entry['bytes']:raise ValueError('Archive byte count mismatch')
  h=hashlib.sha256()
  with path.open('rb') as f:
   while data:=f.read(4*1024*1024):h.update(data)
  if h.hexdigest()!=entry['sha256']:raise ValueError('Archive SHA256 mismatch')
  result.update(status='verified',sha256=h.hexdigest())
 except FileNotFoundError:result['status']='missing';failed=True
 except (OSError,ValueError) as error:result.update(status='invalid',reason=type(error).__name__);failed=True
 print(json.dumps(result,ensure_ascii=False),flush=True)
print(json.dumps({'scope':'local source-vault verification only; no writes, downloads or remote backup claim','externalBackup':manifest['externalBackup']['status']}))
sys.exit(1 if failed else 0)
