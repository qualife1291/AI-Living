import urllib.request,json,hashlib,tarfile,pathlib
root=pathlib.Path(__file__).resolve().parents[1]/'.sites-runtime'/'ai'
root.mkdir(parents=True,exist_ok=True)
artifacts=json.loads((pathlib.Path(__file__).resolve().parents[1]/'data/living/ai-artifacts.json').read_text())
def get(url):
 with urllib.request.urlopen(url,timeout=30) as r:return json.load(r)
def download(url,path,sha):
 if path.exists() and hashlib.file_digest(path.open('rb'),'sha256').hexdigest()==sha:return
 tmp=path.with_suffix('.part')
 with urllib.request.urlopen(url,timeout=90) as r,tmp.open('wb') as out:
  while b:=r.read(1024*1024):out.write(b)
 actual=hashlib.file_digest(tmp.open('rb'),'sha256').hexdigest()
 if actual!=sha:raise ValueError('checksum mismatch')
 tmp.rename(path)
 print('Verified',path.name,flush=True)
download(artifacts['llama']['url'],root/'llama.tar.gz',artifacts['llama']['sha256'])
with tarfile.open(root/'llama.tar.gz') as t:
    valid=True
    for member in t.getmembers():
        if not member.isfile(): continue
        target=root/'llama'/member.name
        if not target.is_file() or hashlib.file_digest(target.open('rb'),'sha256').digest()!=hashlib.file_digest(t.extractfile(member),'sha256').digest():
            valid=False
            break
    if not valid:
        # Extract to a staging directory; never truncate a running executable.
        import tempfile,os
        with tempfile.TemporaryDirectory(dir=root) as staging:
            t.extractall(staging,filter='data')
            for source in pathlib.Path(staging).rglob('*'):
                target=root/'llama'/source.relative_to(staging)
                if source.is_dir(): target.mkdir(parents=True,exist_ok=True)
                else:
                    target.parent.mkdir(parents=True,exist_ok=True)
                    os.replace(source,target)
download(artifacts['model']['url'],root/'qwen2.5-1.5b-instruct-q4_k_m.gguf',artifacts['model']['sha256'])
print('Local open-source AI ready; binaries and model SHA-256 verified. License: Apache-2.0 (Qwen), MIT (llama.cpp).')
