import mongoose from "mongoose";

const batchSchema = new mongoose.Schema({
    batchName: {
        type: String,
        required: true,
    },
    centreId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CentreSchema',
    }
});

const Batch = mongoose.model("Batch", batchSchema);
export default Batch;