import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

dotenv.config();

// Force Node.js to use Google DNS servers instead of system DNS
// ONLY if not running on Render (Render has its own DNS)
if (!process.env.RENDER) {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
}

export default async function connectDB() {
    try {
        const mongoUri = process.env.MONGO_URL;

        if (!mongoUri) {
            console.error("❌ MongoDB URI is not defined in .env file");
            console.error("Please add MONGO_URL to your .env file");
            process.exit(1);
        }

        // Connection options to handle DNS issues
        const options = {
            serverSelectionTimeoutMS: 30000, // Increase timeout to 30s
            socketTimeoutMS: 45000,
            family: 4, // Use IPv4, skip trying IPv6
        };

        // If using mongodb+srv, add DNS resolution options
        if (mongoUri.startsWith('mongodb+srv://')) {
            options.directConnection = false;
            options.retryWrites = true;
            options.w = 'majority';
            
            console.log("⚠️  Using mongodb+srv:// connection");
            console.log("   DNS Servers: 8.8.8.8, 1.1.1.1");
            console.log("   If connection fails, you may need to:");
            console.log("   1. Use mobile hotspot");
            console.log("   2. Use VPN");
            console.log("   3. Get direct connection string from MongoDB Atlas");
            console.log("   See COMPLETE_FIX_GUIDE.md for details\n");
        }

        console.log("🔄 Connecting to MongoDB...");
        await mongoose.connect(mongoUri, options);

        console.log("✅ MongoDB connected successfully");
        console.log(`📍 Connected to: ${mongoose.connection.host}`);
    } catch (error) {
        console.error("❌ Error connecting to MongoDB:", error.message);
        
        // Provide helpful error messages
        if (error.message.includes('querySrv ETIMEOUT') || error.message.includes('ENOTFOUND')) {
            console.error("\n🔧 DNS Resolution Issue Detected!");
            console.error("Your system cannot resolve MongoDB Atlas hostnames.");
            console.error("\n📋 QUICK FIXES:");
            console.error("1. ⚡ Use mobile hotspot (fastest test)");
            console.error("2. 🌐 Use VPN connection");
            console.error("3. 🔧 Get direct connection string from MongoDB Atlas");
            console.error("\n📖 See COMPLETE_FIX_GUIDE.md for detailed instructions\n");
        }
        
        console.error("Please check your MongoDB connection string in .env file");
        process.exit(1);
    }
}

