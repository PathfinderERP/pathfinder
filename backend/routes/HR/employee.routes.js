import express from "express";
import multer from "multer";
import {
    createEmployee,
    getEmployees,
    getEmployeeById,
    updateEmployee,
    deleteEmployee,
    addSalaryStructure,
    getEmployeesForDropdown,
    upload,
    getMyProfile,
    updateMyProfile,
    bulkImportEmployees
} from "../../controllers/HR/employeeController.js";
import { getEmployeeAnalytics } from "../../controllers/HR/employeeAnalyticsController.js";
import { requireAuth } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

// Define multer fields for file uploads
const uploadFields = upload.fields([
    { name: "aadharProof", maxCount: 1 },
    { name: "panProof", maxCount: 1 },
    { name: "bankStatement", maxCount: 1 },
    { name: "educationalQualification1", maxCount: 1 },
    { name: "educationalQualification2", maxCount: 1 },
    { name: "educationalQualification3", maxCount: 1 },
    { name: "form16", maxCount: 1 },
    { name: "insuranceDocument", maxCount: 1 },
    { name: "tdsCertificate", maxCount: 1 },
    { name: "profileImage", maxCount: 1 }
]);

// All routes require authentication
router.use(requireAuth);

// Analytics endpoint
router.get("/analytics", getEmployeeAnalytics);

// Get employees for dropdown (managers)
router.get("/dropdown", getEmployeesForDropdown);

// wrapper to catch multer errors
const handleUpload = (req, res, next) => {
    uploadFields(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: "File too large. Maximum size allowed is 25MB." });
            }
            return res.status(400).json({ message: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(500).json({ message: `Server error: ${err.message}` });
        }
        next();
    });
};

// My Profile Routes (Must be before /:id)
router.get("/me", getMyProfile);
router.put("/me", handleUpload, updateMyProfile);

// Bulk operations
router.post("/bulk/import", bulkImportEmployees);

// CRUD routes
router.post("/", handleUpload, createEmployee);
router.get("/", getEmployees);
router.get("/:id", getEmployeeById);
router.put("/:id", handleUpload, updateEmployee);
router.delete("/:id", deleteEmployee);

// Add salary structure
router.post("/:id/salary", addSalaryStructure);

export default router;
