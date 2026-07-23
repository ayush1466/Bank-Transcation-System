const express = require('express');
const transactionController = require('../controller/transaction.controller');
const authmiddleware = require('../middleware/auth.middleware');

const transaction = express.Router();
 
transaction.post('/', authmiddleware.authenticateToken, transactionController.createTransaction);

/**
 * -POST /api/transactions/system/initial-funds
 * - create a new transaction to add initial funds to the system
 */
transaction.post("/system/initial-funds", authmiddleware.SystemUser, transactionController.createInitialFundsTransaction);

module.exports = transaction;
