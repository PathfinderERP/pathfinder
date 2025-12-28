import express from "express";
import { getBirthdayList } from "../../controllers/HR/birthdayController.js";
import protect from "../../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getBirthdayList);

export default router;
