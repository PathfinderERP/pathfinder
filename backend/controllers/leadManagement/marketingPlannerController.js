import MarketingPlanner from "../../models/MarketingPlanner.js";
import User from "../../models/User.js";
import mongoose from "mongoose";
import DraftPlanner from "../../models/DraftPlanner.js";
import { uploadToR2, getSignedFileUrl } from "../../utils/r2Upload.js";

const isBase64 = (str) => {
    if (!str || typeof str !== "string") return false;
    return str.startsWith("data:image/") && str.includes(";base64,");
};

const uploadBase64ToR2 = async (base64Str, folder = "marketing_planner") => {
    try {
        const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return null;
        }
        
        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        let extension = "jpg";
        if (mimeType.includes("png")) extension = "png";
        else if (mimeType.includes("gif")) extension = "gif";
        else if (mimeType.includes("webp")) extension = "webp";
        
        const file = {
            buffer,
            originalname: `activity_${Date.now()}.${extension}`,
            mimetype: mimeType
        };
        
        const url = await uploadToR2(file, folder);
        return url;
    } catch (error) {
        console.error("Error uploading base64 to R2:", error);
        return null;
    }
};

const processActivitiesImages = async (activities) => {
    if (!activities || !Array.isArray(activities)) return activities;
    
    const processed = [];
    for (const act of activities) {
        const uploadedPhotos = [];
        if (act.photos && Array.isArray(act.photos)) {
            for (const ph of act.photos) {
                if (isBase64(ph)) {
                    const url = await uploadBase64ToR2(ph);
                    if (url) uploadedPhotos.push(url);
                } else if (ph) {
                    uploadedPhotos.push(ph);
                }
            }
        }
        
        let primaryPhoto = act.photo;
        if (isBase64(primaryPhoto)) {
            if (act.photos && act.photos[0] === primaryPhoto && uploadedPhotos[0]) {
                primaryPhoto = uploadedPhotos[0];
            } else {
                const url = await uploadBase64ToR2(primaryPhoto);
                if (url) primaryPhoto = url;
            }
        } else if (!primaryPhoto && uploadedPhotos.length > 0) {
            primaryPhoto = uploadedPhotos[0];
        }
        
        processed.push({
            ...act,
            photos: uploadedPhotos,
            photo: primaryPhoto
        });
    }
    return processed;
};

// Create Planner activities
export const createPlanner = async (req, res) => {
    try {
        const { date, expectedLeadTarget, expectedHotLeads, activities } = req.body;
        if (!date || expectedLeadTarget === undefined || expectedHotLeads === undefined || !activities || !Array.isArray(activities)) {
            return res.status(400).json({ error: "Missing required fields or activities is not an array" });
        }

        const createdRecords = [];
        const processedActivities = await processActivitiesImages(activities);
        for (const act of processedActivities) {
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
            const recObj = newRecord.toObject();
            if (recObj.photo) {
                recObj.photo = await getSignedFileUrl(recObj.photo);
            }
            if (recObj.photos && Array.isArray(recObj.photos)) {
                recObj.photos = await Promise.all(
                    recObj.photos.map(p => getSignedFileUrl(p))
                );
            }
            createdRecords.push({
                ...recObj,
                id: newRecord._id.toString()
            });
        }

        // Delete draft if exists for the user and date
        await DraftPlanner.deleteOne({ user: req.user._id || req.user.id, date });

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
        } else if (userRoleStr === "zonalmanager" || userRoleStr === "zonalhead" || userRoleStr === "assistantzonalmanager") {
            // Zonal manager/head/assistant can view marketing, centerIncharge, assistantCenterIncharge and supportStaff in their allotted centres, plus their own logs
            const userCentres = req.user.centres || [];
            const userIds = [req.user._id || req.user.id]; // Always include their own ID
            if (userCentres.length > 0) {
                const subordinateUsers = await User.find({
                    centres: { $in: userCentres },
                    role: { $in: ["marketing", "centerIncharge", "assistantCenterIncharge", "supportStaff"] }
                }).select('_id');
                subordinateUsers.forEach(u => {
                    userIds.push(u._id);
                });
            }
            query.user = { $in: userIds };
        } else if (userRoleStr === "centerincharge" || userRoleStr === "centreincharge" || userRoleStr === "assistantcenterincharge") {
            // Center Incharge/assistant can view marketing, centerIncharge, assistantCenterIncharge and supportStaff in their centres, plus their own logs
            const userCentres = req.user.centres || [];
            const userIds = [req.user._id || req.user.id]; // Always include their own ID
            if (userCentres.length > 0) {
                const subordinateUsers = await User.find({
                    centres: { $in: userCentres },
                    role: { $in: ["marketing", "centerIncharge", "assistantCenterIncharge", "supportStaff"] }
                }).select('_id');
                subordinateUsers.forEach(u => {
                    userIds.push(u._id);
                });
            }
            query.user = { $in: userIds };
        } else {
            // Other roles (e.g., Marketing Executives) can only view their own logs
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

        const { search, type, owner, status, startDate, endDate, centres } = req.query;

        // Build matching filters
        const filterMatch = {};
        if (type) {
            const typeList = Array.isArray(type) ? type : (type.includes(',') ? type.split(',') : [type]);
            const filteredTypeList = typeList.filter(t => t && t !== "All");
            if (filteredTypeList.length > 0) {
                filterMatch.type = { $in: filteredTypeList };
            }
        }
        if (owner) {
            const ownerList = Array.isArray(owner) ? owner : (owner.includes(',') ? owner.split(',') : [owner]);
            const filteredOwnerList = ownerList.filter(o => o && o !== "All");
            if (filteredOwnerList.length > 0) {
                filterMatch.owner = { $in: filteredOwnerList };
            }
        }
        if (status) {
            const statusList = Array.isArray(status) ? status : (status.includes(',') ? status.split(',') : [status]);
            const filteredStatusList = statusList.filter(s => s && s !== "All");
            if (filteredStatusList.length > 0) {
                filterMatch.status = { $in: filteredStatusList };
            }
        }
        if (search) {
            filterMatch.$or = [
                { institution: { $regex: search.trim(), $options: "i" } },
                { owner: { $regex: search.trim(), $options: "i" } }
            ];
        }

        // Apply centre filtering: map centre IDs to user IDs matching the primary centre
        if (centres) {
            const centreIds = Array.isArray(centres) ? centres : (centres.includes(',') ? centres.split(',') : [centres]);
            const filteredCentres = centreIds.filter(c => c && c !== "All");
            if (filteredCentres.length > 0) {
                const matchedUsers = await User.find({
                    'centres.0': { $in: filteredCentres.map(id => new mongoose.Types.ObjectId(id)) }
                }).select('_id');
                const matchedUserIds = matchedUsers.map(u => u._id);

                if (query.user) {
                    if (query.user.$in) {
                        const existingUserIdsSet = new Set(query.user.$in.map(id => id.toString()));
                        const intersectedUserIds = matchedUserIds.filter(id => existingUserIdsSet.has(id.toString()));
                        query.user = { $in: intersectedUserIds.map(id => new mongoose.Types.ObjectId(id.toString())) };
                    } else {
                        const singleUserIdStr = query.user.toString();
                        const isMatch = matchedUserIds.some(id => id.toString() === singleUserIdStr);
                        query.user = isMatch ? new mongoose.Types.ObjectId(singleUserIdStr) : null;
                    }
                } else {
                    query.user = { $in: matchedUserIds.map(id => new mongoose.Types.ObjectId(id.toString())) };
                }
            }
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

        // For banner KPIs, filter by all filters (except status filter itself for pending/approved)
        const pendingQuery = { ...finalQuery };
        delete pendingQuery.status;
        pendingQuery.status = "Pending";

        const approvedQuery = { ...finalQuery };
        delete approvedQuery.status;
        approvedQuery.status = "Approved";

        const photoQuery = { ...finalQuery };

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
                .populate({
                    path: 'user',
                    select: 'name email role centres',
                    populate: {
                        path: 'centres',
                        model: 'CentreSchema',
                        select: 'centreName'
                    }
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            MarketingPlanner.countDocuments(finalQuery),
            MarketingPlanner.countDocuments(query),
            MarketingPlanner.distinct("type", dateQuery),
            MarketingPlanner.distinct("owner", dateQuery),
            MarketingPlanner.countDocuments(pendingQuery),
            MarketingPlanner.countDocuments(approvedQuery),
            MarketingPlanner.find(photoQuery).select("photos photo").lean()
        ]);

        let totalPhotos = 0;
        photoDocs.forEach(doc => {
            if (doc.photos && doc.photos.length > 0) {
                totalPhotos += doc.photos.length;
            } else if (doc.photo) {
                totalPhotos += 1;
            }
        });

        const records = await Promise.all(rawRecords.map(async (r) => {
            const recObj = {
                ...r,
                id: r._id.toString()
            };
            if (recObj.photo) {
                recObj.photo = await getSignedFileUrl(recObj.photo);
            }
            if (recObj.photos && Array.isArray(recObj.photos)) {
                recObj.photos = await Promise.all(
                    recObj.photos.map(p => getSignedFileUrl(p))
                );
            }
            return recObj;
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
        const allowedRoles = ["superadmin", "super admin", "admin", "zonalmanager", "zonalhead", "centerincharge", "centreincharge", "assistantzonalmanager", "assistantcenterincharge"];
        if (!allowedRoles.includes(userRoleStr)) {
            return res.status(403).json({ error: "Forbidden: You do not have permission to approve/reject plans." });
        }

        const plannerRecord = await MarketingPlanner.findById(id);
        if (!plannerRecord) {
            return res.status(404).json({ error: "Planner record not found" });
        }

        const ownerUser = await User.findById(plannerRecord.user);
        if (!ownerUser) {
            return res.status(404).json({ error: "Owner user not found" });
        }

        const ownerRoleStr = (ownerUser.role || "").toLowerCase().replace(/\s+/g, "");

        const isSuperAdminApprover = ["superadmin", "super admin", "admin"].includes(userRoleStr);

        if (!isSuperAdminApprover) {
            // Disallow self-approval
            const isSelf = plannerRecord.user.toString() === (req.user._id || req.user.id).toString();
            if (isSelf) {
                return res.status(403).json({ error: "Forbidden: You cannot approve/reject your own plan." });
            }

            // Check center overlap
            const managerCentres = (req.user.centres || []).map(c => c.toString());
            const ownerCentres = (ownerUser.centres || []).map(c => c.toString());
            const hasOverlap = ownerCentres.some(c => managerCentres.includes(c));

            if (!hasOverlap) {
                return res.status(403).json({ error: "Forbidden: You are not authorized to approve/reject plans for a user outside your centres." });
            }

            // Specific role hierarchy logic
            if (userRoleStr === "zonalmanager" || userRoleStr === "zonalhead") {
                // Zonal managers can approve marketing, centerIncharge, assistantCenterIncharge, supportStaff, and assistantZonalManager
                const allowedOwners = ["marketing", "centerincharge", "centreincharge", "assistantcenterincharge", "supportstaff", "assistantzonalmanager"];
                if (!allowedOwners.includes(ownerRoleStr)) {
                    return res.status(403).json({ error: "Forbidden: Zonal Managers can only approve plans of Marketing, Center Incharge, Assistant Center Incharge, Support Staff, and Assistant Zonal Manager users." });
                }
            } else if (userRoleStr === "assistantzonalmanager") {
                // Assistant Zonal Managers can approve marketing, centerIncharge, assistantCenterIncharge, and supportStaff.
                // Note: they CANNOT approve assistantZonalManager plans.
                const allowedOwners = ["marketing", "centerincharge", "centreincharge", "assistantcenterincharge", "supportstaff"];
                if (!allowedOwners.includes(ownerRoleStr)) {
                    return res.status(403).json({ error: "Forbidden: Assistant Zonal Managers can only approve plans of Marketing, Center Incharge, Assistant Center Incharge, and Support Staff users." });
                }
            } else if (userRoleStr === "centerincharge" || userRoleStr === "centreincharge") {
                // Center Incharges can approve marketing, supportStaff, and assistantCenterIncharge
                const allowedOwners = ["marketing", "supportstaff", "assistantcenterincharge"];
                if (!allowedOwners.includes(ownerRoleStr)) {
                    return res.status(403).json({ error: "Forbidden: Center Incharges can only approve plans of Marketing, Support Staff, and Assistant Center Incharge users." });
                }
            } else if (userRoleStr === "assistantcenterincharge") {
                // Assistant Center Incharges can approve marketing only
                const allowedOwners = ["marketing"];
                if (!allowedOwners.includes(ownerRoleStr)) {
                    return res.status(403).json({ error: "Forbidden: Assistant Center Incharges can only approve plans of Marketing users." });
                }
            } else {
                return res.status(403).json({ error: "Forbidden: You are not authorized to approve/reject this plan." });
            }
        } else {
            // Superadmins can approve any of the target roles
            const validRoles = ["marketing", "centerincharge", "centreincharge", "zonalmanager", "zonalhead", "superadmin", "super admin", "admin", "assistantzonalmanager", "assistantcenterincharge", "supportstaff"];
            if (!validRoles.includes(ownerRoleStr)) {
                return res.status(403).json({ error: "Forbidden: Not an approvable role." });
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

        const updatedObj = updated.toObject();
        if (updatedObj.photo) {
            updatedObj.photo = await getSignedFileUrl(updatedObj.photo);
        }
        if (updatedObj.photos && Array.isArray(updatedObj.photos)) {
            updatedObj.photos = await Promise.all(
                updatedObj.photos.map(p => getSignedFileUrl(p))
            );
        }
        res.json({ success: true, data: { ...updatedObj, id: updated._id.toString() } });
    } catch (error) {
        console.error("Error updating planner approval:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Save draft planner
export const saveDraftPlanner = async (req, res) => {
    try {
        const { date, expectedLeadTarget, expectedHotLeads, activities } = req.body;
        if (!date || !activities || !Array.isArray(activities)) {
            return res.status(400).json({ error: "Missing required fields or activities is not an array" });
        }

        const userId = req.user._id || req.user.id;
        const processedActivities = await processActivitiesImages(activities);
        
        const draft = await DraftPlanner.findOneAndUpdate(
            { user: userId },
            { 
                date, 
                expectedLeadTarget: Number(expectedLeadTarget || 0), 
                expectedHotLeads: Number(expectedHotLeads || 0), 
                activities: processedActivities 
            },
            { new: true, upsert: true }
        );

        let signedDraft = null;
        if (draft) {
            signedDraft = draft.toObject();
            if (signedDraft.activities && Array.isArray(signedDraft.activities)) {
                signedDraft.activities = await Promise.all(
                    signedDraft.activities.map(async (act) => {
                        const signedAct = { ...act };
                        if (signedAct.photo) {
                            signedAct.photo = await getSignedFileUrl(signedAct.photo);
                        }
                        if (signedAct.photos && Array.isArray(signedAct.photos)) {
                            signedAct.photos = await Promise.all(
                                signedAct.photos.map(p => getSignedFileUrl(p))
                            );
                        }
                        return signedAct;
                    })
                );
            }
        }
        res.status(200).json({ success: true, draft: signedDraft });
    } catch (error) {
        console.error("Error saving draft planner:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Get draft planner
export const getDraftPlanner = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const todayStr = req.query.date || new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
        
        const draft = await DraftPlanner.findOne({ user: userId, date: todayStr });
        
        let signedDraft = null;
        if (draft) {
            signedDraft = draft.toObject();
            if (signedDraft.activities && Array.isArray(signedDraft.activities)) {
                signedDraft.activities = await Promise.all(
                    signedDraft.activities.map(async (act) => {
                        const signedAct = { ...act };
                        if (signedAct.photo) {
                            signedAct.photo = await getSignedFileUrl(signedAct.photo);
                        }
                        if (signedAct.photos && Array.isArray(signedAct.photos)) {
                            signedAct.photos = await Promise.all(
                                signedAct.photos.map(p => getSignedFileUrl(p))
                            );
                        }
                        return signedAct;
                    })
                );
            }
        }
        res.status(200).json({ success: true, draft: signedDraft });
    } catch (error) {
        console.error("Error fetching draft planner:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
