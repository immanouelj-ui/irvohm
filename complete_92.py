"""Complete the 92 local pages while retaining the existing layout and other bodies.

Editorial and photo provenance are versioned inputs. Does not fetch remote assets.
"""
from pathlib import Path
import html, json, re, xml.etree.ElementTree as ET
R=Path(__file__).parent
E=lambda value:html.escape(value,quote=True)
def slug(name):
    import unicodedata
    return re.sub('[^a-z0-9]+','-',unicodedata.normalize('NFKD',name).encode('ascii','ignore').decode().lower()).strip('-')
def replace_one(pattern,replacement,text):
    out,count=re.subn(pattern,replacement,text,count=1,flags=re.S)
    if count!=1:raise ValueError('Expected one match: '+pattern)
    return out
def json_script(obj):return '<script type="application/ld+json">\n'+json.dumps(obj,ensure_ascii=False,indent=2)+'\n</script>'
def schema_replace(s,type_name,obj):
    matched=0
    def change(m):
        nonlocal matched
        if json.loads(m[1]).get('@type')==type_name:matched+=1;return json_script(obj)
        return m[0]
    s=re.sub(r'<script type="application/ld\+json">(.*?)</script>',change,s,flags=re.S)
    if matched!=1:raise ValueError('Expected one schema '+type_name)
    return s
def main():
    rows=json.loads((R/'city_92_editorial.json').read_text())
    communes=json.loads((R/'communes_92.json').read_text())
    photos=json.loads((R/'city_92_image_sources.json').read_text())
    names={c['slug']:c['name'] for c in communes}
    assert len(names)==36 and len(rows)==24 and set(names)==set(photos)
    template=(R/'antony.html').read_text()
    for row in rows:
        name,key=row['name'],row['slug']
        target=R/(key+'.html')
        # Regenerate only our own 24 new pages; existing cities retain their copy.
        s=template
        footer=re.search(r'<footer\b.*?</footer>',s,re.S)[0]
        s=s.replace(footer,'<!-- PRESERVED FOOTER -->')
        s=s.replace('Antony',E(name)).replace('antony',key).replace('92160',row['postal'])
        s=s.replace('<!-- PRESERVED FOOTER -->',footer)
        desc=f"Borne de recharge à {name} : {row['title'][0].lower()+row['title'][1:]}. Étude du raccordement et devis IRV’OHM pour votre stationnement."
        for meta in ['description','og:description','twitter:description']:
            s=replace_one(r'(<meta (?:name|property)="'+re.escape(meta)+r'" content=")[^"]*("/>)',lambda m:m[1]+E(desc)+m[2],s)
        hero=f"À {name} ({row['postal']}), préparez votre installation de borne de recharge : {row['title'][0].lower()+row['title'][1:]}. IRV’OHM étudie votre place, votre véhicule et le raccordement avant de préciser les travaux."
        s=replace_one(r'(<p class="hero-desc load l3">).*?(</p>)',lambda m:m[1]+E(hero)+m[2],s)
        cards='\n'.join('<article class="adv-card"><h3>'+E(t)+'</h3><p>'+E(p)+'</p></article>' for t,p in row['cards'])
        neighbors=', '.join('<a href="'+x+'.html">'+E(names[x])+'</a>' for x in row['neighbors'])
        local=f'''  <!-- LOCAL -->
  <section class="section" style="padding-top:0"><div class="wrap">
    <div class="head reveal"><span class="eyebrow"><span class="dot"></span> Votre projet à {E(name)}</span><h2>{E(row['title'])}</h2><div class="current" aria-hidden="true"></div></div>
    <p style="max-width:760px;margin:0 auto 28px;color:var(--ink-soft);font-size:16px;line-height:1.7">{E(row['intro'])}</p>
    <div class="adv-grid">{cards}</div>
    <p style="margin-top:24px"><a style="color:var(--green);text-decoration:underline" href="devis.html">Présenter mon projet à {E(name)}</a> · <a style="text-decoration:underline" href="hauts-de-seine.html">Toutes les communes des Hauts-de-Seine</a></p>
    <p style="margin-top:16px">À proximité : {neighbors}.</p>
  </div></section>

'''
        s=replace_one(r'  <!-- LOCAL -->.*?(?=  <!-- ADVANTAGES -->)',lambda m:local,s)
        faq='  <!-- FAQ LOCALE (SEO) -->\n<section class="section" style="padding-top:0"><div class="wrap" style="max-width:820px"><div class="head"><span class="eyebrow">Questions sur votre projet</span><h2>Votre recharge à '+E(name)+' : les points à clarifier</h2></div>\n'
        for q,a in row['faqs']:
            faq+='<details style="background:var(--white);border:1px solid var(--line);border-radius:16px;padding:18px 22px;margin-bottom:12px"><summary style="font-weight:600;cursor:pointer">'+E(q)+'</summary><p style="margin-top:12px">'+E(a)+'</p></details>\n'
        faq+='</div></section>\n\n'
        s=replace_one(r'  <!-- FAQ LOCALE \(SEO\) -->.*?(?=  <!-- CTA -->)',lambda m:faq,s)
        s=schema_replace(s,'FAQPage',{'@context':'https://schema.org','@type':'FAQPage','mainEntity':[{'@type':'Question','name':q,'acceptedAnswer':{'@type':'Answer','text':a}} for q,a in row['faqs']]})
        s=schema_replace(s,'BreadcrumbList',{'@context':'https://schema.org','@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':'Accueil','item':'https://www.irvohm.fr/'},{'@type':'ListItem','position':2,'name':'Hauts-de-Seine','item':'https://www.irvohm.fr/hauts-de-seine.html'},{'@type':'ListItem','position':3,'name':name,'item':f'https://www.irvohm.fr/{key}.html'}]})
        s=s.replace('à Le Plessis-Robinson','au Plessis-Robinson').replace('À Le Plessis-Robinson','Au Plessis-Robinson')
        target.write_text(s)
    # Every city has a real, locally stored and credited photo, including older pages.
    for c in communes:
        key=c['slug'];im=photos[key];p=R/(key+'.html');s=p.read_text()
        assert (R/('hero-'+key+'.webp')).is_file(),key
        url='hero-'+key+'.webp'
        s=replace_one(r'(<section class="hero has-photo" style="background-image:url\(\x27).*?(\x27\)")',lambda m:m[1]+url+m[2],s)
        for meta in ['twitter:image','og:image']:
            s=replace_one(r'(<meta (?:name|property)="'+re.escape(meta)+r'" content=")[^"]*("/>)',lambda m:m[1]+'https://www.irvohm.fr/'+url+m[2],s)
        s=replace_one(r'(<link rel="preload" as="image" href=")[^"]*(")',lambda m:m[1]+url+m[2],s)
        credit=f'Photo de {E(c["name"])} : <a href="{E(im["file"])}" target="_blank" rel="noopener noreferrer">{E(im["author"] or "Wikimedia Commons")}</a> — '
        if im['license_url']:credit+=f'<a href="{E(im["license_url"])}" target="_blank" rel="noopener noreferrer">{E(im["license"])}</a>.'
        else:credit+=E(im['license'])+'.'
        credit+=' Photo redimensionnée et convertie en WebP ; recadrage d’affichage. Vue de la commune, hors réalisation IRV’OHM.'
        s=replace_one(r'<p class="hero-credit">.*?</p>',lambda m:'<p class="hero-credit">'+credit+'</p>',s)
        # Keep longer credits readable on narrow screens, without overlaying actions.
        s=re.sub(r'  \.hero-credit \{[^}]*\}',"  .hero-credit { position:relative; z-index:2; max-width:1240px; margin:28px auto -40px; padding:0 20px; font-size:11px; line-height:1.6; color:rgba(255,255,255,0.85); overflow-wrap:anywhere; }",s,count=1)
        s=s.replace('.hero-credit a { color:rgba(255,255,255,0.75); }','.hero-credit a { color:#fff; text-decoration:underline; }')
        p.write_text(s)
    # One complete 92 group per footer; retain all other destinations and content.
    links='\n'.join(f'<a style="font-size:13px;text-decoration:underline" href="/{c["slug"]}.html">{E(c["name"])}</a>' for c in communes)
    block='<!-- HAUTS-DE-SEINE COMPLETE START -->\n<nav aria-label="Les 36 communes des Hauts-de-Seine" style="max-width:1240px;margin:24px auto;padding:20px;border-top:1px solid rgba(187,203,187,0.35)"><p style="font-weight:600;margin-bottom:12px"><a href="/hauts-de-seine.html">Hauts-de-Seine (92) : nos 36 pages locales</a></p><div style="display:flex;flex-wrap:wrap;gap:10px 18px">\n'+links+'\n</div></nav>\n<!-- HAUTS-DE-SEINE COMPLETE END -->\n'
    citypaths='(?:'+'|'.join(re.escape(c['slug']) for c in communes)+')'
    count=0
    for p in R.rglob('*.html'):
        if 'components' in p.relative_to(R).parts or any(part.startswith('.') for part in p.relative_to(R).parts):continue
        s=p.read_text()
        if '<footer' not in s:continue
        def update(m):
            footer=re.sub(r'<!-- HAUTS-DE-SEINE COMPLETE START -->.*?<!-- HAUTS-DE-SEINE COMPLETE END -->\n?','',m[0],flags=re.S)
            footer=re.sub(r'<div style="margin-top:12px"><p style="font-weight:600;margin-bottom:6px">Hauts-de-Seine</p><div[^>]*>.*?</div></div>','',footer,flags=re.S)
            footer=re.sub(r'<a\b[^>]*href=["\x27]/?'+citypaths+r'\.html["\x27][^>]*>.*?</a>','',footer,flags=re.S)
            footer=re.sub(r'[ \t]+\n','\n',footer)
            return footer.replace('</footer>',block+'</footer>')
        s=replace_one(r'<footer\b.*?</footer>',update,s);p.write_text(s);count+=1
    p=R/'hauts-de-seine.html';s=p.read_text()
    s=re.sub(r'<!-- DEPARTMENT CITY EXTENSION -->.*?</section>\n?','',s,flags=re.S)
    s=re.sub(r'<!-- DEPARTMENT 92 COMPLETE START -->.*?<!-- DEPARTMENT 92 COMPLETE END -->\n?','',s,flags=re.S)
    directory='<!-- DEPARTMENT 92 COMPLETE START -->\n<section class="section"><div class="wrap"><div class="head"><span class="eyebrow">Le département au complet</span><h2>Votre installation dans les 36 communes du 92</h2></div><p>Retrouvez votre commune pour préparer le raccordement de votre place, choisir les fonctions utiles et présenter votre projet. Chaque page dispose de conseils dédiés et d’une photographie identifiée de la ville.</p><ul style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px 24px;list-style:none;margin-top:24px">'
    directory+=''.join(f'<li><a style="text-decoration:underline;color:var(--green)" href="{c["slug"]}.html">Borne de recharge à {E(c["name"])}</a></li>' for c in communes)
    directory+='</ul></div></section>\n<!-- DEPARTMENT 92 COMPLETE END -->\n'
    directory=directory.replace('à Le Plessis-Robinson','au Plessis-Robinson')
    s=s.replace('</main>',directory+'</main>');p.write_text(s)
    p=R/'sitemap.xml';s=p.read_text()
    for row in rows:
        url='https://www.irvohm.fr/'+row['slug']+'.html'
        if '<loc>'+url+'</loc>' not in s:s=s.replace('</urlset>',f'  <url><loc>{url}</loc><lastmod>2026-11-03</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n</urlset>')
    p.write_text(s);ET.fromstring(s)
    print(f'{len(rows)} nouvelles pages ; 36 photos locales ; {count} pieds de page ; annuaire départemental et sitemap mis à jour.')
if __name__=='__main__':main()
