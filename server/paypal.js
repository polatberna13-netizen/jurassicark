// paypal.js
import express from "express";

// Polyfill for older Node (safe on Node 18+ too)
if (!globalThis.fetch) {
  const { default: nf } = await import("node-fetch");
  globalThis.fetch = nf;
}

const router = express.Router();

// ===== LIVE ENV ONLY =====
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

// Optional: serve SDK config so client & server stay in sync
router.get("/sdk-config", (_req, res) => {
  res.json({ clientId: CID || null, currency: "EUR", intent: "capture", env: "live" });
});

// Optional: client token endpoint
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

// Create order — converts negative item lines into a proper discount
router.post("/orders", express.json(), async (req, res) => {
  try {
    const { amount, currency = "EUR", userId, items = [] } = req.body || {};
    const clientAmount = Number(amount);
    if (!Number.isFinite(clientAmount) || clientAmount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }
    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "Missing userId" });
    }

    // Normalize incoming items and split into positives / discount accumulator
    const positiveItems = [];
    let discountTotal = 0; // positive number representing total discount

    if (Array.isArray(items)) {
      items.forEach((it, idx) => {
        const qty = Math.max(1, Math.floor(Number(it?.quantity ?? it?.qty ?? 1)));
        const price = Number(it?.unit_amount?.value ?? it?.price ?? 0);
        const sku = String(it?.sku ?? it?.itemId ?? "").slice(0, 127);
        const desc = String(it?.description ?? (sku || `Item ${idx + 1}`)).slice(0, 127);
        const name = String(it?.name ?? `Item ${idx + 1}`).slice(0, 127);

        if (!Number.isFinite(price) || qty <= 0) return;

        if (price < 0) {
          // Treat negatives as a discount
          discountTotal += Math.abs(price) * qty;
        } else if (price > 0) {
          positiveItems.push({
            name,
            sku,
            quantity: String(qty),
            description: desc,
            unit_amount: { currency_code: currency, value: price.toFixed(2) },
          });
        }
        // price === 0 → drop (PayPal dislikes zero-value items)
      });
    }

    // Build purchase unit with correct breakdown math
    let purchaseUnit = {
      reference_id: "PU-1",
      custom_id: String(userId).slice(0, 127),
      invoice_id: `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      amount: { currency_code: currency, value: clientAmount.toFixed(2) }, // may be overridden below
    };

    if (positiveItems.length > 0) {
      const itemTotal = positiveItems.reduce(
        (sum, it) => sum + Number(it.unit_amount.value) * Number(it.quantity),
        0
      );

      const breakdown = {
        item_total: { currency_code: currency, value: itemTotal.toFixed(2) },
      };
      if (discountTotal > 0) {
        breakdown.discount = { currency_code: currency, value: discountTotal.toFixed(2) };
      }

      // Net is what PayPal expects amount.value to be
      const net = Math.max(0, itemTotal - discountTotal);

      purchaseUnit = {
        ...purchaseUnit,
        amount: {
          currency_code: currency,
          value: net.toFixed(2),
          breakdown,
        },
        items: positiveItems,
      };

      // Optional: warn if client sent a different total (does not fail the order)
      if (Math.abs(net - clientAmount) > 0.01) {
        console.warn("Client/server amount mismatch", {
          clientAmount: clientAmount.toFixed(2),
          computedNet: net.toFixed(2),
        });
      }
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
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("PayPal create order failed:", JSON.stringify(j));
      return res.status(r.status).json({ error: "create order failed", detail: j });
    }
    return res.json(j);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || String(e), detail: e.detail });
  }
});

// Capture
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
    if (!r.ok) {
      console.error("PayPal capture failed:", JSON.stringify(j));
      return res.status(r.status).json({ error: "capture failed", detail: j });
    }
    return res.json(j);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || String(e), detail: e.detail });
  }
});

// Debug (safe)
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
