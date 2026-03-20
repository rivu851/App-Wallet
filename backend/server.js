import express from "express";
import dotenv from "dotenv";
import { initDB } from "./config/db.js";
import rateLimiter from "./middleware/rateLimiter.js";

import transactionRoute from "./routes/transactionsRoute.js"

dotenv.config();

const app = express();
app.use(rateLimiter);
app.use(express.json());

const PORT = process.env.PORT || 5001;

// ==================== Initialize DB ====================


app.use("/api/transactions", transactionRoute)

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});
