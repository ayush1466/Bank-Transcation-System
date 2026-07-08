const express = require('express');
const router = express.Router();    
const models = require('../models/user.model');
const authcontroller = require('../controller/auth.controller');
const mongoose = require('mongoose');

// * /POST /api/auth/register
router.post('/register',authcontroller.register);

// * /POST /api/auth/login
router.post('/login', authcontroller.login);

// * /POST /api/auth/logout
router.post('/logout', authcontroller.logout);

module.exports = router;