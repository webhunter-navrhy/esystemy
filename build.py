#!/usr/bin/env python3
"""E-systémy — sestaví statický web ze šablony (src/) a dat (_data/*.json) do site/.
Obsah (texty, služby, systémy, postup, kontakty) je v _data/*.json — kompatibilní se společnou
administrací webhunter-admin (zápis jen do _data/*.json a img/uploads/)."""
import datetime, hashlib, json, pathlib, re, shutil
from jinja2 import Environment, FileSystemLoader

ROOT = pathlib.Path(__file__).parent
SRC, CONTENT, OUT = ROOT / 'src', ROOT / '_data', ROOT / 'site'

if OUT.exists():
    shutil.rmtree(OUT)
shutil.copytree(ROOT / 'assets', OUT / 'assets')
for f in ('style.css', 'main.js'):
    shutil.copy(SRC / f, OUT / 'assets' / f)
for f in ('mark.svg', 'mark-light.svg'):
    shutil.copy(ROOT / 'brand' / f, OUT / 'assets' / f)
if (ROOT / 'img').exists():  # fotky nahrané v administraci
    shutil.copytree(ROOT / 'img', OUT / 'img', ignore=shutil.ignore_patterns('.gitkeep'))

h = lambda p: hashlib.md5((OUT / p).read_bytes()).hexdigest()[:8]
data = {p.stem: json.loads(p.read_text()) for p in CONTENT.glob('*.json')}


def img(p, w=None):
    """cesta k obrázku z dat → cesta od kořene webu; w=900 → menší varianta, pokud existuje"""
    p = str(p)
    if p.startswith('img/'):
        return p
    p = 'assets/img/' + p.rsplit('/', 1)[-1]
    if w:
        small = p.replace('.jpg', f'-{w}.jpg')
        if (OUT / small).exists():
            return small
    return p


def srcset(p):
    p = img(p)
    small = p.replace('.jpg', '-900.jpg')
    if (OUT / small).exists():
        return f'{small} 900w, {p} 1600w'
    return p


env = Environment(loader=FileSystemLoader(str(SRC)), autoescape=False)
env.filters['img'] = img
env.filters['srcset'] = srcset
env.filters['tel'] = lambda t: re.sub(r'[^\d+]', '', t)

# česká typografie: jednopísmenné předložky a spojky nenechávat na konci řádku (jen v textu)
_NB = re.compile(r'(?<![\w&;])([vszkouiaVSZKOUIA]) (?=\S)')


def nbsp(html):
    parts = re.split(r'(<script.*?</script>|<style.*?</style>|<svg.*?</svg>|<[^>]+>)', html, flags=re.S)
    return ''.join(x if i % 2 else _NB.sub(r'\1&nbsp;', x) for i, x in enumerate(parts))


html = env.get_template('index.html').render(
    data,
    v={'css': h('assets/style.css'), 'js': h('assets/main.js'), 'fav': h('assets/favicon.png'), 'logo': h('assets/mark-light.svg')},
    year=datetime.date.today().year,
)
(OUT / 'index.html').write_text(nbsp(html))
(OUT / 'robots.txt').write_text('User-agent: *\nDisallow: /\n')
(OUT / '.nojekyll').touch()
print('✓ site/index.html')
