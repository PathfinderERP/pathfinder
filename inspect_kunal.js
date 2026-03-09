import "dotenv/config";
import mongoose from "mongoose";
import User from "./backend/models/User.js";
import Centre from "./backend/models/Master_data/Centre.js";

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to DB");

        const user = await User.findOne({ email: "kunal.7043@gmail.com" }).populate("centres");
        if (!user) {
            console.log("User not found");
            return;
        }

        console.log("User found:");
        console.log("Name:", user.name);
        console.log("Role:", user.role);
        console.log("Centres Count:", user.centres.length);
        user.centres.forEach(c => {
            console.log(" - Centre Name:", c.centreName, "ID:", c._id);
        });

        // Check if there are any teachers in this centre
        if (user.centres.length > 0) {
            const centreId = user.centres[0]._id;
            const teachers = await User.find({ role: "teacher", centres: centreId });
            console.log(`Found ${teachers.length} teachers in centre ${user.centres[0].centreName}`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkUser();
