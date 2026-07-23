const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
    {
        fromAccountId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Account',
            required: true,
        },
        toAccountId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Account',
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: [0, 'Amount must be a positive number'],
        },
        status: {
            type: String,
            enum: {
                values: ['PENDING', 'COMPLETED', 'FAILED','REVERSED'],
                message: 'Status must be either PENDING, COMPLETED, FAILED, or REVERSED',
            },
            default: 'PENDING',
        },
        idempotencyKey: {
            type: String,
            required: true,
            unique: true,
        }, 
    },
    {
        timestamps: true,
    }
);

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;