import MarketingRequirement from "../../models/Operations/MarketingRequirement.js";
import MarketingCentreBucket from "../../models/Operations/MarketingCentreBucket.js";
import CentreSchema from "../../models/Master_data/Centre.js";

// Helper to find Hazra HO Centre
export const getHazraHOCentre = async () => {
    try {
        let hazra = await CentreSchema.findOne({
            centreName: /hazra/i,
            $or: [
                { centreName: /h\.?o/i },
                { centreName: /head\s*office/i }
            ]
        });

        if (!hazra) {
            hazra = await CentreSchema.findOne({ centreName: /hazra/i });
        }

        if (!hazra) {
            hazra = await CentreSchema.findById('697088baabb4820c05aecdb0');
        }

        return hazra;
    } catch (err) {
        console.error("Error finding Hazra HO centre:", err);
        return null;
    }
};

// GET Centre Bucket & statistics
export const getCentreBucket = async (req, res) => {
    try {
        const centreId = req.query.centreId || req.params.centreId;
        if (!centreId) {
            return res.status(400).json({ success: false, message: "centreId is required" });
        }

        let bucket = await MarketingCentreBucket.findOne({ centre: centreId });
        const centreDoc = await CentreSchema.findById(centreId);

        if (!centreDoc) {
            return res.status(404).json({ success: false, message: "Centre not found" });
        }

        if (!bucket) {
            bucket = await MarketingCentreBucket.create({
                centre: centreDoc._id,
                centreName: centreDoc.centreName || "Centre",
                leaflets: 0,
                banners: 0,
                totalLeafletsReceived: 0,
                totalBannersReceived: 0
            });
        }

        // Live stats for this centre
        const [totalReqs, pendingReqs, approvedReqs, rejectedReqs] = await Promise.all([
            MarketingRequirement.countDocuments({ centre: centreId }),
            MarketingRequirement.countDocuments({ centre: centreId, status: 'Pending' }),
            MarketingRequirement.countDocuments({ centre: centreId, status: 'Approved' }),
            MarketingRequirement.countDocuments({ centre: centreId, status: 'Rejected' })
        ]);

        return res.status(200).json({
            success: true,
            data: bucket,
            stats: {
                totalRequests: totalReqs,
                pendingRequests: pendingReqs,
                approvedRequests: approvedReqs,
                rejectedRequests: rejectedReqs
            }
        });
    } catch (error) {
        console.error("Error in getCentreBucket:", error);
        return res.status(500).json({ success: false, message: "Error fetching bucket", error: error.message });
    }
};

// Permission helper to verify marketing approval rights
const checkApprovalAccess = (user) => {
    if (!user) return false;
    const role = (user.role || "").toLowerCase().replace(/[\s\-_]+/g, "");
    if (role === 'superadmin') return true;
    const perms = user.granularPermissions;
    if (!perms) return false;
    const appSec = perms.marketingApproval?.approval || perms.marketingApproval?.requisitions || perms.operations?.marketingApproval;
    if (!appSec || typeof appSec !== 'object') return false;
    return !!(appSec.edit === true || appSec.create === true || appSec.view === true || appSec.delete === true);
};

// GET All Centres Buckets (Overview for HO / Approval portal)
export const getAllCentresBuckets = async (req, res) => {
    try {
        if (!checkApprovalAccess(req.user)) {
            return res.status(403).json({ success: false, message: "Access denied: You do not have permission to view all centre inventory buckets." });
        }

        const [centres, buckets] = await Promise.all([
            CentreSchema.find({ status: { $ne: 'deactive' } }).select('centreName centreCode location'),
            MarketingCentreBucket.find()
        ]);

        const bucketMap = new Map();
        buckets.forEach(b => {
            bucketMap.set(b.centre.toString(), b);
        });

        const result = centres.map(c => {
            const b = bucketMap.get(c._id.toString());
            return {
                centreId: c._id,
                centreName: c.centreName,
                centreCode: c.centreCode,
                location: c.location,
                leaflets: b ? b.leaflets : 0,
                banners: b ? b.banners : 0,
                totalLeafletsReceived: b ? b.totalLeafletsReceived : 0,
                totalBannersReceived: b ? b.totalBannersReceived : 0,
                lastUpdated: b ? b.lastUpdated : null
            };
        });

        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error("Error in getAllCentresBuckets:", error);
        return res.status(500).json({ success: false, message: "Error fetching all buckets", error: error.message });
    }
};

// CREATE Marketing Requisition Request
export const createRequirement = async (req, res) => {
    try {
        const { centreId, leaflets, banners, purpose } = req.body;

        const leafletQty = Math.max(0, parseInt(leaflets, 10) || 0);
        const bannerQty = Math.max(0, parseInt(banners, 10) || 0);

        if (leafletQty === 0 && bannerQty === 0) {
            return res.status(400).json({
                success: false,
                message: "Please specify a quantity greater than 0 for either leaflets or banners."
            });
        }

        let selectedCentreId = centreId;
        if (!selectedCentreId && req.user?.centres?.length > 0) {
            selectedCentreId = req.user.centres[0];
        }

        if (!selectedCentreId) {
            return res.status(400).json({
                success: false,
                message: "No centre specified or assigned to your profile."
            });
        }

        const centreDoc = await CentreSchema.findById(selectedCentreId);
        if (!centreDoc) {
            return res.status(404).json({ success: false, message: "Requesting centre not found." });
        }

        // Destination is by default Hazra HO
        const hazraDoc = await getHazraHOCentre();

        const requirement = new MarketingRequirement({
            centre: centreDoc._id,
            centreName: centreDoc.centreName,
            destinationCentre: hazraDoc ? hazraDoc._id : null,
            destinationCentreName: hazraDoc ? hazraDoc.centreName : "HAZRA H.O",
            leaflets: leafletQty,
            banners: bannerQty,
            purpose: purpose || "",
            status: 'Pending',
            requestedBy: req.user?._id,
            user: req.user?._id
        });

        await requirement.save();

        const populated = await MarketingRequirement.findById(requirement._id)
            .populate('centre', 'centreName centreCode')
            .populate('destinationCentre', 'centreName centreCode')
            .populate('requestedBy', 'name email mobNum role');

        return res.status(201).json({
            success: true,
            message: "Requisition request submitted to Hazra HO successfully!",
            data: populated
        });
    } catch (error) {
        console.error("Error creating marketing requisition:", error);
        return res.status(500).json({
            success: false,
            message: "Error creating requirement",
            error: error.message
        });
    }
};

// GET Requisitions with filters and pagination
export const getRequirements = async (req, res) => {
    try {
        const { centreId, status, search, myRequests, limit = 100, page = 1 } = req.query;
        const user = req.user;
        const userRole = (user?.role || "").toLowerCase().replace(/\s+/g, "");
        const isSuperAdmin = userRole === "superadmin";

        const andClauses = [];

        // If explicitly requesting user's own profile submissions
        if (myRequests === 'true' || myRequests === true) {
            andClauses.push({
                $or: [
                    { requestedBy: user._id },
                    { user: user._id }
                ]
            });
            if (centreId && centreId !== 'all') {
                andClauses.push({ centre: centreId });
            }
        } else if (centreId && centreId !== 'all') {
            andClauses.push({ centre: centreId });
        } else if (!isSuperAdmin) {
            // For normal users, check if they are an approver role (e.g. at Hazra HO or admin)
            const userCentres = (user?.centres || []).map(c => c.toString());
            const hazra = await getHazraHOCentre();
            const isHazraUser = hazra && userCentres.includes(hazra._id.toString());
            const isManagerOrAdmin = ['admin', 'marketing', 'zonalmanager', 'areamanager'].includes(userRole);

            if (!isHazraUser && !isManagerOrAdmin) {
                // Regular centre user: show their centre requests OR requests they submitted
                andClauses.push({
                    $or: [
                        { centre: { $in: userCentres } },
                        { requestedBy: user._id },
                        { user: user._id }
                    ]
                });
            }
        }

        if (status && status !== 'all') {
            andClauses.push({ status });
        }

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            andClauses.push({
                $or: [
                    { centreName: regex },
                    { purpose: regex },
                    { destinationCentreName: regex }
                ]
            });
        }

        const query = andClauses.length > 0 ? { $and: andClauses } : {};

        const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

        const [requirements, total, summaryStats] = await Promise.all([
            MarketingRequirement.find(query)
                .populate('centre', 'centreName centreCode')
                .populate('destinationCentre', 'centreName centreCode')
                .populate('requestedBy', 'name email mobNum role')
                .populate('user', 'name email mobNum role')
                .populate('approvedBy', 'name email role')
                .populate('rejectedBy', 'name email role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit, 10)),
            MarketingRequirement.countDocuments(query),
            // Overall global metrics for cards
            Promise.all([
                MarketingRequirement.countDocuments({ status: 'Pending' }),
                MarketingRequirement.countDocuments({ status: 'Approved' }),
                MarketingRequirement.countDocuments({ status: 'Rejected' }),
                MarketingRequirement.aggregate([
                    { $match: { status: 'Approved' } },
                    { $group: { _id: null, totalLeaflets: { $sum: '$approvedLeaflets' }, totalBanners: { $sum: '$approvedBanners' } } }
                ])
            ])
        ]);

        const [pendingTotal, approvedTotal, rejectedTotal, approvedAgg] = summaryStats;
        const dispatchedTotals = approvedAgg[0] || { totalLeaflets: 0, totalBanners: 0 };

        const mappedRequirements = requirements.map(req => {
            const doc = req.toObject ? req.toObject() : req;
            const centreName = doc.centreName || (doc.centre && typeof doc.centre === 'object' ? doc.centre.centreName : null) || 'HABRA';
            const userObj = doc.requestedBy || doc.user;
            const requestedByName = (userObj && typeof userObj === 'object') ? userObj.name : 'ROHAN SINGH';
            const requestedByRole = (userObj && typeof userObj === 'object') ? (userObj.role || userObj.email || '') : '';
            return {
                ...doc,
                centreName,
                requestedByName,
                requestedByRole
            };
        });

        return res.status(200).json({
            success: true,
            data: mappedRequirements,
            total,
            overview: {
                totalRequests: pendingTotal + approvedTotal + rejectedTotal,
                pendingRequests: pendingTotal,
                approvedRequests: approvedTotal,
                rejectedRequests: rejectedTotal,
                totalLeafletsDispatched: dispatchedTotals.totalLeaflets || 0,
                totalBannersDispatched: dispatchedTotals.totalBanners || 0
            }
        });
    } catch (error) {
        console.error("Error fetching marketing requirements:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching requirements",
            error: error.message
        });
    }
};

// APPROVE Marketing Requisition & Credit Centre Bucket (Supports initial approval or modifying previous decision)
export const approveRequisition = async (req, res) => {
    try {
        if (!checkApprovalAccess(req.user)) {
            return res.status(403).json({ success: false, message: "Access denied: You do not have permission to approve marketing requisitions." });
        }

        const { id } = req.params;
        const { approvedLeaflets, approvedBanners, approverRemarks } = req.body;

        const requirement = await MarketingRequirement.findById(id);
        if (!requirement) {
            return res.status(404).json({ success: false, message: "Requisition not found" });
        }

        const prevStatus = requirement.status;
        const prevApprovedLeaflets = prevStatus === 'Approved' ? (requirement.approvedLeaflets || 0) : 0;
        const prevApprovedBanners = prevStatus === 'Approved' ? (requirement.approvedBanners || 0) : 0;

        // Determine final approved quantities
        const finalLeaflets = approvedLeaflets !== undefined 
            ? Math.max(0, parseInt(approvedLeaflets, 10) || 0) 
            : (prevStatus === 'Approved' && requirement.approvedLeaflets !== undefined ? requirement.approvedLeaflets : requirement.leaflets);

        const finalBanners = approvedBanners !== undefined 
            ? Math.max(0, parseInt(approvedBanners, 10) || 0) 
            : (prevStatus === 'Approved' && requirement.approvedBanners !== undefined ? requirement.approvedBanners : requirement.banners);

        const diffLeaflets = finalLeaflets - prevApprovedLeaflets;
        const diffBanners = finalBanners - prevApprovedBanners;

        requirement.status = 'Approved';
        requirement.approvedLeaflets = finalLeaflets;
        requirement.approvedBanners = finalBanners;
        requirement.approvedBy = req.user?._id;
        requirement.approvedAt = new Date();
        requirement.approverRemarks = approverRemarks !== undefined ? approverRemarks : requirement.approverRemarks;
        requirement.rejectionReason = undefined;
        requirement.rejectedBy = undefined;
        requirement.rejectedAt = undefined;

        await requirement.save();

        // ═══════════════════════════════════════════════════════════════════
        // UPDATE CENTRE'S MARKETING BUCKET DIRECTLY (Delta Adjustment)
        // ═══════════════════════════════════════════════════════════════════
        let bucket = await MarketingCentreBucket.findOne({ centre: requirement.centre });
        if (!bucket) {
            const centreDoc = await CentreSchema.findById(requirement.centre);
            bucket = new MarketingCentreBucket({
                centre: requirement.centre,
                centreName: centreDoc ? centreDoc.centreName : requirement.centreName,
                leaflets: 0,
                banners: 0,
                totalLeafletsReceived: 0,
                totalBannersReceived: 0
            });
        }

        bucket.leaflets = Math.max(0, (bucket.leaflets || 0) + diffLeaflets);
        bucket.banners = Math.max(0, (bucket.banners || 0) + diffBanners);
        bucket.totalLeafletsReceived = Math.max(0, (bucket.totalLeafletsReceived || 0) + diffLeaflets);
        bucket.totalBannersReceived = Math.max(0, (bucket.totalBannersReceived || 0) + diffBanners);
        bucket.lastUpdated = new Date();
        bucket.updatedBy = req.user?._id;

        await bucket.save();

        const updatedReq = await MarketingRequirement.findById(requirement._id)
            .populate('centre', 'centreName centreCode')
            .populate('destinationCentre', 'centreName centreCode')
            .populate('requestedBy', 'name email role')
            .populate('approvedBy', 'name email role');

        return res.status(200).json({
            success: true,
            message: prevStatus === 'Approved'
                ? `Approval updated! ${finalLeaflets} leaflets and ${finalBanners} banners adjusted in ${requirement.centreName} bucket.`
                : `Requisition approved! ${finalLeaflets} leaflets and ${finalBanners} banners credited to ${requirement.centreName} bucket.`,
            data: updatedReq,
            bucket
        });
    } catch (error) {
        console.error("Error approving requisition:", error);
        return res.status(500).json({
            success: false,
            message: "Error approving requisition",
            error: error.message
        });
    }
};

// REJECT Marketing Requisition (Supports initial rejection or reversing a previously approved request)
export const rejectRequisition = async (req, res) => {
    try {
        if (!checkApprovalAccess(req.user)) {
            return res.status(403).json({ success: false, message: "Access denied: You do not have permission to reject marketing requisitions." });
        }

        const { id } = req.params;
        const { rejectionReason } = req.body;

        if (!rejectionReason || !rejectionReason.trim()) {
            return res.status(400).json({
                success: false,
                message: "A rejection reason is required."
            });
        }

        const requirement = await MarketingRequirement.findById(id);
        if (!requirement) {
            return res.status(404).json({ success: false, message: "Requisition not found" });
        }

        const prevStatus = requirement.status;

        // If the requisition was previously approved, reverse the credited bucket quantities
        if (prevStatus === 'Approved') {
            const deductLeaflets = requirement.approvedLeaflets || 0;
            const deductBanners = requirement.approvedBanners || 0;

            if (deductLeaflets > 0 || deductBanners > 0) {
                let bucket = await MarketingCentreBucket.findOne({ centre: requirement.centre });
                if (bucket) {
                    bucket.leaflets = Math.max(0, (bucket.leaflets || 0) - deductLeaflets);
                    bucket.banners = Math.max(0, (bucket.banners || 0) - deductBanners);
                    bucket.totalLeafletsReceived = Math.max(0, (bucket.totalLeafletsReceived || 0) - deductLeaflets);
                    bucket.totalBannersReceived = Math.max(0, (bucket.totalBannersReceived || 0) - deductBanners);
                    bucket.lastUpdated = new Date();
                    bucket.updatedBy = req.user?._id;
                    await bucket.save();
                }
            }
        }

        requirement.status = 'Rejected';
        requirement.approvedLeaflets = 0;
        requirement.approvedBanners = 0;
        requirement.approvedBy = undefined;
        requirement.approvedAt = undefined;
        requirement.rejectedBy = req.user?._id;
        requirement.rejectedAt = new Date();
        requirement.rejectionReason = rejectionReason.trim();

        await requirement.save();

        const updatedReq = await MarketingRequirement.findById(requirement._id)
            .populate('centre', 'centreName centreCode')
            .populate('destinationCentre', 'centreName centreCode')
            .populate('requestedBy', 'name email role')
            .populate('rejectedBy', 'name email role');

        return res.status(200).json({
            success: true,
            message: prevStatus === 'Approved'
                ? "Requisition reversed to Rejected and previous bucket allocations deducted."
                : "Requisition has been rejected.",
            data: updatedReq
        });
    } catch (error) {
        console.error("Error rejecting requisition:", error);
        return res.status(500).json({
            success: false,
            message: "Error rejecting requisition",
            error: error.message
        });
    }
};

// UPDATE Requisition (Edit requested leaflets, banners, purpose)
export const updateRequisition = async (req, res) => {
    try {
        const { id } = req.params;
        const { leaflets, banners, purpose } = req.body;

        const requirement = await MarketingRequirement.findById(id);
        if (!requirement) {
            return res.status(404).json({ success: false, message: "Requisition not found" });
        }

        const userRole = (req.user?.role || "").toLowerCase().replace(/[\s\-_]+/g, "");
        const isSuperAdmin = userRole === 'superadmin';

        if (!isSuperAdmin && requirement.status !== 'Pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot edit a requisition that is already ${requirement.status}.`
            });
        }

        const leafletQty = leaflets !== undefined ? Math.max(0, parseInt(leaflets, 10) || 0) : requirement.leaflets;
        const bannerQty = banners !== undefined ? Math.max(0, parseInt(banners, 10) || 0) : requirement.banners;

        if (leafletQty === 0 && bannerQty === 0) {
            return res.status(400).json({
                success: false,
                message: "Please specify a quantity greater than 0 for leaflets or banners."
            });
        }

        requirement.leaflets = leafletQty;
        requirement.banners = bannerQty;
        if (purpose !== undefined) {
            requirement.purpose = purpose;
        }

        await requirement.save();

        const updated = await MarketingRequirement.findById(requirement._id)
            .populate('centre', 'centreName centreCode')
            .populate('destinationCentre', 'centreName centreCode')
            .populate('requestedBy', 'name email role')
            .populate('approvedBy', 'name email role')
            .populate('rejectedBy', 'name email role');

        return res.status(200).json({
            success: true,
            message: "Requisition updated successfully.",
            data: updated
        });
    } catch (error) {
        console.error("Error updating requisition:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating requisition",
            error: error.message
        });
    }
};

// DELETE Requisition
export const deleteRequisition = async (req, res) => {
    try {
        const { id } = req.params;
        const requirement = await MarketingRequirement.findById(id);

        if (!requirement) {
            return res.status(404).json({ success: false, message: "Requisition not found" });
        }

        const userRole = (req.user?.role || "").toLowerCase().replace(/[\s\-_]+/g, "");
        const isSuperAdmin = userRole === 'superadmin';

        // If approved, rollback bucket quantities if deleted
        if (requirement.status === 'Approved') {
            if (!isSuperAdmin) {
                return res.status(400).json({
                    success: false,
                    message: "Only administrators can delete an approved requisition."
                });
            }

            const appLeaflets = requirement.approvedLeaflets || 0;
            const appBanners = requirement.approvedBanners || 0;

            if (appLeaflets > 0 || appBanners > 0) {
                await MarketingCentreBucket.findOneAndUpdate(
                    { centre: requirement.centre },
                    {
                        $inc: {
                            leaflets: -appLeaflets,
                            banners: -appBanners,
                            totalLeafletsReceived: -appLeaflets,
                            totalBannersReceived: -appBanners
                        },
                        $set: { lastUpdated: new Date() }
                    }
                );
            }
        }

        await MarketingRequirement.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Requisition deleted successfully."
        });
    } catch (error) {
        console.error("Error deleting requisition:", error);
        return res.status(500).json({
            success: false,
            message: "Error deleting requisition",
            error: error.message
        });
    }
};

export const cancelRequisition = deleteRequisition;

// UPDATE Centre Bucket directly (Admin / Approver manual adjustment)
export const updateCentreBucketDirectly = async (req, res) => {
    try {
        const { centreId } = req.params;
        const { leaflets, banners } = req.body;

        const centreDoc = await CentreSchema.findById(centreId);
        if (!centreDoc) {
            return res.status(404).json({ success: false, message: "Centre not found" });
        }

        let bucket = await MarketingCentreBucket.findOne({ centre: centreId });
        if (!bucket) {
            bucket = new MarketingCentreBucket({
                centre: centreDoc._id,
                centreName: centreDoc.centreName,
                leaflets: 0,
                banners: 0,
                totalLeafletsReceived: 0,
                totalBannersReceived: 0
            });
        }

        if (leaflets !== undefined) bucket.leaflets = Math.max(0, parseInt(leaflets, 10) || 0);
        if (banners !== undefined) bucket.banners = Math.max(0, parseInt(banners, 10) || 0);

        bucket.lastUpdated = new Date();
        bucket.updatedBy = req.user?._id;

        await bucket.save();

        return res.status(200).json({
            success: true,
            message: "Centre bucket stock updated successfully.",
            data: bucket
        });
    } catch (error) {
        console.error("Error updating centre bucket:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating bucket",
            error: error.message
        });
    }
};
