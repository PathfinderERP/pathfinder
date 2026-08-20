import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        status: {
            type: String,
            enum: ["Active", "Deactive", "Inactive"],
            default: "Active"
        }
    }, { timestamps: true }
);

export default mongoose.model("Category", categorySchema);