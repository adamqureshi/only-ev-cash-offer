# ONLY EV — Drop-in backend files (Vercel + Resend)

You asked: “Can you give me the new files to add to my repo?”
This zip contains **only** the new backend + form-submit helper.

## 1) Add these files to your repo

- `api/lead.js`
- `assets/onlyev-lead-submit.js`

## 2) Add ONE line to each page (before </body>)

```html
<script defer src="/assets/onlyev-lead-submit.js"></script>
```

If you have multiple pages (/, /rivian/, /escalade-iq/), add it to each page’s HTML.

### Optional (recommended)
Tag the correct form (if your page has more than one):

```html
<form data-onlyev-lead-form>
```

### Optional spam trap (recommended)
Add a hidden field to your form:

```html
<input type="text" name="company" autocomplete="off" tabindex="-1" style="position:absolute;left:-9999px;opacity:0;height:0;width:0" />
```

Bots fill it, humans won’t. The backend ignores submissions where it’s filled.

## 3) Add env vars in Vercel

Vercel Project → Settings → Environment Variables:

- `RESEND_API_KEY` = re_...
- `RESEND_FROM` = ONLY EV <leads@send.onlyev.com>
  - This MUST be a verified sender/domain in Resend.
- `LEADS_TO_EMAIL` = contact@onlyev.com (optional)

Optional:
- `ALLOWED_ORIGINS` = https://onlyev.com,https://www.onlyev.com,https://only-ev-cash-offer.vercel.app

## 4) Deploy

Commit + push → Vercel auto-deploys.

## How it works (simple)
- Your existing form submits (we intercept it in the browser)
- We POST all form fields to:
  - `/api/lead` if it exists
  - otherwise fallback to `https://only-ev-cash-offer.vercel.app/api/lead`
- Resend emails you the lead instantly
- User is redirected to `/thanks.html`

