/**
 * ONLY EV form submit helper (static-site friendly)
 * - Captures ANY <form> on the page (or one tagged with data-onlyev-lead-form)
 * - Sends form fields to /api/lead (works if site is on Vercel)
 * - If /api/lead returns 404 (GitHub Pages), it falls back to your Vercel backend:
 *   https://only-ev-cash-offer.vercel.app/api/lead
 *
 * To use:
 * 1) Upload this file to: /assets/onlyev-lead-submit.js
 * 2) Add this to your HTML (before </body>):
 *    <script defer src="/assets/onlyev-lead-submit.js"></script>
 *
 * Optional (recommended):
 * Add data-onlyev-lead-form to the form you want to submit:
 *    <form data-onlyev-lead-form>
 */

(function () {
  const FALLBACK_API = "https://only-ev-cash-offer.vercel.app/api/lead";

  function pickForm() {
    const tagged = document.querySelector("form[data-onlyev-lead-form]");
    if (tagged) return tagged;

    const forms = Array.from(document.querySelectorAll("form"));
    if (forms.length === 1) return forms[0];

    // Try common hints
    const byId = document.getElementById("cashOfferForm") || document.getElementById("cash-offer-form");
    if (byId && byId.tagName === "FORM") return byId;

    // Try VIN input presence
    for (const f of forms) {
      const vinInput = f.querySelector("input[name*='vin' i], input[id*='vin' i]");
      if (vinInput) return f;
    }

    return forms[0] || null;
  }

  async function postJson(url, payload) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  function toObject(formData) {
    const obj = {};
    for (const [k, v] of formData.entries()) {
      // If multiple values share key, coerce into array
      if (obj[k] === undefined) obj[k] = v;
      else if (Array.isArray(obj[k])) obj[k].push(v);
      else obj[k] = [obj[k], v];
    }
    return obj;
  }

  function setBusy(form, busy) {
    const btn = form.querySelector("button[type='submit'], input[type='submit']");
    if (btn) btn.disabled = !!busy;

    form.dataset.submitting = busy ? "1" : "0";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;

    if (form.dataset.submitting === "1") return;

    // Create payload from ALL fields
    const fd = new FormData(form);

    // Optional simple honeypot: include a hidden input named "company"
    // (bots tend to fill it). If you haven't added it, ignore.
    const payload = toObject(fd);

    // Include page context
    payload._page = location.href;
    payload._ts = new Date().toISOString();

    setBusy(form, true);

    try {
      // First try same-origin (works when the site is hosted on Vercel)
      let r = await postJson("/api/lead", payload);

      // If the static host doesn't have the endpoint, fall back to your Vercel backend
      if (r.status === 404 || r.status === 405) {
        r = await postJson(FALLBACK_API, payload);
      }

      const j = await r.json().catch(() => ({}));

      if (!r.ok || !j.ok) {
        alert(j.error || "Something went wrong. Please email contact@onlyev.com.");
        return;
      }

      // Redirect to thank-you page if present
      const thankYou = "/thanks.html";
      window.location.href = thankYou;
    } catch (err) {
      alert("Network error. Please email contact@onlyev.com.");
    } finally {
      setBusy(form, false);
    }
  }

  function init() {
    const form = pickForm();
    if (!form) return;

    // Attach submit handler
    form.addEventListener("submit", handleSubmit);

    // If your form has an existing action, this still intercepts it.
    // Quick UX improvement: make sure VIN counter updates if you have an input named vin.
    const vin = form.querySelector("input[name='vin'], input[name='VIN'], input[id*='vin' i]");
    const counter = document.querySelector("[data-vin-count]");
    if (vin && counter) {
      const update = () => { counter.textContent = String((vin.value || "").trim().length); };
      vin.addEventListener("input", update);
      update();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
