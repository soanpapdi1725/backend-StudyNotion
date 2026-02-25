const accountDeletionSuccessTemplate = require("../mail/templates/AccountDeleted");
const Profile = require("../models/Profile");
const User = require("../models/User");
const {
  imageUploadToCloudinary,
  imageAndVideoDeleteFromCloudinary,
} = require("../utils/imageUploader");
const mailSender = require("../utils/mailSender");
exports.updateProfile = async (req, res) => {
  try {
    // get data from request ki body
    console.log(req.body);
    const {
      firstName,
      lastName = "",
      dateOfBirth = "",
      gender,
      contactNumber = "",
      about = "",
    } = req.body;
    // get user Id from JWT decode wali jagah se
    const userId = req.user.id;
    // user ko find karo DB se
    const userDetails = await User.findByIdAndUpdate(
      userId,
      {
        firstName: firstName,
        lastName: lastName,
      },
      { new: true }
    );
    const profileId = userDetails.additionalDetails;

    const profileDetails = await Profile.findById(profileId);
    // additional details me uske ye new wali value update kar do
    profileDetails.gender = gender;
    profileDetails.contactNumber = contactNumber;
    profileDetails.about = about;
    profileDetails.dateOfBirth = dateOfBirth;

    await profileDetails.save();
    const newUserData = await User.findById(userId)
      .populate("additionalDetails")
      .exec();
    // response return
    return res.status(200).json({
      success: true,
      message: "Profile Updated Successfully",
      data: newUserData,
    });
  } catch (error) {
    console.log("Error while updating Profile", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update Profile, Please Try Again",
    });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    // get user id from decode -> req.user.id
    const userId = req.user.id;
    // check valid user Id
    if (!userId) {
      return res.status(404).json({
        success: false,
        message: "User Not Found",
      });
    }

    const userDetails = await User.findById(userId);
    // profile delete kro pehle uss user ka
    await Profile.findByIdAndDelete({ _id: userDetails.additionalDetails });

    await User.findByIdAndDelete(userId);
    // Account deletion mail
    await mailSender(
      userDetails.email,
      "Account Deletion Confirmation Mail",
      accountDeletionSuccessTemplate(userDetails.firstName)
    );
    // Fir user ki detail bhi detail
    return res.status(200).json({
      success: true,
      message: "User Deleted successfully",
    });
  } catch (error) {
    console.log("Error in deleting Account", error);
    return res.status(500).json({
      success: true,
      message: "Failed to delete the account, Please Try again",
    });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    // userid nikal lo decode -> req.user.id
    const userId = req.user.id;
    // validate userId

    if (!userId) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    // getting details of that user
    const userDetails = await User.findById(userId)
      .populate("additionalDetails")
      .exec();

    return res.status(200).json({
      success: true,
      message: "User Details Fetched Successfully",
      data: userDetails,
    });
  } catch (error) {
    console.log("Error while fetching user details");
    return res.status(500).json({
      success: false,
      message: "Failed to get User Details, Please Try again",
    });
  }
};

exports.updateUserImage = async (req, res) => {
  try {
    // get image from request ki body
    const newUserImage = req.files.newUserImage;
    // get user id from request user ki id se
    const userId = req.user.id;
    console.log(userId);
    // upload kro cloudinary pe height and quality daal ke
    const userDetails = await User.findById(userId);
    if (!userDetails) {
      return res.status(404).json({
        success: false,
        message: "user not found",
      });
    }
    const newImage = await imageUploadToCloudinary(
      newUserImage,
      process.env.FOLDER_NAME,
      1000,
      1000,
      userDetails.imagePublicId ? userDetails.imagePublicId : null
    );
    // secure url ko save kr do
    const updatedProfile = await User.findByIdAndUpdate(
      { _id: userId },
      {
        image: newImage.secure_url,
        imagePublicId: newImage.public_id,
      },
      {
        new: true,
      }
    )
      .populate("additionalDetails")
      .exec();
    // return response

    return res.status(200).json({
      success: true,
      message: "Image Updated Successfully",
      data: updatedProfile,
    });
  } catch (error) {
    console.log("Error while updating new Image to user Profile", error);
    return res.status(500).json({
      success: false,
      message: "Failed to Update profile Image, Please Try again",
    });
  }
};

exports.getEnrolledCourses = async (req, res) => {
  try {
    // userId from request me user ki id se
    const userId = req.user.id;
    // user ki details nikal lenge findById se and populate bhi kar denge
    const userDetails = await User.findById(userId).populate(
      "coursesCreatedOrEnroll"
    );
    // validate kr lenge ki user mila ki nahi
    if (!userDetails) {
      return res.status(404).json({
        success: false,
        message: "User Details not found",
      });
    }
    // mil gya toh response bhej denge enrolled courses ka
    return res.status(200).json({
      success: true,
      message: "Enrolled courses Fetched successfully",
      data: userDetails.coursesCreatedOrEnroll,
    });
  } catch (error) {
    console.log("Error while getting Enrolled Courses", error);
    return res.status(500).json({
      success: false,
      message:
        "Failed to get Enrolled courses of the student, Please Try Again",
    });
  }
};

exports.onImageRemove = async (req, res) => {
  try {
    // User ki id nikalenge jo bhi JWT se set kri hai hamne or usko decode kra hai
    const userId = req.user.id;
    // user nikalenge database me se
    const { firstName, lastName, imagePublicId } = await User.findById(userId);
    // cloudinary pe uski image remove kr denge
    const imageDeleted = await imageAndVideoDeleteFromCloudinary(imagePublicId);
    console.log(imageDeleted);
    // user ke naam se dicebear ki image daal denge
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        image: `https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`,
        imagePublicId: null,
      },
      { new: true }
    )
      .populate("additionalDetails")
      .exec();
    // response return kr denge
    return res.status(200).json({
      success: true,
      message: "User Image removed successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.log("Error while deleting image of user", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove the image",
    });
  }
};
