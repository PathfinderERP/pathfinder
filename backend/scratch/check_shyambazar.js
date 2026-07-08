import mongoose from "mongoose";
import dotenv from "dotenv";
import CentreTarget from "../models/Sales/CentreTarget.js";
import Centre from "../models/Master_data/Centre.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const centre = await Centre.findOne({ centreName: /shyambazar/i });
        if (!centre) {
            console.log("Shyambazar centre not found!");
            await mongoose.disconnect();
            return;
        }

        const targets = await CentreTarget.find({
            centre: centre._id,
            month: "July"
        });

        console.log("\n--- All Shyambazar Targets for Month: July ---");
        targets.forEach(t => {
            console.log(`ID: ${t._id} | FY: ${t.financialYear} | Year: ${t.year} | Target: ${t.targetAmount} | AchievedExclGST: ${t.achievedAmountExclGST}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error(error);
    }
};

run();
