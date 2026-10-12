import InventoryMaster from "../../models/Master_data/Inventory.js";

// Standard inventory items to ensure existence
const CORE_MARKETING_ITEMS = [
    { name: "Leaflets", description: "Promotional handbills & flyers", status: "Active" },
    { name: "Banners", description: "Flex banners, standees & posters", status: "Active" },
    { name: "Bags", description: "Promotional student backpacks", status: "Active" },
    { name: "T-Shirts", description: "Branded promotional T-shirts", status: "Active" },
    { name: "KTS Books", description: "Key To Success series books", status: "Active" },
    { name: "VSO Books", description: "Vidyamandir Science Olympiad books", status: "Active" }
];

// Helper to ensure default items exist in database
const ensureDefaultInventoryItems = async () => {
    try {
        const count = await InventoryMaster.countDocuments();
        if (count === 0) {
            await InventoryMaster.insertMany(CORE_MARKETING_ITEMS);
            console.log("[InventoryMaster] Seeded default standard inventory items");
        } else {
            for (const item of CORE_MARKETING_ITEMS) {
                let queryPattern = `^${item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;
                if (item.name === "Bags") queryPattern = "^(bags?)$";
                if (item.name === "T-Shirts") queryPattern = "^(t-?shirts?)$";
                if (item.name === "KTS Books") queryPattern = "(kts|key\\s*to\\s*success)";

                const exists = await InventoryMaster.findOne({
                    name: { $regex: new RegExp(queryPattern, "i") }
                });
                if (!exists) {
                    await InventoryMaster.create({
                        ...item,
                        defaultType: "Free",
                        defaultPrice: 0
                    });
                }
            }
        }
    } catch (err) {
        console.error("[InventoryMaster] Error seeding default inventory items:", err);
    }
};

// @desc    Get all inventory master items
// @route   GET /api/master-data/inventory
// @access  Protected
export const getInventoryMasterItems = async (req, res) => {
    try {
        await ensureDefaultInventoryItems();

        const { status } = req.query;
        const filter = {};
        if (status) {
            filter.status = status;
        }

        const items = await InventoryMaster.find(filter).sort({ name: 1 });
        res.status(200).json(items);
    } catch (error) {
        console.error("Error fetching inventory master items:", error);
        res.status(500).json({ message: "Failed to fetch inventory items", error: error.message });
    }
};

// @desc    Create new inventory master item
// @route   POST /api/master-data/inventory
// @access  Protected (create permission)
export const createInventoryMasterItem = async (req, res) => {
    try {
        const { name, code, description, defaultType, defaultPrice, status } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: "Inventory item name is required" });
        }

        const normalizedName = name.trim();
        const existing = await InventoryMaster.findOne({ 
            name: { $regex: new RegExp(`^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } 
        });

        if (existing) {
            return res.status(400).json({ message: `Inventory item '${normalizedName}' already exists` });
        }

        const newItem = new InventoryMaster({
            name: normalizedName,
            code: code?.trim() || undefined,
            description: description?.trim() || undefined,
            defaultType: defaultType || "Free",
            defaultPrice: Number(defaultPrice) || 0,
            status: status || "Active"
        });

        const savedItem = await newItem.save();
        res.status(201).json(savedItem);
    } catch (error) {
        console.error("Error creating inventory master item:", error);
        res.status(500).json({ message: "Failed to create inventory item", error: error.message });
    }
};

// @desc    Update inventory master item
// @route   PUT /api/master-data/inventory/:id
// @access  Protected (edit permission)
export const updateInventoryMasterItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, description, defaultType, defaultPrice, status } = req.body;

        const item = await InventoryMaster.findById(id);
        if (!item) {
            return res.status(404).json({ message: "Inventory item not found" });
        }

        if (name && name.trim()) {
            const normalizedName = name.trim();
            const duplicate = await InventoryMaster.findOne({
                _id: { $ne: id },
                name: { $regex: new RegExp(`^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") }
            });

            if (duplicate) {
                return res.status(400).json({ message: `Inventory item '${normalizedName}' already exists` });
            }
            item.name = normalizedName;
        }

        if (code !== undefined) item.code = code?.trim() || "";
        if (description !== undefined) item.description = description?.trim() || "";
        if (defaultType !== undefined) item.defaultType = defaultType;
        if (defaultPrice !== undefined) item.defaultPrice = Number(defaultPrice) || 0;
        if (status !== undefined) item.status = status;

        const updatedItem = await item.save();
        res.status(200).json(updatedItem);
    } catch (error) {
        console.error("Error updating inventory master item:", error);
        res.status(500).json({ message: "Failed to update inventory item", error: error.message });
    }
};

// @desc    Delete inventory master item
// @route   DELETE /api/master-data/inventory/:id
// @access  Protected (delete permission)
export const deleteInventoryMasterItem = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await InventoryMaster.findById(id);
        if (!item) {
            return res.status(404).json({ message: "Inventory item not found" });
        }

        await InventoryMaster.findByIdAndDelete(id);
        res.status(200).json({ message: "Inventory item deleted successfully" });
    } catch (error) {
        console.error("Error deleting inventory master item:", error);
        res.status(500).json({ message: "Failed to delete inventory item", error: error.message });
    }
};

// @desc    Bulk update status
// @route   PUT /api/master-data/inventory/bulk-status
// @access  Protected (edit permission)
export const bulkUpdateInventoryMasterStatus = async (req, res) => {
    try {
        const { ids, status } = req.body;
        if (!Array.isArray(ids) || ids.length === 0 || !status) {
            return res.status(400).json({ message: "Invalid request. Provide array of ids and target status" });
        }

        await InventoryMaster.updateMany(
            { _id: { $in: ids } },
            { $set: { status } }
        );

        res.status(200).json({ message: "Status updated successfully" });
    } catch (error) {
        console.error("Error bulk updating inventory status:", error);
        res.status(500).json({ message: "Failed to update status", error: error.message });
    }
};
