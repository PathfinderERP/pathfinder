import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function run() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB.");

        const Class = mongoose.model("Class", new mongoose.Schema({ className: String }));
        const classes = await Class.find({});
        console.log("Available classes:");
        classes.forEach(c => console.log(`- ID: ${c._id}, Name: ${c.className}`));

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
