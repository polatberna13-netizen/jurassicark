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

app.use(express.json());

app.use(cors(corsOpts));

app.options(/.*/, cors(corsOpts));

app.get("/", (_req, res) => res.send("OK"));

app.use("/api/paypal", paypalRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
