#!/usr/bin/env python3
"""Copy only runtime card files into a clean `site/` folder for static hosting (e.g. Cloudflare Pages)."""
from pathlib import Path
import shutil
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
out = root / 'site'

INCLUDE = ['index.html', 'css', 'js', 'assets']
EXCLUDE = {
    'assets/qr',
    'assets/audio/.gitkeep',
}

HEADERS = """/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=()
"""

check = subprocess.run([sys.executable, str(root / 'tools' / 'verify_project.py')], cwd=root)
if check.returncode != 0:
    sys.exit('Project checks failed: fix them before publishing.')

if out.exists():
    shutil.rmtree(out)
out.mkdir()


def skipped(path: Path) -> bool:
    rel = path.relative_to(root).as_posix()
    return any(rel == item or rel.startswith(item + '/') for item in EXCLUDE)


count = 0
size = 0
for item in INCLUDE:
    source = root / item
    files = [source] if source.is_file() else sorted(p for p in source.rglob('*') if p.is_file())
    for file in files:
        if skipped(file):
            continue
        target = out / file.relative_to(root)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(file, target)
        count += 1
        size += file.stat().st_size

(out / '_headers').write_text(HEADERS, encoding='utf-8')
print(f'\nReady: {out}  ({count + 1} files, {size / 1024 / 1024:.2f} MB)')
