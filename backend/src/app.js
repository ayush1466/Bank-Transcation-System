const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const cookieParser = require("cookie-parser");
const cors = require("cors");

connectDB();
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173", // your frontend dev URL
    credentials: true,
  }),
);

/**
 * Routes required
 */
const authRoutes = require("./routes/auth.routes");
const accountRoutes = require("./routes/account.routes");
const transactionRoutes = require("./routes/transaction.routes");

/**
 * Use routes
 */
app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRoutes);

app.use("/api/transactions", transactionRoutes);

console.log("App is running");

module.exports = app;
