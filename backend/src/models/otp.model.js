const mongoose = require("mongoose");

/**
 * A short-lived one-time passcode used for email-based 2FA.
 * One active code per (email, purpose): re-requesting replaces the old one.
 *
 * `context` carries the pending payload the code authorises — e.g. the
 * registration details for REGISTER, or the transfer amount/recipient for
 * TRANSFER — so the code can be bound to the exact action it approves.
 */
const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: ["REGISTER", "CREATE_ACCOUNT", "TRANSFER"],
      required: true,
    },
    // We store only a hash of the code, never the code itself.
    codeHash: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    context: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

// Only one live code per email+purpose.
otpSchema.index({ email: 1, purpose: 1 }, { unique: true });

// TTL index: MongoDB removes the document once expiresAt passes.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Otp = mongoose.model("Otp", otpSchema);
module.exports = Otp;
