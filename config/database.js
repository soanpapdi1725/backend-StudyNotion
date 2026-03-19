const mongoose = require("mongoose");
require("dotenv").config();

exports.connect = async () => {
  try {
    mongoose.connect(process.env.MONGODB_URL);
    console.log("MongoDB is connected");
  } catch (error) {
    console.log("MongoDb is not Connected");
    console.log("Reason for MongoDb not connected: ", error);
    process.exit(1);
  }
};
