# Life route browser artifact fingerprint

Observed during an active run at `2026-10-05T00:33:31Z` (this is a mid-session proof, not a retroactive startup measurement). Loaded URL: `http://127.0.0.1:5195/`; page title `住所與產業 — 橡谷`. Direct response bytes returned HTTP 200 and match the root manifest.

| Resource | HTTP | Observed SHA-256 | Manifest SHA-256 |
|---|---:|---|---|
| `/` document | 200 | `4bae8e855ffba8844b2b86db0c9ec18e1ea574feb53f2e35c212b6cb7c0f6d9c` | same |
| `/assets/index-3j-oQD-G.js` | 200 | `69f6943b69d9ea376f9d11d4f62277656eea43e0173fa0d24374a76f4f6ff00c` | same |
| `/assets/index-CEjw7W01.css` | 200 | `08f388b87104e268347571f8969f37e208908089fadf7f0bdd939866d76f569f` | same |

The identity used for the route remains source commit `c02b600c6f5f1533374d671b707d333c86d852d7`; manifest lives at `../build-manifest.json`.
