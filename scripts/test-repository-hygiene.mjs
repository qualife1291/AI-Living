/** Real source export and Markdown fixtures; no network, user DB or application writes. */
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

function python(args,input){
 const result=spawnSync('python3',args,{input,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr||result.stdout);
 return result.stdout;
}
const temp=mkdtempSync(join(tmpdir(),'xom-repository-hygiene-'));
try {
 const project=join(temp,'project');mkdirSync(project);
 const packager=readFileSync('scripts/package-handoff.py','utf8');
 const required=JSON.parse(python(['-c',`import ast,json,sys
tree=ast.parse(sys.stdin.read())
print(json.dumps(next(ast.literal_eval(node.value) for node in tree.body if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='required' for t in node.targets))))`],packager));
 for(const file of required){const path=join(project,file);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,'Synthetic source fixture\n');}
 const script=join(project,'scripts/package-handoff.py');mkdirSync(dirname(script),{recursive:true});writeFileSync(script,packager);
 const docsScript=join(project,'scripts/check-docs.py');writeFileSync(docsScript,readFileSync('scripts/check-docs.py'));
 const snapshot=()=>Object.fromEntries(readdirSync(project,{recursive:true,withFileTypes:true}).filter(e=>e.isFile()).map(e=>{
  const file=join(e.parentPath,e.name);return[file,readFileSync(file).toString('base64')];
 }));
 const before=snapshot();
 python([docsScript]); // The same checker must work in a source ZIP without .git.
 for(let i=0;i<2;i++){
  const out=join(temp,`source-${i}.zip`);python([script,out]);
  assert.deepEqual(snapshot(),before,'Export must not create or modify any source file, including on repeat');
  python(['-c',`import json,sys,zipfile
with zipfile.ZipFile(sys.argv[1]) as archive:
 assert archive.testzip() is None
 manifest=json.loads(archive.read('xom-ai/TRANSFER_MANIFEST.json'))
 assert manifest['files']
 assert not any(row['path']=='TRANSFER_MANIFEST.json' for row in manifest['files'])`,out]);
 }
 python(['-c',String.raw`import runpy,sys,tempfile
from pathlib import Path
check=runpy.run_path(sys.argv[1])['check_documents']
with tempfile.TemporaryDirectory() as folder:
 root=Path(folder)
 (root/'Đích.md').write_text('# Đối chiếu\n## Notes\n## Notes-1\n## Notes\n')
 (root/'doc.md').write_text('[valid](%C4%90%C3%ADch.md#đối-chiếu)\n[dup](Đích.md#notes-2)\n[external](https://example.invalid/path#section)\n~~~md\n[ignored](missing.md)\n~~~\n'+chr(96)+'[ignored](missing.md)'+chr(96)+'\n')
 assert check(root,['doc.md','Đích.md'])==[]
 (root/'doc.md').write_text('[file](missing.md)\n[anchor](Đích.md#missing)\n[image](missing.png)\n')
 assert len(check(root,['doc.md']))==3
 assert len(check(root,['absent.md']))==1`,resolve('scripts/check-docs.py')]);
 console.log(JSON.stringify({suite:'repository-hygiene',sourceExports:2,sourceUntouched:true,manifestVerified:true,unicodeAndDuplicateAnchors:true,missingPathHeadingImage:true,codeAndExternalLinksExcluded:true,productionAccess:false}));
} finally {rmSync(temp,{recursive:true,force:true});}
