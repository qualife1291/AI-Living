"""Offline palette sampling; returns vertex skin mask, never modifies source images."""
import sys,json,collections
from pathlib import Path
from PIL import Image
x=json.load(sys.stdin);p=Path(x['path']);assert p.parent==Path('public/models/supplied') and p.suffix=='.png'
im=Image.open(p).convert('RGB');samples=[]
for index,u,v in x['vertices']:
 c=im.getpixel((min(im.width-1,max(0,round(u*(im.width-1)))),min(im.height-1,max(0,round(v*(im.height-1))))));samples.append((index,c))
warm=[c for _,c in samples if c[0]>c[1]*1.05 and c[1]>c[2]*1.04 and c[0]>65]
assert warm,'No source skin palette found'
reference=collections.Counter(warm).most_common(1)[0][0]
accepted=[i for i,c in samples if sum((c[k]-reference[k])**2 for k in range(3))<52**2]
print(json.dumps({'indices':accepted,'skinTone':'#'+'%02x%02x%02x'%reference}))
