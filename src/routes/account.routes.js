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


module.exports = router;