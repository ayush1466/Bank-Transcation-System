const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const otpModel = require("../models/otp.model");
const emailservice = require("./email.service");

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

// Human-friendly labels used in the email body.
const PURPOSE_LABEL = {
  REGISTER: "complete your registration",
  CREATE_ACCOUNT: "open a new bank account",
  TRANSFER: "confirm your money transfer",
};

function generateCode() {
  // A 6-digit code, zero-padded (100000–999999 range is fine, but pad to be safe).
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * Create a fresh OTP for (email, purpose), email it, and store only its hash.
 * Any existing code for the same email+purpose is replaced.
 *
 * @param {object} args
 * @param {string} args.email    - recipient email
 * @param {string} args.name     - recipient name (for the email greeting)
 * @param {string} args.purpose  - REGISTER | CREATE_ACCOUNT | TRANSFER
 * @param {object} [args.context]- pending payload bound to this code
 */
async function generateAndSend({ email, name, purpose, context = {} }) {
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  // Send first: if delivery fails we don't want a live code the user can never
  // receive. sendOtpEmail throws on a failed send.
  await emailservice.sendOtpEmail(
    email,
    name,
    code,
    PURPOSE_LABEL[purpose] || "verify this action",
    OTP_TTL_MINUTES,
  );

  await otpModel.findOneAndUpdate(
    { email: email.toLowerCase(), purpose },
    { codeHash, context, attempts: 0, expiresAt },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

/**
 * Verify a submitted code for (email, purpose). On success the code is
 * consumed (deleted) and its stored context is returned.
 *
 * @returns {Promise<{ ok: boolean, message?: string, context?: object }>}
 */
async function verify({ email, purpose, code }) {
  if (!code || !/^\d{6}$/.test(String(code))) {
    return { ok: false, message: "Enter the 6-digit code we emailed you" };
  }

  const record = await otpModel.findOne({
    email: email.toLowerCase(),
    purpose,
  });

  if (!record) {
    return { ok: false, message: "No active code — please request a new one" };
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await otpModel.deleteOne({ _id: record._id });
    return { ok: false, message: "Code expired — please request a new one" };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await otpModel.deleteOne({ _id: record._id });
    return {
      ok: false,
      message: "Too many incorrect attempts — please request a new code",
    };
  }

  const matches = await bcrypt.compare(String(code), record.codeHash);
  if (!matches) {
    await otpModel.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
    const left = MAX_ATTEMPTS - (record.attempts + 1);
    return {
      ok: false,
      message:
        left > 0
          ? `Incorrect code — ${left} attempt${left === 1 ? "" : "s"} left`
          : "Too many incorrect attempts — please request a new code",
    };
  }

  const context = record.context || {};
  await otpModel.deleteOne({ _id: record._id });
  return { ok: true, context };
}

module.exports = { generateAndSend, verify, OTP_TTL_MINUTES };
