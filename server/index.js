import "dotenv/config";
import express from "express";
import cors from "cors";
import paypalRoutes from "./paypal.js";

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://jurassicark.x10.mx",
  ],
  methods: ["GET", "POST"],
}));

app.get("/", (_req, res) => res.send("ok"));             
app.get("/healthz", (_req, res) => res.status(200).json({status: "ok"})); 

app.use("/api/paypal", paypalRoutes);

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";                                  
app.listen(PORT, HOST, () => console.log(`API on http://${HOST}:${PORT}`));
