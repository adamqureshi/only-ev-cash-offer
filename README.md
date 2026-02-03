# ONLYEV.com — Cash Offer Lander (GitHub Pages)

This folder is ready to upload to GitHub and publish with GitHub Pages.

## What it does
- Mobile-first landing page
- Big VIN input (17 chars) + required fields: miles, ZIP, mobile #
- Loan/title selection (+ bank if loan)
- Submits to `contact@onlyev.com` using FormSubmit (static-site friendly)

## Files
- `index.html` — landing page
- `thanks.html` — optional thank you page (not required)
- `assets/logo.png` — provided logo
- `assets/favicon.png` — favicon

## Notes
Form submission uses FormSubmit:
- Action (fallback): https://formsubmit.co/contact@onlyev.com
- AJAX endpoint (preferred): https://formsubmit.co/ajax/contact@onlyev.com

On first real submission, FormSubmit may email you a confirmation link to activate delivery.

When you're ready, we can also switch this to a different form provider (Formspree, Basin, etc.).
