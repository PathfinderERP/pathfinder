import MarketingPlanner from "../../models/MarketingPlanner.js";
import User from "../../models/User.js";
import mongoose from "mongoose";

// Create Planner activities
export const createPlanner = async (req, res) => {
    try {
        const { date, expectedLeadTarget, expectedHotLeads, activities } = req.body;
        if (!date || expectedLeadTarget === undefined || expectedHotLeads === undefined || !activities || !Array.isArray(activities)) {
            return res.status(400).json({ error: "Missing required fields or activities is not an array" });
        }

        const createdRecords = [];
        for (const act of activities) {
            const newRecord = new MarketingPlanner({
                user: req.user._id || req.user.id,
                date,
                expectedLeadTarget: Number(expectedLeadTarget),
                expectedHotLeads: Number(expectedHotLeads),
                type: act.type,
                institution: act.place || "—",
                owner: req.user.name || req.user.username || "Unknown",
                plan: act.time ? (() => {
                    const [h, m] = act.time.split(':');
                    const d = new Date();
                    d.setHours(+h, +m);
                    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                })() : "—",
                planTimeRaw: act.time || "",
                actual: act.actualTime || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
                leads: act.expectedLeads || "0",
                photo: act.photos?.[0] || act.photo || null,
                photos: act.photos || [],
                latitude: act.latitude || null,
                longitude: act.longitude || null,
                locationName: act.locationName || "",
                captureDateTime: act.captureDateTime || "",
                submittedAt: act.submittedAt || new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
                status: "Pending",
                remarks: ""
            });
            await newRecord.save();
            createdRecords.push({
                ...newRecord.toObject(),
                id: newRecord._id.toString()
            });
        }

        res.status(201).json({ success: true, records: createdRecords });
    } catch (error) {
        console.error("Error creating planner records:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Get Planner activities
export const getPlanners = async (req, res) => {
    try {
        let query = {};
        const userRoleStr = (req.user.role || "").toLowerCase().replace(/\s+/g, "");
        const privilegedRoles = ["superadmin", "super admin", "admin", "centerincharge", "zonalmanager", "zonalhead", "hr", "class_coordinator", "rm", "hod"];
        const isPrivileged = privilegedRoles.includes(userRoleStr);

        if (!isPrivileged) {
            query.user = req.user._id || req.user.id;
        } else if (userRoleStr !== "superadmin" && userRoleStr !== "super admin") {
            const userCentres = req.user.centres || [];
            if (userCentres.length > 0) {
                const usersInCentres = await User.find({ centres: { $in: userCentres } }).select('_id');
                const userIds = usersInCentres.map(u => u._id);
                query.user = { $in: userIds };
            }
        }

        const records = await MarketingPlanner.find(query).sort({ createdAt: -1 });
        const formattedRecords = records.map(r => ({
            ...r.toObject(),
            id: r._id.toString()
        }));

        res.json({ success: true, records: formattedRecords });
    } catch (error) {
        console.error("Error fetching planner records:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Update Planner approval status & remarks
export const updatePlannerApproval = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;

        const updateData = {};
        if (status !== undefined) updateData.status = status;
        if (remarks !== undefined) updateData.remarks = remarks;

        const updated = await MarketingPlanner.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ error: "Planner record not found" });
        }

        res.json({ success: true, data: { ...updated.toObject(), id: updated._id.toString() } });
    } catch (error) {
        console.error("Error updating planner approval:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
