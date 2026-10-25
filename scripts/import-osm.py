"""Import a bounded public OSM extract; preserve ODbL attribution, omit contributor metadata.
python3 scripts/import-osm.py --input /tmp/xom-hcm-osm.json
Without --input, fetch the fixed central HCMC bbox once through inherited HTTPS proxy.
"""
import argparse,datetime,json,pathlib,urllib.request,urllib.parse
parser=argparse.ArgumentParser();parser.add_argument('--input');args=parser.parse_args()
root=pathlib.Path(__file__).resolve().parents[1]
bbox=[10.770,106.692,10.782,106.707]
query='[out:json][timeout:30];(way["highway"]('+','.join(map(str,bbox))+');way["building"]('+','.join(map(str,bbox))+'););out tags geom;'
if args.input:data=json.loads(pathlib.Path(args.input).read_text())
else:
 request=urllib.request.Request('https://overpass-api.de/api/interpreter',data=urllib.parse.urlencode({'data':query}).encode(),headers={'User-Agent':'XomAI bounded public map importer'})
 with urllib.request.urlopen(request,timeout=45) as response:data=json.load(response)
if data.get('remark'):raise RuntimeError('OSM provider reported a partial/error result')
features=[]
for element in data['elements']:
 tags=element.get('tags',{});geometry=element.get('geometry',[])
 kind='road' if 'highway' in tags else 'building' if 'building' in tags else None
 if not kind or len(geometry)<2:continue
 points=[]
 for p in geometry:
  if not(-90<=p['lat']<=90 and -180<=p['lon']<=180):raise ValueError('Invalid coordinates')
  points.append([round(80+(p['lon']-bbox[1])/(bbox[3]-bbox[1])*2240,2),round(1380-(p['lat']-bbox[0])/(bbox[2]-bbox[0])*1260,2)])
 features.append({'id':f"way/{element['id']}",'kind':kind,'category':tags.get('highway',tags.get('building','yes')),'name':tags.get('name','')[:160],'points':points})
result={'name':'Trung tâm TP.HCM — trích đoạn OpenStreetMap','bbox':bbox,'source':'https://overpass-api.de/api/interpreter','license':'ODbL-1.0','licenseUrl':'https://opendatacommons.org/licenses/odbl/1-0/','attribution':'© OpenStreetMap contributors','attributionUrl':'https://www.openstreetmap.org/copyright','fetchedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'osmBaseTime':data.get('osm3s',{}).get('timestamp_osm_base'),'features':features}
(root/'data/city/hcm-district1.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
print('Imported',len(features),'OSM features; source/ODbL attribution retained')
