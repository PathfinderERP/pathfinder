import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            unique: true
        },
        code: {
            type: String,
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        defaultType: {
            type: String,
            enum: ["Free", "Paid"],
            default: "Free"
        },
        defaultPrice: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: ["Active", "Deactive", "Inactive"],
            default: "Active"
        }
    },
    { timestamps: true }
);

export default mongoose.model("InventoryMaster", inventorySchema);
