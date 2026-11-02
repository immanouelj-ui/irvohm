"""Generate this batch of local pages and add its links to every existing footer.

Inputs are editorial content and verified image credits, kept in this repository.
Run from the repository root. Existing page bodies are never regenerated.
"""
from pathlib import Path
import json,re,html,xml.etree.ElementTree as ET
R=Path(__file__).parent
rows=json.loads((R/'city_batch.json').read_text())
images=json.loads((R/'city_image_sources.json').read_text())
cp=['92160','92220','92140','92110','92100','92300','92130','93200','93300','93500','93700','93130','94200','94600','94140','95870','95520','95610','78190','78990','78370','77380','77330','77220','91300','91120','91600','91000','91100','91170']
dept={'92':'hauts-de-seine','93':'seine-saint-denis','94':'val-de-marne','95':'val-doise','78':'yvelines','77':'seine-et-marne','91':'essonne'}
dept_names={'92':'Hauts-de-Seine','93':'Seine-Saint-Denis','94':'Val-de-Marne','95':"Val-d’Oise",'78':'Yvelines','77':'Seine-et-Marne','91':'Essonne'}
E=lambda s:html.escape(s,quote=True)
template=(R/'nanterre.html').read_text()
names={x[1]:x[0] for x in rows}
existing={'courbevoie':'Courbevoie','asnieres-sur-seine':'Asnières-sur-Seine','le-blanc-mesnil':'Le Blanc-Mesnil','bondy':'Bondy','rosny-sous-bois':'Rosny-sous-Bois','vitry-sur-seine':'Vitry-sur-Seine','creteil':'Créteil','maisons-alfort':'Maisons-Alfort','argenteuil':'Argenteuil','houilles':'Houilles','pontoise':'Pontoise','cergy':'Cergy','saint-ouen-laumone':"Saint-Ouen-l’Aumône",'montigny-le-bretonneux':'Montigny-le-Bretonneux','versailles':'Versailles','savigny-le-temple':'Savigny-le-Temple','melun':'Melun','pontault-combault':'Pontault-Combault'}
names.update(existing)
for row,postal in zip(rows,cp):
 name,slug,d,wiki,title,intro,sub,detail,n1,n2=row
 if slug=='eragny': name='Éragny-sur-Oise'
 s=template.replace('Nanterre',E(name)).replace('nanterre',slug).replace('92000',postal)
 # Match the service area without creating a fictional branch address.
 service={'@context':'https://schema.org','@type':'Service','name':f'Installation de borne de recharge à {name}','serviceType':'Installation de borne de recharge IRVE','url':f'https://www.irvohm.fr/{slug}.html','areaServed':{'@type':'City','name':name},'provider':{'@type':'Organization','name':"IRV’OHM",'url':'https://www.irvohm.fr/','telephone':'+33651078828'}}
 s=re.sub(r'<script type="application/ld\+json">[\s\S]*?</script>',lambda m:'<script type="application/ld+json">\n'+json.dumps(service,ensure_ascii=False,indent=2)+'\n</script>',s,count=1)
 s=s.replace('href="hauts-de-seine.html">Zones',f'href="{dept[d]}.html">Zones')
 hero=f'Installation de borne de recharge à {name} ({postal}) : {title[0].lower()+title[1:]}. IRV’OHM étudie votre raccordement et prépare un devis adapté au véhicule et au stationnement.'
 s=re.sub(r'(<p class="hero-desc load l3">)[\s\S]*?(</p>)',lambda m:m[1]+E(hero)+m[2],s,count=1)
 desc=f'Borne de recharge à {name} : {sub.lower()}. Étude du raccordement, choix du matériel et devis IRVE pour votre projet.'
 for key in ['description','og:description','twitter:description']:
  s=re.sub(r'(<meta (?:name|property)="'+re.escape(key)+r'" content=")[^"]*("/>)',lambda m:m[1]+E(desc)+m[2],s)
 im=images.get(slug)
 if im:
  credit=f'Photo de {E(name)} : {E(im["author"])} — <a href="{E(im["file"])}" target="_blank" rel="noopener noreferrer">{E(im["license"])}</a>. Image redimensionnée et convertie en WebP.'
  if im.get('license_url'):credit+=f' <a href="{E(im["license_url"])}" target="_blank" rel="noopener noreferrer">Conditions de licence</a>.'
 else:
  s=s.replace(f'hero-{slug}.webp','borne-recharge.webp')
  credit='Illustration de recharge électrique ; cette image ne représente pas un chantier réalisé dans la commune.'
 s=re.sub(r'<p class="hero-credit">[\s\S]*?</p>',lambda m:'<p class="hero-credit">'+credit+'</p>',s,count=1)
 links=', '.join(f'<a href="{x}.html">{E(names[x])}</a>' for x in [n1,n2])
 local=f'''  <!-- LOCAL -->
  <section class="section" style="padding-top:0"><div class="wrap">
    <div class="head reveal"><span class="eyebrow"><span class="dot"></span> Votre projet à {E(name)}</span><h2>{E(title)}</h2><div class="current" aria-hidden="true"></div></div>
    <p style="max-width:680px;margin:0 auto 24px;color:var(--ink-soft);font-size:16px;line-height:1.7">{E(intro)}</p>
    <div class="adv-grid">
      <div class="adv-card"><h3>{E(sub)}</h3><p>{E(detail)}</p></div>
      <div class="adv-card"><h3>Comparer la borne, la pose et les options</h3><p>Le devis distingue le matériel, les protections, le cheminement et les essais de mise en service. Vérifiez également les accessoires, les garanties et les éventuels frais de service.</p><p><a href="blog/prix-installation-borne-recharge.html">Comprendre le prix de l’installation</a></p></div>
      <div class="adv-card"><h3>Préparer votre demande à {E(name)}</h3><p>Précisez votre véhicule, le type de stationnement et l’origine de l’alimentation. Pour une place partagée, indiquez aussi le gestionnaire et les équipements existants.</p><p><a href="devis.html">Demander un devis à {E(name)}</a></p></div>
    </div>
    <p style="margin-top:24px">Selon votre projet : <a href="particulier.html">recharge à domicile</a>, <a href="entreprise.html">parking professionnel</a> ou <a href="blog/borne-recharge-copropriete-droit-a-la-prise.html">installation en copropriété</a>.</p>
    <p style="margin-top:16px">Consultez aussi les secteurs proches : {links}.</p>
  </div></section>

'''
 s=re.sub(r'  <!-- LOCAL -->[\s\S]*?(?=  <!-- ADVANTAGES -->)',lambda m:local,s,count=1)
 faqs=[(f'Quel budget prévoir pour une borne à {name} ?',f'À {name}, le budget dépend de la borne, du raccordement et des travaux. Comparez les mêmes postes de fourniture, pose, options et mise en service ; le tarif final nécessite une étude de votre installation.'),(f'Comment préparer mon projet à {name} ?',intro+' '+detail),(f'Quelle puissance choisir à {name} ?',"La puissance dépend de l’énergie à récupérer, du temps de stationnement, de l’alimentation et du chargeur AC du véhicule. Une borne 22 kW ne fournit pas cette puissance à une voiture limitée à 7,4 kW."),(f'Quelles aides examiner pour une installation à {name} ?',"Les conditions sont à vérifier selon le logement et le projet. ADVENIR peut concerner un point éligible en immeuble collectif, mais pas une borne en maison individuelle. Consultez le guide des aides pour les conditions et dates applicables.")]
 faq_json={'@context':'https://schema.org','@type':'FAQPage','mainEntity':[{'@type':'Question','name':q,'acceptedAnswer':{'@type':'Answer','text':a}} for q,a in faqs]}
 s=re.sub(r'<script type="application/ld\+json">([\s\S]*?)</script>',lambda m:'<script type="application/ld+json">\n'+json.dumps(faq_json,ensure_ascii=False,indent=2)+'\n</script>' if '"FAQPage"' in m[1] else m[0],s)
 faq='<section class="section" style="padding-top:0"><div class="wrap" style="max-width:820px"><div class="head"><h2>Installer une borne de recharge à '+E(name)+'</h2></div>'
 for q,a in faqs:faq+='<details style="background:var(--white);border:1px solid var(--line);border-radius:16px;padding:18px 22px;margin-bottom:12px"><summary style="font-weight:600;cursor:pointer">'+E(q)+'</summary><p style="margin-top:12px">'+E(a)+'</p></details>'
 faq+='</div></section>\n\n'
 s=re.sub(r'  <!-- FAQ LOCALE \(SEO\) -->[\s\S]*?(?=  <!-- CTA -->)',lambda m:'  <!-- FAQ LOCALE (SEO) -->\n'+faq,s,count=1)
 # Preserve structure but remove inherited unconditional commercial claims on new pages.
 s=s.replace('généralement sous 15 jours après validation du devis','à une date convenue après validation technique')
 s=s.replace("Vous recevez l'attestation de conformité nécessaire pour débloquer la prime ADVENIR et la TVA réduite à 5,5&nbsp;%.","Les documents remis et les conditions d’aide sont précisés selon le projet. Aucun financement n’est automatique.")
 # Keep all pre-existing footer destinations, including Nanterre itself.
 s=re.sub(r'<footer\b[\s\S]*?</footer>',lambda m:re.search(r'<footer\b[\s\S]*?</footer>',template)[0],s,count=1)
 (R/(slug+'.html')).write_text(s)

# Essonne department page follows the same layout and serves as a useful entry point.
s=(R/'massy.html').read_text()
s=s.replace('Massy','Essonne').replace('massy.html','essonne.html').replace('91300','91')
s=s.replace('hero-massy.webp','borne-recharge.webp')
s=re.sub(r'<p class="hero-credit">[\s\S]*?</p>','<p class="hero-credit">Illustration de recharge électrique.</p>',s,count=1)
s=re.sub(r'  <!-- LOCAL -->[\s\S]*?(?=  <!-- ADVANTAGES -->)','''  <!-- LOCAL -->
<section class="section" style="padding-top:0"><div class="wrap"><div class="head"><h2>Installation de borne de recharge dans l’Essonne (91)</h2></div><p>Maison, place en copropriété ou parking professionnel : préparez votre projet avec les informations du véhicule, du tableau et du stationnement. Les pages ci-dessous précisent différents points à examiner avant une demande de devis.</p><ul>'''+''.join(f'<li><a href="{r[1]}.html">Installateur de borne de recharge à {E(r[0])}</a></li>' for r in rows if r[2]=='91')+'''</ul><p>La faisabilité et les travaux sont confirmés après étude du raccordement. Le devis distingue matériel, pose et options.</p></div></section>
''',s,count=1)
s=re.sub(r'<script type="application/ld\+json">([\s\S]*?)</script>',lambda m:m[0].replace('"@type": "City"','"@type": "AdministrativeArea"') if '"Service"' in m[1] else m[0],s)
(R/'essonne.html').write_text(s)

new_links=[(r[0] if r[1]!='eragny' else 'Éragny-sur-Oise',r[1],r[2]) for r in rows]
block='<!-- IDF EXTENSION START -->\n<div style="max-width:1240px;margin:24px auto;padding:20px;border-top:1px solid rgba(187,203,187,0.35)"><p style="font-weight:600;margin-bottom:12px">Autres villes d’Île-de-France</p>'
for d in ['92','93','94','95','78','77','91']:
 block+='<div style="margin-top:12px"><p style="font-weight:600;margin-bottom:6px">'+(f'<a href="/essonne.html">{dept_names[d]}</a>' if d=='91' else dept_names[d])+'</p><div style="display:flex;flex-wrap:wrap;gap:8px 16px">'
 block+=''.join(f'<a style="font-size:13px;text-decoration:underline" href="/{slug}.html">{E(name)}</a>' for name,slug,dd in new_links if dd==d)+'</div></div>'
block+='</div>\n<!-- IDF EXTENSION END -->\n'
count=0
for p in R.rglob('*.html'):
 s=p.read_text()
 if '</footer>' not in s:continue
 s=re.sub(r'<!-- IDF EXTENSION START -->[\s\S]*?<!-- IDF EXTENSION END -->\n?','',s)
 s=s.replace('</footer>',block+'</footer>');p.write_text(s);count+=1

s=(R/'sitemap.xml').read_text()
for slug in [r[1] for r in rows]+['essonne']:
 url=f'https://www.irvohm.fr/{slug}.html'
 if '<loc>'+url+'</loc>' not in s:s=s.replace('</urlset>',f'  <url><loc>{url}</loc><lastmod>2026-11-02</lastmod></url>\n</urlset>')
(R/'sitemap.xml').write_text(s)
# Link the new city pages from their department content as well as the footer.
for d in dept:
 p=R/(dept[d]+'.html');s=p.read_text()
 marker='<!-- DEPARTMENT CITY EXTENSION -->'
 if marker in s:continue
 section=marker+'<section class="section"><div class="wrap"><h2>Autres communes desservies dans ce département</h2><ul>'
 section+=''.join(f'<li><a href="{slug}.html">Installation de borne de recharge à {E(name)}</a></li>' for name,slug,dd in new_links if dd==d)
 section+='</ul></div></section>\n'
 s=s.replace('</main>',section+'</main>');p.write_text(s)
print(f'{len(rows)} villes, un département, {count} footers mis à jour.')
