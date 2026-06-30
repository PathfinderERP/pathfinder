import mongoose from "mongoose";
import dotenv from "dotenv";
import LeadManagement from "../models/LeadManagement.js";
import User from "../models/User.js";
import CentreSchema from "../models/Master_data/Centre.js";

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const kunal = await User.findOne({ name: "Kunal Ganguly" }).populate('centres');
        console.log("Kunal Ganguly ID:", kunal._id);
        const userCentreIds = kunal.centres.map(c => c._id);
        console.log("Kunal's centres:", userCentreIds);

        // Find leads in Kunal's centres
        const leadsInCentre = await LeadManagement.find({ centre: { $in: userCentreIds } }).lean();
        console.log(`Total leads in Kunal's centres: ${leadsInCentre.length}`);

        // How many walk-ins in Kunal's centres?
        const walkins = leadsInCentre.filter(l => l.isWalkIn || (l.source && /^walk[- ]?in$/i.test(l.source)));
        console.log(`Walkins in Kunal's centres: ${walkins.length}`);
        console.log(walkins.map(w => ({
            _id: w._id,
            name: w.name,
            leadResponsibility: w.leadResponsibility,
            createdBy: w.createdBy,
            isWalkIn: w.isWalkIn,
            source: w.source,
            isCounseled: w.isCounseled
        })));

        // How many leads are assigned to Kunal Ganguly or created by him?
        const assignedOrCreated = leadsInCentre.filter(l => 
            l.leadResponsibility === "Kunal Ganguly" || 
            (l.createdBy && l.createdBy.toString() === kunal._id.toString())
        );
        console.log(`Leads assigned to or created by Kunal Ganguly in Jodhpur Park: ${assignedOrCreated.length}`);

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

run();
