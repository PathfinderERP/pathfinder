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
                estimatedDuration: act.estimatedDuration || "",
                notes: act.notes || "",
                priority: act.priority || "Medium",
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

        if (userRoleStr === "superadmin" || userRoleStr === "super admin" || userRoleStr === "admin") {
            // Superadmin and Admin can view all data
            query = {};
        } else if (userRoleStr === "zonalmanager" || userRoleStr === "zonalhead") {
            // Zonal head/manager can view marketing role users in their allotted centres, plus their own logs
            const userCentres = req.user.centres || [];
            const userIds = [req.user._id || req.user.id]; // Always include their own ID
            if (userCentres.length > 0) {
                const marketingUsersInCentres = await User.find({
                    centres: { $in: userCentres },
                    role: { $regex: /^marketing$/i }
                }).select('_id');
                marketingUsersInCentres.forEach(u => {
                    userIds.push(u._id);
                });
            }
            query.user = { $in: userIds };
        } else {
            // Other roles (e.g., Centre Incharge, Marketing Executives) can only view their own logs
            query.user = req.user._id || req.user.id;
        }

        // Convert query.user strings to mongoose ObjectIds for aggregation compatibility
        if (query.user) {
            if (query.user.$in) {
                query.user = { $in: query.user.$in.map(id => new mongoose.Types.ObjectId(id.toString())) };
            } else {
                query.user = new mongoose.Types.ObjectId(query.user.toString());
            }
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const { search, type, owner, status, startDate, endDate } = req.query;

        // Build matching filters
        const filterMatch = {};
        if (type && type !== "All") {
            filterMatch.type = type;
        }
        if (owner && owner !== "All") {
            filterMatch.owner = owner;
        }
        if (status && status !== "All") {
            filterMatch.status = status;
        }
        if (search) {
            filterMatch.$or = [
                { institution: { $regex: search.trim(), $options: "i" } },
                { owner: { $regex: search.trim(), $options: "i" } }
            ];
        }

        const dateQuery = { ...query };
        if (startDate && endDate) {
            dateQuery.date = { $gte: startDate, $lte: endDate };
            filterMatch.date = { $gte: startDate, $lte: endDate };
        } else if (startDate) {
            dateQuery.date = { $gte: startDate };
            filterMatch.date = { $gte: startDate };
        } else if (endDate) {
            dateQuery.date = { $lte: endDate };
            filterMatch.date = { $lte: endDate };
        }

        const finalQuery = { ...query, ...filterMatch };

        const [
            rawRecords,
            totalRecords,
            totalRecordsBeforeFilters,
            rawUniqueTypes,
            rawUniqueOwners,
            totalPending,
            totalApproved,
            photoDocs
        ] = await Promise.all([
            MarketingPlanner.find(finalQuery)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            MarketingPlanner.countDocuments(finalQuery),
            MarketingPlanner.countDocuments(query),
            MarketingPlanner.distinct("type", dateQuery),
            MarketingPlanner.distinct("owner", dateQuery),
            MarketingPlanner.countDocuments({ ...dateQuery, status: "Pending" }),
            MarketingPlanner.countDocuments({ ...dateQuery, status: "Approved" }),
            MarketingPlanner.find(dateQuery).select("photos photo").lean()
        ]);

        let totalPhotos = 0;
        photoDocs.forEach(doc => {
            if (doc.photos && doc.photos.length > 0) {
                totalPhotos += doc.photos.length;
            } else if (doc.photo) {
                totalPhotos += 1;
            }
        });

        const records = rawRecords.map(r => ({
            ...r,
            id: r._id.toString()
        }));

        const totalPages = Math.ceil(totalRecords / limit);
        const uniqueTypes = ["All", ...rawUniqueTypes.filter(Boolean)];
        const uniqueOwners = ["All", ...rawUniqueOwners.filter(Boolean)];

        res.json({
            success: true,
            records,
            totalRecords,
            totalPages,
            currentPage: page,
            uniqueTypes,
            uniqueOwners,
            totalRecordsBeforeFilters,
            totalPending,
            totalApproved,
            totalPhotos
        });
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

        const userRoleStr = (req.user.role || "").toLowerCase().replace(/\s+/g, "");
        const allowedRoles = ["superadmin", "super admin", "admin", "zonalmanager", "zonalhead"];
        if (!allowedRoles.includes(userRoleStr)) {
            return res.status(403).json({ error: "Forbidden: You do not have permission to approve/reject plans." });
        }

        const plannerRecord = await MarketingPlanner.findById(id);
        if (!plannerRecord) {
            return res.status(404).json({ error: "Planner record not found" });
        }

        // Enforce boundary check for non-superadmin users
        if (userRoleStr !== "superadmin" && userRoleStr !== "super admin" && userRoleStr !== "admin") {
            const isSelf = plannerRecord.user.toString() === (req.user._id || req.user.id).toString();
            if (!isSelf) {
                const ownerUser = await User.findById(plannerRecord.user);
                if (!ownerUser) {
                    return res.status(404).json({ error: "Owner user not found" });
                }

                const managerCentres = (req.user.centres || []).map(c => c.toString());
                const ownerCentres = (ownerUser.centres || []).map(c => c.toString());
                const hasOverlap = ownerCentres.some(c => managerCentres.includes(c));
                const isMarketing = (ownerUser.role || "").toLowerCase() === "marketing";

                if (!hasOverlap || !isMarketing) {
                    return res.status(403).json({ error: "Forbidden: You are not authorized to approve/reject plans for this user." });
                }
            }
        }

        const updateData = {};
        if (status !== undefined) {
            updateData.status = status;
            updateData.approvedBy = req.user.name || req.user.username || "System";
        }
        if (remarks !== undefined) {
            updateData.remarks = remarks;
            updateData.approvedBy = req.user.name || req.user.username || "System";
        }

        const updated = await MarketingPlanner.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        res.json({ success: true, data: { ...updated.toObject(), id: updated._id.toString() } });
    } catch (error) {
        console.error("Error updating planner approval:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
