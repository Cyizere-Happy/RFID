const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/rfid_wallet";
  try {
    await mongoose.connect(uri);
    console.log("\x1b[32m[DB]\x1b[0m MongoDB connected");
  } catch (err) {
    console.error("\x1b[31m[DB]\x1b[0m MongoDB connection error:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
