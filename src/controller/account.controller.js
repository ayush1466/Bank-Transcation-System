const AccountModel = require('../models/account.model');

async function createAccount(req, res) {
    const userId = req.userId; // Assuming the user ID is available in the request object after authentication

    if (await AccountModel.findOne({ userId: userId })) {
        return res.status(400).json({ message: 'Account already exists for this user' });
    }

    const account = await AccountModel.create({ userId: userId });

    res.status(201).json({ message: 'Account created successfully', account:{
        id: account._id,
        status: account.status,
        currency: account.currency,
        timestamps: account.timestamps,
    } });
}

async function getUserAccounts(req, res) {

   const accounts = await AccountModel.find({ userId: req.userId });
    res.status(200).json({ accounts });
}

async function getAllAccounts(req, res) {
    const accounts = await AccountModel.find()
        .populate('userId', 'name email');

    res.status(200).json({ accounts });
}

async function getAccountBalance(req, res) {
    const { accountId: accountidentifier } = req.params;

    const account = await AccountModel.findOne({
        userId: req.userId, // Ensure the account belongs to the authenticated user
        $or: [{ _id: accountidentifier }, { userId: accountidentifier }]
    });

    if (!account) {
        return res.status(404).json({ message: 'Account not found' });
    }

    res.status(200).json({ balance: account.balance });
}


module.exports = {
    createAccount,
    getUserAccounts,
    getAllAccounts,
    getAccountBalance
};
