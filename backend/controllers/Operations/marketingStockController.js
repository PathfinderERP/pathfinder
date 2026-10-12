import MarketingCentreBucket from "../../models/Operations/MarketingCentreBucket.js";
import MarketingStockMovement from "../../models/Operations/MarketingStockMovement.js";
import MarketingRequirement from "../../models/Operations/MarketingRequirement.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import User from "../../models/User.js";
import InventoryMaster from "../../models/Master_data/Inventory.js";
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
    'key to success book': 'ktsBooks',
    'vsobooks': 'vsoBooks',
    'vso books': 'vsoBooks',
    'vso': 'vsoBooks'
};

export const normalizeMaterialKey = (name = "") => {
    if (!name) return "";
    const clean = name.toLowerCase().trim();
    if (MATERIAL_MAP[clean]) return MATERIAL_MAP[clean];
    const noSpace = clean.replace(/[-_\s]+/g, '');
    if (noSpace.includes('leaflet')) return 'leaflets';
    if (noSpace.includes('banner')) return 'banners';
    if (noSpace.includes('bag')) return 'bags';
    if (noSpace.includes('tshirt')) return 'tshirts';
    if (noSpace.includes('kts') || noSpace.includes('keytosuccess')) return 'ktsBooks';
    if (noSpace.includes('vso')) return 'vsoBooks';
    return clean.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'item';
};

// Strict material matching helper to prevent substring collision
export const matchesMaterial = (materialStr, keyOrName) => {
    if (!materialStr || !keyOrName) return false;
    const s = String(materialStr).toLowerCase().replace(/[-_\s]+/g, '');
    const k = String(keyOrName).toLowerCase().replace(/[-_\s]+/g, '');
    
    if (s === k) return true;
    
    if (k.includes('leaflet') || s.includes('leaflet')) {
        return s.includes('leaflet') && k.includes('leaflet');
    }
    if (k.includes('banner') || s.includes('banner')) {
        return s.includes('banner') && k.includes('banner');
    }
    if (k.includes('bag') || s.includes('bag')) {
        return s.includes('bag') && k.includes('bag');
    }
    if (k.includes('tshirt') || s.includes('tshirt')) {
        return (s.includes('tshirt') || s.includes('t-shirt')) && (k.includes('tshirt') || k.includes('t-shirt'));
    }
    if (k.includes('kts') || s.includes('kts') || k.includes('keytosuccess') || s.includes('keytosuccess')) {
        return (s.includes('kts') || s.includes('keytosuccess')) && (k.includes('kts') || k.includes('keytosuccess'));
    }
    if (k.includes('vso') || s.includes('vso')) {
        return s.includes('vso') && k.includes('vso');
    }
    return s === k || s.includes(k) || k.includes(s);
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

        // Fetch all active inventory master items
        const activeInventory = await InventoryMaster.find({ status: { $ne: 'Inactive' } }).sort({ name: 1 });

        // Build unique materials list
        const materialNames = new Set(activeInventory.map(i => i.name));
        ['Leaflets', 'Banners', 'BAG', 'T-SHIRT', 'KEY TO SUCCESS BOOK', 'VSO Books'].forEach(c => materialNames.add(c));

        // Fetch all stock in movements to Hazra
        const stockInMovements = await MarketingStockMovement.find({
            centre: hazra._id,
            movementType: 'STOCK_IN'
        });

        // Fetch all approved requirements
        const approvedReqs = await MarketingRequirement.find({
            status: 'Approved'
        });

        // Compute stats for each material dynamically
        const dynamicStats = {};
        const dynamicStockMap = {};
        let totalStockInCalculated = 0;
        let totalDispatchedCalculated = 0;

        for (const mat of materialNames) {
            let totalStockIn = 0;
            stockInMovements.forEach(mov => {
                if (Array.isArray(mov.items) && mov.items.length > 0) {
                    mov.items.forEach(it => {
                        if (matchesMaterial(it.material, mat)) {
                            totalStockIn += (it.quantity || 0);
                        }
                    });
                } else if (mov.material && matchesMaterial(mov.material, mat)) {
                    totalStockIn += (mov.quantity || 0);
                }
            });

            let totalDispatched = 0;
            approvedReqs.forEach(r => {
                let qty = 0;
                if (matchesMaterial(mat, 'leaflets')) qty = r.approvedLeaflets || 0;
                else if (matchesMaterial(mat, 'banners')) qty = r.approvedBanners || 0;
                else if (matchesMaterial(mat, 'bags')) qty = r.approvedBags || 0;
                else if (matchesMaterial(mat, 'tshirts')) qty = r.approvedTshirts || 0;
                else if (matchesMaterial(mat, 'ktsBooks')) qty = r.approvedKtsBooks || 0;
                else if (matchesMaterial(mat, 'vsoBooks')) qty = r.approvedVsoBooks || 0;

                if (qty === 0 && r.itemType && matchesMaterial(r.itemType, mat)) {
                    qty = r.approvedQuantity || r.quantity || 0;
                }
                totalDispatched += qty;
            });

            const currentStock = Math.max(0, totalStockIn - totalDispatched);
            totalStockInCalculated += totalStockIn;
            totalDispatchedCalculated += totalDispatched;

            dynamicStats[mat] = {
                currentStock,
                totalStockIn,
                totalDispatched
            };
            dynamicStockMap[mat] = currentStock;

            // Sync with standard fields if applicable
            const normKey = normalizeMaterialKey(mat);
            const standardKeys = ['leaflets', 'banners', 'bags', 'tshirts', 'ktsBooks', 'vsoBooks'];
            if (standardKeys.includes(normKey)) {
                bucket[normKey] = currentStock;
                const totRec = `total${normKey.charAt(0).toUpperCase() + normKey.slice(1)}Received`;
                if (bucket[totRec] !== undefined) {
                    bucket[totRec] = totalStockIn;
                }
            } else {
                if (!bucket.customStock) bucket.customStock = new Map();
                if (typeof bucket.customStock.set === 'function') {
                    bucket.customStock.set(mat, currentStock);
                } else {
                    bucket.customStock[mat] = currentStock;
                }
            }
        }

        bucket.lastUpdated = new Date();
        await bucket.save();

        const totalUnitsInStock = Object.values(dynamicStats).reduce((a, b) => a + (b.currentStock || 0), 0);

        return res.status(200).json({
            success: true,
            centre: {
                id: hazra._id,
                name: hazra.centreName,
                code: hazra.centreCode,
                location: hazra.location
            },
            stock: {
                ...bucket.toObject(),
                customStock: bucket.customStock ? Object.fromEntries(bucket.customStock) : {},
                ...dynamicStockMap
            },
            inventoryItems: activeInventory.map(i => ({ _id: i._id, name: i.name, code: i.code, description: i.description })),
            materialStats: dynamicStats,
            stats: {
                totalUnitsInStock,
                totalStockIn: totalStockInCalculated,
                totalDispatched: totalDispatchedCalculated,
                totalApprovedRequisitions: approvedReqs.length
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

        const { remarks, items, ...fields } = req.body;

        let bucket = await MarketingCentreBucket.findOne({ centre: hazra._id });
        if (!bucket) {
            bucket = new MarketingCentreBucket({
                centre: hazra._id,
                centreName: hazra.centreName || "HAZRA H.O"
            });
        }

        const itemsChanged = [];
        const standardKeys = ['leaflets', 'banners', 'bags', 'tshirts', 'ktsBooks', 'vsoBooks'];

        // 1. Process items array if passed
        if (Array.isArray(items) && items.length > 0) {
            for (const item of items) {
                const matName = item.material?.trim();
                const val = Math.max(0, parseInt(item.quantity, 10) || 0);
                if (matName) {
                    const norm = normalizeMaterialKey(matName);
                    let prev = 0;
                    if (standardKeys.includes(norm)) {
                        prev = bucket[norm] || 0;
                        if (val !== prev) {
                            itemsChanged.push({ material: matName, quantity: val - prev, previousStock: prev, newStock: val });
                            bucket[norm] = val;
                        }
                    } else {
                        if (!bucket.customStock) bucket.customStock = new Map();
                        prev = (typeof bucket.customStock.get === 'function' ? bucket.customStock.get(matName) : bucket.customStock[matName]) || 0;
                        if (val !== prev) {
                            itemsChanged.push({ material: matName, quantity: val - prev, previousStock: prev, newStock: val });
                            if (typeof bucket.customStock.set === 'function') {
                                bucket.customStock.set(matName, val);
                            } else {
                                bucket.customStock[matName] = val;
                            }
                        }
                    }
                }
            }
        }

        // 2. Process direct key-value pairs (leaflets, banners, or dynamic material names)
        for (const [k, v] of Object.entries(fields)) {
            if (v !== undefined && v !== null && k !== 'items' && k !== 'remarks') {
                const val = Math.max(0, parseInt(v, 10) || 0);
                const norm = normalizeMaterialKey(k);
                if (standardKeys.includes(norm)) {
                    const prev = bucket[norm] || 0;
                    if (val !== prev) {
                        itemsChanged.push({ material: k, quantity: val - prev, previousStock: prev, newStock: val });
                        bucket[norm] = val;
                    }
                } else {
                    if (!bucket.customStock) bucket.customStock = new Map();
                    const prev = (typeof bucket.customStock.get === 'function' ? bucket.customStock.get(k) : bucket.customStock[k]) || 0;
                    if (val !== prev) {
                        itemsChanged.push({ material: k, quantity: val - prev, previousStock: prev, newStock: val });
                        if (typeof bucket.customStock.set === 'function') {
                            bucket.customStock.set(k, val);
                        } else {
                            bucket.customStock[k] = val;
                        }
                    }
                }
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
                const matName = (item.material || "").trim();
                const qty = Math.max(0, parseInt(item.quantity, 10) || 0);
                if (matName && qty > 0) {
                    itemsToAdd.push({ material: matName, quantity: qty });
                }
            }
        } else {
            const matName = (material || "").trim();
            const qty = Math.max(0, parseInt(quantity, 10) || 0);
            if (!matName) {
                return res.status(400).json({ success: false, message: "Please select or specify a material name." });
            }
            if (qty <= 0) {
                return res.status(400).json({ success: false, message: "Stock in quantity must be greater than 0." });
            }
            itemsToAdd.push({ material: matName, quantity: qty });
        }

        if (itemsToAdd.length === 0) {
            return res.status(400).json({ success: false, message: "No valid items or quantities provided for stock in." });
        }

        const recordedItems = [];
        let totalQtyAdded = 0;
        const standardKeys = ['leaflets', 'banners', 'bags', 'tshirts', 'ktsBooks', 'vsoBooks'];

        for (const item of itemsToAdd) {
            const normKey = normalizeMaterialKey(item.material);
            let prevStock = 0;
            let newStock = 0;

            if (standardKeys.includes(normKey)) {
                prevStock = bucket[normKey] || 0;
                newStock = prevStock + item.quantity;
                bucket[normKey] = newStock;
                const totRecKey = `total${normKey.charAt(0).toUpperCase() + normKey.slice(1)}Received`;
                if (bucket[totRecKey] !== undefined) {
                    bucket[totRecKey] = (bucket[totRecKey] || 0) + item.quantity;
                }
            } else {
                if (!bucket.customStock) bucket.customStock = new Map();
                const cur = (typeof bucket.customStock.get === 'function' ? bucket.customStock.get(item.material) : bucket.customStock[item.material]) || 0;
                prevStock = cur;
                newStock = prevStock + item.quantity;
                if (typeof bucket.customStock.set === 'function') {
                    bucket.customStock.set(item.material, newStock);
                } else {
                    bucket.customStock[item.material] = newStock;
                }

                if (!bucket.totalCustomReceived) bucket.totalCustomReceived = new Map();
                const curRec = (typeof bucket.totalCustomReceived.get === 'function' ? bucket.totalCustomReceived.get(item.material) : bucket.totalCustomReceived[item.material]) || 0;
                if (typeof bucket.totalCustomReceived.set === 'function') {
                    bucket.totalCustomReceived.set(item.material, curRec + item.quantity);
                } else {
                    bucket.totalCustomReceived[item.material] = curRec + item.quantity;
                }
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

        // Fetch active materials from InventoryMaster
        const invMasterItems = await InventoryMaster.find({ status: { $ne: 'Inactive' } }).sort({ name: 1 });
        
        // Build unique materials list
        const materialMap = new Map();
        invMasterItems.forEach(i => {
            materialMap.set(i.name, { key: normalizeMaterialKey(i.name), name: i.name, description: i.description || "" });
        });

        // Ensure default core materials are represented
        const fallbackCore = [
            { key: 'leaflets', name: 'Leaflets' },
            { key: 'banners', name: 'Banners' },
            { key: 'bags', name: 'BAG' },
            { key: 'tshirts', name: 'T-SHIRT' },
            { key: 'ktsBooks', name: 'KEY TO SUCCESS BOOK' },
            { key: 'vsoBooks', name: 'VSO Books' }
        ];
        fallbackCore.forEach(f => {
            if (!Array.from(materialMap.keys()).some(k => matchesMaterial(k, f.key) || matchesMaterial(k, f.name))) {
                materialMap.set(f.name, f);
            }
        });

        const materials = Array.from(materialMap.values()).map(m => {
            let totalDispatched = 0;
            let reqsCount = 0;
            const centreDispatchesMap = new Map();

            approvedReqs.forEach(r => {
                let qty = 0;
                if (matchesMaterial(m.name, 'leaflets')) qty = r.approvedLeaflets || 0;
                else if (matchesMaterial(m.name, 'banners')) qty = r.approvedBanners || 0;
                else if (matchesMaterial(m.name, 'bags')) qty = r.approvedBags || 0;
                else if (matchesMaterial(m.name, 'tshirts')) qty = r.approvedTshirts || 0;
                else if (matchesMaterial(m.name, 'ktsBooks')) qty = r.approvedKtsBooks || 0;
                else if (matchesMaterial(m.name, 'vsoBooks')) qty = r.approvedVsoBooks || 0;

                if (qty === 0 && r.itemType && matchesMaterial(r.itemType, m.name)) {
                    qty = r.approvedQuantity || r.quantity || 0;
                }

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
                        if (matchesMaterial(it.material, m.name) || matchesMaterial(it.material, m.key)) {
                            totalStockIn += (it.quantity || 0);
                        }
                    });
                } else if (mov.material) {
                    if (matchesMaterial(mov.material, m.name) || matchesMaterial(mov.material, m.key)) {
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
