# Putting SherPay online permanently

The web app is **100% static** (no backend, no build step) and uses **hash routing**, so it works on
*any* static host with **zero redirect/rewrite configuration**. `SherPay-web-dist.zip` (or the `dist/`
folder) is the deployable unit: index.html, styles.css, js/, assets/, manifest.json, sw.js + the
single-file offline build as a bonus download.

## Option A — Netlify Drop (fastest, free, permanent)
1. Go to https://app.netlify.com/drop
2. Drag **SherPay-web-dist.zip** (or the unzipped `dist/` folder) onto the page.
3. You get a live `https://xxx.netlify.app` URL instantly; claim it with a free Netlify account to keep it forever and rename the subdomain (e.g. `sherpay.netlify.app`).
4. Custom domain: Domain settings → add `app.yourdomain.com` + CNAME record.

## Option B — I deploy it for you (zero effort on your side)
Paste a deploy token in the chat and I run the CLI from this workspace:
- Netlify: `NETLIFY_AUTH_TOKEN` (app.netlify.com → User → Applications → Personal access tokens)
- Vercel: `VERCEL_TOKEN` (vercel.com/account/tokens)
- DigitalOcean: API token (cloud.digitalocean.com/account/api)
I'll deploy `dist/`, verify HTTPS + PWA headers, and hand you the permanent URL.

## Option C — Vercel yourself
```bash
npm i -g vercel && cd dist && vercel --prod
```
(first run asks login via browser; framework preset: *Other/Static*)

## Option D — GitHub Pages (free, great for demos)
1. Create a repo, upload the contents of `dist/` to the root of `main`.
2. Settings → Pages → Source: *Deploy from a branch* → `main` / root.
3. Live at `https://<user>.github.io/<repo>/` — hash routing means deep links just work.

## Option E — DigitalOcean App Platform / Droplet
- **App Platform:** New App → GitHub repo (or drag zip via "static site") → it detects a static site; build command empty, output directory `/`.
- **Droplet (nginx):**
  ```nginx
  server {
    listen 80; server_name app.yourdomain.com;
    root /var/www/sherpay; index index.html;
    location / { try_files $uri $uri/ /index.html; }
  }
  ```
  `scp -r dist/* user@droplet:/var/www/sherpay/` then `certbot --nginx` for HTTPS.

## Option F — any shared/cPanel host
Upload the contents of `dist/` into `public_html/` via FTP/File Manager. Done.

## After any deploy — verify
- `https://your-url/` loads the dashboard.
- Phone: Add to Home Screen (iOS Safari / Android Chrome) → installs as PWA, works offline (service worker caches the shell).
- `SherPay-mobile.html` remains reachable at `https://your-url/SherPay-mobile.html` as a downloadable offline copy.
