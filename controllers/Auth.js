const User = require("../models/User");
const Profile = require("../models/Profile");
const OTP = require("../models/OTP");
const otpGenerator = require("otp-generator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mailSender = require("../utils/mailSender");
const accountCreationSuccessTemplate = require("../mail/templates/AccountCreatedSuccessfully");
require("dotenv").config();
// OTP send Controller
exports.sendOTP = async (req, res) => {
  try {
    // user ki email fetch kari
    const { email } = req.body;
    // checking user exists in DB or not in User collection
    const checkUserExist = await User.findOne({ email });

    // if user exists
    if (checkUserExist) {
      return res.status(401).json({
        success: false,
        message: "User Already Exists",
      });
    }

    // if user does not exist then do this

    //Creating a otp
    let otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
    });
    // checking OTP exist in OTP collection or not if not result = undefined
    let result = await OTP.findOne({ email: email, otp: otp });
    while (result) {
      // if otp exist result will be something means true
      //again creating new otp for uniqueness
      otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        specialChars: false,
        lowerCaseAlphabets: false,
      });
      //   then again checking new otp exist or not until it be unique
      result = await OTP.findOne({email: email, otp: otp });
    }

    // when unique otp is created saving them in database
    const otpPayload = { email, otp };

    // create and save both works the same but save requires a instance of mongoose model
    const otpBody = await OTP.create(otpPayload);

    console.log("OTP created and body: ", otpBody);

    // response is sending after generation of OTP
    res.status(200).json({
      success: true,
      message: "OTP sent Successfully to DB",
    });
  } catch (error) {
    console.log("error while generating otp: ", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Signup Controller
exports.postSignUp = async (req, res) => {
  try {
    // fetch karunga request ki body
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      otp,
      contactNumber,
      accountType,
    } = req.body;
    // fields ko validate krunga ki empty toh nahi aayi
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !confirmPassword ||
      !otp
    ) {
      return res.json(400).json({
        success: false,
        message: "All fields are not filled by the User",
      });
    }
    // user already exist krta hai ya nahi
    const checkUserExist = await User.findOne({ email });
    if (checkUserExist) {
      return res.status(400).json({
        success: false,
        message: "User already Exists",
      });
    }
    // user ka password confirm password same hai ya nahi
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and Confirm password does not match",
      });
    }
    // recent OTP stored for same User based on email ko retrieve krenge
    const OTPs = await OTP.find({ email }).sort({ createAt: -1 }).limit(1);
    //newestOTP will be array of OTP
    if (OTPs.length == 0) {
      // NO recent OTP
      return res.status(400).json({
        success: false,
        message: "OTP not Found",
      });
    } else if (OTPs[0].otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP entered",
      });
    }

    //   hashing password
    const hashedPassword = await bcrypt.hash(password, 12);
    // saving user info data to DB
    const profileDetails = await Profile.create({
      contactNumber: contactNumber,
      gender: null,
      dateOfBirth: null,
      about: null,
    });
    const user = await User.create({
      firstName,
      lastName,
      password: hashedPassword,
      email,
      accountType,
      additionalDetails: profileDetails._id,
      image: `https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`,
      authProvider: "local",
    });

    // sending email to user that his account is created
    await mailSender(
      email,
      "Account Successfully Created",
      accountCreationSuccessTemplate(firstName, accountType)
    );
    // response bhej denge JSON wala
    return res.status(200).json({
      success: true,
      message: "User is registered successfully",
      data: user,
    });
  } catch (error) {
    console.log("error while saving user in Database", error);
    return res.status(500).json({
      success: false,
      message: "User cannot be registered. please try again later...",
    });
  }
};

// Login Controller

exports.postLogin = async (req, res) => {
  try {
    // data lao fetch karke request ki body se
    const { email, password } = req.body;
    // validate karo empty toh nahi ya undefined toh nahi if yes send 400 and send json
    if (!email || !password) {
      return res.status(403).json({
        success: false,
        message: "All fields are required to login",
      });
    }
    // user email se check kro exist karta hai ya nahi database me
    const checkUserExist = await User.findOne({ email }).populate(
      "additionalDetails"
    );
    if (!checkUserExist) {
      return res.status(401).json({
        success: false,
        message: "User does not exist.. Please SignUp first",
      });
    }

    // generate JWT token after checking password with hashedPassword in database

    if (await bcrypt.compare(password, checkUserExist.password)) {
      const payload = {
        email: checkUserExist.email,
        accountType: checkUserExist.accountType,
        id: checkUserExist._id,
      };
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        //payload me jo bhi value dunga toh wo encrypt ho jayegi or verify karne pr decrypt hogi
        expiresIn: "2h",
      });
      checkUserExist.token = token;
      checkUserExist.password = undefined;
      // create cookie and send response
      const options = {
        expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        httpOnly: true,
      };
      res.cookie("token", token, options).status(200).json({
        user: checkUserExist,
        token: token,
        success: true,
        message: "user Logged In Successfully",
      });
    } else {
      return res.status(401).json({
        success: false,
        message: "Password is incorrect",
      });
    }
  } catch (error) {
    console.log("Internal Error while login in", error);
    return res.status(500).json({
      success: false,
      message: "Login Failure, Please Try Again...",
    });
  }
};

// Change password - Controller

exports.postChangePass = async (req, res) => {
  // get data from user
  const userId = req.user.id;
  // fetch old pass, new pass, and confirm pass
  const { currentPassword, newPassword, confirmPassword } = req.body;
  // check all are not empty
  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "All Fields are required",
    });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "New password is not matching with current password",
    });
  }
  const user = await User.findById(userId);
  // check old password are correct or not using compare of bcryptjs
  if (!(await bcrypt.compare(currentPassword, user.password))) {
    return res.status(403).json({
      success: false,
      message: "Old password is not matching to change it to new password",
    });
  }
  // update password
  const newHashedPassword = await bcrypt.hash(newPassword, 12);
  user.password = newHashedPassword;
  await user.save();
  // then send response
  return res.status(200).json({
    success: true,
    message: "Password Changed Successfully",
  });
};
