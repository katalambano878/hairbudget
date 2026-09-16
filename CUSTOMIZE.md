# Customization Checklist

Complete every item below to make this project fully yours. Search for each placeholder string to find all locations.

---

## 1. Identity Placeholders — Global Find & Replace

Run a case-sensitive global search across the entire project and replace every occurrence:

| Placeholder | Replace with |
|---|---|
| `YOUR_APP_NAME` | Your store/app name |
| `YOUR_TAGLINE` | Your short tagline |
| `YOUR_COMPANY_NAME` | Your legal company or business name |
| `YOUR_BRAND_NAME` | Your brand name (may differ from company name) |
| `yourdomain.com` | Your actual domain |
| `YOUR_PHONE_NUMBER` | Your customer-facing phone number |
| `YOUR_ADDRESS` | Your physical or mailing address |
| `YOUR_STREET_ADDRESS` | Street address (for structured data) |
| `YOUR_CITY` | City (for structured data) |
| `YOUR_AREA_SERVED` | Country/region code e.g. `US`, `GH` |
| `YOUR_PRIMARY_COLOR` | Primary brand hex color e.g. `0C4534` |
| `YOUR_PRIMARY_COLOR_LIGHT` | Light tint of primary e.g. `eff6ff` |
| `YOUR_PRIMARY_COLOR_DARK` | Dark shade of primary e.g. `1e3a5f` |
| `YOUR_SECONDARY_COLOR` | Secondary brand hex color |
| `YOUR_CURRENCY_CODE` | ISO currency code e.g. `USD`, `GHS` |
| `YOUR_CURRENCY_SYMBOL` | Currency symbol e.g. `$`, `GH₵` |
| `YOUR_SMS_SENDER_ID` | SMS sender ID registered with your SMS provider (max 11 chars) |
| `YOUR_KEYWORD_1` / `2` / `3` | SEO keywords for your store |
| `YOUR_DEFAULT_PAGE_TITLE` | Default title for pages with no specific title |
| `YOUR_DEFAULT_DESCRIPTION` | Default meta description |
| `YOUR_APP_DESCRIPTION` | Full description used in manifest, OG tags, structured data |
| `YOUR_OG_IMAGE_ALT_TEXT` | Alt text for Open Graph image |
| `YOUR_DEPLOYMENT_INSTRUCTIONS` | Your deploy process (Vercel/Netlify/etc.) |
| `YOUR_LICENSE` | Your chosen license type |
| `YOUR_YEAR` | Copyright year |

---

## 2. Assets — Required Files

All original images have been removed. Add these files to `/public/`:

| File | Size | Purpose |
|---|---|---|
| `/public/favicon.ico` | 32×32px | Browser tab icon |
| `/public/apple-touch-icon.png` | 180×180px | iOS home screen |
| `/public/icon-192.png` | 192×192px | Android / PWA icon |
| `/public/icon-512.png` | 512×512px | PWA splash screen |
| `/public/logo.png` | Any | Main logo (PNG fallback) |
| `/public/logo.svg` | Vector | Main logo (SVG preferred) |
| `/public/og-image.png` | 1200×630px | Social / Open Graph share image |
| `/public/hero.jpg` or hero images | 1920×1080px | Homepage hero background |

See `/public/ASSETS_GUIDE.md` for full details and tool recommendations.

Also update these favicon `<link>` tags in [app/layout.tsx](app/layout.tsx):
```html
<link rel="icon" href="/favicon.ico" type="image/x-icon" sizes="any" />
<link rel="shortcut icon" href="/favicon.ico" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

---

## 3. Configuration Files

### [package.json](package.json)
- [ ] `"name"` — set to your npm package name (kebab-case)
- [ ] Add `"description"`, `"author"`, `"homepage"`, `"repository"` fields

### [public/manifest.json](public/manifest.json)
- [ ] `name`, `short_name`, `description`
- [ ] `background_color`, `theme_color` — your brand hex colors
- [ ] `icons` — replace with your actual icon files

### [app/layout.tsx](app/layout.tsx)
- [ ] All metadata title/description/OG fields
- [ ] Structured data organization block
- [ ] `locale` — change from `en_US` if targeting a different region

### [hooks/usePageTitle.ts](hooks/usePageTitle.ts)
- [ ] `SITE_NAME` constant
- [ ] Tagline in the fallback string

---

## 4. Environment Variables

Copy `.env.example` to `.env.local` and fill in every value:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

# App URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Payment — Moolre
MOOLRE_API_USER=YOUR_MOOLRE_API_USER
MOOLRE_API_KEY=YOUR_MOOLRE_API_KEY
MOOLRE_API_PUBKEY=YOUR_MOOLRE_API_PUBKEY
MOOLRE_ACCOUNT_NUMBER=YOUR_MOOLRE_ACCOUNT_NUMBER
MOOLRE_MERCHANT_EMAIL=YOUR_MOOLRE_MERCHANT_EMAIL

# Email — Resend
RESEND_API_KEY=YOUR_RESEND_API_KEY
EMAIL_FROM=YOUR_APP_NAME <noreply@yourdomain.com>
ADMIN_EMAIL=admin@yourdomain.com

# SMS — Moolre SMS (optional, falls back to MOOLRE_API_KEY)
MOOLRE_SMS_API_KEY=YOUR_MOOLRE_SMS_API_KEY

# Analytics (optional)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# reCAPTCHA v3 (optional)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=YOUR_RECAPTCHA_SITE_KEY
RECAPTCHA_SECRET_KEY=YOUR_RECAPTCHA_SECRET_KEY
```

Also update `.cursor/mcp.json` with your Supabase project ref for Cursor AI integration.

---

## 5. Database & Supabase

- [ ] Create a new Supabase project
- [ ] Run migrations: `npm run db:migrate`
- [ ] Create admin user: `npm run create-admin`
- [ ] Update storage bucket names if you changed them from defaults
- [ ] Update RLS policies if your user roles differ

---

## 6. Notifications — lib/notifications.ts

- [ ] `BRAND.color` / `BRAND.colorLight` / `BRAND.colorDark` — your brand colors
- [ ] `BRAND.name` — your app name
- [ ] `senderid` in SMS payloads — registered sender ID (max 11 chars, no spaces)
- [ ] The welcome email copy (`sendWelcomeMessage`) — update to describe your actual product range

---

## 7. Content Pages

These pages contain placeholder or generic copy — update with your real content:

| File | What to update |
|---|---|
| [app/about/page.tsx](app/about/page.tsx) | Brand story, values, team info |
| [app/terms/page.tsx](app/terms/page.tsx) | Legal terms (consult a lawyer) |
| [app/privacy/page.tsx](app/privacy/page.tsx) | Privacy policy (consult a lawyer) |
| [app/shipping/page.tsx](app/shipping/page.tsx) | Shipping rates and timelines |
| [app/returns/page.tsx](app/returns/page.tsx) | Returns and exchange policy |
| [app/faqs/page.tsx](app/faqs/page.tsx) | Frequently asked questions |

---

## 8. SEO

- [ ] [public/robots.txt](public/robots.txt) — sitemap URL (already set to `https://yourdomain.com/sitemap.xml`)
- [ ] [app/sitemap.ts](app/sitemap.ts) — `baseUrl` comes from `NEXT_PUBLIC_APP_URL` env var (no change needed)
- [ ] Add your Google Search Console verification to `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`

---

## 9. Admin SKU Prefix

- [ ] [components/admin/ProductForm.tsx](components/admin/ProductForm.tsx) line ~39 — update the `prefix` constant from `'SKU'` to your 2–3 letter brand abbreviation

---

## 10. Legal

- [ ] Replace `/LICENSE` with your chosen license
- [ ] Have a lawyer review and customize `/app/terms/page.tsx` and `/app/privacy/page.tsx`
- [ ] Update copyright year/name in all footer/email references (driven by `YOUR_APP_NAME` and `YOUR_YEAR` placeholders)

---

## 11. Deployment

- [ ] Set all environment variables in your deployment platform (Vercel → Project Settings → Environment Variables)
- [ ] Configure your custom domain
- [ ] Update `NEXT_PUBLIC_APP_URL` to your production URL
- [ ] Run a build (`npm run build`) locally before deploying to catch any remaining placeholder strings

---

*Generated by forensic ownership purge — 2026-04-23*
