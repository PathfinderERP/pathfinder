import express from "express";
import { createPost, getAllPosts, likePost, reactToPost, votePoll, addComment, deletePost, recordPostView } from "../controllers/communityController.js";
import { requireAuth } from "../middleware/permissionMiddleware.js";
import { upload } from "../utils/r2Upload.js";

const router = express.Router();

// Apply requireAuth to all routes for community
router.post("/", requireAuth, upload.array("files", 10), createPost);
router.get("/", requireAuth, getAllPosts);
router.delete("/:id", requireAuth, deletePost);
router.post("/:id/like", requireAuth, likePost);
router.post("/:id/react", requireAuth, reactToPost);
router.post("/:id/vote", requireAuth, votePoll);
router.post("/:id/comment", requireAuth, addComment);
router.post("/:id/view", requireAuth, recordPostView);

export default router;
