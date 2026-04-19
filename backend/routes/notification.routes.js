import express from "express";
import { getNotifications, markAsRead, markAllAsRead, clearAllNotifications } from "../controllers/notificationController.js";
import { requireAuth } from "../middleware/permissionMiddleware.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", getNotifications);
router.put("/:id/read", markAsRead);
router.put("/read-all", markAllAsRead);
router.delete("/clear", clearAllNotifications);

export default router;
