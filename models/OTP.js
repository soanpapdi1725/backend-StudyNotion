const mongoose = require("mongoose");
const mailSender = require("../utils/mailSender");
const emailtemplate = require("../mail/templates/emailVerificationTemplate")
const otpSchema = mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: { type: Date, default: Date.now(), expires: 5 * 60 * 1000 },
});

const sendVerificationEmail = async (email, otp) => {
  try {
    const mailResponse = await mailSender(
      email,
      "Verifcation Email From Study Notion",
      emailtemplate(otp),
    );
    console.log("Email Send Successfully", mailResponse);
  } catch (error) {
    console.log("Error while sending verification mail", error);
  }
}

otpSchema.pre("save", async function (next) {
  await sendVerificationEmail(this.email, this.otp);
  next();
});

module.exports = mongoose.model("OTP", otpSchema);
