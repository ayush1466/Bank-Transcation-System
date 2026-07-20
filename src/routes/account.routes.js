const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const accountController = require('../controller/account.controller');

const router = express.Router();


/**
 * - Routes POST /api/accounts/
 * - Create a new account for the authenticated user
 * - Protected route, requires authentication
 */

router.post('/', authMiddleware.authenticateToken, accountController.createAccount);

// - Routes GET /api/accounts/
// - Get every account in the database

router.get('/', authMiddleware.authenticateToken, accountController.getAllAccounts);

// System-only alias for clients that explicitly require a privileged endpoint.
router.get('/all', authMiddleware.SystemUser, accountController.getAllAccounts);

/**
 * - Routes GET /api/accounts/balance/:accountId
 * - Get the balance of a specific account for the authenticated user
 * - Protected route, requires authentication
 */
router.get('/balance/:accountId', authMiddleware.authenticateToken, accountController.getAccountBalance);



module.exports = router;
