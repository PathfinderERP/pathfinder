import mongoose from "mongoose";

const batchSchema = new mongoose.Schema({
    batchName: {
        type: String,
        required: true,
    }
});

const Batch = mongoose.model("Batch", batchSchema);
export default Batch;