import express from "express";

if (!globalThis.fetch) {
  const { default: nf } = await import("node-fetch");
  globalThis.fetch = nf;
}

const router = express.Router();

const BASE = process.env.PAYPAL_BASE_URL || "https://api-m.paypal.com";
const CID = process.env.PAYPAL_CLIENT_ID;
const SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PUBLIC = process.env.PUBLIC_BASE_URL || "http://localhost:5173";
const DEBUG = process.env.NODE_ENV !== "production";

function assertEnv() {
  const missing = [];
  if (!CID) missing.push("PAYPAL_CLIENT_ID");
  if (!SECRET) missing.push("PAYPAL_CLIENT_SECRET");
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
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = j?.error_description || j?.error || `${r.status} ${r.statusText}`;
    if (DEBUG) console.error("PayPal token error:", msg, j);
    throw Object.assign(new Error(`PayPal token error: ${msg}`), { status: r.status, detail: j });
  }
  return j.access_token;
}

router.get("/client-token", async (_req, res) => {
  try {
    const access = await getAccessToken();
    const r = await fetch(`${BASE}/v1/identity/generate-token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
        "Accept-Language": "en_GB"
      }
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      if (DEBUG) console.error("generate-token failed:", j);
      return res.status(r.status).json({ error: "generate-token failed", detail: j });
    }
    res.json({ client_token: j.client_token });
  } catch (e) {
    if (DEBUG) console.error("client-token error:", e);
    res.status(e.status || 500).json({ error: e.message || String(e), detail: e.detail });
  }
});

const toPrice = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function normalizeClientItems(rawItems = [], currency = "EUR") {
  if (!Array.isArray(rawItems)) return [];
  return rawItems.map((it, idx) => {
    const price = toPrice(it?.unit_amount?.value ?? it?.price ?? 0);
    const qty = Math.max(1, Math.floor(Number(it?.quantity ?? it?.qty ?? 1)));
    const sku = String(it?.sku ?? it?.itemId ?? "").slice(0, 127);
    let desc = String(it?.description ?? "").slice(0, 127);

    const isHL = it?.isHighLevel === true || it?.highLevel === true;
    if (isHL && !/^\(High level\)/i.test(desc)) desc = desc ? `(High level) ${desc}` : "(High level)";

    const name = String(it?.name ?? `Item ${idx + 1}`).slice(0, 127);

    return {
      name,
      sku,
      quantity: String(qty),
      description: desc,
      unit_amount: { currency_code: currency, value: price.toFixed(2) },
      _numPrice: price,
      _numQty: qty
    };
  });
}

router.post("/orders", async (req, res) => {
  try {
    const { amount, currency = "EUR", userId, items = [] } = req.body || {};
    const clientAmount = toPrice(amount);
    if (!Number.isFinite(clientAmount) || clientAmount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }
    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "Missing userId" });
    }

    if (DEBUG) console.log("Create order request:", { clientAmount, currency, userId, itemCount: Array.isArray(items) ? items.length : 0 });

    const normalized = normalizeClientItems(items, currency);

    const positiveItems = normalized.filter(i => i._numPrice >= 0);
    const negativeItems = normalized.filter(i => i._numPrice < 0);

    const bundleDiscountAbs = negativeItems.reduce((s, it) => s + Math.abs(it._numPrice * it._numQty), 0);

    let positiveTotal = positiveItems.reduce((s, it) => s + (it._numPrice * it._numQty), 0);

    const uidShort = userId.length > 20 ? `${userId.slice(0, 10)}…${userId.slice(-4)}` : userId;
    const uidLineValue = 0.01;
    const uidItem = {
      name: "User name",
      sku: `UID:${uidShort}`,
      quantity: "1",
      description: `User: ${userId}`.slice(0, 127),
      unit_amount: { currency_code: currency, value: uidLineValue.toFixed(2) }
    };

    const itemsForPaypal = [...positiveItems.map(({ name, sku, quantity, description, unit_amount }) => ({
      name, sku, quantity, description, unit_amount
    })), uidItem];

    const itemTotalForPaypal = positiveTotal + uidLineValue;

    const totalDiscount = bundleDiscountAbs + uidLineValue;

    const computedNet = itemTotalForPaypal - totalDiscount;

    if (Math.abs(computedNet - clientAmount) > 0.01) {
      if (DEBUG) {
        console.error("Amount mismatch", {
          clientAmount: clientAmount.toFixed(2),
          positives: positiveTotal.toFixed(2),
          bundleDiscountAbs: bundleDiscountAbs.toFixed(2),
          uidLineValue: uidLineValue.toFixed(2),
          itemTotalForPaypal: itemTotalForPaypal.toFixed(2),
          totalDiscount: totalDiscount.toFixed(2),
          computedNet: computedNet.toFixed(2)
        });
      }
      return res.status(400).json({
        error: "Amount mismatch",
        detail: {
          clientAmount: clientAmount.toFixed(2),
          positives: positiveTotal.toFixed(2),
          bundleDiscountAbs: bundleDiscountAbs.toFixed(2),
          uidLineValue: uidLineValue.toFixed(2),
          itemTotalForPaypal: itemTotalForPaypal.toFixed(2),
          totalDiscount: totalDiscount.toFixed(2),
          computedNet: computedNet.toFixed(2)
        }
      });
    }

    const access = await getAccessToken();
    const invoiceId = `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const payload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: "PU-1",
          custom_id: String(userId).slice(0, 127),
          invoice_id: invoiceId,
          amount: {
            currency_code: currency,
            value: clientAmount.toFixed(2),
            breakdown: {
              item_total: { currency_code: currency, value: itemTotalForPaypal.toFixed(2) },
              discount: { currency_code: currency, value: totalDiscount.toFixed(2) }
            }
          },
          items: itemsForPaypal
        }
      ],
      application_context: {
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        brand_name: "Your Store",
        locale: "en-GB",
        return_url: `${PUBLIC}/paypal/return`,
        cancel_url: `${PUBLIC}/paypal/cancel`
      }
    };

    if (DEBUG) console.log("PayPal create order payload:", JSON.stringify(payload));

    const r = await fetch(`${BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      if (DEBUG) console.error("PayPal create order failed:", r.status, j);
      return res.status(r.status).json({ error: "create order failed", detail: j });
    }
    return res.json(j);
  } catch (e) {
    if (DEBUG) console.error("create order error:", e);
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
        "PayPal-Request-Id": `${req.params.id}-${Date.now()}`
      },
      body: "{}"
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      if (DEBUG) console.error("PayPal capture failed:", r.status, j);
      return res.status(r.status).json({ error: "capture failed", detail: j });
    }
    return res.json(j);
  } catch (e) {
    if (DEBUG) console.error("capture error:", e);
    res.status(e.status || 500).json({ error: e.message || String(e), detail: e.detail });
  }
});

export default router;
