"""Audit built HTML, excluding shared navigation, tools and promotions from similarity checks."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, urljoin
from collections import Counter
import json,re,itertools,sys,xml.etree.ElementTree as ET

VOID={'meta','link','img','input','br','hr','source','wbr','area','base','embed','param','track','col'}
class Page(HTMLParser):
 def __init__(self):
  super().__init__();self.stack=[];self.title=[];self.h1=[];self.editorial=[];self.description=[];self.canonical=[];self.robots='';self.links=[];self.ids=set();self.schemas=[];self.schema_text='';self.in_schema=False
 def editorial_context(self):
  return any(t=='main' for t,a in self.stack) and not any(t in {'nav','footer','script','style'} or any(c in a.get('class','').split() for c in ['tool-shell','pp-panel','pp-strip','tool-preview','tool-inputs']) for t,a in self.stack)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.add(a['id'])
  if tag=='meta':
   if a.get('name')=='description':self.description.append(a.get('content',''))
   if a.get('name')=='robots':self.robots=a.get('content','')
  if tag=='link' and a.get('rel')=='canonical':self.canonical.append(a.get('href',''))
  if tag=='a':self.links.append({'href':a.get('href',''),'contextual':self.editorial_context()})
  if tag=='script' and a.get('type')=='application/ld+json':self.in_schema=True;self.schema_text=''
  if tag not in VOID:self.stack.append((tag,a))
  if tag=='h1':self.h1.append('')
 def handle_startendtag(self,tag,attrs):
  self.handle_starttag(tag,attrs)
  if tag not in VOID:self.handle_endtag(tag)
 def handle_endtag(self,tag):
  if tag=='script' and self.in_schema:
   try:self.schemas.append(json.loads(self.schema_text))
   except ValueError:self.schemas.append({'invalid':True})
   self.in_schema=False
  for i in range(len(self.stack)-1,-1,-1):
   if self.stack[i][0]==tag:self.stack=self.stack[:i];break
 def handle_data(self,data):
  if self.in_schema:self.schema_text+=data
  if any(t=='title' for t,a in self.stack):self.title.append(data)
  if any(t=='h1' for t,a in self.stack):self.h1[-1]+=data
  if self.editorial_context():self.editorial.append(data)

def main():
 root=Path(__file__).resolve().parents[1]
 build=root/'dist/client'
 pages={}
 for path in build.rglob('*.html'):
  route='/' if path==build/'index.html' else '/404' if path.name=='404.html' else '/'+path.parent.relative_to(build).as_posix()
  p=Page();p.feed(path.read_text(encoding='utf-8'));pages[route]=p
 issues=[]
 for route,p in pages.items():
  if len(p.h1)!=1:issues.append(f'{route}: expected one H1, found {len(p.h1)}')
  if not ''.join(p.title):issues.append(f'{route}: missing title')
  if len(p.canonical)!=1 or p.canonical[0]!=('https://www.qrworkbench.com'+('/' if route=='/' else route)):issues.append(f'{route}: incorrect canonical')
  if 'noindex' not in p.robots and (len(p.description)!=1 or not p.description[0]):issues.append(f'{route}: missing description')
  if any(s.get('invalid') for s in p.schemas):issues.append(f'{route}: invalid JSON-LD')
  for link in p.links:
   u=urlparse(urljoin('https://www.qrworkbench.com'+route,link['href']))
   if u.netloc not in {'www.qrworkbench.com','qrworkbench.com'}:continue
   target=u.path.rstrip('/') or '/'
   if target in pages:
    if u.fragment and u.fragment not in pages[target].ids:issues.append(f'{route}: missing anchor {link["href"]}')
   elif not (build/u.path.lstrip('/')).exists() and not target.startswith('/api/'):
    issues.append(f'{route}: broken link {link["href"]}')
 indexed={r:p for r,p in pages.items() if 'noindex' not in p.robots}
 for name,values in [('title',[''.join(p.title) for p in indexed.values()]),('description',[p.description[0] if p.description else '' for p in indexed.values()])]:
  for value,count in Counter(values).items():
   if count>1:issues.append(f'Duplicate {name}: {value}')
 locs=[]
 for path in build.glob('sitemap-*.xml'):
  if path.name=='sitemap-index.xml':continue
  locs += [e.text for e in ET.parse(path).iter() if e.tag.endswith('}loc')]
 expected={'https://www.qrworkbench.com'+('/' if r=='/' else r) for r in indexed}
 # The bare origin and origin + '/' identify the same homepage URL.
 normalized_locs={u+'/' if urlparse(u).path=='' else u for u in locs}
 if normalized_locs!=expected:issues.append(f'Sitemap mismatch: missing {sorted(expected-normalized_locs)}; unexpected {sorted(normalized_locs-expected)}')
 def words(p):return re.findall(r'[a-z0-9]+',' '.join(p.editorial).lower())
 def shingles(p):
  w=words(p);return set(tuple(w[i:i+5]) for i in range(len(w)-4))
 similar=[]
 for (a,p),(b,q) in itertools.combinations(indexed.items(),2):
  x,y=shingles(p),shingles(q);score=len(x&y)/max(1,len(x|y))
  similar.append({'a':a,'b':b,'jaccard_5word':round(score,3)})
  similar.sort(key=lambda s:s['jaccard_5word'],reverse=True)
 metrics=[]
 for route,p in sorted(pages.items()):
  incoming=[r for r,q in pages.items() if r!=route and any((urlparse(l['href']).path.rstrip('/') or '/')==route and l['contextual'] for l in q.links)]
  metrics.append({'route':route,'indexed':route in indexed,'title':''.join(p.title),'description':p.description[0] if p.description else '', 'editorial_words':len(words(p)),'contextual_inbound':incoming,'canonical':p.canonical,'schema_types':[s.get('@type') for s in p.schemas]})
 result={'pages':len(pages),'indexed_pages':len(indexed),'sitemap_urls':len(locs),'issues':sorted(set(issues)),'metrics':metrics,'most_similar_pairs':similar[:15], 'method':'Five-word Jaccard overlap of main text excluding navigation, footer, tool shell, and shared pricing. Similarity and word counts are review signals, not Google ranking thresholds.'}
 out=root/'docs';out.mkdir(exist_ok=True);(out/'seo-audit-results.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
 print(json.dumps({k:result[k] for k in ['pages','indexed_pages','sitemap_urls','issues','most_similar_pairs']},indent=2))
 print('Editorial content / contextual inbound:')
 for m in metrics:print(m['route'],m['editorial_words'],len(m['contextual_inbound']))
 sys.exit(bool(issues))

if __name__ == "__main__": main()
