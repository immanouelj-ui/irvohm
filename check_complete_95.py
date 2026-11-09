"""Validate actual 95 coverage, unique editorial, assets, links and preserved bodies."""
from pathlib import Path
import json,re,hashlib,subprocess,xml.etree.ElementTree as ET
from lxml import html as LH
from PIL import Image
from check_site_revision import MAIN, strip_chrome
from complete_95 import inputs,at
R=Path(__file__).parent
BASE='1640ebda2066c256de39f064a4843fc8e33c44c2'
def main():
    cs,rows,photos=inputs();keys={c['slug'] for c in cs}
    assert len(keys)==183 and len(rows)==155 and len(photos)==157
    for field in ['title','intro','prepare','question','answer']:
        assert len({r[field] for r in rows.values()})==155,field
    assert len({p['source'] for p in photos.values()})==157
    urls=[x.text for x in ET.parse(R/'sitemap.xml').findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    footer_count=0
    for p in R.rglob('*.html'):
        if 'components' in p.relative_to(R).parts or any(part.startswith('.') for part in p.relative_to(R).parts):continue
        s=p.read_text();doc=LH.fromstring(s);footer=doc.xpath('//footer')
        if not footer:continue
        footer_count+=1;f=footer[0]
        group=f.xpath('.//nav[@aria-label="Les 183 communes du Val-d’Oise"]')
        assert len(group)==1,p
        assert group[0].getparent().tag=='details' and 'open' not in group[0].getparent().attrib,p
        hrefs=f.xpath('.//a/@href')
        for key in keys:assert hrefs.count('/'+key+'.html')==1,(p,key)
        assert len(f.xpath('.//nav[@aria-label="Les 36 communes des Hauts-de-Seine"]'))==1,p
    for c in cs:
        key=c['slug'];p=R/(key+'.html');s=p.read_text();doc=LH.fromstring(s)
        url='https://www.irvohm.fr/'+key+'.html'
        assert len(doc.xpath('//h1'))==1,key
        assert urls.count(url)==1,key
        assert doc.xpath('//link[@rel="canonical"]/@href')==[url],key
        assert doc.xpath('//meta[@property="og:url"]/@content')==[url],key
        for raw in doc.xpath('//script[@type="application/ld+json"]/text()'):json.loads(raw)
        if key in photos:
            im=photos[key];asset=R/im['local_asset']
            assert im['author'] and im['license'] and im['file'].startswith('https://commons.wikimedia.org/wiki/File:'),key
            assert hashlib.sha256(asset.read_bytes()).hexdigest()==im['sha256'],key
            with Image.open(asset) as image:image.verify()
            assert "background-image:url('hero-"+key+".webp')" in s,key
            assert im['author'] in doc.xpath('//p[@class="hero-credit"]')[0].text_content(),key
            for meta in ['og:image','twitter:image']:
                assert doc.xpath('//meta[@property="'+meta+'" or @name="'+meta+'"]/@content')==['https://www.irvohm.fr/hero-'+key+'.webp'],key
        else:
            hero=re.search(r"background-image:url\('([^']+)'",s)[1]
            assert hero=='hero-'+key+'.webp' and (R/hero).is_file(),key
        if key not in rows:continue
        r=rows[key];main=doc.xpath('//main')[0].text_content()
        assert r['intro'] in main and r['prepare'] in main,key
        hero=doc.xpath('//section[contains(concat(" ",normalize-space(@class)," ")," hero ")]')[0].text_content()
        assert 'Antony' not in hero,key
        assert 'à Le ' not in main,key
        schemas=[json.loads(raw) for raw in doc.xpath('//script[@type="application/ld+json"]/text()')]
        service=next(x for x in schemas if x.get('@type')=='Service')
        assert service['areaServed']['name']==c['name'],key
        faq=next(x for x in schemas if x.get('@type')=='FAQPage')
        assert len(faq['mainEntity'])==3,key
        assert faq['mainEntity'][0]['name']==r['question'] and faq['mainEntity'][0]['acceptedAnswer']['text']==r['answer'],key
        visible=[(d.xpath('./summary')[0].text_content(),d.xpath('./p')[0].text_content()) for d in doc.xpath('//main//details')]
        assert visible==[(q['name'],q['acceptedAnswer']['text']) for q in faq['mainEntity']],key
        for href in doc.xpath('//a/@href | //link[@rel="preload" and @as="image"]/@href'):
            if href.startswith(('http','tel:','mailto:','#','javascript:')):continue
            path=href.split('#',1)[0].split('?',1)[0]
            dest=R/path.lstrip('/') if path.startswith('/') else p.parent/path
            assert dest.exists(),(key,href)
        for neighbor in c['neighbors']:assert doc.xpath('//main//a[@href="'+neighbor+'.html"]'),(key,neighbor)
    dep=LH.fromstring((R/'val-doise.html').read_text())
    for key in keys:assert dep.xpath('//main//a[@href="'+key+'.html"]'),key
    # Compare to the merged 92 baseline, independently of current staging or commits.
    tracked=subprocess.check_output(['git','ls-tree','-r','--name-only',BASE],cwd=R,text=True).splitlines()
    strip=strip_chrome
    for path in tracked:
        if path in MAIN or not path.endswith('.html') or path in ['val-doise.html','bezons.html','eragny.html']:continue
        old=subprocess.check_output(['git','show',BASE+':'+path],cwd=R,text=True)
        assert strip(old)==strip((R/path).read_text()),path
    print(f'OK : 183 communes ; 155 textes, préparations et FAQ dédiés ; 157 photos vérifiées ; {footer_count} footers repliables ; liens, sitemap, JSON-LD et contenu des autres pages préservés.')
if __name__=='__main__':main()
