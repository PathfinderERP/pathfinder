import mongoose from "mongoose";
import "dotenv/config";

const mongoUrl = process.env.MONGO_URL;

async function lookupDesignation() {
    try {
        await mongoose.connect(mongoUrl);
        const Designation = mongoose.model("Designation", new mongoose.Schema({}, { strict: false }), "designations");
        
        const designations = await Designation.find().limit(20);
        console.log("Designations available:");
        designations.forEach(d => console.log(` - ${d.designationName} (${d._id})`));

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.connection.close();
    }
}

lookupDesignation();
