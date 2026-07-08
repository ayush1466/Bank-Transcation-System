const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const emailservice = require('../services/email.service');

async function register(req, res) {
    try{
        const { name, email, password } = req.body;

        const existingUser = await User.findOne({ email});
        if (existingUser) {
            return res.status(400).json({ message: 'Email address already exists' });
        }

        const user = await User.create({ name, email, password });

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.cookie('token', token)
        res.status(201).json({ message: 'User registered successfully', user: { id: user._id, name: user.name, email: user.email } });

        // Send registration email
        await emailservice.sendRegistrationEmail(user.email, user.name);
    }
    catch (error) {
        console.log(error);
        res.status(400).json({ "error": error.message });
    }
}

async function login(req, res) {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({email}).select('+password'); // Include password field in the query result
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.cookie('token', token, { httpOnly: true });

        res.status(200).json({ message: 'Login successful', user: { id: user._id, name: user.name, email: user.email } });
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

module.exports = {register, login, logout};