import express from "express";
import { createPost, getAllPosts, likePost, votePoll, addComment, getUsersForTagging, deletePost, updatePost, deleteComment, recordPostView, updateSocialVisit, getSocialActivity } from "../controllers/postController.js";
import { requireAuth } from "../middleware/permissionMiddleware.js";
import { upload } from "../utils/r2Upload.js";

const router = express.Router();

// All routes are protected via requireAuth to allow all active users
router.post("/", requireAuth, upload.array("images", 5), createPost);
router.get("/", requireAuth, getAllPosts);
router.put("/:id", requireAuth, upload.array("images", 5), updatePost);
router.delete("/:id", requireAuth, deletePost);
router.post("/:id/like", requireAuth, likePost);
router.post("/:id/vote", requireAuth, votePoll);
router.post("/:id/comment", requireAuth, addComment);
router.post("/:id/view", requireAuth, recordPostView);
router.post("/visit", requireAuth, updateSocialVisit);
router.get("/activity", requireAuth, getSocialActivity);
router.delete("/:id/comment/:commentId", requireAuth, deleteComment);
router.get("/users", requireAuth, getUsersForTagging);

export default router;
