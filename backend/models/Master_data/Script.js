import mongoose from "mongoose";

const scriptSchema = new mongoose.Schema({
    scriptName: {
        type: String,
        required: true,
    }
});

const Script = mongoose.model("Script", scriptSchema);
export default Script;
