const User = require("../models/User");
const mailsender = require("../utils/mailSender");
const crypto = require("crypto");
const bcryptjs = require("bcryptjs");
const resetPasswordTemplate = require("../mail/templates/resetPassLink");
const { passwordResetMail } = require("../mail/templates/PasswordResetMail");
// Reset Password Token Controller
exports.resetPassToken = async (req, res) => {
  try {
    // user entered his email to get reset pass link
    // fetch email from req ki body
    const { email } = req.body;
    // check user email correct and not empty
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email field is not filled by user to Proceed",
      });
    }

    // check user exist or not in User collection
    const checkUserExist = await User.findOne({ email });
    if (!checkUserExist) {
      return res.json({
        success: false,
        message: "This Email is not registered with us",
      });
    }
    if (checkUserExist.authProvider !== "local") {
      return res.status(401).json({
        success: false,
        message:
          "This id is registered with Google cannot be used for resetting password",
      });
    }
    // generate token
    const token = crypto.randomUUID();
    // update particular User's database with key token and resetPassExpiration
    const updatedUserObj = await User.findOneAndUpdate(
      { email }, // filter on this basis
      {
        resetToken: token, //update
        resetPassExpiration: Date.now() + 15 * 60 * 1000, //update
      },
      { new: true } //return updatedDocument
    );
    const frontendPORT = 3000;
    const resetUrl = `${process.env.FRONTEND_URL || `http://localhost:${frontendPORT}`}/update-password?token=${token}`;
    // mail send kar do unique link ke saath
    await mailsender(
      email,
      "Password reset Link - StudyNotion",
      resetPasswordTemplate(resetUrl)
    );
    // response send kr do uske baad
    return res.status(200).json({
      success: true,
      message: "Reset Password link successfully sent, Please check email",
    });
  } catch (error) {
    console.log("Error while sending Reset password link", error);
    return res.status(500).json({
      success: false,
      message: "Something went Wrong while sending reset password mail",
    });
  }
};

// Reset Password Controller

exports.resetPassword = async (req, res) => {
  try {
    //data fetch karunga pass, confirm pass, token
    //token body se ayega kyuki ham frontend se utha ke body me dalenge
    const { password, confirmPassword, token } = req.body;
    //validation karenge password khali na ho
    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Check Password and Confirm Password field are filled",
      });
    }
    // validation for pass & confirm pass same ho
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and Confirm Password are not matching",
      });
    }

    // token se user ko Dhundenge kyuki ham pe kuch ni hai or update bhi toh krna hai
    const user = await User.findOne({ resetToken: token });

    //   user exist karta hai nahi database me wo bhi pata karenge
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Token for reset password is invalid",
      });
    }
    // expiry check krenge token ki
    // resetPassExpiration ka kam hona chahiye abhi ke time se to make it false

    if (user.resetPassExpiration < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Reset Password Link is Expired",
      });
    }
    // hash karenge new password
    const hashedPassword = await bcryptjs.hash(password, 12);

    // update krenge new password
    await User.findOneAndUpdate(
      { resetToken: token },
      {
        password: hashedPassword,
        resetToken: null,
        resetPassExpiration: null,
      },
      { new: true }
    );
    await mailsender(
      user.email,
      "Password Changed Confirmation",
      passwordResetMail(user.email, user.firstName)
    );
    // response bhej denge
    return res.status(200).json({
      success: true,
      message: "Password Reset Successful",
      email: user.email,
    });
  } catch (error) {
    console.log("Error while changing password", error);
    return res.status(500).json({
      success: false,
      message: "Your Password hasn't changed, Please Try Again...",
    });
  }
};
