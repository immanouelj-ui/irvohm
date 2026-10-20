#!/usr/bin/env python3
"""Offline SEO checks; run from any directory with Python 3, no dependencies."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
from collections import defaultdict
import json, re, sys, posixpath, xml.etree.ElementTree as ET
ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://www.irvohm.fr'
class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(); self.meta={}; self.canonical=[]; self.links=[]; self.ids=set(); self.h1=[]; self.title=[]; self.capture=None; self.jsonld=[]; self.ld=False; self.buf=''; self.feed(text)
    def handle_starttag(self,t,a):
        a=dict(a)
        if 'id' in a: self.ids.add(a['id'])
        if t=='meta': self.meta[a.get('name',a.get('property',''))]=a.get('content','')
        if t=='link' and a.get('rel')=='canonical': self.canonical.append(a.get('href',''))
        if t in ('a','link') and a.get('href'): self.links.append(a['href'])
        if t in ('h1','title'): self.capture=t; getattr(self,t).append('')
        if t=='script' and a.get('type')=='application/ld+json': self.ld=True; self.buf=''
    def handle_endtag(self,t):
        if t==self.capture: self.capture=None
        if t=='script' and self.ld: self.jsonld.append(self.buf); self.ld=False
    def handle_data(self,d):
        if self.capture: getattr(self,self.capture)[-1]+=d
        if self.ld: self.buf+=d

def canonical(path):
    return BASE+'/'+('' if path=='index.html' else path[:-10] if path.endswith('/index.html') else path)
def main():
    errors=[]; pages={str(p.relative_to(ROOT)):Page(p.read_text()) for p in ROOT.rglob('*.html') if '.git' not in p.parts}; indexed={k:p for k,p in pages.items() if 'noindex' not in p.meta.get('robots','').lower() and k!='404.html'}
    def check(ok,msg):
        if not ok: errors.append(msg)
    for k,p in pages.items():
        for block in p.jsonld:
            try: json.loads(block)
            except ValueError as e: errors.append(f'{k}: JSON-LD {e}')
        if k not in indexed: continue
        check(len(p.title)==1 and bool(p.title[0].strip()),f'{k}: title')
        check(bool(p.meta.get('description','').strip()),f'{k}: description')
        check(len(p.h1)==1 and bool(p.h1[0].strip()),f'{k}: H1')
        check(p.canonical==[canonical(k)],f'{k}: canonical {p.canonical}')
    for field in ('title','description'):
        groups=defaultdict(list)
        for k,p in indexed.items(): groups[(p.title[0] if p.title else '') if field=='title' else p.meta.get(field,'')].append(k)
        for value,keys in groups.items(): check(len(keys)==1,f'Duplicate {field}: {keys}')
    urls=[e.text for e in ET.parse(ROOT/'sitemap.xml').findall('.//{*}loc')]
    expected={canonical(k) for k in indexed}
    check(len(urls)==len(set(urls)),'Duplicate sitemap URLs')
    check(set(urls)==expected,f'Sitemap: missing={sorted(expected-set(urls))}, extra={sorted(set(urls)-expected)}')
    for k,p in pages.items():
        for href in p.links:
            u=urlsplit(href)
            if u.scheme and u.scheme not in ('http','https'): continue
            if u.netloc and u.netloc!='www.irvohm.fr': continue
            target=unquote(u.path)
            if not target: target=k
            elif target.startswith('/'): target=target.lstrip('/') or 'index.html'
            else: target=posixpath.normpath(posixpath.join(posixpath.dirname(k),target))
            rewrites=json.loads((ROOT/'vercel.json').read_text()).get('rewrites',[])
            for rule in rewrites:
                if '/'+target==rule['source']: target=rule['destination'].lstrip('/')
            if (ROOT/target).is_dir(): target=target.rstrip('/')+'/index.html'
            check((ROOT/target).is_file(),f'{k}: broken link {href}')
            if u.fragment and target in pages: check(u.fragment in pages[target].ids,f'{k}: missing fragment {href}')
    for k in ('admin.html','code.html','confirmation.html','demande-envoyee.html'):
        check('noindex' in pages[k].meta.get('robots',''),f'{k}: noindex missing')
        check('Disallow: /'+k not in (ROOT/'robots.txt').read_text(),f'{k}: noindex blocked by robots')
    print(f'{len(pages)} HTML pages; {len(indexed)} indexable; {len(urls)} sitemap URLs; {len(errors)} errors')
    for e in errors: print(e)
    return bool(errors)
if __name__=='__main__': sys.exit(main())
