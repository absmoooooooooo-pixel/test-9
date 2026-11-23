# Backend — Metal Weight Calculator API

Node.js 18+, **no dependencies**. Serves the calculation API only; the website
is static (`index.html` at the repository root plus `frontend/`) and is hosted
separately, for example on GitHub Pages.

```bash
node server.js          # or: npm start
npm run dev             # restart on change
npm test                # calculation parity test (starts its own server)
```

Configuration: copy `.env.example` to `.env` (never commit `.env`) or set the
variables in the host environment. `ALLOWED_ORIGINS` must list the origin of the
hosted site, otherwise the browser's requests are refused with `403`.

## Layout

| Folder | Contents |
| --- | --- |
| `server.js` | Process entry: listens, handles shutdown |
| `app.js` | Request handler: `/api/*` only, nothing else is served |
| `config.js` | Environment settings and the `.env` reader |
| `routes/index.js` | API routes and their status codes |
| `controllers/` | `calculate`, `materials`, `bootstrap.js` |
| `middleware/` | `http` helpers, `cors`, `rateLimit` |
| `calculations/` | One module per calculator family + `index.js` registry |
| `core/` | `weight.js` (volume → kg chain), `validation.js` |
| `materials/` | `materialDensity.js`: g/cm³ sections, kg/m³ dish heads, reference table |
| `test/` | `parity.js`, `domStub.js`, `fixtures/original/` (reference only) |

## Calculation modules

- `prismatic.js` — plate, box/c/e/i/t/l channels, pipe, shell, hexagon bar,
  square bar, trapezium, trapezoidal, triangular, and the two holed-bar shapes.
- `circularPlate.js`, `roundBar.js`, `solidCone.js`, `sphereBall.js`,
  `truncatedCone.js`, `flangePlate.js`, `dishEnds.js` — the shapes with their own
  geometry or plate thickness.

Every module exposes `compute(payload)` and throws a `ValidationError` (with a field
name) for bad input. Payload shape:

```json
{ "values": { "…": 0 }, "unit": "mm", "density": 7.85, "quantity": 1, "material": "carbon-steel" }
```

`dish-ends` adds `type` and uses a density in kg/m³.

## Rules for this folder

- Formulas live here and nowhere else; the pages only render returned numbers.
- The weight chain is `core/weight.js` for every calculator — do not re-derive it.
- Densities come from `materials/materialDensity.js` only; the pages receive the same
  tables from `/api/materials` (and `/api/bootstrap.js` for tooling and tests).
- `test/fixtures/original/` holds the pre-restructure pages used by `parity.js`. They
  are reference material, never served and never edited.
