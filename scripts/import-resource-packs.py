#!/usr/bin/env python3
"""Import canonical glTF assets only; never execute archive text or extract formats wholesale."""
import argparse, importlib.util, json, re, sys, zipfile
from pathlib import Path, PurePosixPath
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('kenney_import',Path(__file__).with_name('import-kenney.py'))
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
ROOT=Path(__file__).resolve().parents[1];OUTPUT=ROOT/'public/models/resources';MANIFEST=ROOT/'data/assets/resource-manifest.json'
NAMES=['animal','animal007','animalB','birds','farm','human001','human002','human003','human004','human005','human007','human008']
PACKS={f'gobkit-{name}':f'gobkit-{name}-pack.zip' for name in NAMES}
PACKS.update({'kaykit-adventurers':'KayKit_Adventurers_2.0_FREE.zip','kaykit-furniture':'KayKit_Furniture_Bits_1.0_FREE.zip','kaykit-city':'KayKit_City_Builder_Bits_1.0_FREE.zip'})
MAX_TOTAL=64*1024*1024

def slug(value):return re.sub(r'[^a-z0-9_-]+','-',re.sub(r'([a-z0-9])([A-Z])',r'\1-\2',value).lower()).strip('-')
def write(relative,data):
 p=OUTPUT.joinpath(*base.safe_relative(relative).parts)
 if p.is_symlink() or not p.resolve().is_relative_to(OUTPUT.resolve()):raise ValueError('Output escapes asset directory')
 p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
 return {'url':'/models/resources/'+relative,'bytes':len(data),'sha256':base.sha(data)}
def document(data,name):
 g=base.parse_glb(data) if name.endswith('.glb') else json.loads(data)
 if g.get('asset',{}).get('version')!='2.0':raise ValueError('Not glTF 2.0')
 return g

def import_packs(source):
 files={};assets=[];packs=[]
 for pack,filename in PACKS.items():
  matches=sorted(source.rglob(filename))
  if len(matches)!=1:raise ValueError(f'Expected one source ZIP: {filename}')
  path=matches[0]
  with zipfile.ZipFile(path) as z:
   names=[i.filename for i in z.infolist() if not i.is_dir()]
   if len(names)!=len(set(names)):raise ValueError('Duplicate ZIP path')
   licenses=[n for n in names if PurePosixPath(n).name.lower() in ['license.txt','licence.txt']]
   if len(licenses)!=1:raise ValueError(f'Expected license in {pack}')
   license_bytes=base.read_member(z,licenses[0]);license_text=license_bytes.decode('utf-8')
   if 'CC0' not in license_text and 'Creative Commons Zero' not in license_text:raise ValueError('CC0 not verified')
   meta=write(pack+'/LICENSE.txt',license_bytes);files[meta['url']]=meta
   pack_info={'id':pack,'sourceFile':filename,'sourceSha256':base.sha(path.read_bytes()),'license':'CC0-1.0','licenseUrl':meta['url'],'referenceImages':[]}
   models=sorted(n for n in names if PurePosixPath(n).suffix.lower() in ['.glb','.gltf'])
   for name in models:
    raw=base.read_member(z,name);g=document(raw,name);info=base.metadata(g)
    relative=pack+'/'+name;record=write(relative,raw);files[record['url']]=record
    dependencies=[]
    for item in [*g.get('images',[]),*g.get('buffers',[])]:
     uri=item.get('uri')
     if not uri:continue
     # These packs are self-contained and have no data URLs or network dependencies.
     dependency=base.safe_relative(uri)
     if dependency.suffix.lower() not in ['.png','.jpg','.jpeg','.bin']:raise ValueError('Unsupported glTF dependency')
     member=str(PurePosixPath(name).parent/dependency);data=base.read_member(z,member)
     output=write(pack+'/'+member,data);files[output['url']]=output;dependencies.append(output)
    stem=PurePosixPath(name).stem
    kind='animation-library' if '/Animations/' in name else 'character' if info['skins'] else 'prop'
    if pack in ['gobkit-animal','gobkit-animal007','gobkit-animalB','gobkit-birds','gobkit-farm']:kind='animal'
    if pack=='kaykit-furniture':kind='furniture'
    if pack=='kaykit-city':kind='city'
    genre='theatre' if pack in ['gobkit-human003','kaykit-adventurers'] else 'exhibition' if pack=='gobkit-human004' else 'daily-life'
    assets.append({'id':pack+'/'+slug(stem),'name':stem,'pack':pack,'kind':kind,'genre':genre,'license':'CC0-1.0',**record,**info,'resources':dependencies,'sourceMember':name})
   # Keep distinct image references/atlases; omit copies in alternate FBX/OBJ directories.
   seen=set()
   for name in sorted(n for n in names if n.lower().endswith('.png')):
    if any('fbx' in part.lower() or part.lower()=='obj' for part in PurePosixPath(name).parts):continue
    data=base.read_member(z,name);digest=base.sha(data)
    if digest in seen:continue
    seen.add(digest);meta=write(pack+'/references/'+digest[:10]+'-'+PurePosixPath(name).name,data);files[meta['url']]=meta;pack_info['referenceImages'].append(meta)
   packs.append(pack_info)
 ids=[a['id'] for a in assets]
 if len(ids)!=len(set(ids)):raise ValueError('Canonical asset ID collision')
 total=sum(f['bytes'] for f in files.values())
 if total>MAX_TOTAL:raise ValueError('Resource budget exceeded')
 manifest={'version':1,'license':'CC0-1.0','packs':packs,'assets':assets,'files':list(files.values()),'bytes':total,'maxBytes':MAX_TOTAL}
 MANIFEST.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 keys=['id','name','pack','kind','genre','url','bytes','sha256','license','bounds','clips','skins','triangles']
 catalog={'version':1,'packs':packs,'assets':[{k:a[k] for k in keys} for a in assets]}
 (OUTPUT/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+'\n')
 check()

def check():
 m=json.loads(MANIFEST.read_text());catalog=json.loads((OUTPUT/'catalog.json').read_text())
 if len(m['packs'])!=15 or len(m['assets'])!=239:raise ValueError('Incomplete canonical resource import')
 total=0
 for f in m['files']:
  relative=f['url'].removeprefix('/models/resources/');p=OUTPUT.joinpath(*base.safe_relative(relative).parts)
  if p.is_symlink() or not p.resolve().is_relative_to(OUTPUT.resolve()):raise ValueError('Invalid resource path')
  raw=p.read_bytes();total+=len(raw)
  if len(raw)!=f['bytes'] or base.sha(raw)!=f['sha256']:raise ValueError('Resource hash mismatch: '+f['url'])
 if total>MAX_TOTAL or total!=m['bytes']:raise ValueError('Resource byte budget')
 for a,c in zip(m['assets'],catalog['assets'],strict=True):
  if a['id']!=c['id'] or a['sha256']!=c['sha256'] or a['license']!='CC0-1.0':raise ValueError('Browser catalog mismatch')
  raw=(ROOT/'public'/a['url'].lstrip('/')).read_bytes();g=document(raw,a['url'])
  for item in [*g.get('images',[]),*g.get('buffers',[])]:
   if item.get('uri'):
    p=(ROOT/'public'/a['url'].lstrip('/')).parent.joinpath(*base.safe_relative(item['uri']).parts)
    if not p.is_file():raise ValueError('Missing glTF dependency')
 print(json.dumps({'packs':len(m['packs']),'assets':len(m['assets']),'skinned':sum(a['skins']>0 for a in m['assets']),'files':len(m['files']),'bytes':total,'integrity':'verified','dependencies':'local and complete'}))

if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source-dir',type=Path,default=Path('/workspace/attachments'));p.add_argument('--check',action='store_true');args=p.parse_args()
 if args.check:check()
 else:import_packs(args.source_dir)
