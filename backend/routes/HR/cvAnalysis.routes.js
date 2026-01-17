import express from 'express';
import { analyzeCVs, uploadCVs } from '../../controllers/HR/cvAnalysisController.js';
import authMiddleware from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

// Define route for analyzing CVs
router.post('/analyze', uploadCVs, analyzeCVs);

export default router;
