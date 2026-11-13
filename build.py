"""Build the self-contained CAI Digital Twin HTML from src/ (inlines CSS, JS and images)."""
import base64, io, json, pathlib
from PIL import Image
ROOT = pathlib.Path(__file__).parent
SRC = ROOT / 'src'
AERIAL = ROOT / 'WhatsApp Image 2026-10-20 at 12.45.49 PM.jpeg'
TERMS = ROOT / 'WhatsApp Image 2026-10-20 at 1.12.16 PM.jpeg'

def jpg(im, w=None, q=80):
    if w and im.width > w:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.convert('RGB').save(b, 'JPEG', quality=q, optimize=True, progressive=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()

img = {'aerial': jpg(Image.open(AERIAL), 1600, 82)}
t = Image.open(TERMS); W, H = t.size; hw, hh = W // 2, H // 2
for i, (x, y) in enumerate([(0, 0), (hw, 0), (0, hh), (hw, hh)]):
    img['t%d' % (i + 1)] = jpg(t.crop((x + 4, y + 4, x + hw - 4, y + hh - 4)), 760, 78)
for k in ('se', 'av'):
    img[k] = 'data:image/svg+xml;base64,' + base64.b64encode((SRC / 'assets' / (k + '.svg')).read_bytes()).decode()
for k in ('sch', 'ave'):
    img[k] = 'data:image/jpeg;base64,' + base64.b64encode((SRC / 'assets' / (k + '.jpg')).read_bytes()).decode()

import sys; sys.path.insert(0, str(SRC))
from cctv_photos import tiles
import re
_pool = (SRC / 'cctv.js').read_text(encoding='utf8'); _pool = _pool[_pool.index('const CAM_POOL'):_pool.index('const CAM_PHOTO')]
_used = set(re.findall(r"'([a-eh]\d)'", _pool))  # embed only scenes some camera can show
img['cc'] = {k: jpg(v, 600, 70) for k, v in tiles(SRC / 'assets' / 'cctv').items() if k.rstrip('LRZ') in _used}  # user-supplied illustrative stills for the CCTV tab
_ppl = json.loads((SRC / 'assets' / 'cctv' / 'people.json').read_text())  # person boxes from tools/detect_people.py (run once, offline)
img['ccp'] = {k: _ppl.get(k, []) for k in img['cc']}

js = '\n'.join((SRC / f).read_text(encoding='utf8') for f in ['data.js', 'finance.js', 'engine.js', 'ui.js', 'maps.js', 'views.js', 'views2.js', 'ef.js', 'enm.js', 'fin.js', 'cases.js', 'cctv.js', 'tests.js'])
html = (SRC / 'index.html').read_text(encoding='utf8')
html = html.replace('/*CSS*/', (SRC / 'styles.css').read_text(encoding='utf8')).replace('/*IMG*/', json.dumps(img)).replace('/*JS*/', js)
out = ROOT / 'CAI Digital Twin.html'
out.write_text(html, encoding='utf8')
print(out, round(len(html) / 1024), 'KB')
