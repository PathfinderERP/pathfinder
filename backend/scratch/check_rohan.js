import mongoose from "mongoose";
import "dotenv/config";
import User from "../models/User.js";
import connectDB from "../db/connect.js";

const checkRohan = async () => {
    await connectDB();
    try {
        const user = await User.findOne({ email: "rohan1@pathfinder.edu.in" });
        console.log("Rohan's User Record:");
        console.log(JSON.stringify(user, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.connection.close();
    }
};

checkRohan();
