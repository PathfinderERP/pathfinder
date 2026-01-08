import express from "express";
import { getAllHODs } from "../../controllers/Academics/hodController.js";
import { requireGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

router.get("/list", requireGranularPermission("academics", "hodList", "view"), getAllHODs);

export default router;
