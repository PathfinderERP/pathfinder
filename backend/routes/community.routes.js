import express from "express";
import { createPost, getAllPosts, likePost, votePoll, addComment, deletePost, recordPostView } from "../controllers/communityController.js";
import protect from "../middleware/authMiddleware.js";
import { upload } from "../utils/r2Upload.js";

const router = express.Router();

// All routes are protected
router.use(protect);

router.post("/", upload.array("images", 5), createPost);
router.get("/", getAllPosts);
router.delete("/:id", deletePost);
router.post("/:id/like", likePost);
router.post("/:id/vote", votePoll);
router.post("/:id/comment", addComment);
router.post("/:id/view", recordPostView);

export default router;
