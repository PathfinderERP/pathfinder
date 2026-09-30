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
                bags: 0,
                tshirts: 0,
                ktsBooks: 0,
                vsoBooks: 0,
                totalLeafletsReceived: 0,
                totalBannersReceived: 0,
                totalBagsReceived: 0,
                totalTshirtsReceived: 0,
                totalKtsBooksReceived: 0,
                totalVsoBooksReceived: 0
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
                leaflets: b ? (b.leaflets || 0) : 0,
                banners: b ? (b.banners || 0) : 0,
                bags: b ? (b.bags || 0) : 0,
                tshirts: b ? (b.tshirts || 0) : 0,
                ktsBooks: b ? (b.ktsBooks || 0) : 0,
                vsoBooks: b ? (b.vsoBooks || 0) : 0,
                totalLeafletsReceived: b ? (b.totalLeafletsReceived || 0) : 0,
                totalBannersReceived: b ? (b.totalBannersReceived || 0) : 0,
                totalBagsReceived: b ? (b.totalBagsReceived || 0) : 0,
                totalTshirtsReceived: b ? (b.totalTshirtsReceived || 0) : 0,
                totalKtsBooksReceived: b ? (b.totalKtsBooksReceived || 0) : 0,
                totalVsoBooksReceived: b ? (b.totalVsoBooksReceived || 0) : 0,
                lastUpdated: b ? b.lastUpdated : null
            };
        });

        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error("Error in getAllCentresBuckets:", error);
        return res.status(500).json({ success: false, message: "Error fetching all buckets", error: error.message });
    }
};

// CREATE Marketing Requisition Request (Supports single or batch items)
export const createRequirement = async (req, res) => {
    try {
        const { centreId, items, leaflets, banners, bags, tshirts, ktsBooks, vsoBooks, books, bookType, itemType, quantity, purpose } = req.body;

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

        const hazraDoc = await getHazraHOCentre();

        // 1. Batch submission handling (when items array is sent)
        if (Array.isArray(items) && items.length > 0) {
            const createdDocs = [];

            for (const item of items) {
                let parsedQty = Math.max(0, parseInt(item.quantity, 10) || 0);
                if (parsedQty <= 0) continue;

                let lQty = 0, bQty = 0, bgQty = 0, tQty = 0, kQty = 0, vQty = 0;
                let itm = item.itemType || "";
                let bType = item.bookType || "";

                const lower = itm.toLowerCase();
                if (lower === 'leaflets' || lower === 'leaflet') {
                    lQty = parsedQty;
                    itm = "Leaflets";
                } else if (lower === 'banners' || lower === 'banner') {
                    bQty = parsedQty;
                    itm = "Banners";
                } else if (lower === 'bags' || lower === 'bag') {
                    bgQty = parsedQty;
                    itm = "Bags";
                } else if (lower.includes('tshirt') || lower.includes('t-shirt')) {
                    tQty = parsedQty;
                    itm = "T-Shirts";
                } else if (lower.includes('book') || bType) {
                    const subType = (bType || itm).toLowerCase();
                    if (subType.includes('kts')) {
                        kQty = parsedQty;
                        itm = "KTS Books";
                        bType = "KTS Books";
                    } else if (subType.includes('vso')) {
                        vQty = parsedQty;
                        itm = "VSO Books";
                        bType = "VSO Books";
                    } else {
                        kQty = parsedQty;
                        itm = "KTS Books";
                        bType = "KTS Books";
                    }
                }

                const doc = new MarketingRequirement({
                    centre: centreDoc._id,
                    centreName: centreDoc.centreName,
                    destinationCentre: hazraDoc ? hazraDoc._id : null,
                    destinationCentreName: hazraDoc ? hazraDoc.centreName : "HAZRA H.O",
                    leaflets: lQty,
                    banners: bQty,
                    bags: bgQty,
                    tshirts: tQty,
                    ktsBooks: kQty,
                    vsoBooks: vQty,
                    books: kQty + vQty,
                    bookType: bType,
                    itemType: itm,
                    quantity: parsedQty,
                    purpose: item.purpose || purpose || "",
                    status: 'Pending',
                    requestedBy: req.user?._id,
                    user: req.user?._id
                });

                await doc.save();
                createdDocs.push(doc);
            }

            if (createdDocs.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Please specify valid items with quantity greater than 0."
                });
            }

            return res.status(201).json({
                success: true,
                message: `Successfully placed ${createdDocs.length} requisition request(s) to Hazra HO!`,
                data: createdDocs
            });
        }

        // 2. Single item submission handling (legacy / direct)
        let leafletQty = Math.max(0, parseInt(leaflets, 10) || 0);
        let bannerQty  = Math.max(0, parseInt(banners, 10) || 0);
        let bagsQty    = Math.max(0, parseInt(bags, 10) || 0);
        let tshirtsQty = Math.max(0, parseInt(tshirts, 10) || 0);
        let ktsBooksQty = Math.max(0, parseInt(ktsBooks, 10) || 0);
        let vsoBooksQty = Math.max(0, parseInt(vsoBooks, 10) || 0);
        let parsedQty = Math.max(0, parseInt(quantity, 10) || 0);

        if (itemType) {
            const lower = itemType.toLowerCase();
            if (lower === 'leaflets' || lower === 'leaflet') {
                leafletQty = parsedQty || leafletQty;
            } else if (lower === 'banners' || lower === 'banner') {
                bannerQty = parsedQty || bannerQty;
            } else if (lower === 'bags' || lower === 'bag') {
                bagsQty = parsedQty || bagsQty;
            } else if (lower.includes('tshirt') || lower.includes('t-shirt')) {
                tshirtsQty = parsedQty || tshirtsQty;
            } else if (lower.includes('book') || bookType) {
                const subType = (bookType || itemType).toLowerCase();
                if (subType.includes('kts')) {
                    ktsBooksQty = parsedQty || ktsBooksQty;
                } else if (subType.includes('vso')) {
                    vsoBooksQty = parsedQty || vsoBooksQty;
                } else {
                    ktsBooksQty = parsedQty || ktsBooksQty;
                }
            }
        }

        const totalQty = leafletQty + bannerQty + bagsQty + tshirtsQty + ktsBooksQty + vsoBooksQty;

        if (totalQty === 0) {
            return res.status(400).json({
                success: false,
                message: "Please specify a quantity greater than 0 for the requisition material."
            });
        }

        let determinedItemType = itemType || "";
        if (!determinedItemType) {
            if (ktsBooksQty > 0) determinedItemType = "KTS Books";
            else if (vsoBooksQty > 0) determinedItemType = "VSO Books";
            else if (bagsQty > 0) determinedItemType = "Bags";
            else if (tshirtsQty > 0) determinedItemType = "T-Shirts";
            else if (leafletQty > 0 && bannerQty > 0) determinedItemType = "Leaflets & Banners";
            else if (leafletQty > 0) determinedItemType = "Leaflets";
            else if (bannerQty > 0) determinedItemType = "Banners";
        }

        const determinedBookType = bookType || (ktsBooksQty > 0 ? "KTS Books" : vsoBooksQty > 0 ? "VSO Books" : "");

        const requirement = new MarketingRequirement({
            centre: centreDoc._id,
            centreName: centreDoc.centreName,
            destinationCentre: hazraDoc ? hazraDoc._id : null,
            destinationCentreName: hazraDoc ? hazraDoc.centreName : "HAZRA H.O",
            leaflets: leafletQty,
            banners: bannerQty,
            bags: bagsQty,
            tshirts: tshirtsQty,
            ktsBooks: ktsBooksQty,
            vsoBooks: vsoBooksQty,
            books: ktsBooksQty + vsoBooksQty,
            bookType: determinedBookType,
            itemType: determinedItemType,
            quantity: totalQty,
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
                    { destinationCentreName: regex },
                    { itemType: regex },
                    { bookType: regex }
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
                    { $group: { 
                        _id: null, 
                        totalLeaflets: { $sum: '$approvedLeaflets' }, 
                        totalBanners: { $sum: '$approvedBanners' },
                        totalBags: { $sum: '$approvedBags' },
                        totalTshirts: { $sum: '$approvedTshirts' },
                        totalKtsBooks: { $sum: '$approvedKtsBooks' },
                        totalVsoBooks: { $sum: '$approvedVsoBooks' }
                    } }
                ])
            ])
        ]);

        const [pendingTotal, approvedTotal, rejectedTotal, approvedAgg] = summaryStats;
        const dispatchedTotals = approvedAgg[0] || { 
            totalLeaflets: 0, 
            totalBanners: 0, 
            totalBags: 0, 
            totalTshirts: 0, 
            totalKtsBooks: 0, 
            totalVsoBooks: 0 
        };

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
                totalBannersDispatched: dispatchedTotals.totalBanners || 0,
                totalBagsDispatched: dispatchedTotals.totalBags || 0,
                totalTshirtsDispatched: dispatchedTotals.totalTshirts || 0,
                totalKtsBooksDispatched: dispatchedTotals.totalKtsBooks || 0,
                totalVsoBooksDispatched: dispatchedTotals.totalVsoBooks || 0
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
        const { 
            approvedLeaflets, 
            approvedBanners, 
            approvedBags, 
            approvedTshirts, 
            approvedKtsBooks, 
            approvedVsoBooks, 
            approverRemarks 
        } = req.body;

        const requirement = await MarketingRequirement.findById(id);
        if (!requirement) {
            return res.status(404).json({ success: false, message: "Requisition not found" });
        }

        const prevStatus = requirement.status;
        const prevApprovedLeaflets = prevStatus === 'Approved' ? (requirement.approvedLeaflets || 0) : 0;
        const prevApprovedBanners  = prevStatus === 'Approved' ? (requirement.approvedBanners || 0) : 0;
        const prevApprovedBags     = prevStatus === 'Approved' ? (requirement.approvedBags || 0) : 0;
        const prevApprovedTshirts  = prevStatus === 'Approved' ? (requirement.approvedTshirts || 0) : 0;
        const prevApprovedKts      = prevStatus === 'Approved' ? (requirement.approvedKtsBooks || 0) : 0;
        const prevApprovedVso      = prevStatus === 'Approved' ? (requirement.approvedVsoBooks || 0) : 0;

        // Determine final approved quantities
        const finalLeaflets = approvedLeaflets !== undefined 
            ? Math.max(0, parseInt(approvedLeaflets, 10) || 0) 
            : (prevStatus === 'Approved' && requirement.approvedLeaflets !== undefined ? requirement.approvedLeaflets : (requirement.leaflets || 0));

        const finalBanners = approvedBanners !== undefined 
            ? Math.max(0, parseInt(approvedBanners, 10) || 0) 
            : (prevStatus === 'Approved' && requirement.approvedBanners !== undefined ? requirement.approvedBanners : (requirement.banners || 0));

        const finalBags = approvedBags !== undefined 
            ? Math.max(0, parseInt(approvedBags, 10) || 0) 
            : (prevStatus === 'Approved' && requirement.approvedBags !== undefined ? requirement.approvedBags : (requirement.bags || 0));

        const finalTshirts = approvedTshirts !== undefined 
            ? Math.max(0, parseInt(approvedTshirts, 10) || 0) 
            : (prevStatus === 'Approved' && requirement.approvedTshirts !== undefined ? requirement.approvedTshirts : (requirement.tshirts || 0));

        const finalKts = approvedKtsBooks !== undefined 
            ? Math.max(0, parseInt(approvedKtsBooks, 10) || 0) 
            : (prevStatus === 'Approved' && requirement.approvedKtsBooks !== undefined ? requirement.approvedKtsBooks : (requirement.ktsBooks || 0));

        const finalVso = approvedVsoBooks !== undefined 
            ? Math.max(0, parseInt(approvedVsoBooks, 10) || 0) 
            : (prevStatus === 'Approved' && requirement.approvedVsoBooks !== undefined ? requirement.approvedVsoBooks : (requirement.vsoBooks || 0));

        const diffLeaflets = finalLeaflets - prevApprovedLeaflets;
        const diffBanners  = finalBanners - prevApprovedBanners;
        const diffBags     = finalBags - prevApprovedBags;
        const diffTshirts  = finalTshirts - prevApprovedTshirts;
        const diffKts      = finalKts - prevApprovedKts;
        const diffVso      = finalVso - prevApprovedVso;

        requirement.status = 'Approved';
        requirement.approvedLeaflets = finalLeaflets;
        requirement.approvedBanners = finalBanners;
        requirement.approvedBags = finalBags;
        requirement.approvedTshirts = finalTshirts;
        requirement.approvedKtsBooks = finalKts;
        requirement.approvedVsoBooks = finalVso;
        requirement.approvedBooks = finalKts + finalVso;
        requirement.approvedQuantity = finalLeaflets + finalBanners + finalBags + finalTshirts + finalKts + finalVso;
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
                bags: 0,
                tshirts: 0,
                ktsBooks: 0,
                vsoBooks: 0,
                totalLeafletsReceived: 0,
                totalBannersReceived: 0,
                totalBagsReceived: 0,
                totalTshirtsReceived: 0,
                totalKtsBooksReceived: 0,
                totalVsoBooksReceived: 0
            });
        }

        bucket.leaflets = Math.max(0, (bucket.leaflets || 0) + diffLeaflets);
        bucket.banners  = Math.max(0, (bucket.banners || 0) + diffBanners);
        bucket.bags     = Math.max(0, (bucket.bags || 0) + diffBags);
        bucket.tshirts  = Math.max(0, (bucket.tshirts || 0) + diffTshirts);
        bucket.ktsBooks = Math.max(0, (bucket.ktsBooks || 0) + diffKts);
        bucket.vsoBooks = Math.max(0, (bucket.vsoBooks || 0) + diffVso);

        bucket.totalLeafletsReceived = Math.max(0, (bucket.totalLeafletsReceived || 0) + diffLeaflets);
        bucket.totalBannersReceived  = Math.max(0, (bucket.totalBannersReceived || 0) + diffBanners);
        bucket.totalBagsReceived     = Math.max(0, (bucket.totalBagsReceived || 0) + diffBags);
        bucket.totalTshirtsReceived  = Math.max(0, (bucket.totalTshirtsReceived || 0) + diffTshirts);
        bucket.totalKtsBooksReceived = Math.max(0, (bucket.totalKtsBooksReceived || 0) + diffKts);
        bucket.totalVsoBooksReceived = Math.max(0, (bucket.totalVsoBooksReceived || 0) + diffVso);
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
                ? `Approval updated! Quantities adjusted in ${requirement.centreName} bucket.`
                : `Requisition approved! Quantities credited to ${requirement.centreName} bucket.`,
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
            const deductBanners  = requirement.approvedBanners || 0;
            const deductBags     = requirement.approvedBags || 0;
            const deductTshirts  = requirement.approvedTshirts || 0;
            const deductKts      = requirement.approvedKtsBooks || 0;
            const deductVso      = requirement.approvedVsoBooks || 0;

            if (deductLeaflets > 0 || deductBanners > 0 || deductBags > 0 || deductTshirts > 0 || deductKts > 0 || deductVso > 0) {
                let bucket = await MarketingCentreBucket.findOne({ centre: requirement.centre });
                if (bucket) {
                    bucket.leaflets = Math.max(0, (bucket.leaflets || 0) - deductLeaflets);
                    bucket.banners  = Math.max(0, (bucket.banners || 0) - deductBanners);
                    bucket.bags     = Math.max(0, (bucket.bags || 0) - deductBags);
                    bucket.tshirts  = Math.max(0, (bucket.tshirts || 0) - deductTshirts);
                    bucket.ktsBooks = Math.max(0, (bucket.ktsBooks || 0) - deductKts);
                    bucket.vsoBooks = Math.max(0, (bucket.vsoBooks || 0) - deductVso);

                    bucket.totalLeafletsReceived = Math.max(0, (bucket.totalLeafletsReceived || 0) - deductLeaflets);
                    bucket.totalBannersReceived  = Math.max(0, (bucket.totalBannersReceived || 0) - deductBanners);
                    bucket.totalBagsReceived     = Math.max(0, (bucket.totalBagsReceived || 0) - deductBags);
                    bucket.totalTshirtsReceived  = Math.max(0, (bucket.totalTshirtsReceived || 0) - deductTshirts);
                    bucket.totalKtsBooksReceived = Math.max(0, (bucket.totalKtsBooksReceived || 0) - deductKts);
                    bucket.totalVsoBooksReceived = Math.max(0, (bucket.totalVsoBooksReceived || 0) - deductVso);

                    bucket.lastUpdated = new Date();
                    bucket.updatedBy = req.user?._id;
                    await bucket.save();
                }
            }
        }

        requirement.status = 'Rejected';
        requirement.approvedLeaflets = 0;
        requirement.approvedBanners = 0;
        requirement.approvedBags = 0;
        requirement.approvedTshirts = 0;
        requirement.approvedKtsBooks = 0;
        requirement.approvedVsoBooks = 0;
        requirement.approvedBooks = 0;
        requirement.approvedQuantity = 0;
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

// UPDATE Requisition (Edit requested materials, purpose)
export const updateRequisition = async (req, res) => {
    try {
        const { id } = req.params;
        const { leaflets, banners, bags, tshirts, ktsBooks, vsoBooks, books, bookType, itemType, quantity, purpose } = req.body;

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

        let leafletQty = leaflets !== undefined ? Math.max(0, parseInt(leaflets, 10) || 0) : requirement.leaflets;
        let bannerQty  = banners !== undefined ? Math.max(0, parseInt(banners, 10) || 0) : requirement.banners;
        let bagsQty    = bags !== undefined ? Math.max(0, parseInt(bags, 10) || 0) : (requirement.bags || 0);
        let tshirtsQty = tshirts !== undefined ? Math.max(0, parseInt(tshirts, 10) || 0) : (requirement.tshirts || 0);
        let ktsBooksQty = ktsBooks !== undefined ? Math.max(0, parseInt(ktsBooks, 10) || 0) : (requirement.ktsBooks || 0);
        let vsoBooksQty = vsoBooks !== undefined ? Math.max(0, parseInt(vsoBooks, 10) || 0) : (requirement.vsoBooks || 0);
        let parsedQty = quantity !== undefined ? Math.max(0, parseInt(quantity, 10) || 0) : 0;

        if (itemType) {
            const lower = itemType.toLowerCase();
            if (lower === 'leaflets' || lower === 'leaflet') {
                leafletQty = parsedQty || leafletQty;
                bannerQty = 0; bagsQty = 0; tshirtsQty = 0; ktsBooksQty = 0; vsoBooksQty = 0;
            } else if (lower === 'banners' || lower === 'banner') {
                bannerQty = parsedQty || bannerQty;
                leafletQty = 0; bagsQty = 0; tshirtsQty = 0; ktsBooksQty = 0; vsoBooksQty = 0;
            } else if (lower === 'bags' || lower === 'bag') {
                bagsQty = parsedQty || bagsQty;
                leafletQty = 0; bannerQty = 0; tshirtsQty = 0; ktsBooksQty = 0; vsoBooksQty = 0;
            } else if (lower.includes('tshirt') || lower.includes('t-shirt')) {
                tshirtsQty = parsedQty || tshirtsQty;
                leafletQty = 0; bannerQty = 0; bagsQty = 0; ktsBooksQty = 0; vsoBooksQty = 0;
            } else if (lower.includes('book') || bookType) {
                const subType = (bookType || itemType).toLowerCase();
                if (subType.includes('kts')) {
                    ktsBooksQty = parsedQty || ktsBooksQty;
                    leafletQty = 0; bannerQty = 0; bagsQty = 0; tshirtsQty = 0; vsoBooksQty = 0;
                } else if (subType.includes('vso')) {
                    vsoBooksQty = parsedQty || vsoBooksQty;
                    leafletQty = 0; bannerQty = 0; bagsQty = 0; tshirtsQty = 0; ktsBooksQty = 0;
                }
            }
        }

        const totalQty = leafletQty + bannerQty + bagsQty + tshirtsQty + ktsBooksQty + vsoBooksQty;
        if (totalQty === 0) {
            return res.status(400).json({
                success: false,
                message: "Please specify a quantity greater than 0 for the requisition material."
            });
        }

        requirement.leaflets = leafletQty;
        requirement.banners = bannerQty;
        requirement.bags = bagsQty;
        requirement.tshirts = tshirtsQty;
        requirement.ktsBooks = ktsBooksQty;
        requirement.vsoBooks = vsoBooksQty;
        requirement.books = ktsBooksQty + vsoBooksQty;
        requirement.quantity = totalQty;
        if (itemType) requirement.itemType = itemType;
        if (bookType !== undefined) requirement.bookType = bookType;
        if (purpose !== undefined) requirement.purpose = purpose;

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
            const appBanners  = requirement.approvedBanners || 0;
            const appBags     = requirement.approvedBags || 0;
            const appTshirts  = requirement.approvedTshirts || 0;
            const appKts      = requirement.approvedKtsBooks || 0;
            const appVso      = requirement.approvedVsoBooks || 0;

            if (appLeaflets > 0 || appBanners > 0 || appBags > 0 || appTshirts > 0 || appKts > 0 || appVso > 0) {
                await MarketingCentreBucket.findOneAndUpdate(
                    { centre: requirement.centre },
                    {
                        $inc: {
                            leaflets: -appLeaflets,
                            banners: -appBanners,
                            bags: -appBags,
                            tshirts: -appTshirts,
                            ktsBooks: -appKts,
                            vsoBooks: -appVso,
                            totalLeafletsReceived: -appLeaflets,
                            totalBannersReceived: -appBanners,
                            totalBagsReceived: -appBags,
                            totalTshirtsReceived: -appTshirts,
                            totalKtsBooksReceived: -appKts,
                            totalVsoBooksReceived: -appVso
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
        const { leaflets, banners, bags, tshirts, ktsBooks, vsoBooks } = req.body;

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
                bags: 0,
                tshirts: 0,
                ktsBooks: 0,
                vsoBooks: 0,
                totalLeafletsReceived: 0,
                totalBannersReceived: 0,
                totalBagsReceived: 0,
                totalTshirtsReceived: 0,
                totalKtsBooksReceived: 0,
                totalVsoBooksReceived: 0
            });
        }

        if (leaflets !== undefined) bucket.leaflets = Math.max(0, parseInt(leaflets, 10) || 0);
        if (banners !== undefined)  bucket.banners  = Math.max(0, parseInt(banners, 10) || 0);
        if (bags !== undefined)     bucket.bags     = Math.max(0, parseInt(bags, 10) || 0);
        if (tshirts !== undefined)  bucket.tshirts  = Math.max(0, parseInt(tshirts, 10) || 0);
        if (ktsBooks !== undefined) bucket.ktsBooks = Math.max(0, parseInt(ktsBooks, 10) || 0);
        if (vsoBooks !== undefined) bucket.vsoBooks = Math.max(0, parseInt(vsoBooks, 10) || 0);

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
