const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema(
    {
        account: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Account',
            required: true,
            index: true, // Add an index for faster queries
            immutable: true, // Prevent changes to the account field after creation
        },
        amount: {
            type: Number,
            required: true,
            immutable: true,
        },
        transaction: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Transaction',
            required: true,
            index: true, 
            immutable: true,
        },
        type: {
            type: String,
            enum: ['CREDIT', 'DEBIT'],
            required: true,
            immutable: true,
        }
    },
    {
        timestamps: true,
    }
);

    function preventLedgerModification() {
        throw new Error('Ledger entries cannot be modified or deleted');
    }

    ledgerSchema.pre('findOneAndUpdate', preventLedgerModification);
    ledgerSchema.pre('updateOne', preventLedgerModification);
    ledgerSchema.pre('deleteOne', preventLedgerModification);
    ledgerSchema.pre('remove', preventLedgerModification);
    ledgerSchema.pre('deleteMany', preventLedgerModification);
    ledgerSchema.pre('updateMany', preventLedgerModification);
    ledgerSchema.pre('findOneAndDelete', preventLedgerModification);
    ledgerSchema.pre('findOneAndReplace', preventLedgerModification);

const Ledger = mongoose.model('Ledger', ledgerSchema);
module.exports = Ledger;
