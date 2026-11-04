"""Fetch geographically identified Commons photos; retain attribution and sources."""
from pathlib import Path
import json, urllib.request, urllib.parse, concurrent.futures, time, re, html, io
from PIL import Image, ImageOps
R=Path(__file__).parent
CACHE=R/'.asset-cache-92'; CACHE.mkdir(exist_ok=True)
UA={'User-Agent':'IRVOHM-local-pages/1.0 (contact@irvohm.fr)'}
def get(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers=UA),timeout=35) as r:return r.read()
        except Exception:
            if attempt==2:raise
            time.sleep(1+attempt)
def plain(s):return html.unescape(re.sub('<[^>]+>','',s)).strip()
def slug(s):
    import unicodedata
    return re.sub('[^a-z0-9]+','-',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()).strip('-')
communes=[{'nom':c['name'],'code':c['insee'],'slug':c['slug']} for c in json.loads((R/'communes_92.json').read_text())]
def fetch(c):
    name=c['nom']; key=c['slug']; out=CACHE/(key+'.json')
    if out.exists():return key,json.loads(out.read_text())
    title={'Bagneux':'Bagneux (Hauts-de-Seine)','Châtillon':'Châtillon (Hauts-de-Seine)','Sceaux':'Sceaux (Hauts-de-Seine)','Malakoff':'Malakoff (Hauts-de-Seine)'}.get(name,name)
    summary=json.loads(get('https://fr.wikipedia.org/api/rest_v1/page/summary/'+urllib.parse.quote(title)))
    orig=summary.get('originalimage',{}).get('source')
    if not orig:
        pagehtml=get('https://fr.wikipedia.org/wiki/'+urllib.parse.quote(title)).decode()
        infobox=pagehtml[pagehtml.find('class="infobox'):]
        match=re.search(r'<img[^>]+src="(//[^" ]+)',infobox)
        if not match:raise ValueError('No image '+name)
        orig='https:'+html.unescape(match[1])
        if '/thumb/' in orig:orig=orig.replace('/thumb/','/').rsplit('/',1)[0]
    imagepath=urllib.parse.urlsplit(orig).path
    if '/thumb/' in imagepath:imagepath=imagepath.rsplit('/',1)[0]
    filename=urllib.parse.unquote(imagepath.rsplit('/',1)[-1])
    filename={'Courbevoie':'Église_Sts_Pierre_Paul_Courbevoie_2.jpg','Nanterre':'Parc_Anciennes_Mairies_-_Nanterre_(FR92)_-_2023-02-19_-_4.jpg','Clamart':'Hôtel_ville_Clamart_2.jpg','Suresnes':'Mairie_Suresnes_12.jpg'}.get(name,filename)
    api='https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode({'action':'query','format':'json','redirects':1,'prop':'imageinfo','titles':'File:'+filename,'iiprop':'url|extmetadata','iiurlwidth':1600})
    data=json.loads(get(api)); page=next(iter(data['query']['pages'].values())); info=page['imageinfo'][0]; meta=info['extmetadata']
    record={'name':name,'slug':key,'insee':c['code'],'wiki':summary['content_urls']['desktop']['page'],'extract':summary.get('extract',''),'file':info['descriptionurl'],'source':info['url'],'download':info.get('thumburl',info['url']),'author':plain(meta.get('Artist',{}).get('value','')),'license':plain(meta.get('LicenseShortName',{}).get('value','')),'license_url':meta.get('LicenseUrl',{}).get('value',''),'description':plain(meta.get('ImageDescription',{}).get('value','')),'attribution':plain(meta.get('Attribution',{}).get('value','')),'original_filename':filename}
    out.write_text(json.dumps(record,ensure_ascii=False,indent=2))
    return key,record
if __name__=='__main__':
    records={};errors=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
        futures={ex.submit(fetch,c):c['nom'] for c in communes}
        for f in concurrent.futures.as_completed(futures):
            try:
                key,record=f.result(); records[key]=record;print(key,record['original_filename'],record['license'],flush=True)
            except Exception as e:errors.append((futures[f],str(e)));print('ERROR',futures[f],str(e),flush=True)
    (R/'city_92_image_sources.json').write_text(json.dumps(records,ensure_ascii=False,indent=2,sort_keys=True)+'\n')
    print('Metadata',len(records),'errors',errors,flush=True)
    if errors:raise SystemExit(1)
    def download(item):
        key,record=item
        if not record['license'] or (not record['author'] and 'public domain' not in record['license'].lower()):raise ValueError('Incomplete credit '+key)
        cached=CACHE/(key+'.source')
        if not cached.exists():cached.write_bytes(get(record['download']))
        with Image.open(cached) as im:
            im=ImageOps.exif_transpose(im).convert('RGB')
            im.thumbnail((1600,1200))
            quality=80
            while True:
                buffer=io.BytesIO();im.save(buffer,'WEBP',quality=quality,method=6)
                if len(buffer.getvalue())<=240000 or quality<=50:break
                quality-=6
            data=buffer.getvalue();assert data[:4]==b'RIFF' and len(data)>100
            (R/('hero-'+key+'.webp')).write_bytes(data)
        return key
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
        for key in ex.map(download,records.items()):print('Photo saved',key,flush=True)
