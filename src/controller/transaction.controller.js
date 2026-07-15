const transactionModel = require('../models/transaction.model');
const ledgerModel = require('../models/ledger.model');
const accountModel = require('../models/account.model');
const mongoose = require('mongoose');

/**
 * create a new transaction between two accounts
 * 1 - Validate request body
 * 2 - validate idempotency key
 * 3 - check account status
 * 4 - derive sender balance from ledger
 * 5 - create transaction (PENDING)
 * 6 - create DEBIT ledger entry for sender
 * 7 - create CREDIT ledger entry for receiver
 * 8 - mark transaction as COMPLETED
 * 9 - commit mongodb session
 * 10 - send email notification to sender and receiver
 */
async function createTransaction(req, res) {

    /**
     * 1 - Validate request body
     */
    const { fromAccountId, toAccountId, amount, idempotencyKey } = req.body;
    
    if (!fromAccountId || !toAccountId || amount === undefined || !idempotencyKey) {
        return res.status(400).json({ message: 'fromAccountId, toAccountId, amount, and idempotencyKey are required' });
    }

    const fromaccount = await accountModel.findOne({ _id: fromAccountId});
    const toaccount = await accountModel.findOne({ _id: toAccountId});

    if (!fromaccount || !toaccount) {
        return res.status(404).json({ message: 'One or both accounts not found' });
    }

    /**
     * 2 - validate idempotency key
     */
    const isTransactionExists = await transactionModel.findOne({ idempotencyKey: idempotencyKey });

    if (isTransactionExists) {
        if (isTransactionExists.status === 'COMPLETED') {
            return res.status(200).json({
                message: 'Transaction already processed',
                transaction: isTransactionExists,
            });
        }
        if (isTransactionExists.status === 'PENDING') {
            return res.status(200).json({
                message: 'Transaction is still pending',
            });
        }
        if (isTransactionExists.status === 'FAILED') {
            return res.status(200).json({
                message: 'Transaction has failed',
                transaction: isTransactionExists,
            });
        }
        if (isTransactionExists.status === 'REVERSED') {
            return res.status(200).json({
                message: 'Transaction has been reversed',
            });
        }
        
    }  

    /**
     * 3 - check account status
     */

    if (fromaccount.status !== 'ACTIVE' || toaccount.status !== 'ACTIVE') {
        return res.status(400).json({ message: 'One or both accounts are not active' });
    }

    // 4 - derive sender balance from ledger

    const senderBalance = await fromaccount.getBalance(); 

    if (senderBalance < amount) {
        return res.status(400).json({ message: `Insufficient balance. Available: ${senderBalance}, Requested: ${amount}` });
    }

    /**
     * 5 - create transaction (PENDING)
     */

    const session = await mongoose.startSession();
    session.startTransaction();

    const transaction = new transactionModel({
        fromAccountId,
        toAccountId,
        amount,
        idempotencyKey,
        status: 'PENDING',
    }, { session });

    const creditLedgerEntry = new ledgerModel({
        account: toAccountId,
        transaction: transaction._id,
        amount: amount,
        type: 'CREDIT',
    }, { session });

    transaction.save = "COMPLETED";
    await transaction.save({ session });

    /**
     * 10 - send email notification to sender and receiver
     */

    await emailserivce.sendTransactionEmail(fromaccount.userEmail, fromaccount.name, `You sent ${amount} to ${toaccount.name}`);

    return res.status(201).json({
        message: 'Transaction created successfully',
        transaction,
    });
    
}

async function createInitialFundsTransaction(req, res) {
    const session = await mongoose.startSession();


    try {
        const { toAccountID, amount, idempotencyKey } = req.body;

        if (!toAccountID || amount === undefined || !idempotencyKey) {
            return res.status(400).json({ message: 'toAccountID, amount, and idempotencyKey are required' });
        }

        if (!mongoose.isValidObjectId(toAccountID)) {
            return res.status(400).json({ message: 'Invalid toAccountID' });
        }

        const parsedAmount = Number(amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ message: 'amount must be a positive number' });
        }

        const existingTransaction = await transactionModel.findOne({ idempotencyKey });
        if (existingTransaction) {
            return res.status(200).json({
                message: 'Initial funds transaction already processed',
                transaction: existingTransaction,
            });
        }

        let transaction;

        await session.withTransaction(async () => {
            const toAccount = await accountModel.findOne({
                _id: toAccountID,
                status: 'active',
            }).session(session);

            if (!toAccount) {
                const error = new Error('To account not found or inactive');
                error.statusCode = 404;
                throw error;
            }

            const fromAccount = await accountModel.findOne({
                userId: req.user._id,
                status: 'active',
            }).session(session);

            if (!fromAccount) {
                const error = new Error('Active system account not found');
                error.statusCode = 404;
                throw error;
            }

            if (fromAccount._id.equals(toAccount._id)) {
                const error = new Error('System account and destination account must be different');
                error.statusCode = 400;
                throw error;
            }

            const debitResult = await accountModel.updateOne(
                { _id: fromAccount._id, balance: { $gte: parsedAmount } },
                { $inc: { balance: -parsedAmount } },
                { session }
            );

            if (debitResult.modifiedCount !== 1) {
                const error = new Error('Insufficient system account balance');
                error.statusCode = 400;
                throw error;
            }

            await accountModel.updateOne(
                { _id: toAccount._id },
                { $inc: { balance: parsedAmount } },
                { session }
            );

            transaction = await transactionModel.create([{
                fromAccountId: fromAccount._id,
                toAccountId: toAccount._id,
                amount: parsedAmount,
                idempotencyKey,
                status: 'completed',
            }], { session }).then(([createdTransaction]) => createdTransaction);

            await ledgerModel.create([
                {
                    account: fromAccount._id,
                    transaction: transaction._id,
                    amount: parsedAmount,
                    type: 'Debit',
                },
                {
                    account: toAccount._id,
                    transaction: transaction._id,
                    amount: parsedAmount,
                    type: 'Credit',
                },
            ], { session });
        });

        return res.status(201).json({
            message: 'Initial funds transaction created successfully',
            transaction,
        });
    } catch (error) {
        if (error && error.code === 11000) {
            const transaction = await transactionModel.findOne({ idempotencyKey: req.body.idempotencyKey });
            return res.status(200).json({
                message: 'Initial funds transaction already processed',
                transaction,
            });
        }

        console.error('Failed to create initial funds transaction:', error);
        return res.status(error.statusCode || 500).json({
            message: error.message || 'Unable to create initial funds transaction',
        });
    } finally {
        await session.endSession();
    }
}

module.exports = {
    createTransaction,
    createInitialFundsTransaction,
};
