"""Extract only hash-pinned GLBs from the owner's verified ZIP vault; execute no archive code."""
import json,hashlib,zipfile,stat,sys
from pathlib import Path,PurePosixPath
repo=Path(__file__).resolve().parent.parent
selection=json.loads((repo/'data/assets/supplied-selection.json').read_text());registry=json.loads((repo/'data/assets/source-archives.json').read_text());vault=repo/registry['localDirectory'];out=repo/'work/supplied-inputs';out.mkdir(exist_ok=True,parents=True);results=[]
for archive in sorted(set(a['archive'] for a in selection['assets'])):
 entry=next(a for a in registry['archives'] if a['file']==archive);path=vault/archive
 if not stat.S_ISREG(path.lstat().st_mode) or path.stat().st_size!=entry['bytes']:raise ValueError('Invalid source archive')
 h=hashlib.sha256()
 with path.open('rb') as f:
  while b:=f.read(4*1024**2):h.update(b)
 if h.hexdigest()!=entry['sha256']:raise ValueError('Source archive checksum mismatch')
 with zipfile.ZipFile(path) as z:
  for nested in sorted(set(a['nested'] for a in selection['assets'] if a['archive']==archive)):
   matches=[i for i in z.infolist() if not i.is_dir() and not i.filename.startswith('__MACOSX/') and PurePosixPath(i.filename).name==nested];assert len(matches)==1
   i=matches[0];assert i.file_size<=150*1024**2 and not i.flag_bits&1
   temp=out/nested;temp.write_bytes(z.read(i))
   with zipfile.ZipFile(temp) as n:
    for a in [a for a in selection['assets'] if a['archive']==archive and a['nested']==nested]:
     name=a['member'];assert not PurePosixPath(name).is_absolute() and '..' not in PurePosixPath(name).parts and '\\' not in name
     matches=[i for i in n.infolist() if i.filename==name];assert len(matches)==1
     i=matches[0];assert i.file_size<=16*1024**2 and not i.flag_bits&1 and ((i.external_attr>>16)&0o170000)!=0o120000
     data=n.read(i);assert hashlib.sha256(data).hexdigest()==a['sourceSha256'];target=out/(a['id'].split('/')[1]+'.glb');assert not target.is_symlink();target.write_bytes(data);results.append({'id':a['id'],'bytes':len(data)})
print(json.dumps({'selected':results,'codeExecuted':False}))
