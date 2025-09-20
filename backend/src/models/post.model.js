import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      maxLength: 280,
    },
    // generic media object to support image or video
    media: {
      type: {
        type: String,
        enum: ["image", "video"],
        default: "image",
      },
      url: { type: String, default: "" },
      // optional poster/thumbnail for videos
      poster: { type: String, default: "" },
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
  },
  { timestamps: true }
);

const Post = mongoose.model("Post", postSchema);

export default Post;