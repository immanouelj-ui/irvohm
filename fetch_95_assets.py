"""Fetch geographically identified Val-d'Oise photographs and Commons credits.

Metadata and source bytes are cached. Ambiguous Wikipedia matches and non-photo
assets are rejected. Run from this repository with Pillow and lxml installed.
"""
from pathlib import Path
import concurrent.futures,hashlib,html,io,json,math,re,time,unicodedata,urllib.parse,urllib.request
from PIL import Image,ImageOps,ImageDraw
from lxml import html as LH
R=Path(__file__).parent
CACHE=R/'.asset-cache-95';CACHE.mkdir(exist_ok=True)
HEADERS={'User-Agent':'IRVOHM-local-pages/1.0 (contact@irvohm.fr)'}
def get(url):
    last=None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers=HEADERS),timeout=35) as r:return r.read()
        except Exception as e:
            last=e
            if attempt<2:time.sleep(attempt+1)
    raise last
def api(base,params):return json.loads(get(base+'?'+urllib.parse.urlencode(params)))
def plain(s):return html.unescape(re.sub('<[^>]*>','',s)).strip()
def norm(s):return re.sub('[^a-z0-9]','',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower())
def filename(url):
    path=urllib.parse.urlsplit(url).path
    if '/thumb/' in path:path=path.rsplit('/',1)[0]
    return urllib.parse.unquote(path.rsplit('/',1)[-1])
def valid_filename(f):
    return f.lower().endswith(('.jpg','.jpeg','.png','.webp')) and not re.search(r'(?:^|[_\-\s])(?:map|relief|location|locator|hydro|sols|geologie)(?:[_\-\s.]|$)',f.lower()) and not any(x in norm(f) for x in ['blason','armoirie','logotype','logo','carte','mapof','locationmap','reliefmap','occupationdessols','hydrograph','flag','drapeau','coatofarms','localisation'])
def distance(a,b):
    lon1,lat1=a;lon2,lat2=b
    return math.hypot((lon1-lon2)*math.cos(math.radians((lat1+lat2)/2)),lat1-lat2)*111.2
def fetch_geo():
    p=R/'geo_95_verified.json'
    if p.exists():return json.loads(p.read_text())
    x=json.loads(get('https://geo.api.gouv.fr/communes?codeDepartement=95&fields=nom,code,codesPostaux,centre&format=json'))
    assert len(x)==183
    p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n');return x
communes=json.loads((R/'communes_95.json').read_text())
targets=[c for c in communes if not c['existing'] or c['slug'] in ['bezons','eragny']]
GEO={}
def imageinfo(f,c,summary):
    if not valid_filename(f):raise ValueError('Not a photograph: '+f)
    data=api('https://commons.wikimedia.org/w/api.php',{'action':'query','format':'json','redirects':1,'prop':'imageinfo','titles':'File:'+f,'iiprop':'url|extmetadata','iiurlwidth':1280})
    info=next(iter(data['query']['pages'].values())).get('imageinfo',[{}])[0]
    if not info:raise ValueError('No Commons imageinfo '+f)
    meta=info['extmetadata'];artist=plain(meta.get('Artist',{}).get('value',''));license=plain(meta.get('LicenseShortName',{}).get('value',''))
    if not license or (not artist and 'public domain' not in license.lower()):raise ValueError('Incomplete attribution '+f)
    if not any(x in license for x in ['CC BY','CC0','Public domain','PD','GFDL']):raise ValueError('Unclear free licence '+license)
    description=plain(meta.get('ImageDescription',{}).get('value',''))
    if re.search(r'\b(?:map|carte|hydrographique|géologique|land cover|occupation des sols)\b',description,re.I) or any(x in norm(description) for x in ['blasonde','coatofarms']):raise ValueError('Non-photographic description')
    return {'name':c['nom'],'slug':c['slug'],'insee':c['code'],'wiki':summary['content_urls']['desktop']['page'],'extract':summary.get('extract',''),'file':info['descriptionurl'],'source':info['url'],'download':info.get('thumburl',info['url']),'author':artist,'license':license,'license_url':meta.get('LicenseUrl',{}).get('value',''),'description':description,'attribution':plain(meta.get('Attribution',{}).get('value','')),'original_filename':f,'postal_codes':GEO[c['code']]['codesPostaux'],'coordinates':GEO[c['code']]['centre']['coordinates'],'verified_on':'2026-11-04','verification':'Photograph selected from the geographically verified French municipality article; Commons subject, author and licence checked.'}
def fetch(c):
    dest=CACHE/(c['slug']+'.json')
    if dest.exists():return c['slug'],json.loads(dest.read_text())
    summary=None;errors=[]
    titles=[c['nom'],c['nom']+" (Val-d'Oise)"]
    for title in titles:
        try:
            s=json.loads(get('https://fr.wikipedia.org/api/rest_v1/page/summary/'+urllib.parse.quote(title)))
            coords=s.get('coordinates',{})
            if not coords or distance([coords['lon'],coords['lat']],GEO[c['code']]['centre']['coordinates'])>7:raise ValueError('Wrong geographic match '+title)
            if s.get('type')=='disambiguation':raise ValueError('Disambiguation')
            summary=s;break
        except Exception as e:errors.append(str(e))
    if not summary:raise ValueError('; '.join(errors))
    candidates=[]
    overrides={'herouville-en-vexin':'Hérouville_(92),_mairie,_rue_du_Poteau.JPG','puiseux-en-france':'Puiseux-en-France_(95),_église.jpg','vaudherland':'Vaudherland_town_hall.jpg','viarmes':'Château_de_Viarmes.jpg'}
    if c['slug'] in overrides:candidates.append(overrides[c['slug']])
    if summary.get('originalimage'):candidates.append(filename(summary['originalimage']['source']))
    # The article infobox provides alternatives when REST selects an emblem.
    page=get(summary['content_urls']['desktop']['page']).decode()
    (CACHE/(c['slug']+'.wiki.html')).write_text(page)
    doc=LH.fromstring(page)
    infobox=doc.xpath('//table[contains(@class,"infobox")]')
    if infobox:
        for src in infobox[0].xpath('.//img/@src'):
            candidates.append(filename('https:'+src if src.startswith('//') else src))
    # Some small communes have no infobox photo. Use an explicitly named local
    # photograph from the same verified article, never its locator map.
    base=re.split(r'-en-|-sur-|-lès-|-la-|-le-',c['nom'],maxsplit=1)[0]
    for src in doc.xpath('//img/@src'):
        f=filename('https:'+src if src.startswith('//') else src)
        if len(norm(base))>=4 and norm(base) in norm(f) and valid_filename(f):candidates.append(f)
    last=[]
    for f in dict.fromkeys(candidates):
        if not valid_filename(f):continue
        try:
            record=imageinfo(f,c,summary);dest.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n');return c['slug'],record
        except Exception as e:last.append(str(e))
    raise ValueError('No suitable infobox photograph: '+'; '.join(last)+' candidates '+str(candidates))
def download(item):
    key,record=item;p=CACHE/(key+'.source');marker=CACHE/(key+'.source-url')
    if not p.exists() or not marker.exists() or marker.read_text()!=record['source']:
        p.write_bytes(get(record['download']));marker.write_text(record['source'])
    with Image.open(p) as original:
        im=ImageOps.exif_transpose(original).convert('RGB');im.thumbnail((1280,960))
        if min(im.size)<200:raise ValueError('Image too small '+key)
        q=79
        while True:
            b=io.BytesIO();im.save(b,'WEBP',quality=q,method=6)
            if len(b.getvalue())<160000 or q<=49:break
            q-=6
        data=b.getvalue();assert data[:4]==b'RIFF' and len(data)>100
        (R/('hero-'+key+'.webp')).write_bytes(data)
        record.update({'local_asset':'hero-'+key+'.webp','width':im.width,'height':im.height,'size_bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
    return key
def main():
    global GEO
    GEO={c['code']:c for c in fetch_geo()}
    records={};errors=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        fs={ex.submit(fetch,c):c['nom'] for c in targets}
        for future in concurrent.futures.as_completed(fs):
            try:
                k,v=future.result();records[k]=v;print('METADATA',len(records),k,v['original_filename'],flush=True)
            except Exception as e:errors.append({'name':fs[future],'error':str(e)});print('ERROR',fs[future],str(e),flush=True)
    (R/'city_95_image_sources.json').write_text(json.dumps(records,ensure_ascii=False,indent=2,sort_keys=True)+'\n')
    (CACHE/'errors.json').write_text(json.dumps(errors,ensure_ascii=False,indent=2)+'\n')
    print('Metadata',len(records),'errors',len(errors),flush=True)
    saved=[];download_errors=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
        fs={ex.submit(download,item):item[0] for item in records.items()}
        for f in concurrent.futures.as_completed(fs):
            try:saved.append(f.result());print('PHOTO',len(saved),saved[-1],flush=True)
            except Exception as e:download_errors.append({'slug':fs[f],'error':str(e)});print('DOWNLOAD ERROR',fs[f],str(e),flush=True)
    (CACHE/'download-errors.json').write_text(json.dumps(download_errors,ensure_ascii=False,indent=2)+'\n')
    (R/'city_95_image_sources.json').write_text(json.dumps(records,ensure_ascii=False,indent=2,sort_keys=True)+'\n')
    print('DONE metadata',len(records),'saved',len(saved),'errors',len(errors)+len(download_errors),flush=True)
if __name__=='__main__':main()
