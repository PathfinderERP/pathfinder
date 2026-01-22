import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';
import Batch from "../models/Master_data/Batch.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const listBatches = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const batches = await Batch.find();
        console.log(`Found ${batches.length} batches:`);
        batches.forEach(b => console.log(`- ${b.batchName}`));
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

listBatches();
