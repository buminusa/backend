const jwt = require("jsonwebtoken");

const generateVerificationToken = (userId) => {
    return jwt.sign(
        { userId, purpose: "verify_email" },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
    );
};

const generateResetToken = (userId, email) => {
    return jwt.sign(
        { userId, email, purpose: "reset_password" },
        process.env.JWT_SECRET,
        { expiresIn: "30m" }
    );
};

const verifyToken = (token, expectedPurpose) => {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.purpose !== expectedPurpose) {
        throw new Error("Token tidak valid untuk tujuan ini");
    }

    return decoded;
};

module.exports = {
    generateVerificationToken,
    generateResetToken,
    verifyToken
};