/**
 * Vercel Serverless Function: /api/lead
 * - Receives JSON from your cash-offer form
 * - Emails the lead to contact@onlyev.com via Resend
 *
 * Required env vars on Vercel:
 * - RESEND_API_KEY = re_...
 * - RESEND_FROM    = "ONLY EV <leads@send.onlyev.com>"   (must be a verified sender/domain in Resend)
 *
 * Optional env vars:
 * - LEADS_TO_EMAIL = "contact@onlyev.com"
 * - ALLOWED_ORIGINS = "https://onlyev.com,https://www.onlyev.com,https://only-ev-cash-offer.vercel.app"
 */

const DEFAULT_ALLOWED = [
  "https://onlyev.com",
  "https://www.onlyev.com",
  "https://only-ev-cash-offer.vercel.app",
];

function getAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw) return DEFAULT_ALLOWED;
  return raw
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

function setCors(req, res) {
  const origin = req.headers.origin;
  const allowed = getAllowedOrigins();
  if (origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

function normalize(body) {
  // Accept either a plain object or something string-y.
  if (!body) return {};
  if (typeof body === "object") return body;
  try { return JSON.parse(body); } catch { return { raw: String(body) }; }
}

module.exports = async (req, res) => {
  setCors(req, res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const to = process.env.LEADS_TO_EMAIL || "contact@onlyev.com";

  if (!apiKey) return res.status(500).json({ ok: false, error: "Missing RESEND_API_KEY env var" });
  if (!from) return res.status(500).json({ ok: false, error: "Missing RESEND_FROM env var" });

  const body = normalize(req.body);

  // Simple spam trap (optional): if you add an input named "company" and bots fill it, ignore.
  if (body.company && String(body.company).trim().length > 0) {
    return res.status(200).json({ ok: true }); // silently accept
  }

  // Try to extract common fields (but we still email everything)
  const vin = (body.vin || body.VIN || body.Vin || "").toString().trim();
  const phone = (body.phone || body.mobile || body.mobileNumber || body.mobile_number || "").toString().trim();
  const zip = (body.zip || body.zipcode || body.postal || body.postal_code || "").toString().trim();
  const vehicle = (body.vehicle || body.brand || body.make || body.whichEV || body.which_ev || "").toString().trim();

  // Light validation: require at least a VIN or phone to reach you
  if (!vin && !phone) {
    return res.status(400).json({ ok: false, error: "Missing VIN or mobile number" });
  }

  const ref = (req.headers.referer || "").toString();
  const ua = (req.headers["user-agent"] || "").toString();

  const subjectBits = [
    "ONLY EV Lead",
    vehicle ? `— ${vehicle}` : "",
    vin ? `— VIN ${vin.slice(-6)}` : "",
    zip ? `— ${zip}` : "",
  ].filter(Boolean);

  const subject = subjectBits.join(" ");

  // Create a clean list of fields
  const rows = Object.entries(body)
    .filter(([k]) => k !== "company") // keep spam field out
    .map(([k, v]) => {
      const value = Array.isArray(v) ? v.join(", ") : v;
      return `<tr><td style="padding:6px 10px;border:1px solid #eee;"><b>${escapeHtml(k)}</b></td><td style="padding:6px 10px;border:1px solid #eee;">${escapeHtml(value)}</td></tr>`;
    })
    .join("");

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.4">
      <h2>New ONLY EV cash-offer request</h2>
      <p><b>Submitted from:</b> ${escapeHtml(ref || "(unknown)")}</p>
      <p><b>User-Agent:</b> ${escapeHtml(ua || "(unknown)")}</p>

      <h3>Lead details</h3>
      <table style="border-collapse:collapse;border:1px solid #eee;">
        ${rows || "<tr><td style='padding:10px'>No fields received.</td></tr>"}
      </table>

      <p style="margin-top:14px;color:#666;font-size:12px">
        Tip: Reply directly to this email thread to keep everything in one place.
      </p>
    </div>
  `;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
      }),
    });

    const text = await r.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    if (!r.ok) {
      return res.status(500).json({ ok: false, error: json?.message || "Resend error", details: json });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};
