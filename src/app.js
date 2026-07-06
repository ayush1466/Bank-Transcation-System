const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth.routes');


connectDB();
const app = express();
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);

console.log('App is running');

module.exports = app;
