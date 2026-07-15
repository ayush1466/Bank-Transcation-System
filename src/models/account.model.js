const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    balance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "INACTIVE", "SUSPENDED"],
        message: "Status must be either ACTIVE, INACTIVE, or SUSPENDED",
      },
      default: "ACTIVE",
    },

    currency: {
      type: String,
      required: [true, "Currency is required"],
      default: "INR",
    },
  },
  {
    timestamps: true,
  },
);

// compound index to ensure uniqueness of userId and status combination
accountSchema.index({ userId: 1, status: 1 });

accountSchema.methods.getBalance = async function () {

  const balanceData = await ledgerModel.aggregate([
    { $match: { accountId: this._id } },
  {
    $group: {
      _id: null,
      totalDebits: { $sum: { $cond: [{ $eq: ["$type", "DEBIT"] }, "$amount", 0] } },
      totalCredits: { $sum: { $cond: [{ $eq: ["$type", "CREDIT"] }, "$amount", 0] } },
    },
  },
    {
      $project: {
        _id: 0,
        balance: { $subtract: ["$totalCredits", "$totalDebits"] },
      },
    },

  ]);

  if (balanceData.length == 0) {
    return 0;
  }
  return balanceData[0].balance;
}

const Account = mongoose.model("Account", accountSchema);
module.exports = Account;
