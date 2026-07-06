const express = require('express');
const router = express.Router();    
const models = require('../models/user.model');
const authcontroller = require('../controller/auth.controller');
const mongoose = require('mongoose');

router.post('/register',authcontroller.register);


module.exports = router;