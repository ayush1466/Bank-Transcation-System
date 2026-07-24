require('dotenv').config();
const nodemailer = require('nodemailer');
const dns = require('dns').promises;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Error connecting to email server:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

/**
 * Check whether an email address is plausibly deliverable BEFORE we send to it.
 *
 * This does two things:
 *  1. Validates the syntax.
 *  2. Confirms the domain actually has mail servers (MX records) — this is what
 *     rejects fake/typo domains like "test.com" that can't receive mail at all.
 *
 * Limitation: a valid MX only proves the *domain* accepts mail, not that the
 * specific mailbox exists (e.g. a random name @gmail.com passes here and only
 * bounces later). Full mailbox verification needs a paid verification service.
 *
 * @returns {Promise<{ valid: boolean, reason?: string }>}
 */
async function verifyEmailDeliverable(email) {
  const value = String(email || '').trim().toLowerCase();

  const syntax = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!syntax.test(value)) {
    return { valid: false, reason: 'Please enter a valid email address' };
  }

  const domain = value.split('@')[1];

  try {
    const mx = await dns.resolveMx(domain);
    const usable = (mx || []).filter((r) => r.exchange);
    if (usable.length === 0) {
      return {
        valid: false,
        reason: "This email domain isn't set up to receive mail",
      };
    }
    return { valid: true };
  } catch (error) {
    // ENOTFOUND / ENODATA => the domain doesn't exist or has no MX records.
    if (error && (error.code === 'ENOTFOUND' || error.code === 'ENODATA')) {
      return {
        valid: false,
        reason: "This email address doesn't look real — its domain can't receive mail",
      };
    }
    // A transient DNS failure shouldn't hard-block sign-up: allow it through
    // and let the actual send be the source of truth.
    console.error('MX lookup failed for', domain, error.code || error.message);
    return { valid: true };
  }
}

// Function to send email. `throwOnError` lets callers (e.g. OTP delivery) treat
// a failed send as a real error instead of silently reporting success.
const sendEmail = async (to, subject, text, html, { throwOnError = false } = {}) => {
  try {
    const info = await transporter.sendMail({
      from: `"Backend Ledger" <${process.env.EMAIL_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Error sending email:', error);
    if (throwOnError) throw error;
  }
};

async function sendRegistrationEmail(userEmail, name) {
    const subject = 'Welcome to Backend Ledger!';
    const text = `Hello ${name},\n\nThank you for registering with Backend Ledger. We're excited to have you on board!\n\nBest regards,\nThe Backend Ledger Team`;
    const html = `<p>Hello ${name},</p><p>Thank you for registering with Backend Ledger. We're excited to have you on board!</p><p>Best regards,<br>The Backend Ledger Team</p>`;

    await sendEmail(userEmail, subject, text, html);
}

async function sendTransactionEmail(userEmail, name, transactionDetails) {
    const subject = 'Transaction Notification';
    const text = `Hello ${name},\n\nA transaction has been made on your account:\n\n${transactionDetails}\n\nBest regards,\nThe Backend Ledger Team`;
    const html = `<p>Hello ${name},</p><p>A transaction has been made on your account:</p><p>${transactionDetails}</p><p>Best regards,<br>The Backend Ledger Team</p>`;

    await sendEmail(userEmail, subject, text, html);
}


async function sendTransactionFailureEmail(userEmail, name, transactionDetails) {
    const subject = 'Transaction Failure Notification';
    const text = `Hello ${name},\n\nWe regret to inform you that a transaction on your account has failed:\n\n${transactionDetails}\n\nPlease contact support for further assistance.\n\nBest regards,\nThe Backend Ledger Team`;
    const html = `<p>Hello ${name},</p><p>We regret to inform you that a transaction on your account has failed:</p><p>${transactionDetails}</p><p>Please contact support for further assistance.</p><p>Best regards,<br>The Backend Ledger Team</p>`;

    await sendEmail(userEmail, subject, text, html);
}

async function sendOtpEmail(userEmail, name, code, purposeLabel, ttlMinutes) {
    const subject = 'Your verification code';
    const text = `Hello ${name || 'there'},\n\nUse this code to ${purposeLabel}:\n\n${code}\n\nThis code expires in ${ttlMinutes} minutes. If you didn't request it, you can safely ignore this email.\n\nBest regards,\nThe Backend Ledger Team`;
    const html = `
      <div style="font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto;">
        <p>Hello ${name || 'there'},</p>
        <p>Use this code to <strong>${purposeLabel}</strong>:</p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 24px 0; text-align: center; color: #1e50e0;">${code}</p>
        <p style="color: #666;">This code expires in ${ttlMinutes} minutes. If you didn't request it, you can safely ignore this email.</p>
        <p>Best regards,<br>The Backend Ledger Team</p>
      </div>`;

    // OTP delivery must be reliable — surface a failed send to the caller
    // rather than pretending the code was sent.
    await sendEmail(userEmail, subject, text, html, { throwOnError: true });
}

module.exports = { sendEmail, sendRegistrationEmail, sendTransactionEmail, sendTransactionFailureEmail, sendOtpEmail, verifyEmailDeliverable };