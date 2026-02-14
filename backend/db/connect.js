import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async (retryCount = 0) => {
  const MAX_RETRIES = 5;
  const RETRY_DELAY = Math.min(Math.pow(2, retryCount) * 1000, 30000); // Exponential backoff up to 30s

  try {
    const mongoUri = process.env.MONGO_URL;

    if (!mongoUri) {
      console.error("❌ MongoDB URI not found in .env file");
      process.exit(1);
    }

    const options = {
      serverSelectionTimeoutMS: 30000, // Timeout after 30s (increased from 5s)
      socketTimeoutMS: 45000,         // Close sockets after 45s of inactivity
      family: 4,                      // Use IPv4, skip trying IPv6 (can help with ENOTFOUND)
      connectTimeoutMS: 30000,        // Connection timeout (increased from 10s)
    };

    mongoose.connection.on("error", (err) => {
      console.error(`❌ MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected. Attempting to reconnect...");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected successfully");
    });

    await mongoose.connect(mongoUri, options);
    console.log("✅ MongoDB connected successfully");

  } catch (error) {
    console.error(`❌ MongoDB connection attempt ${retryCount + 1} failed: ${error.message}`);

    if (retryCount < MAX_RETRIES) {
      console.log(`🔄 Retrying in ${RETRY_DELAY / 1000}s...`);
      setTimeout(() => connectDB(retryCount + 1), RETRY_DELAY);
    } else {
      console.error("❌ Max retries reached. Exiting...");
      process.exit(1);
    }
  }
};

export default connectDB;
