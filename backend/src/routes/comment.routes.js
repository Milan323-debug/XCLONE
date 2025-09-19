import express from "express";
import protectRoute from "../middleware/auth.middleware.js";
import { createComment, getComments, deleteComment, likeComment, dislikeComment, getCommentById } from "../controllers/comment.controllers.js";

const router = express.Router();

// public routes
router.get("/post/:postId", getComments);
router.get("/:commentId", getCommentById);

// protected routes
router.post("/post/:postId", protectRoute, createComment);
router.delete("/:commentId", protectRoute, deleteComment);
router.post("/:commentId/like", protectRoute, likeComment);
router.post("/:commentId/dislike", protectRoute, dislikeComment);

export default router;