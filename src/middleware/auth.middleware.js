const userModel = require('../models/user.model');
const jwt = require('jsonwebtoken');

async function authenticateToken(req, res, next) {

    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access Denied: No Token Provided' });
    }

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const userId = await userModel.findById(decoded.userId);
        req.userId = userId; // Attach user to request object
        next();

    }catch(err){
        return res.status(403).json({ message: 'Invalid Token' });
    }
}

module.exports = {
    authenticateToken,
};
