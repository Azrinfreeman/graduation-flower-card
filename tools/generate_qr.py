#!/usr/bin/env python3
"""Generate a QR code pointing to the FINAL public HTTPS card URL.

Install dependency: python -m pip install -r tools/requirements-qr.txt
Run: python tools/generate_qr.py https://YOUR-PROJECT.pages.dev/
"""
from pathlib import Path
from urllib.parse import urlparse
import argparse
import qrcode

parser = argparse.ArgumentParser(description='Create graduation card sharing QR code')
parser.add_argument('url', help='Final publicly accessible HTTPS URL')
args = parser.parse_args()
parsed = urlparse(args.url)
if parsed.scheme != 'https' or not parsed.netloc:
    parser.error('Provide the real HTTPS deployment URL (not localhost or a placeholder).')
if parsed.hostname in {'example.com', 'localhost', 'YOUR-PROJECT.pages.dev'}:
    parser.error('Please replace the example hostname with your deployed website.')

root = Path(__file__).resolve().parents[1]
out = root / 'assets' / 'qr' / 'graduation-qr.png'
qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=12, border=4)
qr.add_data(args.url)
qr.make(fit=True)
qr.make_image(fill_color='#352c39', back_color='white').save(out)
print(f'QR code saved: {out}')
print('Next: change qrReady to true in js/config.js and deploy again.')
