# E-systémy — návrh webu

Návrh nového webu pro E-systémy (Filip Sklenář, České Budějovice, esystemy.cz): chytrý dům, kamery, alarmy PZTS, přístupové systémy, FVE. Statický web generovaný z dat.

- **Obsah** je v `_data/*.json` (texty, služby, systémy, postup, kontakty), kompatibilní se společnou administrací `~/webhunter-admin`.
- **Šablona** `src/index.html` (Jinja), styly `src/style.css`, skripty `src/main.js`, logo „E“ ve vektoru `brand/` (potrace z favicony).
- `python3 build.py` → `site/` (s `?v=` hashi proti cache GitHub Pages, noindex + robots.txt).
- Push do `main` → GitHub Actions sestaví a nasadí Pages.
- Fotky a odznak Loxone Gold Partner jsou z jejich webu (Mozello, zdroje v `_research/`, mimo git). Ovládací panel v úvodu je ilustrace, formulář je jen ukázka.
