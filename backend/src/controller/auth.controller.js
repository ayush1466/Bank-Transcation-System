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
        res.status(201).json({ message: 'User registered successfully', user: { id: user._id, name: user.name, email: user.email, systemUser: user.systemUser, hasTransferPassword: false } });

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

        const user = await User.findOne({email}).select('+password +systemUser +transferPassword'); // Include password + systemUser + transferPassword in the query result
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.cookie('token', token, { httpOnly: true });

        res.status(200).json({ message: 'Login successful', user: { id: user._id, name: user.name, email: user.email, systemUser: user.systemUser, hasTransferPassword: !!user.transferPassword } });
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

/**
 * GET /api/auth/me
 * Return the signed-in user's profile, including whether a transfer password
 * has been set. Lets the frontend decide whether to prompt the user to set one.
 * Protected route, requires authentication.
 */
async function me(req, res) {
    try {
        const user = await User.findById(req.userId).select('+systemUser +transferPassword');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                systemUser: user.systemUser,
                hasTransferPassword: !!user.transferPassword,
            },
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({ error: error.message });
    }
}

/**
 * POST /api/auth/transfer-password
 * Set or change the transfer password used to authorise money transfers.
 * Re-authenticates with the account (login) password before changing it.
 * Protected route, requires authentication.
 */
async function setTransferPassword(req, res) {
    try {
        const { currentPassword, transferPassword } = req.body;

        if (!currentPassword || !transferPassword) {
            return res
                .status(400)
                .json({ message: 'currentPassword and transferPassword are required' });
        }

        if (String(transferPassword).length < 4) {
            return res
                .status(400)
                .json({ message: 'Transfer password must be at least 4 characters long' });
        }

        const user = await User.findById(req.userId).select('+password +transferPassword');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Re-check the account password so a hijacked session can't silently
        // set/change the transfer password.
        const ok = await user.comparePassword(currentPassword);
        if (!ok) {
            return res.status(401).json({ message: 'Your account password is incorrect' });
        }

        // Don't let the transfer password be the same as the login password.
        if (currentPassword === transferPassword) {
            return res.status(400).json({
                message: 'Transfer password must be different from your account password',
            });
        }

        user.transferPassword = transferPassword; // hashed by the pre-save hook
        await user.save();

        res.status(200).json({ message: 'Transfer password saved successfully' });
    } catch (error) {
        console.log(error);
        res.status(400).json({ error: error.message });
    }
}

module.exports = { requestRegisterOtp, verifyRegisterOtp, login, logout, me, setTransferPassword };