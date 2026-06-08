# InstaHelp Vendor Store Builder (MVP)

Premium SaaS storefront builder for local businesses — **Vercel frontend + Google Apps Script API + Google Sheets + Razorpay**.

## Architecture

| Layer | Technology |
|-------|------------|
| Frontend (Vercel) | Static HTML, `/css`, `/js` |
| API | Google Apps Script (`Code.gs`) via `js/api.js` |
| Database | Google Sheets |
| Payments | Razorpay |
| Media | Google Drive |

## Vercel URLs (after deploy)

| Page | URL |
|------|-----|
| Hub (entry) | `/` → `index.html` |
| InstaHelp showcase | `/showcase` |
| Vendor onboarding | `/vendors/apply` |
| Public store | `/shop/your-slug` |
| Vendor dashboard | `/vendor/dashboard?vendorId=VND_XXX` |
| Admin panel | `/admin/vendors` |

## Deploy to Vercel

1. Push this folder (`instahelp-vendor-network/`) to GitHub.
2. In [Vercel](https://vercel.com): **Add New Project** → import the repo.
3. Set **Root Directory** to `instahelp-vendor-network` (if the repo root is the parent folder).
4. Framework preset: **Other** (static site — Vercel serves `index.html` at `/`).
5. Optional env var:
   - `INSTAHELP_API_URL` = your Google Apps Script Web App URL (injected at build into `js/config.js`).
6. Deploy.

CLI alternative:

```bash
cd instahelp-vendor-network
npx vercel
```

## Google Apps Script backend

| Resource | URL / ID |
|----------|----------|
| **Web App** | https://script.google.com/macros/s/AKfycbzfBuJzx20OmkPF5bkI8POEeMgF_wfLbyHllLDKASf4M3Wrel3HOSkDdkSYJmphjhLNVg/exec |
| **Spreadsheet** | https://docs.google.com/spreadsheets/d/1-TjwourKbMFaz-LpFMIROmYyqgrK_CQJ3_9ZhWrSnm8/edit |

### GAS setup

1. Copy `Code.gs` + HTML files into your Apps Script project (for GAS-hosted fallback).
2. Run `initializeSheets()` once in the Apps Script editor.
3. **Deploy → New deployment → Web app** — Execute as **Me**, access **Anyone**.
4. After code changes, create a **new deployment version** and update `INSTAHELP_API_URL` / `js/config.js` if the URL changes.

### Admin login

Password is set in `Code.gs` → `ADMIN_PASSWORD`. Session tokens are stored in `CacheService`.

## API bridge (`js/api.js`)

Vercel pages use `google.script.run` shim that POSTs JSON to GAS:

```json
{ "action": "getVendorStore", "args": ["shop-slug"] }
```

Showcase hero form POSTs directly to the same Web App URL (`submitShowcaseForm`).

## Plans

| Plan | Price | Templates | Products | Branding |
|------|-------|-----------|----------|----------|
| Free | ₹0 | Classic | 10 max | InstaHelp shown |
| Pro | ₹499/mo | Classic, Luxury, Service | Unlimited | Hidden |
| Pro+ | ₹999/mo | All 4 | Unlimited | Hidden + Priority |

## File structure

```
instahelp-vendor-network/
├── index.html              # Vercel entry / hub
├── showcase.html           # InstaHelp landing page
├── vendor-registration.html
├── shop.html
├── vendor-dashboard.html
├── admin-dashboard.html
├── vercel.json             # Clean URL rewrites
├── package.json            # Optional build (env injection)
├── Code.gs                 # GAS backend (not served by Vercel)
├── css/
│   ├── shared.css
│   └── shop-templates.css
└── js/
    ├── config.js           # API URL + site helpers
    ├── api.js              # GAS JSON client + google.script.run shim
    ├── shared.js
    └── shop-templates.js
```

## Google Sheets

| Sheet | Purpose |
|-------|---------|
| Vendors | Store profiles, plan, template, theme |
| Applications | Onboarding submissions |
| Products | Product catalog |
| Leads | Customer enquiries |
| Analytics | Daily views, clicks, leads |
| Payments | Razorpay payment records |
| ShowcaseForms | Landing page hero form |
