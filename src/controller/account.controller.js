const AccountModel = require('../models/account.model');

async function createAccount(req, res) {
    const userId = req.userId; // Assuming the user ID is available in the request object after authentication

    const account = await AccountModel.create({ userId: userId });

    res.status(201).json({ message: 'Account created successfully', account:{
         id: account._id,
        status: account.status,
        currency: account.currency,
        timestamps: account.timestamps
    } });
}

module.exports = {
    createAccount,
};