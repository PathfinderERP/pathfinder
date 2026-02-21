import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    content: {
        type: String,
        required: false
    },
    images: [{
        type: String // Cloudflare R2 or other URLs
    }],
    videos: [{
        type: String // Cloudflare R2 or other URLs for videos
    }],
    poll: {
        question: { type: String },
        options: [{
            text: { type: String },
            votes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
        }],
        expiresAt: { type: Date }
    },
    tags: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    comments: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    }],
    views: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
}, {
    timestamps: true
});

const Post = mongoose.model("Post", postSchema);
export default Post;
