import "dotenv/config";
import express from "express";
import cors from "cors";
import paypalRoutes from "./paypal.js";

const app = express();

const allowedOrigins = [
  "https://jurassicark.x10.mx",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "OPTIONS"], 
  })
);

app.options("*", cors({ origin: allowedOrigins }));

app.get("/", (_req, res) => res.send("OK"));

app.use("/api/paypal", paypalRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
