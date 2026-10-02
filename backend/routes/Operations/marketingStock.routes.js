import express from "express";
import { 
    getHazraStock, 
    updateHazraStockDirectly, 
    recordStockIn, 
    getCentreWiseReport, 
    getStockMovements,
    getConsolidatedReport
} from "../../controllers/Operations/marketingStockController.js";
import protect from "../../middleware/authMiddleware.js";

const router = express.Router();

// GET Hazra Central Marketing Stock & Summary
router.get("/", protect, getHazraStock);

// GET Consolidated Stock Report per Material & Centre
router.get("/consolidated-report", protect, getConsolidatedReport);

// PUT Update/Set current baseline physical stock in Hazra
router.put("/set-stock", protect, updateHazraStockDirectly);

// POST Record Stock In (New stock added to main warehouse)
router.post("/stock-in", protect, recordStockIn);

// GET Centre-wise Dispatched Report (Which centre materials have been sent to)
router.get("/centre-report", protect, getCentreWiseReport);

// GET Stock Movements / Audit History
router.get("/movements", protect, getStockMovements);

export default router;
