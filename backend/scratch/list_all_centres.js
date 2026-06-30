import mongoose from "mongoose";
import dotenv from "dotenv";
import Centre from "../models/Master_data/Centre.js";

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const centres = await Centre.find({}).select("centreName").lean();
        console.log("All Centres:");
        console.log(centres.map(c => ({ id: c._id, name: c.centreName })));

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

run();
