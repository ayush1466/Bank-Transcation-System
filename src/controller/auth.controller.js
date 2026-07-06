const jwt = require('jsonwebtoken');
const User = require('../models/user.model');


async function register(req, res) {
    try{
        const { name, email, password } = req.body;
        const user = await User.create({ name, email, password });

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.cookie('token', token)
        res.status(201).json({ message: 'User registered successfully', user: { id: user._id, name: user.name, email: user.email } });
    }
    catch (error) {
        console.log(error);
        res.status(400).json({ "error": error.message });
    }
}

module.exports = {register};