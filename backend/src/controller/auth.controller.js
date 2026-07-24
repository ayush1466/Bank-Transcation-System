const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const emailservice = require('../services/email.service');
const otpservice = require('../services/otp.service');

/**
 * POST /api/auth/register/request-otp
 * Step 1 of registration: validate the details and email a 6-digit code.
 * The account is NOT created yet — the pending details are stored (with the
 * password already hashed) against the OTP until the code is verified.
 */
async function requestRegisterOtp(req, res) {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'name, email and password are required' });
        }
        if (String(password).length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email address already exists' });
        }

        // Reject addresses whose domain can't receive mail (fake/typo domains)
        // before we bother generating and "sending" a code.
        const deliverable = await emailservice.verifyEmailDeliverable(email);
        if (!deliverable.valid) {
            return res.status(400).json({ message: deliverable.reason });
        }

        // Hash the password now so we never store it in plain text.
        const passwordHash = await bcrypt.hash(password, 10);

        await otpservice.generateAndSend({
            email,
            name,
            purpose: 'REGISTER',
            context: { name, email: String(email).toLowerCase(), passwordHash },
        });

        res.status(200).json({ message: `Verification code sent to ${email}` });
    }
    catch (error) {
        console.log(error);
        res.status(400).json({ error: error.message });
    }
}

/**
 * POST /api/auth/register/verify
 * Step 2 of registration: verify the emailed code, then create the user.
 */
async function verifyRegisterOtp(req, res) {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ message: 'email and code are required' });
        }

        const result = await otpservice.verify({ email, purpose: 'REGISTER', code });
        if (!result.ok) {
            return res.status(400).json({ message: result.message });
        }

        const { name, passwordHash } = result.context;

        // Guard against the email having been registered in the meantime.
        const existingUser = await User.findOne({ email: String(email).toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: 'Email address already exists' });
        }

        const user = new User({ name, email: String(email).toLowerCase() });
        user.password = passwordHash;
        user.$locals.skipPasswordHash = true; // already hashed above
        await user.save();

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.cookie('token', token, { httpOnly: true });
        res.status(201).json({ message: 'User registered successfully', user: { id: user._id, name: user.name, email: user.email, systemUser: user.systemUser } });

        // Send welcome email (best-effort).
        await emailservice.sendRegistrationEmail(user.email, user.name);
    }
    catch (error) {
        console.log(error);
        res.status(400).json({ error: error.message });
    }
}

async function login(req, res) {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({email}).select('+password +systemUser'); // Include password + systemUser in the query result
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.cookie('token', token, { httpOnly: true });

        res.status(200).json({ message: 'Login successful', user: { id: user._id, name: user.name, email: user.email, systemUser: user.systemUser } });
    }
    catch (error) {
        console.log(error);
        res.status(400).json({ "error": error.message });
    }
}

async function logout(req, res) {
    res.clearCookie('token');
    res.status(200).json({ message: 'Logout successful' });
}

module.exports = { requestRegisterOtp, verifyRegisterOtp, login, logout };