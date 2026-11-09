"""Generate the missing Val-d'Oise pages from reviewed, municipality-specific inputs.

The 28 previously existing city bodies and all other department bodies are retained.
Only their footers, and the two explicitly generic 95 hero photos, are updated.
"""
from pathlib import Path
import json, re, math, html, xml.etree.ElementTree as ET
from complete_92 import replace_one, schema_replace
R=Path(__file__).parent
E=lambda s:html.escape(str(s),quote=True)
def display(s):return s.replace("'",'’')
def at(name):return 'au '+name[3:] if name.startswith('Le ') else 'à '+name
def distance(a,b):
    lon1,lat1=map(math.radians,a);lon2,lat2=map(math.radians,b)
    return 2*6371*math.asin(min(1,math.sqrt(math.sin((lat2-lat1)/2)**2+math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2)))
def inputs():
    cs=json.loads((R/'communes_95.json').read_text())
    geo={g['code']:g for g in json.loads((R/'geo_95_verified.json').read_text())}
    photos=json.loads((R/'city_95_image_sources.json').read_text())
    rows={}
    for line in (R/'city_95_editorial.tsv').read_text().splitlines():
        if not line or line.startswith('#'):continue
        key,title,intro,prepare,q,a=line.split('|')
        assert key not in rows,key
        rows[key]={'title':title,'intro':intro,'prepare':prepare,'question':q,'answer':a}
    assert len(cs)==183 and len(rows)==155
    assert {c['slug'] for c in cs if not c['existing']}==set(rows)
    assert set(rows).issubset(photos)
    for c in cs:
        c['name']=display(c['nom']);c['postal']=geo[c['code']]['codesPostaux']
        c['coordinates']=geo[c['code']]['centre']['coordinates']
        c['neighbors']=[x['slug'] for x in sorted((d for d in cs if d['code']!=c['code']),key=lambda d:distance(c['coordinates'],geo[d['code']]['centre']['coordinates']))[:3]]
    return cs,rows,photos
def picture(s,c,im):
    key,name=c['slug'],c['name'];url='hero-'+key+'.webp'
    assert (R/url).is_file(),url
    s=replace_one(r'(<section class="hero has-photo" style="background-image:url\(\x27).*?(\x27\)")',lambda m:m[1]+url+m[2],s)
    for meta in ['og:image','twitter:image']:
        s=replace_one(r'(<meta (?:property|name)="'+meta+r'" content=")[^"]*("/>)',lambda m:m[1]+'https://www.irvohm.fr/'+url+m[2],s)
    s=replace_one(r'(<link rel="preload" as="image" href=")[^"]*(")',lambda m:m[1]+url+m[2],s)
    credit=f'Vue de la commune : {E(name)}. Photo : <a href="{E(im["file"])}" target="_blank" rel="noopener noreferrer">{E(im["author"])}</a> — '
    credit+=(f'<a href="{E(im["license_url"])}" target="_blank" rel="noopener noreferrer">{E(im["license"])}</a>.' if im['license_url'] else E(im['license'])+'.')
    credit+=' Redimensionnement et conversion WebP ; recadrage d’affichage. Cette vue ne représente pas un chantier IRV’OHM.'
    s=replace_one(r'<p class="hero-credit">.*?</p>',lambda m:'<p class="hero-credit">'+credit+'</p>',s)
    s=re.sub(r'  \.hero-credit \{[^}]*\}',"  .hero-credit { position:relative; z-index:2; max-width:1240px; margin:28px auto -40px; padding:0 20px; font-size:11px; line-height:1.6; color:rgba(255,255,255,0.85); overflow-wrap:anywhere; }",s,count=1)
    s=s.replace('.hero-credit a { color:rgba(255,255,255,0.75); }','.hero-credit a { color:#fff; text-decoration:underline; }')
    return s
def main():
    cs,rows,photos=inputs();bykey={c['slug']:c for c in cs}
    template=(R/'antony.html').read_text()
    footer=re.search(r'<footer\b.*?</footer>',template,re.S)[0]
    for c in cs:
        if c['existing']:continue
        key,name=c['slug'],c['name'];row=rows[key];postal=' / '.join(c['postal'])
        s=template.replace(footer,'<!-- PRESERVED FOOTER -->')
        s=s.replace('Antony',E(name)).replace('antony',key).replace('92160',postal)
        s=s.replace('<!-- PRESERVED FOOTER -->',footer)
        s=s.replace('href="hauts-de-seine.html">Zones','href="val-doise.html">Zones')
        desc=f'Borne de recharge {at(name)} : {row["title"][0].lower()+row["title"][1:]}. Étude de votre place et devis IRV’OHM.'
        for meta in ['description','og:description','twitter:description']:
            s=replace_one(r'(<meta (?:name|property)="'+re.escape(meta)+r'" content=")[^"]*("/>)',lambda m:m[1]+E(desc)+m[2],s)
        hero=f'Votre borne de recharge {at(name)} ({postal}) : {row["title"][0].lower()+row["title"][1:]}. Décrivez votre véhicule et votre stationnement pour préparer l’étude du raccordement.'
        s=replace_one(r'(<p class="hero-desc load l3">).*?(</p>)',lambda m:m[1]+E(hero)+m[2],s)
        nearby=', '.join(f'<a style="color:var(--green);text-decoration:underline" href="{x}.html">{E(bykey[x]["name"])}</a>' for x in c['neighbors'])
        local=f'''  <!-- LOCAL -->
  <section class="section" style="padding-top:0"><div class="wrap">
    <div class="head reveal"><span class="eyebrow"><span class="dot"></span> Votre projet {E(at(name))}</span><h2>{E(row['title'])}</h2><div class="current" aria-hidden="true"></div></div>
    <p style="max-width:760px;margin:0 auto 28px;color:var(--ink-soft);font-size:16px;line-height:1.7">{E(row['intro'])}</p>
    <div class="adv-grid">
      <article class="adv-card"><h3>Les éléments à préparer</h3><p>{E(row['prepare'])}</p><p style="margin-top:16px"><a style="text-decoration:underline;color:var(--green)" href="devis.html">Présenter mon projet {E(at(name))}</a></p></article>
      <article class="adv-card"><h3>L’adresse de votre stationnement</h3><p>Pour votre place située {E(at(name))} ({E(postal)}), précisez l’adresse complète et les accès utiles à la visite. Si le stationnement est distinct du logement, indiquez son entrée et les espaces à traverser pour examiner le raccordement.</p></article>
      <article class="adv-card"><h3>Autres communes proches</h3><p>Pour situer votre projet dans le Val-d’Oise, retrouvez aussi les pages de {nearby}.</p><p style="margin-top:16px"><a style="text-decoration:underline;color:var(--green)" href="val-doise.html">Les 183 communes du département</a></p></article>
    </div>
    <p style="margin-top:24px">Selon les utilisateurs de la place : <a style="text-decoration:underline" href="particulier.html">préparer une recharge à domicile</a> ou <a style="text-decoration:underline" href="entreprise.html">étudier un parking professionnel</a>.</p>
  </div></section>

'''
        s=replace_one(r'  <!-- LOCAL -->.*?(?=  <!-- ADVANTAGES -->)',lambda m:local,s)
        faqs=[(row['question'],row['answer']),
              (f'Quels codes postaux indiquer pour une demande {at(name)} ?',f'Les codes postaux associés à {name} dans le référentiel communal sont : {postal}. Précisez surtout l’adresse complète de la place concernée et ses accès pour préparer l’étude de votre raccordement.'),
              (f'Quelles informations préparer pour une étude {at(name)} ?',row['prepare']+' Ces éléments préparent le premier échange ; le raccordement et les travaux sont confirmés après les vérifications adaptées à votre place.')]
        faq='  <!-- FAQ LOCALE (SEO) -->\n<section class="section" style="padding-top:0"><div class="wrap" style="max-width:820px"><div class="head"><span class="eyebrow">Questions sur votre projet</span><h2>Préparer votre recharge '+E(at(name))+'</h2></div>\n'
        for q,a in faqs:faq+='<details style="background:var(--white);border:1px solid var(--line);border-radius:16px;padding:18px 22px;margin-bottom:12px"><summary style="font-weight:600;cursor:pointer">'+E(q)+'</summary><p style="margin-top:12px">'+E(a)+'</p></details>\n'
        faq+='</div></section>\n\n'
        s=replace_one(r'  <!-- FAQ LOCALE \(SEO\) -->.*?(?=  <!-- CTA -->)',lambda m:faq,s)
        service={'@context':'https://schema.org','@type':'Service','name':f'Installation de borne de recharge {at(name)}','serviceType':'Installation de borne de recharge IRVE','url':f'https://www.irvohm.fr/{key}.html','areaServed':{'@type':'City','name':name},'provider':{'@type':'Organization','name':'IRV’OHM','url':'https://www.irvohm.fr/','telephone':'+33651078828'}}
        s=schema_replace(s,'Service',service)
        s=schema_replace(s,'FAQPage',{'@context':'https://schema.org','@type':'FAQPage','mainEntity':[{'@type':'Question','name':q,'acceptedAnswer':{'@type':'Answer','text':a}} for q,a in faqs]})
        s=schema_replace(s,'BreadcrumbList',{'@context':'https://schema.org','@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':'Accueil','item':'https://www.irvohm.fr/'},{'@type':'ListItem','position':2,'name':'Val-d’Oise','item':'https://www.irvohm.fr/val-doise.html'},{'@type':'ListItem','position':3,'name':name,'item':f'https://www.irvohm.fr/{key}.html'}]})
        if name.startswith('Le '):s=s.replace('à '+E(name),'au '+E(name[3:])).replace('À '+E(name),'Au '+E(name[3:]))
        s=picture(s,c,photos[key]);(R/(key+'.html')).write_text(s)
    for key in ['bezons','eragny']:
        p=R/(key+'.html');p.write_text(picture(p.read_text(),bykey[key],photos[key]))
    # Keep 183 links in static HTML but collapse the long list for mobile usability.
    links='\n'.join(f'<a style="font-size:13px;text-decoration:underline" href="/{c["slug"]}.html">{E(c["name"])}</a>' for c in cs)
    block='<!-- VAL-DOISE COMPLETE START -->\n<details style="max-width:1240px;margin:24px auto;padding:20px;border-top:1px solid rgba(187,203,187,0.35)"><summary style="font-weight:600;cursor:pointer">Val-d’Oise (95) : les 183 communes</summary><p style="margin-top:16px"><a style="text-decoration:underline" href="/val-doise.html">Voir le département et toutes nos pages locales</a></p><nav aria-label="Les 183 communes du Val-d’Oise" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px 18px;margin-top:18px">\n'+links+'\n</nav></details>\n<!-- VAL-DOISE COMPLETE END -->\n'
    citypaths='(?:'+'|'.join(re.escape(c['slug']) for c in cs)+')'
    count=0
    for p in R.rglob('*.html'):
        if any(part.startswith('.') for part in p.relative_to(R).parts):continue
        s=p.read_text()
        if '<footer' not in s:continue
        def update(m):
            f=re.sub(r'<!-- VAL-DOISE COMPLETE START -->.*?<!-- VAL-DOISE COMPLETE END -->\n?','',m[0],flags=re.S)
            f=re.sub(r'<div style="margin-top:12px"><p style="font-weight:600;margin-bottom:6px">Val-d’Oise</p><div[^>]*>.*?</div></div>','',f,flags=re.S)
            f=re.sub(r'<a\b[^>]*href=["\x27]/?'+citypaths+r'\.html["\x27][^>]*>.*?</a>','',f,flags=re.S)
            f=re.sub(r'[ \t]+\n','\n',f)
            return f.replace('</footer>',block+'</footer>')
        p.write_text(replace_one(r'<footer\b.*?</footer>',update,s));count+=1
    p=R/'val-doise.html';s=p.read_text()
    s=re.sub(r'<!-- DEPARTMENT CITY EXTENSION -->.*?</section>\n?','',s,flags=re.S)
    s=re.sub(r'<!-- DEPARTMENT 95 COMPLETE START -->.*?<!-- DEPARTMENT 95 COMPLETE END -->\n?','',s,flags=re.S)
    directory='<!-- DEPARTMENT 95 COMPLETE START -->\n<section class="section"><div class="wrap"><div class="head"><span class="eyebrow">Votre commune dans le Val-d’Oise</span><h2>Les 183 communes du 95</h2></div><p>Choisissez votre commune pour préparer le raccordement de votre place et présenter votre projet de recharge. Les pages ci-dessous proposent des points à examiner selon différents usages du stationnement.</p><ul style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px 24px;list-style:none;margin-top:24px">'
    directory+=''.join(f'<li><a style="text-decoration:underline;color:var(--green)" href="{c["slug"]}.html">Borne de recharge {E(at(c["name"]))}</a></li>' for c in cs)
    directory+='</ul><p style="margin-top:24px;font-size:13px;color:var(--ink-soft)">Noms, codes et centres communaux : <a style="text-decoration:underline" href="https://geo.api.gouv.fr/decoupage-administratif/communes" target="_blank" rel="noopener noreferrer">référentiel de l’API Géo</a>. Les communes proches sont proposées à partir de leurs centres géographiques ; les adresses et accès précis restent à indiquer pour l’étude.</p></div></section>\n<!-- DEPARTMENT 95 COMPLETE END -->\n'
    p.write_text(s.replace('</main>',directory+'</main>'))
    p=R/'sitemap.xml';s=p.read_text()
    for key in rows:
        url=f'https://www.irvohm.fr/{key}.html'
        if '<loc>'+url+'</loc>' not in s:s=s.replace('</urlset>',f'  <url><loc>{url}</loc><lastmod>2026-11-04</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n</urlset>')
    for key in ['val-doise','bezons','eragny']:
        pattern=r'(<url>\s*<loc>https://www\.irvohm\.fr/'+re.escape(key)+r'\.html</loc>\s*<lastmod>)[^<]+(</lastmod>)'
        s=re.sub(pattern,lambda m:m[1]+'2026-11-04'+m[2],s)
    p.write_text(s);ET.fromstring(s)
    print(f'155 nouvelles pages ; 183 communes couvertes ; 157 photos locales intégrées ; {count} footers, annuaire et sitemap actualisés.')
if __name__=='__main__':main()
