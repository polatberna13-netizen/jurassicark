// index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import paypalRoutes from "./paypal.js";

const app = express();

/** CORS allowlist (prod + local dev) */
const ALLOW = new Set([
  "http://localhost:5173",
  "https://jurassicark.x10.mx",
]);
if (process.env.PUBLIC_BASE_URL) ALLOW.add(process.env.PUBLIC_BASE_URL);
if (process.env.RENDER_EXTERNAL_URL) {
  try {
    const u = new URL(process.env.RENDER_EXTERNAL_URL);
    ALLOW.add(`${u.protocol}//${u.host}`);
  } catch {}
}

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);           // server-to-server/tools
      if (ALLOW.has(origin)) return cb(null, true);
      return cb(new Error(`CORS: Origin not allowed: ${origin}`));
    },
    methods: ["GET", "POST"],
  })
);

// Health checks
app.get("/", (_req, res) => res.send("ok"));
app.get("/healthz", (_req, res) => res.status(200).json({ status: "ok" }));

// API
app.use("/api/paypal", paypalRoutes);

// Listen on Render's injected PORT
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";
console.log("PORT from env =", process.env.PORT);
app.listen(PORT, HOST, () => console.log(`API on http://${HOST}:${PORT}`));
