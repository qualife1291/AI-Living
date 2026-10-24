"""Export tracked source, scan credential patterns, and verify archive checksums.
Usage: python scripts/package-handoff.py /absolute/output.zip
Run after commit/push; never archives .git or runtime/dependencies.
"""
import subprocess,pathlib,zipfile,hashlib,json,re,datetime,sys
root=pathlib.Path(__file__).resolve().parents[1];out=pathlib.Path(sys.argv[1]).resolve();out.parent.mkdir(parents=True,exist_ok=True)
files=[p for p in subprocess.check_output(['git','ls-files','-z'],cwd=root).decode().split('\0') if p]
blocked={'.git','node_modules','dist','.wrangler','.sites-runtime','.vinext','.next','outputs','work','__pycache__'}
assert all(not(set(pathlib.PurePosixPath(p).parts)&blocked) for p in files)
assert all(not pathlib.Path(p).name.startswith(('.env','.dev.vars')) for p in files)
manifest={'project':'Xóm AI','source_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root).decode().strip(),'created_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'delivery':'Final source handoff; not a new production deployment','excluded':['credentials','Git internals/history','runtime database','node_modules','build output'],'files':[]}
for f in files:
 b=(root/f).read_bytes()
 if re.search(rb'art_v2_[A-Za-z0-9_]{12,}|sk-proj-[A-Za-z0-9_-]{15,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----',b):raise RuntimeError('Credential-like content found; archive stopped')
 manifest['files'].append({'path':f,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for f in files:z.write(root/f,'xom-ai/'+f)
 z.writestr('xom-ai/TRANSFER_MANIFEST.json',json.dumps(manifest,ensure_ascii=False,indent=2))
with zipfile.ZipFile(out) as z:
 assert z.testzip() is None
 for name in ['README.md','AGENTS.md','CODEX_HANDOFF.md','MEMORY_LONG.md','MEMORY_SHORT.md','ROADMAP.md','lib/life.ts','lib/traffic.ts','lib/speech.ts','pnpm-lock.yaml','docs/CHARACTER_DESIGN.md','docs/ANIMATION_SOURCES.md','docs/TESTING.md']:
  assert 'xom-ai/'+name in z.namelist(),name
 for entry in manifest['files']:assert hashlib.sha256(z.read('xom-ai/'+entry['path'])).hexdigest()==entry['sha256']
print(json.dumps({'archive':str(out),'source_files':len(files),'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'verified':'ZIP integrity, required files, per-file SHA256 and exclusion/credential scan passed'},ensure_ascii=False))
