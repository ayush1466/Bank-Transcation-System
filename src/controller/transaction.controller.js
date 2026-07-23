const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const userModel = require("../models/user.model");
const emailserivce = require("../services/email.service");
const mongoose = require("mongoose");

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

/**
 * POST /api/transactions
 * Create a new transaction between two accounts
 * Protected route, requires authentication
 */
async function createTransaction(req, res) {
  /**
   * 1 - Validate request body
   */
  const { fromAccountId, toAccountId, amount, idempotencyKey } = req.body;

  if (
    !fromAccountId ||
    !toAccountId ||
    amount === undefined ||
    !idempotencyKey
  ) {
    return res
      .status(400)
      .json({
        message:
          "fromAccountId, toAccountId, amount, and idempotencyKey are required",
      });
  }

  if (
    !mongoose.isValidObjectId(fromAccountId) ||
    !mongoose.isValidObjectId(toAccountId)
  ) {
    return res.status(400).json({ message: "Invalid account id" });
  }

  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return res
      .status(400)
      .json({ message: "amount must be a positive number" });
  }

  const fromaccount = await accountModel.findOne({
    $or: [{ _id: fromAccountId }, { userId: fromAccountId }],
  });
  const toaccount = await accountModel.findOne({
    $or: [{ _id: toAccountId }, { userId: toAccountId }],
  });

  if (!toaccount || !fromaccount) {
    return res.status(404).json({ message: "One or both accounts not found" });
  }

  // Authorization: the caller may only send from their own account.
  if (!fromaccount.userId.equals(req.userId)) {
    return res
      .status(403)
      .json({ message: "You do not own the source account" });
  }

  // A transfer to the same account is a no-op that still writes ledger rows.
  if (fromaccount._id.equals(toaccount._id)) {
    return res
      .status(400)
      .json({ message: "Cannot transfer to the same account" });
  }

  /**
   * 2 - validate idempotency key
   */
  const isTransactionExists = await transactionModel.findOne({
    idempotencyKey,
  });

  if (isTransactionExists) {
    if (isTransactionExists.status === "COMPLETED") {
      return res
        .status(200)
        .json({
          message: "Transaction already processed",
          transaction: isTransactionExists,
        });
    }
    if (isTransactionExists.status === "PENDING") {
      return res.status(200).json({ message: "Transaction is still pending" });
    }
    if (isTransactionExists.status === "FAILED") {
      return res
        .status(200)
        .json({
          message: "Transaction has failed",
          transaction: isTransactionExists,
        });
    }
    if (isTransactionExists.status === "REVERSED") {
      return res.status(200).json({ message: "Transaction has been reversed" });
    }
  }

  /**
   * 3 - check account status
   */
  if (fromaccount.status !== "ACTIVE" || toaccount.status !== "ACTIVE") {
    return res
      .status(400)
      .json({ message: "One or both accounts are not active" });
  }

  /**
   * 4 - derive sender balance
   */
  const senderBalance = fromaccount.balance;
  if (senderBalance < parsedAmount) {
    return res
      .status(400)
      .json({
        message: `Insufficient balance. Available: ${senderBalance}, Requested: ${parsedAmount}`,
      });
  }

  /**
   * 5-9 - create transaction + ledger entries + update balances, all inside one committed session
   */
  const session = await mongoose.startSession();
  let transaction;

  try {
    await session.withTransaction(async () => {
      // Debit sender — guard with balance check to avoid race conditions
      const debitResult = await accountModel.updateOne(
        { _id: fromaccount._id, balance: { $gte: parsedAmount } },
        { $inc: { balance: -parsedAmount } },
        { session },
      );

      if (debitResult.modifiedCount !== 1) {
        const error = new Error("Insufficient balance");
        error.statusCode = 400;
        throw error;
      }

      // Credit receiver
      await accountModel.updateOne(
        { _id: toaccount._id },
        { $inc: { balance: parsedAmount } },
        { session },
      );

      // Create the transaction record
      transaction = await transactionModel
        .create(
          [
            {
              fromAccountId: fromaccount._id,
              toAccountId: toaccount._id,
              amount: parsedAmount,
              idempotencyKey,
              status: "COMPLETED",
            },
          ],
          { session, ordered: true },
        )
        .then(([t]) => t);

      // Create both ledger entries
      await ledgerModel.create(
        [
          {
            account: fromaccount._id,
            transaction: transaction._id,
            amount: parsedAmount,
            type: "DEBIT",
          },
          {
            account: toaccount._id,
            transaction: transaction._id,
            amount: parsedAmount,
            type: "CREDIT",
          },
        ],
        { session, ordered: true },
      );
    });
  } catch (error) {
    if (error && error.code === 11000) {
      const existing = await transactionModel.findOne({ idempotencyKey });
      return res
        .status(200)
        .json({
          message: "Transaction already processed",
          transaction: existing,
        });
    }
    console.error("Failed to create transaction:", error);
    return res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Unable to create transaction" });
  } finally {
    await session.endSession();
  }

  /**
   * 10 - send email notification (best-effort; must not fail the request)
   */
  try {
    const [fromUser, toUser] = await Promise.all([
      userModel.findById(fromaccount.userId).select("email name"),
      userModel.findById(toaccount.userId).select("email name"),
    ]);

    if (fromUser?.email) {
      await emailserivce.sendTransactionEmail(
        fromUser.email,
        fromUser.name,
        `You sent ${parsedAmount} to ${toUser?.name || "another account"}`,
      );
    }
  } catch (err) {
    console.error("Failed to send transaction email:", err);
  }

  return res.status(201).json({
    message: "Transaction created successfully",
    transaction,
  });
}

async function createInitialFundsTransaction(req, res) {
  const session = await mongoose.startSession();

  try {
    // `toAccountId` is the public API field. Keep `toAccountID` working for
    // clients that used the original spelling.
    const toAccountId = req.body.toAccountId || req.body.toAccountID;
    const { amount, idempotencyKey } = req.body;

    if (!toAccountId || amount === undefined || !idempotencyKey) {
      return res
        .status(400)
        .json({
          message: "toAccountId, amount, and idempotencyKey are required",
        });
    }

    if (!mongoose.isValidObjectId(toAccountId)) {
      return res.status(400).json({ message: "Invalid toAccountId" });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res
        .status(400)
        .json({ message: "amount must be a positive number" });
    }

    const existingTransaction = await transactionModel.findOne({
      idempotencyKey,
    });
    if (existingTransaction) {
      return res.status(200).json({
        message: "Initial funds transaction already processed",
        transaction: existingTransaction,
      });
    }

    let transaction;

    await session.withTransaction(async () => {
      const toAccount = await accountModel
        .findOne({
          status: "ACTIVE",
          // Compass often displays the account owner's `userId`. Accept
          // either that value or the account document's `_id`.
          $or: [{ _id: toAccountId }, { userId: toAccountId }],
        })
        .session(session);

      if (!toAccount) {
        const error = new Error("Destination account not found or inactive");
        error.statusCode = 404;
        throw error;
      }

      const fromAccount = await accountModel
        .findOne({
          userId: req.user._id,
          status: "ACTIVE",
        })
        .session(session);

      if (!fromAccount) {
        const error = new Error("Active system account not found");
        error.statusCode = 404;
        throw error;
      }

      const isSystemAccount = fromAccount._id.equals(toAccount._id);

      // A system user may seed its own account. This is an issuance of
      // initial funds, so it creates only a credit and does not debit the
      // same account first. Funding another account remains a transfer.
      if (!isSystemAccount) {
        const debitResult = await accountModel.updateOne(
          { _id: fromAccount._id, balance: { $gte: parsedAmount } },
          { $inc: { balance: -parsedAmount } },
          { session },
        );

        if (debitResult.modifiedCount !== 1) {
          const error = new Error("Insufficient system account balance");
          error.statusCode = 400;
          throw error;
        }
      }

      await accountModel.updateOne(
        { _id: toAccount._id },
        { $inc: { balance: parsedAmount } },
        { session },
      );

      transaction = await transactionModel
        .create(
          [
            {
              fromAccountId: fromAccount._id,
              toAccountId: toAccount._id,
              amount: parsedAmount,
              idempotencyKey,
              status: "COMPLETED",
            },
          ],
          { session },
        )
        .then(([createdTransaction]) => createdTransaction);

      const ledgerEntries = [
        {
          account: toAccount._id,
          transaction: transaction._id,
          amount: parsedAmount,
          type: "CREDIT",
        },
      ];

      if (!isSystemAccount) {
        ledgerEntries.unshift({
          account: fromAccount._id,
          transaction: transaction._id,
          amount: parsedAmount,
          type: "DEBIT",
        });
      }

      await ledgerModel.create(ledgerEntries, { session });
    });

    return res.status(201).json({
      message: "Initial funds transaction created successfully",
      transaction,
    });
  } catch (error) {
    if (error && error.code === 11000) {
      const transaction = await transactionModel.findOne({
        idempotencyKey: req.body.idempotencyKey,
      });
      return res.status(200).json({
        message: "Initial funds transaction already processed",
        transaction,
      });
    }

    console.error("Failed to create initial funds transaction:", error);
    return res.status(error.statusCode || 500).json({
      message: error.message || "Unable to create initial funds transaction",
    });
  } finally {
    await session.endSession();
  }
}

module.exports = {
  createTransaction,
  createInitialFundsTransaction,
};
