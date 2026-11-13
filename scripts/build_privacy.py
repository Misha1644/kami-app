"""Собирает docs/privacy.md и docs/privacy.html из src/data/privacy.js (RU + ES)."""
import html, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'src/data/privacy.js'), encoding='utf-8').read()
date = re.search(r"PRIVACY_UPDATED = '([^']+)'", open(os.path.join(ROOT, 'src/config.js'), encoding='utf-8').read()).group(1)


def sections(lang):
    block = src.split(f"  {lang}: {{")[1].split("\n  },")[0]
    title = re.search(r"title: '([^']*)'", block).group(1)
    secs = [(h, p.replace('\\n', '\n')) for h, p in re.findall(r"\['([^']*)', '((?:[^'\\]|\\.)*)'\]", block)]
    return title, secs


md = ['# Kami — политика конфиденциальности / Política de privacidad', '', f'Обновлено / Actualizada: {date}', '']
for lang in ['ru', 'es']:
    title, secs = sections(lang)
    md += [f'## {title}', '']
    for h, p in secs:
        md += [f'### {h}', '', p, '']
open(os.path.join(ROOT, 'docs/privacy.md'), 'w', encoding='utf-8').write('\n'.join(md))


def render(lang):
    title, secs = sections(lang)
    out = [f'<section id="{lang}" lang="{lang}"><h1>{html.escape(title)}</h1>']
    for h, p in secs:
        out.append(f'<h2>{html.escape(h)}</h2>' + ''.join(f'<p>{html.escape(line)}</p>' for line in p.split('\n')))
    out.append(f'<p class="date">{"Обновлено" if lang == "ru" else "Actualizada"}: {date}</p></section>')
    return ''.join(out)


KAMI = ('<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M34 58 C12 58 8 84 26 84 C38 84 38 70 28 70" fill="none" stroke="#3DB37F" stroke-width="9" stroke-linecap="round"/>'
        '<ellipse cx="62" cy="52" rx="30" ry="21" fill="#3DB37F"/><rect x="46" y="26" width="24" height="22" rx="6" fill="#E8833A"/>'
        '<line x1="50" y1="70" x2="46" y2="82" stroke="#3DB37F" stroke-width="6" stroke-linecap="round"/><line x1="74" y1="70" x2="78" y2="82" stroke="#3DB37F" stroke-width="6" stroke-linecap="round"/>'
        '<circle cx="92" cy="44" r="18" fill="#3DB37F"/><circle cx="96" cy="39" r="9" fill="#fff" stroke="#1F7A52" stroke-width="2.5"/><circle cx="98" cy="39" r="4" fill="#1B1F1D"/>'
        '<path d="M98 52 Q104 56 109 50" fill="none" stroke="#1F7A52" stroke-width="2.5" stroke-linecap="round"/></svg>')
CSS = """:root{--bg:#F6F7F4;--card:#fff;--text:#1B1F1D;--muted:#5B635F;--green:#1F7A52;--line:#DDE2DE}
*{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--text);font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
main{max-width:720px;margin:0 auto;padding:32px 20px 64px}
header{display:flex;align-items:center;gap:14px;margin-bottom:8px} header svg{width:72px;height:54px;flex:none}
.brand{font-weight:800;font-size:20px} .sub{color:var(--muted);font-size:14px}
nav{display:flex;gap:8px;margin:20px 0 8px} nav a{padding:8px 14px;border:1.5px solid var(--line);border-radius:12px;color:var(--text);text-decoration:none;font-size:14px}
nav a:hover{border-color:var(--green)}
section{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:24px;margin-top:16px}
h1{font-size:26px;margin:0 0 8px} h2{font-size:17px;margin:22px 0 4px} p{margin:4px 0} .date{color:var(--muted);font-size:14px;margin-top:20px}"""
page = (f'<!DOCTYPE html>\n<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
        f'<title>Kami — política de privacidad</title><style>{CSS}</style></head><body><main>'
        f'<header>{KAMI}<div><div class="brand">Kami</div><div class="sub">Español para el instituto · Школьный испанский</div></div></header>'
        f'<nav><a href="#es">Español</a><a href="#ru">Русский</a></nav>{render("es")}{render("ru")}</main></body></html>')
open(os.path.join(ROOT, 'docs/privacy.html'), 'w', encoding='utf-8').write(page)
print('privacy docs written,', date)
