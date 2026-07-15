const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");

async function authenticateToken(req, res, next) {
  const token =
    req.cookies.token || req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access Denied: No Token Provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userModel.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "Access Denied: User not found" });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid Token" });
  }
}

async function SystemUser(req, res, next) {
  const cookieToken =
    req.cookies.token || req.headers["authorization"]?.split(" ")[1];

  if (!cookieToken) {
    return res
      .status(401)
      .json({ message: "Access Denied: No Token Provided" });
  }

  try {
    const decoded = jwt.verify(cookieToken, process.env.JWT_SECRET);

    const user = await userModel.findById(decoded.userId).select("+systemUser");

    if (!user || !user.systemUser) {
      return res
        .status(403)
        .json({ message: "Access Denied: Not a System User" });
    }

    req.user = user;
    req.userId = user._id;
    return next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid Token" });
  }
}


module.exports = {
  authenticateToken,
  SystemUser,
};
