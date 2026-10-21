#!/usr/bin/env bash
set -euo pipefail
OUT="dist/apexcalc.html"
mkdir -p dist
python3 - <<'PY'
import re, pathlib
root = pathlib.Path('.')
html = (root / 'index.html').read_text()
def inline_css(m):
    href = m.group(1)
    return f'<style>\n{(root / href).read_text()}\n</style>'
html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', inline_css, html)
pathlib.Path('dist/apexcalc.html').write_text(html)
print('Wrote dist/apexcalc.html')
PY