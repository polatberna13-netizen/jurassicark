import "dotenv/config";
import express from "express";
import cors from "cors";
import paypalRoutes from "./paypal.js";

const app = express();

app.use(cors({
  origin: [  
    "https://jurassicark.x10.mx",  
    "http://localhost:5173", 
  ],
  methods: ["GET", "POST"],
}));

app.use("/api/paypal", paypalRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
