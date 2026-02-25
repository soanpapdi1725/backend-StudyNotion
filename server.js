const express = require("express");
const app = express();

const courseRouter = require("./routes/courseRouter");
const authAndResetRouter = require("./routes/AuthAndResetRouter");
const paymentRouter = require("./routes/paymentRouter");
const profileRouter = require("./routes/profileRouter");

const database = require("./config/database");
const { cloudinaryConnect } = require("./config/cloudinary");

const cookieParser = require("cookie-parser");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const contactUsRouter = require("./routes/ContactUsRoute");
require("dotenv").config();

const PORT = process.env.PORT || 4000;

// database connect
database.connect();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "studynotion-2517-ef48b.firebaseapp.com",
      "studynotion-2517-ef48b.web.app",
      "https://studynotion-react-frontend.vercel.app/"
    ],
    credentials: true,
  })
);

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);
// cloudinary connect call
cloudinaryConnect();

//routes
app.use((req, res, next) => {
  console.log(req.url, req.method);
  next();
});
app.use("/api/v1/auth", authAndResetRouter);
app.use("/api/v1/profile", profileRouter);
app.use("/api/v1/course", courseRouter);
app.use("/api/v1/payment", paymentRouter);
app.use("/api/v1", contactUsRouter);

app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "Your server is up and running",
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
