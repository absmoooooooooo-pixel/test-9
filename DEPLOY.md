# Deployment

The project has two independent parts:

| Part | What it is | Where it runs |
| --- | --- | --- |
| Website | static files: `index.html` at the repository root + `frontend/` | GitHub Pages (or any static host) |
| API | `backend/` — the engineering formulas, densities, validation | a Node host, deployed separately |

Nothing on the website needs a local development server: the home page is
`index.html` in the repository root, so a static host serves it as `/`
automatically.

---

## 1. Website on GitHub Pages

1. Push the repository to GitHub (the root `index.html` is what visitors see).
2. Repository → **Settings → Pages**.
3. **Source**: *Deploy from a branch*; **Branch**: `main` (or your default
   branch), **Folder**: `/ (root)`. Save.
4. After the first build the site is at `https://<user>.github.io/<repo>/`
   (or at your custom domain). The home page opens directly; there is no
   folder listing and no backend page.

The `.nojekyll` file at the root makes GitHub Pages serve the files exactly as
they are.

All links are relative, so the same files work at a domain root
(`https://example.com/`) and in a repository sub-path
(`https://user.github.io/repo/`):

```
/index.html                      home page (calculator cards)
/frontend/about/index.html       about page
/frontend/calculators/plate/     one folder per calculator
/frontend/assets/, /frontend/shared/, /frontend/icons/
/manifest.webmanifest, /service-worker.js, /robots.txt, /sitemap.xml, /ads.txt
```

## 2. API on a Node host

The API has no npm dependencies. Any Node 18+ host works (Render, Railway,
Fly.io, a VPS, a shared Node plan).

1. Deploy the `backend/` folder (only that folder is needed at runtime).
2. Set the environment variables:

   | Variable | Value for a split deployment |
   | --- | --- |
   | `PORT` | supplied by the host |
   | `HOST` | `0.0.0.0` |
   | `NODE_ENV` | `production` |
   | `PUBLIC_API_BASE` | `https://api.example.com` |
   | `ALLOWED_ORIGINS` | `https://<user>.github.io,https://example.com` |
   | `API_KEY` | leave empty (see below) |
   | `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` | `120` / `60000` |
   | `MAX_BODY_BYTES` | `16384` |

3. Start it with `npm start` (or `node server.js`).
4. Check `GET https://api.example.com/api/health` returns `{"ok":true,…}`.

`ALLOWED_ORIGINS` must list the exact origin of the site: GitHub Pages sends
`https://<user>.github.io` even when the site lives in `/repo/`. Requests from
any other origin get `403`.

`API_KEY` stays empty for the public website: a static page cannot keep a
secret. Use it only for non-browser clients.

## 3. Point the website at the API

Edit one line in `frontend/assets/js/api-config.js`:

```js
window.MW_API_BASE = "https://api.example.com";
```

Commit and push; GitHub Pages publishes it. Every calculator sends its
calculation to that host (`POST /api/calculate/<calculator>`) and loads the
material density table from `/api/materials`. No key, token or formula is in
any frontend file.

If `MW_API_BASE` is left empty, requests go to the site's own origin, which is
correct only when a host serves both the pages and the API together.

## What is never published

- `backend/` is not part of the website. The static host serves it as plain
  repository files only if it is inside the published folder, and the API host
  runs it as a service. The API process itself serves nothing but `/api/*`.
- `backend/.env` is git-ignored; only `.env.example` is committed.
- Formulas, densities and validation live only in `backend/calculations`,
  `backend/materials` and `backend/core`.

## After deploying

1. `https://<site>/` shows the home page with 24 calculator cards.
2. A card opens its calculator, the drawing and layout are intact.
3. Calculate returns a result: the browser sends `POST /api/calculate/…` to the
   URL from `api-config.js` and gets `200`.
4. `cd backend && npm test` passes: `calculator/scenario pairs compared: 71`
   followed by `PASS`.

## Updating

- Website: push the changed files; GitHub Pages rebuilds automatically.
- API: redeploy `backend/` and restart the process.

The service worker only passes requests through, so visitors get the new files
on the next load.
