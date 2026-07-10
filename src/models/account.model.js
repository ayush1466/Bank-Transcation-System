const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        status: {
            type: String,
            enum: {
                values: ['active', 'inactive', 'suspended'],
                message: 'Status must be either active, inactive, or suspended',
            },
            default: 'active',
        },

        currency: {
            type: String,
            required: [true, 'Currency is required'],
            default: 'INR',
        }
    },
    {
        timestamps: true
    }
);

// compound index to ensure uniqueness of userId and status combination
accountSchema.index({ userId: 1, status: 1 });

const Account = mongoose.model('Account', accountSchema);
module.exports = Account;