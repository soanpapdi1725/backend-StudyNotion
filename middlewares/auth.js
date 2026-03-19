const User = require("../models/User");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// isAuthentic middleware
exports.auth = async (req, res, next) => {
  try {
    // extract token from cookie
    const token =
      req.body?.token ||
      req.cookies?.token ||
      req.header("Authorization")?.replace("Bearer ", "");

    console.log("Extracted token:", token);

    //   if token is missing return response
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token not found",
      });
    }

    //   verify if token exists
    try {
      const decode = jwt.verify(token, process.env.JWT_SECRET); // decrypting jwt token email, userId, accountType
      console.log(decode);
      req.user = decode; // decrypted value ko set kar diya
    } catch (error) {
      console.log(error);
      return res.status(401).json({
        // 401-unauthorized
        success: false,
        message: "Token is invalid",
      });
    }
    next();
  } catch (error) {
    console.log("error while authentication ", error);
    return res.status(500).json({
      success: true,
      message: "Something went Wrong while Validating Your Token",
    });
  }
};
// isStudent authorization middleware
exports.isStudent = async (req, res, next) => {
  try {
    if (req.user.accountType !== "Student") {
      return res.status(401).json({
        success: false,
        message: "This is protected route for students only",
      });
    }
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "User Role cannot be verified, please try again",
    });
  }
};

// isInstructor authorization middleware
exports.isInstructor = async (req, res, next) => {
  try {
    if (req.user.accountType !== "Instructor") {
      return res.status(401).json({
        success: false,
        message: "This is protected route for Instructor only",
      });
    }
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "User Role cannot be verified, please try again",
    });
  }
};

// isAdmin authorization middleware
exports.isAdmin = async (req, res, next) => {
  try {
    if (req.user.accountType !== "Admin") {
      return res.status(401).json({
        success: false,
        message: "This is protected route for Admin only",
      });
    }
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "User Role cannot be verified, please try again",
    });
  }
};
