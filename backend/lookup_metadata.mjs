import mongoose from "mongoose";
import "dotenv/config";

const mongoUrl = process.env.MONGO_URL;

async function lookupMetadata() {
    try {
        await mongoose.connect(mongoUrl);
        const Centre = mongoose.model("Centre", new mongoose.Schema({}, { strict: false }), "centreschemas");
        
        const centreId = "697088baabb4820c05aecdb4";
        const centre = await Centre.findById(centreId);
        if (centre) {
            console.log("Centre Data:", JSON.stringify(centre, null, 2));
        }

        const Dept = mongoose.model("Department", new mongoose.Schema({}, { strict: false }), "departments");
        // I don't have a dept ID from the lead, but I can check common ones
        const commonDepts = await Dept.find().limit(10);
        console.log("Departments available:");
        commonDepts.forEach(d => console.log(` - ${d.departmentName} (${d._id})`));

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.connection.close();
    }
}

lookupMetadata();
