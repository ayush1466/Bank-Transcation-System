const express = require('express');
const router = express.Router();    
const models = require('../models/user.model');
const authcontroller = require('../controller/auth.controller');
const mongoose = require('mongoose');

// * /POST /api/auth/register/request-otp  — step 1: email a verification code
router.post('/register/request-otp', authcontroller.requestRegisterOtp);

// * /POST /api/auth/register/verify — step 2: verify code and create the user
router.post('/register/verify', authcontroller.verifyRegisterOtp);

// * /POST /api/auth/login
router.post('/login', authcontroller.login);

// * /POST /api/auth/logout
router.post('/logout', authcontroller.logout);

module.exports = router;