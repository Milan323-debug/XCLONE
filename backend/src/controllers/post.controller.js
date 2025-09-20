import asyncHandler from "express-async-handler";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";

import cloudinary from "../config/cloudinary.js";

import Notification from "../models/notification.model.js";
import Comment from "../models/comment.model.js";

export const getPosts = asyncHandler(async (req, res) => {
  const posts = await Post.find()
    .sort({ createdAt: -1 })
  .populate("user", "username firstName lastName profileImage")
    .populate({
      path: "comments",
      populate: {
        path: "user",
    select: "username firstName lastName profileImage",
      },
    });

  res.status(200).json({ posts });
});

export const getPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const post = await Post.findById(postId)
  .populate("user", "username firstName lastName profileImage")
    .populate({
      path: "comments",
      populate: {
        path: "user",
    select: "username firstName lastName profileImage",
      },
    });

  if (!post) return res.status(404).json({ error: "Post not found" });

  res.status(200).json({ post });
});

export const getUserPosts = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const user = await User.findOne({ username });
  if (!user) return res.status(404).json({ error: "User not found" });

  const posts = await Post.find({ user: user._id })
    .sort({ createdAt: -1 })
  .populate("user", "username firstName lastName profileImage")
    .populate({
      path: "comments",
      populate: {
        path: "user",
    select: "username firstName lastName profileImage",
      },
    });

  res.status(200).json({ posts });
});

export const createPost = asyncHandler(async (req, res) => {
  // req.user is set by protectRoute middleware
  const userFromReq = req.user;
  const { content } = req.body;
  const mediaFile = req.file;

  if (!content && !mediaFile) {
    return res.status(400).json({ error: "Post must contain either text or media" });
  }

  const user = userFromReq;
  if (!user) return res.status(404).json({ error: "User not found" });

  let media = { type: "image", url: "", poster: "" };

  // upload media (image or video) to Cloudinary if provided
  if (mediaFile) {
    try {
      // convert buffer to base64 for cloudinary
      const base64Data = `data:${mediaFile.mimetype};base64,${mediaFile.buffer.toString(
        "base64"
      )}`;

      // choose resource_type based on mimetype
      const isVideo = mediaFile.mimetype.startsWith("video/");

      const uploadOptions = {
        folder: "social_media_posts",
        resource_type: isVideo ? "video" : "image",
        transformation: [
          { quality: "auto" },
          { format: "auto" },
        ],
      };

      // for images, apply size limit; for videos allow original
      if (!isVideo) {
        uploadOptions.transformation.unshift({ width: 800, height: 600, crop: "limit" });
      }

      const uploadResponse = await cloudinary.uploader.upload(base64Data, uploadOptions);
      console.log('Cloudinary upload response:', uploadResponse && uploadResponse.secure_url ? uploadResponse.secure_url : uploadResponse);

      media.type = isVideo ? "video" : "image";
      // for videos Cloudinary may return secure_url or a different field; secure_url works for both
      media.url = uploadResponse.secure_url || uploadResponse.url || "";

      // if video, try to get a poster/thumbnail
      if (isVideo && uploadResponse && uploadResponse.thumbnail_url) {
        media.poster = uploadResponse.thumbnail_url;
      }
    } catch (uploadError) {
      console.error("Cloudinary upload error:", uploadError);
      return res.status(400).json({ error: "Failed to upload media" });
    }
  }

  const post = await Post.create({
    user: user._id,
    content: content || "",
    media,
  });

  res.status(201).json({ post });
});

export const likePost = asyncHandler(async (req, res) => {
  const userFromReq = req.user;
  const { postId } = req.params;
  const user = userFromReq;
  const post = await Post.findById(postId);

  if (!user || !post) return res.status(404).json({ error: "User or post not found" });

  const isLiked = post.likes.includes(user._id);

  if (isLiked) {
    // unlike
    await Post.findByIdAndUpdate(postId, {
      $pull: { likes: user._id },
    });
  } else {
    // like
    await Post.findByIdAndUpdate(postId, {
      $push: { likes: user._id },
    });

    // create notification if not liking own post
    if (post.user.toString() !== user._id.toString()) {
      await Notification.create({
        from: user._id,
        to: post.user,
        type: "like",
        post: postId,
      });
    }
  }

  res.status(200).json({
    message: isLiked ? "Post unliked successfully" : "Post liked successfully",
  });
});

export const deletePost = asyncHandler(async (req, res) => {
  const userFromReq = req.user;
  const { postId } = req.params;
  const user = userFromReq;
  const post = await Post.findById(postId);

  if (!user || !post) return res.status(404).json({ error: "User or post not found" });

  if (post.user.toString() !== user._id.toString()) {
    return res.status(403).json({ error: "You can only delete your own posts" });
  }

  // delete all comments on this post
  await Comment.deleteMany({ post: postId });

  // delete the post
  await Post.findByIdAndDelete(postId);

  res.status(200).json({ message: "Post deleted successfully" });
});