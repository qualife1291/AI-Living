"""Package the verified Worker build only, omitting secrets, runtime DBs and source caches."""
import json, pathlib, tarfile, subprocess, hashlib
root=pathlib.Path(__file__).resolve().parents[1]
if subprocess.check_output(['git','status','--porcelain'],cwd=root,text=True).strip():
    raise SystemExit('Commit source and release notes before packaging.')
sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
if json.loads((root/'dist/.openai/source.json').read_text())['commit_sha'] != sha:
    raise SystemExit('Release build does not match HEAD; run npm run release:build.')
manifest=json.loads((root/'.openai/hosting.json').read_text())
if not manifest.get('project_id') or not (root/'dist/server/index.js').is_file():
    raise SystemExit('Project identity or Worker build missing')
if (root/'dist/.openai/hosting.json').read_bytes() != (root/'.openai/hosting.json').read_bytes():
    raise SystemExit('Rebuild after manifest change')
for path in (root/'dist').rglob('*'):
    if path.is_symlink() or path.name.startswith('.env') or path.name.startswith('.dev.vars') or path.suffix in ('.sqlite','.sqlite3','.pem'):
        raise SystemExit('Disallowed deployment artifact')
out=root/'work/production.tar.gz';out.parent.mkdir(exist_ok=True)
with tarfile.open(out,'w:gz') as archive:
    archive.add(root/'dist',arcname='dist')
    archive.add(root/'dist'/'.openai',arcname='.openai')
print(json.dumps({'archive':str(out),'commit_sha':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'project_id':manifest['project_id'],'sha256':hashlib.sha256(out.read_bytes()).hexdigest()}))
