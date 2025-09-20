import express from "express";
import {
  createPost,
  deletePost,
  getPost,
  getPosts,
  getUserPosts,
  likePost,
} from "../controllers/post.controller.js";
import protectRoute from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

// public routes
router.get("/", getPosts);
router.get("/user/:username", getUserPosts);
router.get("/:postId", getPost);

// protected proteced
// accept a single file under field name 'media' (image or video)
router.post("/", protectRoute, upload.single("media"), createPost);
router.post("/:postId/like", protectRoute, likePost);
router.delete("/:postId", protectRoute, deletePost);

export default router;