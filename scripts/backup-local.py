"""Consistent SQLite backup of the local world DB, preserving WAL writes.
This only reads local .wrangler state; it never exports a remote database.
"""
import datetime,pathlib,sqlite3,uuid
root=pathlib.Path(__file__).resolve().parents[1]
matched=[]
for source in (root/'.wrangler/state/v3/d1').rglob('*.sqlite'):
 conn=sqlite3.connect('file:'+str(source)+'?mode=ro',uri=True)
 tables={row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
 conn.close()
 if {'worlds','episodes'}<=tables:matched.append(source)
if len(matched)!=1:raise RuntimeError(f'Expected one local world DB, found {len(matched)}; no files changed')
folder=root/'backups';folder.mkdir(exist_ok=True)
target=folder/f'world-{datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")}-{uuid.uuid4().hex[:8]}.sqlite3'
source=sqlite3.connect('file:'+str(matched[0])+'?mode=ro',uri=True);out=sqlite3.connect(target);source.backup(out)
if out.execute('PRAGMA integrity_check').fetchone()[0]!='ok':raise RuntimeError('Backup integrity check failed')
source.close();out.close();print('Verified local backup:',target.relative_to(root))
