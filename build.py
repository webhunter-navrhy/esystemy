#!/usr/bin/env python3
"""E-systémy — sestaví statický web ze šablony (src/) a dat (_data/*.json) do site/.
Obsah (texty, služby, systémy, postup, kontakty) je v _data/*.json — kompatibilní se společnou
administrací webhunter-admin (zápis jen do _data/*.json a img/uploads/)."""
import datetime, hashlib, json, pathlib, re, shutil
from jinja2 import Environment, FileSystemLoader

ROOT = pathlib.Path(__file__).parent
SRC, CONTENT, OUT = ROOT / 'src', ROOT / '_data', ROOT / 'site'
URL = 'https://webhunter-navrhy.github.io/esystemy/'

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
            p = small
    return webp(p)


def webp(p):
    """stejná fotka ve WebP (menší přenos), pokud vedle JPG existuje"""
    w = p[:-4] + '.webp' if p.endswith('.jpg') else p
    return w if (OUT / w).exists() else p


def srcset(p):
    p = img(p)
    small = p.replace('.webp', '-900.webp').replace('.jpg', '-900.jpg')
    if (OUT / small).exists():
        return f'{small} 900w, {p} 1600w'
    return p


def jsonld(site):
    """schema.org jen z údajů, které jsou na webu"""
    street, _, city = site['address'].partition(', ')
    m = re.match(r'(\d{3} ?\d{2})\s+(.+)', city)
    psc, mesto = (m.group(1), m.group(2)) if m else ('', city)
    d = {
        '@context': 'https://schema.org',
        '@type': 'HomeAndConstructionBusiness',
        'name': site['name'],
        'description': 'Chytrý dům Loxone, Fibaro a Control4, kamerové systémy, alarmy PZTS, přístupové a docházkové systémy a fotovoltaika. Projekt, realizace i servis.',
        'url': URL,
        'image': URL + 'assets/img/og.jpg',
        'logo': URL + 'assets/apple-touch-icon.png',
        'telephone': site['phone'].replace(' ', ''),
        'email': site['email'],
        'taxID': site['ico'],
        'legalName': site['owner'],
        'address': {'@type': 'PostalAddress', 'streetAddress': street,
                    'postalCode': psc, 'addressLocality': mesto, 'addressCountry': 'CZ'},
        'areaServed': 'České Budějovice',
    }
    return json.dumps(d, ensure_ascii=False, indent=1).replace('</', '<\\/')


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
    jsonld=jsonld(data['site']),
)
(OUT / 'index.html').write_text(nbsp(html))
(OUT / 'robots.txt').write_text('User-agent: *\nDisallow: /\n')
(OUT / '.nojekyll').touch()
print('✓ site/index.html')
