import express from "express";
import { createPost, getAllPosts, likePost, votePoll, addComment, getUsersForTagging, deletePost, updatePost, deleteComment, recordPostView, updateSocialVisit, getSocialActivity } from "../controllers/postController.js";
import protect from "../middleware/authMiddleware.js";
import { upload } from "../utils/r2Upload.js";

const router = express.Router();

// All routes are protected
router.use(protect);

router.post("/", upload.array("images", 5), createPost);
router.get("/", getAllPosts);
router.put("/:id", upload.array("images", 5), updatePost);
router.delete("/:id", deletePost);
router.post("/:id/like", likePost);
router.post("/:id/vote", votePoll);
router.post("/:id/comment", addComment);
router.post("/:id/view", recordPostView);
router.post("/visit", updateSocialVisit);
router.get("/activity", getSocialActivity);
router.delete("/:id/comment/:commentId", deleteComment);
router.get("/users", getUsersForTagging);

export default router;
