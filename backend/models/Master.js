import mongoose from "mongoose";

import Batch from "./Master_data/Batch.js";
import Boards from "./Master_data/Boards.js";
import CentreSchema from "./Master_data/Centre.js";
import Class from "./Master_data/Class.js";
import Department from "./Master_data/Department.js";
import Sources from "./Master_data/Sources.js";
import ZoneSchema from "./Zone.js";


const masterSchema = new mongoose.Schema({
    batch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: Batch,
    },
    boards: {
        type: mongoose.Schema.Types.ObjectId,
        ref: Boards,
    },
    centre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: CentreSchema,
    },
    classMaster: {
        type: mongoose.Schema.Types.ObjectId,
        ref: Class,
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: Department,
    },
    sources: {
        type: mongoose.Schema.Types.ObjectId,
        ref: Sources,
    },
    zone: {
        type: mongoose.Schema.Types.ObjectId,
        ref: ZoneSchema,
    },
});


export default mongoose.model("Master", masterSchema);