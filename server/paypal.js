import express from "express";

if (!globalThis.fetch) {
  const { default: nf } = await import("node-fetch");
  globalThis.fetch = nf;
}

const router = express.Router();

const BASE   = process.env.PAYPAL_BASE_URL || "https://api-m.paypal.com";
const CID    = process.env.PAYPAL_CLIENT_ID;
const SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PUBLIC = process.env.PUBLIC_BASE_URL || "https://jurassicark.x10.mx";

function assertEnv() {
  const missing = [];
  if (!CID) missing.push("PAYPAL_CLIENT_ID");
  if (!SECRET) missing.push("PAYPAL_CLIENT_SECRET");
  if (!BASE) missing.push("PAYPAL_BASE_URL");
  if (missing.length) {
    const msg = `Missing env: ${missing.join(", ")}`;
    throw Object.assign(new Error(msg), { status: 500 });
  }
}

async function getAccessToken() {
  assertEnv();
  const auth = Buffer.from(`${CID}:${SECRET}`).toString("base64");
  const r = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = j?.error_description || j?.error || `${r.status} ${r.statusText}`;
    throw Object.assign(new Error(`PayPal token error: ${msg}`), { status: r.status, detail: j });
  }
  return j.access_token;
}

router.get("/sdk-config", (_req, res) => {
  res.json({
    clientId: CID || null,
    currency: "EUR",
    intent: "capture",
    env: "live",
  });
});

router.get("/client-token", async (_req, res) => {
  try {
    const access = await getAccessToken();
    const r = await fetch(`${BASE}/v1/identity/generate-token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
        "Accept-Language": "en_GB",
      },
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: "generate-token failed", detail: j });
    res.json({ client_token: j.client_token });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || String(e), detail: e.detail });
  }
});

router.post("/orders", express.json(), async (req, res) => {
  try {
    const { amount, currency = "EUR", userId, items = [] } = req.body || {};
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return res.status(400).json({ error: "Invalid amount" });
    if (!userId || typeof userId !== "string") return res.status(400).json({ error: "Missing userId" });

    let purchaseUnit = {
      reference_id: "PU-1",
      custom_id: String(userId).slice(0, 127),
      invoice_id: `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      amount: { currency_code: currency, value: n.toFixed(2) },
    };

    if (Array.isArray(items) && items.length > 0) {
      const normalized = items.map((it, idx) => {
        const price = Number(it?.unit_amount?.value ?? it?.price ?? 0);
        const qty = Math.max(1, Math.floor(Number(it?.quantity ?? it?.qty ?? 1)));
        const sku = String(it?.sku ?? it?.itemId ?? "").slice(0, 127);

        const desc = String(it?.description ?? (sku || `Item ${idx + 1}`)).slice(0, 127);

        return {
          name: String(it?.name ?? `Item ${idx + 1}`).slice(0, 127),
          sku,
          quantity: String(qty),
          description: desc,
          unit_amount: { currency_code: currency, value: price.toFixed(2) },
        };
      });

      const itemTotal = normalized.reduce(
        (sum, it) => sum + Number(it.unit_amount.value) * Number(it.quantity),
        0
      );

      purchaseUnit = {
        ...purchaseUnit,
        amount: {
          currency_code: currency,
          value: n.toFixed(2),
          breakdown: { item_total: { currency_code: currency, value: itemTotal.toFixed(2) } },
        },
        items: normalized,
      };
    }

    const access = await getAccessToken();
    const payload = {
      intent: "CAPTURE",
      purchase_units: [purchaseUnit],
      application_context: {
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        brand_name: "Your Store",
        locale: "en-GB",
        return_url: `${PUBLIC}/paypal/return`,
        cancel_url: `${PUBLIC}/paypal/cancel`,
      },
    };

    const r = await fetch(`${BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: "create order failed", detail: j });
    return res.json(j);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || String(e), detail: e.detail });
  }
});

router.post("/orders/:id/capture", async (req, res) => {
  try {
    const access = await getAccessToken();
    const r = await fetch(`${BASE}/v2/checkout/orders/${req.params.id}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "PayPal-Request-Id": `${req.params.id}-${Date.now()}`,
      },
      body: "{}",
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: "capture failed", detail: j });
    return res.json(j);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || String(e), detail: e.detail });
  }
});

router.get("/debug/env", (_req, res) => {
  res.json({
    base: BASE,
    clientIdSuffix: CID ? CID.slice(-8) : null,
    hasSecret: Boolean(SECRET),
  });
});
router.get("/ping", async (_req, res) => {
  try {
    await getAccessToken();
    res.json({ ok: true });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, detail: e.detail });
  }
});

export default router;
