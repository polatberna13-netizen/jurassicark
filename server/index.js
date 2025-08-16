import "dotenv/config";
import express from "express";
import cors from "cors";
import paypalRoutes from "./paypal.js";

const app = express();

const allowedOrigins = [
  "https://jurassicark.x10.mx",
  "http://localhost:5173"
];

const corsOpts = {
  origin: allowedOrigins,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

// Parse JSON globally (harmless even if route also uses express.json())
app.use(express.json());

// CORS for all requests
app.use(cors(corsOpts));

// Express 5 compatible catch-all for preflight
app.options(/.*/, cors(corsOpts));

// Tiny health check
app.get("/", (_req, res) => res.send("OK"));

// PayPal API routes
app.use("/api/paypal", paypalRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
