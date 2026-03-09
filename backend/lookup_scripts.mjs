import mongoose from "mongoose";
import "dotenv/config";

const mongoUrl = process.env.MONGO_URL;

async function lookupScript() {
    try {
        await mongoose.connect(mongoUrl);
        const Script = mongoose.model("Script", new mongoose.Schema({ name: String }, { strict: false }), "scripts");
        
        const scripts = await Script.find().limit(5);
        console.log("Scripts available:");
        scripts.forEach(s => console.log(` - ${s.name} (${s._id})`));

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.connection.close();
    }
}

lookupScript();
