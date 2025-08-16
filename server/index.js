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

app.use("/api/paypal", paypalRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
