import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Centre from "./models/Master_data/Centre.js";
import Boards from "./models/Master_data/Boards.js";

async function checkMasterData() {
    try {
        const uri = process.env.MONGO_URL;
        console.log("Connecting to Mongo URI:", uri ? uri.substring(0, 30) + "..." : "undefined");
        await mongoose.connect(uri);
        console.log("Connected to Mongo");

        const centres = await Centre.find({}, "centreName status");
        console.log("--- CENTRES (" + centres.length + ") ---");
        console.log(JSON.stringify(centres.map(c => c.centreName).sort(), null, 2));

        const boards = await Boards.find({}, "boardCourse name");
        console.log("--- BOARDS (" + boards.length + ") ---");
        console.log(JSON.stringify(boards, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkMasterData();
