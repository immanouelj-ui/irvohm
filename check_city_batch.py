from pathlib import Path
import re,json,xml.etree.ElementTree as ET,subprocess,html
from urllib.parse import urlsplit,unquote
from html.parser import HTMLParser
R=Path(__file__).parent
rows=json.loads((R/'city_batch.json').read_text())
new=[r[1]+'.html' for r in rows]+['essonne.html']
class Scan(HTMLParser):
 def __init__(self):super().__init__();self.links=[];self.ids=[];self.h1=0
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if t=='h1':self.h1+=1
  if 'id' in a:self.ids.append(a['id'])
  if t=='a' and 'href' in a:self.links.append(a['href'])
footers=0
for p in R.rglob('*.html'):
 s=p.read_text()
 if '</footer>' in s:
  f=re.search(r'<footer\b[\s\S]*?</footer>',s)[0]
  for row in rows:assert f'href="/{row[1]}.html"' in f,(p,row[1])
  assert 'href="/essonne.html"' in f,p
  footers+=1
for name in new:
 p=R/name;s=p.read_text();scan=Scan();scan.feed(s);assert scan.h1==1,(name,'h1');assert len(scan.ids)==len(set(scan.ids)),(name,'duplicate ids')
 assert f'href="https://www.irvohm.fr/{name}"' in s,(name,'canonical')
 assert re.search(r'<meta name="robots" content="index, follow"',s),(name,'robots')
 for link in scan.links:
  u=urlsplit(html.unescape(link))
  if u.scheme or u.netloc or not u.path:continue
  target=(R/u.path.lstrip('/')) if u.path.startswith('/') else p.parent/u.path
  assert target.exists(),(name,link)
 for image in re.findall(r'(?:url\([\'"]?|href=")(hero-[^\'"\)]+\.webp)',s):assert (R/image).exists(),(name,image)
 data=[json.loads(x) for x in re.findall(r'<script type="application/ld\+json">([\s\S]*?)</script>',s)]
 faq=next(x for x in data if x.get('@type')=='FAQPage')
 for q in faq['mainEntity']:assert html.escape(q['name'],quote=True) in s and html.escape(q['acceptedAnswer']['text'],quote=True) in s,(name,'FAQ mismatch')
 service=next(x for x in data if x.get('@type')=='Service');assert 'address' not in service
schema='{http://www.sitemaps.org/schemas/sitemap/0.9}'
tree=ET.parse(R/'sitemap.xml');urls=[n.text for n in tree.findall('.//'+schema+'loc')];assert len(urls)==len(set(urls))
for name in new:assert 'https://www.irvohm.fr/'+name in urls
# Existing executable JavaScript must remain identical: footer and text work only.
scripts=lambda s:re.findall(r'<script\b(?![^>]*application/ld\+json)[^>]*>[\s\S]*?</script>',s)
changed=subprocess.check_output(['git','diff','--name-only'],cwd=R,text=True).splitlines()
for name in changed:
 if not name.endswith('.html'):continue
 old=subprocess.check_output(['git','show','HEAD:'+name],cwd=R,text=True);s=(R/name).read_text()
 assert scripts(old)==scripts(s),(name,'scripts changed')
 # Existing body changes are limited to department links; all others change only footer.
 if name not in ['hauts-de-seine.html','seine-saint-denis.html','val-de-marne.html','val-doise.html','yvelines.html','seine-et-marne.html']:
  strip=lambda x:re.sub(r'<!-- IDF EXTENSION START -->[\s\S]*?<!-- IDF EXTENSION END -->\n?','',x)
  assert old==strip(s),(name,'outside footer changed')
print(f'OK: {len(new)} pages, {footers} footers, sitemap, liens, images, FAQ/JSON-LD et périmètre des modifications.')
