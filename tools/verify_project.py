#!/usr/bin/env python3
"""Static smoke checks + privacy guard for the public Graduation Flower Card template."""
from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parents[1]
required = [
    'index.html', 'README.md', 'LICENSE', 'AGENTS.md',
    'css/fonts.css', 'css/main.css', 'css/animations.css', 'css/responsive.css',
    'js/config.js', 'js/app.js', 'js/quiz.js', 'js/runawayButton.js', 'js/cardPages.js',
    'js/flowers.js', 'js/asciiBouquet.js', 'js/flowerShapes.js',
    'js/bouquet3dScene.js', 'js/bouquet3dRenderer.js', 'js/bouquet3dMotion.js',
    'js/audio.js', 'js/confetti.js', 'js/sfx.js', 'js/toast.js',
    'assets/icons/favicon.svg', 'assets/fonts/jetbrains-mono-latin.woff2', 'assets/fonts/OFL-JetBrains-Mono.txt',
    'docs/ASSETS_AND_LICENSES.md', 'docs/DEPLOYMENT_AND_QR.md',
]
for rel in required:
    assert (root / rel).is_file(), f'Missing required file: {rel}'

config = (root / 'js/config.js').read_text(encoding='utf-8')
for preset in ('wildflower', 'roses', 'sunflowers', 'tulips', 'sakura', 'lilies', 'ascii-garden', 'minimal-svg'):
    assert preset in config, f'Missing bouquet preset in config.js: {preset}'
assert 'enabled: false' in config, 'Music should default to off in the public template'

# Verify local asset links in index.html
html = (root / 'index.html').read_text(encoding='utf-8')
for path in re.findall(r'(?:href|src)="((?:css|js|assets)/[^"#?]+)"', html):
    if path == 'assets/qr/graduation-qr.png':
        continue
    assert (root / path).exists(), f'Broken local asset reference: {path} in index.html'

# Ensure no webcam/microphone APIs are called
all_js = ''.join(p.read_text(encoding='utf-8') for p in (root / 'js').glob('*.js'))
assert 'getUserMedia' not in all_js, 'Camera/microphone APIs must not be used'

# Privacy guard: ensure no copyrighted MP3 or private client strings leaked into the public repo
assert not (root / 'assets/audio/our-song.mp3').exists(), 'Private audio file must not exist in public repo'
private_terms = ['cancain', 'takda manisan', 'n sunshine', 'rm350', 'our-song.mp3']
for file in root.rglob('*'):
    if not file.is_file() or '.git' in file.parts or 'site' in file.parts:
        continue
    if file.name == 'verify_project.py' or file.suffix.lower() in {'.woff2', '.png', '.jpg', '.mp3', '.zip'}:
        continue
    text = file.read_text(encoding='utf-8', errors='ignore').lower()
    for term in private_terms:
        assert not re.search(rf'(?<![a-z0-9]){re.escape(term)}', text), f'Private term "{term}" found in {file.relative_to(root)}'

try:
    subprocess.run(['node', '--version'], capture_output=True, check=True)
except (FileNotFoundError, subprocess.CalledProcessError):
    print('Node not installed, skipping JavaScript syntax check')
else:
    for file in sorted((root / 'js').glob('*.js')):
        subprocess.run(['node', '--check', str(file)], check=True)
    print('JavaScript syntax passed')

print(f'Static checks & privacy guard passed ({len(required)} required files, 8 bouquet presets).')
