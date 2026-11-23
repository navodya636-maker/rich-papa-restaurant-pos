
const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error("MONGODB_URI is missing from backend/.env");
    }

    await mongoose.connect(uri);

    console.log("MongoDB connected successfully!");
    console.log(`MongoDB host: ${mongoose.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

