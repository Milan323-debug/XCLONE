import asyncHandler from "express-async-handler";
import mongoose from 'mongoose';
import Comment from "../models/comment.model.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";

export const getComments = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!mongoose.isValidObjectId(postId)) {
    return res.status(400).json({ error: 'Invalid postId' });
  }

  // pagination params
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, Math.max(5, parseInt(req.query.limit || '50', 10)));
  const skip = (page - 1) * limit;

  // fetch comments and post in parallel, use lean() and select minimal fields
  const [comments, total, post] = await Promise.all([
    Comment.find({ post: postId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('user content likes dislikes parentComment createdAt')
      .populate('user', 'username firstName lastName profileImage')
      .lean(),
    Comment.countDocuments({ post: postId }),
    Post.findById(postId).select('content image user').populate('user', 'username firstName lastName profileImage').lean(),
  ]);

  res.status(200).json({ comments, total, page, limit, post });
});

export const createComment = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!mongoose.isValidObjectId(postId)) {
    return res.status(400).json({ error: 'Invalid postId' });
  }
  const { content } = req.body;

  if (!content || content.trim() === "") {
    return res.status(400).json({ error: "Comment content is required" });
  }

  // req.user is set by the protectRoute middleware
  const user = req.user;
  const post = await Post.findById(postId);

  if (!user || !post) return res.status(404).json({ error: "User or post not found" });

  const comment = await Comment.create({
    user: user._id,
    post: postId,
    content,
  });

  // link the comment to the post
  await Post.findByIdAndUpdate(postId, {
    $push: { comments: comment._id },
  });

  // create notification if not commenting on own post
  if (post.user.toString() !== user._id.toString()) {
    await Notification.create({
      from: user._id,
      to: post.user,
      type: "comment",
      post: postId,
      comment: comment._id,
    });
  }

  res.status(201).json({ comment });
});

export const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!mongoose.isValidObjectId(commentId)) {
    return res.status(400).json({ error: 'Invalid commentId' });
  }
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const comment = await Comment.findById(commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  if (comment.user.toString() !== user._id.toString()) {
    return res.status(403).json({ error: "You can only delete your own comments" });
  }

  // remove comment from post
  await Post.findByIdAndUpdate(comment.post, {
    $pull: { comments: commentId },
  });

  // delete the comment
  await Comment.findByIdAndDelete(commentId);

  res.status(200).json({ message: "Comment deleted successfully" });
});

export const likeComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!mongoose.isValidObjectId(commentId)) {
    return res.status(400).json({ error: 'Invalid commentId' });
  }

  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const comment = await Comment.findById(commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  const isLiked = comment.likes.some((l) => l.toString() === user._id.toString());

  if (isLiked) {
    await Comment.findByIdAndUpdate(commentId, { $pull: { likes: user._id } });
  } else {
    await Comment.findByIdAndUpdate(commentId, { $push: { likes: user._id } });

    // optional: notify the comment owner if liking someone else's comment
    if (comment.user.toString() !== user._id.toString()) {
      await Notification.create({
        from: user._id,
        to: comment.user,
        type: 'like_comment',
        post: comment.post,
        comment: comment._id,
      });
    }
  }

  const updated = await Comment.findById(commentId).populate('user', 'username firstName lastName profileImage');
  res.status(200).json({ comment: updated });
});

export const dislikeComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!mongoose.isValidObjectId(commentId)) {
    return res.status(400).json({ error: 'Invalid commentId' });
  }

  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const comment = await Comment.findById(commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  const isDisliked = comment.dislikes.some((d) => d.toString() === user._id.toString());

  if (isDisliked) {
    await Comment.findByIdAndUpdate(commentId, { $pull: { dislikes: user._id } });
  } else {
    // remove like if present
    await Comment.findByIdAndUpdate(commentId, { $pull: { likes: user._id } });
    await Comment.findByIdAndUpdate(commentId, { $push: { dislikes: user._id } });
  }

  const updated = await Comment.findById(commentId).populate('user', 'username firstName lastName profileImage');
  res.status(200).json({ comment: updated });
});