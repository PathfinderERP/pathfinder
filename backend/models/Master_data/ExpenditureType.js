import mongoose from "mongoose";

const expenditureTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    }
}, { timestamps: true });

const ExpenditureType = mongoose.model("ExpenditureType", expenditureTypeSchema);
export default ExpenditureType;
