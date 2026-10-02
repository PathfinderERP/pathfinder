import MarketingCentreBucket from "../../models/Operations/MarketingCentreBucket.js";
import MarketingStockMovement from "../../models/Operations/MarketingStockMovement.js";
import MarketingRequirement from "../../models/Operations/MarketingRequirement.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import User from "../../models/User.js";
import { getHazraHOCentre } from "./marketingController.js";

// Helper to normalize material keys
const MATERIAL_MAP = {
    'leaflets': 'leaflets',
    'leaflet': 'leaflets',
    'banners': 'banners',
    'banner': 'banners',
    'bags': 'bags',
    'bag': 'bags',
    'tshirts': 'tshirts',
    'tshirt': 'tshirts',
    't-shirts': 'tshirts',
    't-shirt': 'tshirts',
    'ktsbooks': 'ktsBooks',
    'kts books': 'ktsBooks',
    'kts': 'ktsBooks',
    'vsobooks': 'vsoBooks',
    'vso books': 'vsoBooks',
    'vso': 'vsoBooks'
};

const normalizeMaterialKey = (name = "") => {
    const clean = name.toLowerCase().trim();
    return MATERIAL_MAP[clean] || null;
};

// Strict material matching helper to prevent substring collision (e.g., leaflets matching t-shirts)
export const matchesMaterial = (materialStr, key) => {
    if (!materialStr || !key) return false;
    const s = String(materialStr).toLowerCase().replace(/[-_\s]+/g, '');
    const k = String(key).toLowerCase().replace(/[-_\s]+/g, '');
    
    if (k === 'leaflets' || k === 'leaflet') {
        return s.includes('leaflet');
    }
    if (k === 'banners' || k === 'banner') {
        return s.includes('banner');
    }
    if (k === 'bags' || k === 'bag') {
        return s.includes('bag');
    }
    if (k === 'tshirts' || k === 'tshirt') {
        return s.includes('tshirt') || s.includes('t-shirt');
    }
    if (k === 'ktsbooks' || k === 'kts') {
        return s.includes('kts');
    }
    if (k === 'vsobooks' || k === 'vso') {
        return s.includes('vso');
    }
    return false;
};

// 1. GET Hazra Centre Current Stock & Summary
export const getHazraStock = async (req, res) => {
    try {
        const hazra = await getHazraHOCentre();
        if (!hazra) {
            return res.status(404).json({ success: false, message: "Hazra H.O centre not found in database." });
        }

        let bucket = await MarketingCentreBucket.findOne({ centre: hazra._id });
        if (!bucket) {
            bucket = await MarketingCentreBucket.create({
                centre: hazra._id,
                centreName: hazra.centreName || "HAZRA H.O",
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

        // Aggregate total approved requisitions that deducted from main stock
        const approvedStats = await MarketingRequirement.aggregate([
            { $match: { status: 'Approved' } },
            {
                $group: {
                    _id: null,
                    totalLeaflets: { $sum: "$approvedLeaflets" },
                    totalBanners: { $sum: "$approvedBanners" },
                    totalBags: { $sum: "$approvedBags" },
                    totalTshirts: { $sum: "$approvedTshirts" },
                    totalKts: { $sum: "$approvedKtsBooks" },
                    totalVso: { $sum: "$approvedVsoBooks" },
                    count: { $sum: 1 }
                }
            }
        ]);

        const app = approvedStats[0] || {};
        const totalDispatched = (app.totalLeaflets || 0) +
            (app.totalBanners || 0) +
            (app.totalBags || 0) +
            (app.totalTshirts || 0) +
            (app.totalKts || 0) +
            (app.totalVso || 0);

        // Fetch all stock in movements to Hazra to accurately determine total added per material
        const stockInMovements = await MarketingStockMovement.find({
            centre: hazra._id,
            movementType: 'STOCK_IN'
        });

        const stockInMap = {
            leaflets: 0,
            banners: 0,
            bags: 0,
            tshirts: 0,
            ktsBooks: 0,
            vsoBooks: 0
        };

        stockInMovements.forEach(mov => {
            if (Array.isArray(mov.items) && mov.items.length > 0) {
                mov.items.forEach(it => {
                    const qty = it.quantity || 0;
                    ['leaflets', 'banners', 'bags', 'tshirts', 'ktsBooks', 'vsoBooks'].forEach(k => {
                        if (matchesMaterial(it.material, k)) {
                            stockInMap[k] += qty;
                        }
                    });
                });
            } else if (mov.material) {
                const qty = mov.quantity || 0;
                ['leaflets', 'banners', 'bags', 'tshirts', 'ktsBooks', 'vsoBooks'].forEach(k => {
                    if (matchesMaterial(mov.material, k)) {
                        stockInMap[k] += qty;
                    }
                });
            }
        });

        const totalStockInCalculated = Object.values(stockInMap).reduce((a, b) => a + b, 0);

        // Synchronize bucket: available stock = Math.max(0, Total In - Total Dispatched)
        bucket.leaflets = Math.max(0, stockInMap.leaflets - (app.totalLeaflets || 0));
        bucket.banners = Math.max(0, stockInMap.banners - (app.totalBanners || 0));
        bucket.bags = Math.max(0, stockInMap.bags - (app.totalBags || 0));
        bucket.tshirts = Math.max(0, stockInMap.tshirts - (app.totalTshirts || 0));
        bucket.ktsBooks = Math.max(0, stockInMap.ktsBooks - (app.totalKts || 0));
        bucket.vsoBooks = Math.max(0, stockInMap.vsoBooks - (app.totalVso || 0));
        bucket.totalLeafletsReceived = stockInMap.leaflets;
        bucket.totalBannersReceived = stockInMap.banners;
        bucket.totalBagsReceived = stockInMap.bags;
        bucket.totalTshirtsReceived = stockInMap.tshirts;
        bucket.totalKtsBooksReceived = stockInMap.ktsBooks;
        bucket.totalVsoBooksReceived = stockInMap.vsoBooks;
        await bucket.save();

        const totalUnitsInStock = (bucket.leaflets || 0) +
            (bucket.banners || 0) +
            (bucket.bags || 0) +
            (bucket.tshirts || 0) +
            (bucket.ktsBooks || 0) +
            (bucket.vsoBooks || 0);

        return res.status(200).json({
            success: true,
            centre: {
                id: hazra._id,
                name: hazra.centreName,
                code: hazra.centreCode,
                location: hazra.location
            },
            stock: bucket,
            stats: {
                totalUnitsInStock,
                totalStockIn: totalStockInCalculated,
                totalDispatched,
                totalApprovedRequisitions: app.count || 0
            }
        });
    } catch (error) {
        console.error("Error in getHazraStock:", error);
        return res.status(500).json({ success: false, message: "Error fetching Hazra stock", error: error.message });
    }
};

// 2. PUT Update Hazra Stock directly (User putting the current baseline/physical stock)
export const updateHazraStockDirectly = async (req, res) => {
    try {
        const hazra = await getHazraHOCentre();
        if (!hazra) {
            return res.status(404).json({ success: false, message: "Hazra H.O centre not found in database." });
        }

        const { leaflets, banners, bags, tshirts, ktsBooks, vsoBooks, remarks } = req.body;

        let bucket = await MarketingCentreBucket.findOne({ centre: hazra._id });
        if (!bucket) {
            bucket = new MarketingCentreBucket({
                centre: hazra._id,
                centreName: hazra.centreName || "HAZRA H.O"
            });
        }

        const prevValues = {
            leaflets: bucket.leaflets || 0,
            banners: bucket.banners || 0,
            bags: bucket.bags || 0,
            tshirts: bucket.tshirts || 0,
            ktsBooks: bucket.ktsBooks || 0,
            vsoBooks: bucket.vsoBooks || 0
        };

        const itemsChanged = [];

        if (leaflets !== undefined) {
            const val = Math.max(0, parseInt(leaflets, 10) || 0);
            if (val !== prevValues.leaflets) {
                itemsChanged.push({ material: 'Leaflets', quantity: val - prevValues.leaflets, previousStock: prevValues.leaflets, newStock: val });
                bucket.leaflets = val;
            }
        }
        if (banners !== undefined) {
            const val = Math.max(0, parseInt(banners, 10) || 0);
            if (val !== prevValues.banners) {
                itemsChanged.push({ material: 'Banners', quantity: val - prevValues.banners, previousStock: prevValues.banners, newStock: val });
                bucket.banners = val;
            }
        }
        if (bags !== undefined) {
            const val = Math.max(0, parseInt(bags, 10) || 0);
            if (val !== prevValues.bags) {
                itemsChanged.push({ material: 'Bags', quantity: val - prevValues.bags, previousStock: prevValues.bags, newStock: val });
                bucket.bags = val;
            }
        }
        if (tshirts !== undefined) {
            const val = Math.max(0, parseInt(tshirts, 10) || 0);
            if (val !== prevValues.tshirts) {
                itemsChanged.push({ material: 'T-Shirts', quantity: val - prevValues.tshirts, previousStock: prevValues.tshirts, newStock: val });
                bucket.tshirts = val;
            }
        }
        if (ktsBooks !== undefined) {
            const val = Math.max(0, parseInt(ktsBooks, 10) || 0);
            if (val !== prevValues.ktsBooks) {
                itemsChanged.push({ material: 'KTS Books', quantity: val - prevValues.ktsBooks, previousStock: prevValues.ktsBooks, newStock: val });
                bucket.ktsBooks = val;
            }
        }
        if (vsoBooks !== undefined) {
            const val = Math.max(0, parseInt(vsoBooks, 10) || 0);
            if (val !== prevValues.vsoBooks) {
                itemsChanged.push({ material: 'VSO Books', quantity: val - prevValues.vsoBooks, previousStock: prevValues.vsoBooks, newStock: val });
                bucket.vsoBooks = val;
            }
        }

        bucket.lastUpdated = new Date();
        bucket.updatedBy = req.user?._id;
        await bucket.save();

        if (itemsChanged.length > 0) {
            const netQuantity = itemsChanged.reduce((acc, it) => acc + Math.abs(it.quantity), 0);
            await MarketingStockMovement.create({
                movementType: 'STOCK_ADJUSTMENT',
                centre: hazra._id,
                centreName: hazra.centreName,
                material: itemsChanged.map(i => i.material).join(', '),
                quantity: netQuantity,
                items: itemsChanged,
                remarks: remarks || "Manual stock baseline count update",
                performedBy: req.user?._id
            });
        }

        return res.status(200).json({
            success: true,
            message: "Hazra central marketing stock updated successfully.",
            stock: bucket,
            changesCount: itemsChanged.length
        });
    } catch (error) {
        console.error("Error updating Hazra stock:", error);
        return res.status(500).json({ success: false, message: "Error updating Hazra stock", error: error.message });
    }
};

// 3. POST Record Stock In (New incoming stock to main stock)
export const recordStockIn = async (req, res) => {
    try {
        const hazra = await getHazraHOCentre();
        if (!hazra) {
            return res.status(404).json({ success: false, message: "Hazra H.O centre not found in database." });
        }

        const { material, quantity, sourceOrVendor, remarks, items } = req.body;

        let bucket = await MarketingCentreBucket.findOne({ centre: hazra._id });
        if (!bucket) {
            bucket = new MarketingCentreBucket({
                centre: hazra._id,
                centreName: hazra.centreName || "HAZRA H.O"
            });
        }

        const itemsToAdd = [];

        if (Array.isArray(items) && items.length > 0) {
            for (const item of items) {
                const key = normalizeMaterialKey(item.material);
                const qty = Math.max(0, parseInt(item.quantity, 10) || 0);
                if (key && qty > 0) {
                    itemsToAdd.push({ key, material: item.material, quantity: qty });
                }
            }
        } else {
            const key = normalizeMaterialKey(material);
            const qty = Math.max(0, parseInt(quantity, 10) || 0);
            if (!key) {
                return res.status(400).json({ success: false, message: "Please specify a valid marketing material type." });
            }
            if (qty <= 0) {
                return res.status(400).json({ success: false, message: "Stock in quantity must be greater than 0." });
            }
            itemsToAdd.push({ key, material, quantity: qty });
        }

        if (itemsToAdd.length === 0) {
            return res.status(400).json({ success: false, message: "No valid items or quantities provided for stock in." });
        }

        const recordedItems = [];
        let totalQtyAdded = 0;

        for (const item of itemsToAdd) {
            const prevStock = bucket[item.key] || 0;
            const newStock = prevStock + item.quantity;
            bucket[item.key] = newStock;

            const totalRecKey = `total${item.key.charAt(0).toUpperCase() + item.key.slice(1)}Received`;
            if (bucket[totalRecKey] !== undefined) {
                bucket[totalRecKey] = (bucket[totalRecKey] || 0) + item.quantity;
            }

            recordedItems.push({
                material: item.material,
                quantity: item.quantity,
                previousStock: prevStock,
                newStock: newStock
            });
            totalQtyAdded += item.quantity;
        }

        bucket.lastUpdated = new Date();
        bucket.updatedBy = req.user?._id;
        await bucket.save();

        const movementDoc = await MarketingStockMovement.create({
            movementType: 'STOCK_IN',
            centre: hazra._id,
            centreName: hazra.centreName,
            material: recordedItems.map(i => `${i.material} (+${i.quantity})`).join(', '),
            quantity: totalQtyAdded,
            items: recordedItems,
            sourceOrVendor: sourceOrVendor || "",
            remarks: remarks || "New stock in added to Hazra main warehouse",
            performedBy: req.user?._id
        });

        return res.status(201).json({
            success: true,
            message: `Successfully added ${totalQtyAdded} unit(s) into Hazra main stock.`,
            stock: bucket,
            movement: movementDoc
        });
    } catch (error) {
        console.error("Error in recordStockIn:", error);
        return res.status(500).json({ success: false, message: "Error recording stock in", error: error.message });
    }
};

// 4. GET Centre-Wise Dispatched Report Table List
// Shows which centres materials have been sent to from Hazra main stock via Marketing Approvals
export const getCentreWiseReport = async (req, res) => {
    try {
        const { search } = req.query;

        // Fetch all approved requirements that were dispatched to centres
        const approvedReqs = await MarketingRequirement.find({
            status: 'Approved'
        })
        .populate('centre', 'centreName centreCode location')
        .populate('approvedBy', 'name email role')
        .populate('requestedBy', 'name email role')
        .sort({ approvedAt: -1, createdAt: -1 });

        // Aggregate by centre
        const centreMap = new Map();

        approvedReqs.forEach(reqDoc => {
            const centreIdStr = reqDoc.centre?._id?.toString() || reqDoc.centre?.toString() || "unknown";
            const centreName = reqDoc.centre?.centreName || reqDoc.centreName || "Centre";
            const centreCode = reqDoc.centre?.centreCode || "";
            const location = reqDoc.centre?.location || "";

            const isHazraSelf = centreName.toLowerCase().includes("hazra");
            const finalCentreName = isHazraSelf ? "HAZRA H.O (Internal / Local)" : centreName;

            if (!centreMap.has(centreIdStr)) {
                centreMap.set(centreIdStr, {
                    centreId: centreIdStr,
                    centreName: finalCentreName,
                    centreCode,
                    location,
                    leaflets: 0,
                    banners: 0,
                    bags: 0,
                    tshirts: 0,
                    ktsBooks: 0,
                    vsoBooks: 0,
                    totalUnits: 0,
                    approvedRequisitionsCount: 0,
                    lastDispatchedAt: reqDoc.approvedAt || reqDoc.updatedAt || reqDoc.createdAt,
                    dispatches: []
                });
            }

            const cData = centreMap.get(centreIdStr);
            const l = reqDoc.approvedLeaflets || 0;
            const bn = reqDoc.approvedBanners || 0;
            const bg = reqDoc.approvedBags || 0;
            const t = reqDoc.approvedTshirts || 0;
            const k = reqDoc.approvedKtsBooks || 0;
            const v = reqDoc.approvedVsoBooks || 0;
            const tot = (l + bn + bg + t + k + v) || reqDoc.approvedQuantity || 0;

            cData.leaflets += l;
            cData.banners += bn;
            cData.bags += bg;
            cData.tshirts += t;
            cData.ktsBooks += k;
            cData.vsoBooks += v;
            cData.totalUnits += tot;
            cData.approvedRequisitionsCount += 1;

            if (reqDoc.approvedAt && (!cData.lastDispatchedAt || new Date(reqDoc.approvedAt) > new Date(cData.lastDispatchedAt))) {
                cData.lastDispatchedAt = reqDoc.approvedAt;
            }

            cData.dispatches.push({
                requisitionId: reqDoc._id,
                approvedAt: reqDoc.approvedAt || reqDoc.updatedAt,
                leaflets: l,
                banners: bn,
                bags: bg,
                tshirts: t,
                ktsBooks: k,
                vsoBooks: v,
                totalUnits: tot,
                purpose: reqDoc.purpose || "",
                approvedBy: reqDoc.approvedBy ? { name: reqDoc.approvedBy.name, role: reqDoc.approvedBy.role } : null,
                requestedBy: reqDoc.requestedBy ? { name: reqDoc.requestedBy.name } : null
            });
        });

        let results = Array.from(centreMap.values());

        // Sort by total units sent descending
        results.sort((a, b) => b.totalUnits - a.totalUnits);

        if (search) {
            const q = search.toLowerCase();
            results = results.filter(r => 
                r.centreName.toLowerCase().includes(q) ||
                r.centreCode.toLowerCase().includes(q) ||
                r.location.toLowerCase().includes(q)
            );
        }

        // Summary totals across all centres
        const summary = {
            totalCentresServed: results.length,
            totalLeafletsSent: results.reduce((acc, c) => acc + c.leaflets, 0),
            totalBannersSent: results.reduce((acc, c) => acc + c.banners, 0),
            totalBagsSent: results.reduce((acc, c) => acc + c.bags, 0),
            totalTshirtsSent: results.reduce((acc, c) => acc + c.tshirts, 0),
            totalKtsBooksSent: results.reduce((acc, c) => acc + c.ktsBooks, 0),
            totalVsoBooksSent: results.reduce((acc, c) => acc + c.vsoBooks, 0),
            totalUnitsSent: results.reduce((acc, c) => acc + c.totalUnits, 0),
            totalRequisitionsApproved: approvedReqs.length
        };

        return res.status(200).json({
            success: true,
            summary,
            data: results,
            allDispatches: approvedReqs
        });
    } catch (error) {
        console.error("Error in getCentreWiseReport:", error);
        return res.status(500).json({ success: false, message: "Error generating centre-wise report", error: error.message });
    }
};

// 5. GET Stock Movement History / Audit Logs
export const getStockMovements = async (req, res) => {
    try {
        const hazra = await getHazraHOCentre();
        if (!hazra) {
            return res.status(404).json({ success: false, message: "Hazra H.O centre not found in database." });
        }

        const { movementType, search, limit = 50, page = 1 } = req.query;

        const query = { centre: hazra._id };

        if (movementType && movementType !== 'all') {
            query.movementType = movementType;
        }

        if (search) {
            const regex = new RegExp(search, 'i');
            query.$or = [
                { material: regex },
                { remarks: regex },
                { purpose: regex },
                { targetCentreName: regex },
                { sourceOrVendor: regex }
            ];
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
        const skip = (pageNum - 1) * limitNum;

        const [movements, total] = await Promise.all([
            MarketingStockMovement.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate('performedBy', 'name email role')
                .populate('targetCentre', 'centreName centreCode')
                .populate('requisition', 'purpose itemType quantity approvedAt'),
            MarketingStockMovement.countDocuments(query)
        ]);

        return res.status(200).json({
            success: true,
            data: movements,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error("Error fetching stock movements:", error);
        return res.status(500).json({ success: false, message: "Error fetching stock movements", error: error.message });
    }
};

// 6. GET Consolidated Stock Report per Material & Centre
export const getConsolidatedReport = async (req, res) => {
    try {
        const hazra = await getHazraHOCentre();
        if (!hazra) {
            return res.status(404).json({ success: false, message: "Hazra H.O centre not found in database." });
        }

        let hazraBucket = await MarketingCentreBucket.findOne({ centre: hazra._id });
        if (!hazraBucket) {
            hazraBucket = {
                leaflets: 0, banners: 0, bags: 0, tshirts: 0, ktsBooks: 0, vsoBooks: 0
            };
        }

        const approvedReqs = await MarketingRequirement.find({
            status: 'Approved'
        }).populate('centre', 'centreName centreCode location');

        const movements = await MarketingStockMovement.find({
            centre: hazra._id
        }).sort({ createdAt: -1 });

        const materialsMeta = [
            { key: 'leaflets', name: 'Leaflets' },
            { key: 'banners', name: 'Banners' },
            { key: 'bags', name: 'Bags' },
            { key: 'tshirts', name: 'T-Shirts' },
            { key: 'ktsBooks', name: 'KTS Books' },
            { key: 'vsoBooks', name: 'VSO Books' }
        ];

        const materials = materialsMeta.map(m => {
            let totalDispatched = 0;
            let reqsCount = 0;
            const centreDispatchesMap = new Map();

            approvedReqs.forEach(r => {
                let qty = 0;
                if (m.key === 'leaflets') qty = r.approvedLeaflets || 0;
                else if (m.key === 'banners') qty = r.approvedBanners || 0;
                else if (m.key === 'bags') qty = r.approvedBags || 0;
                else if (m.key === 'tshirts') qty = r.approvedTshirts || 0;
                else if (m.key === 'ktsBooks') qty = r.approvedKtsBooks || 0;
                else if (m.key === 'vsoBooks') qty = r.approvedVsoBooks || 0;

                if (qty > 0) {
                    totalDispatched += qty;
                    reqsCount += 1;
                    const cName = r.centreName || r.centre?.centreName || "Other Centre";
                    centreDispatchesMap.set(cName, (centreDispatchesMap.get(cName) || 0) + qty);
                }
            });

            let totalStockIn = 0;
            movements.filter(mov => mov.movementType === 'STOCK_IN').forEach(mov => {
                if (Array.isArray(mov.items) && mov.items.length > 0) {
                    mov.items.forEach(it => {
                        if (matchesMaterial(it.material, m.key)) {
                            totalStockIn += (it.quantity || 0);
                        }
                    });
                } else if (mov.material) {
                    if (matchesMaterial(mov.material, m.key)) {
                        totalStockIn += (mov.quantity || 0);
                    }
                }
            });

            const currentStock = Math.max(0, totalStockIn - totalDispatched);

            const centresBreakdown = Array.from(centreDispatchesMap.entries()).map(([centreName, quantity]) => ({
                centreName,
                quantity
            }));

            return {
                materialKey: m.key,
                materialName: m.name,
                currentStock,
                totalStockIn,
                totalDispatched,
                centresSupplied: centresBreakdown.length,
                requisitionsApproved: reqsCount,
                centresBreakdown,
                status: currentStock > 50 ? 'In Stock' : (currentStock > 0 ? 'Low Stock' : 'Out of Stock')
            };
        });

        return res.status(200).json({
            success: true,
            materials,
            summary: {
                totalCurrentStock: materials.reduce((acc, m) => acc + m.currentStock, 0),
                totalStockIn: materials.reduce((acc, m) => acc + m.totalStockIn, 0),
                totalDispatched: materials.reduce((acc, m) => acc + m.totalDispatched, 0)
            }
        });
    } catch (error) {
        console.error("Error in getConsolidatedReport:", error);
        return res.status(500).json({ success: false, message: "Error generating consolidated report", error: error.message });
    }
};
