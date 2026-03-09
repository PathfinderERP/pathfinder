import mongoose from "mongoose";
import "dotenv/config";

const mongoUrl = process.env.MONGO_URL;

async function lookupScriptV2() {
    try {
        await mongoose.connect(mongoUrl);
        const Script = mongoose.model("Script", new mongoose.Schema({}, { strict: false }), "scripts");
        
        const scripts = await Script.find().limit(5);
        console.log("Scripts available:");
        scripts.forEach(s => console.log(` - ${s.scriptName} (${s._id})`));

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.connection.close();
    }
}

lookupScriptV2();
