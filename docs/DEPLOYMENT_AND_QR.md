# Deployment & QR Code Guide

## 1. GitHub Pages (fastest)
1. Push your customized repository to GitHub.
2. Open **Settings → Pages**.
3. Set Source to **Deploy from a branch** → `main` → `/ (root)` and click **Save**.
4. Your live card will be available at `https://<username>.github.io/<repo-name>/`.

## 2. Cloudflare Pages
1. Run `python tools/build_site.py` to build a minimal `site/` folder containing only `index.html`, `css/`, `js/`, `assets/`, and `_headers`.
2. Drag and drop `site/` in the Cloudflare Pages dashboard, or deploy via CLI:
   ```bash
   npx wrangler pages deploy site
   ```

## 3. Optional QR Code (for printed cards)
Generate a QR code **after** your site is live at a real HTTPS URL:

```bash
python -m pip install -r tools/requirements-qr.txt
python tools/generate_qr.py https://your-live-url.example/
```

The PNG is written to `assets/qr/graduation-qr.png`. Scan-test it on a phone before printing.
