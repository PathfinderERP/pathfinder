import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
    sessionName: {
        type: String,
        required: true,
    }
});

const Session = mongoose.model("Session", sessionSchema);
export default Session;
