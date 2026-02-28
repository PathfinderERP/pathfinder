import mongoose from "mongoose";

const communityPostSchema = new mongoose.Schema({
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
    reactions: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String }
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
    }],
    files: [{
        name: { type: String },
        url: { type: String }
    }],
    isDeleted: {
        type: Boolean,
        default: false
    },
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CommunityPost",
        required: false
    }
}, {
    timestamps: true
});

const CommunityPost = mongoose.model("CommunityPost", communityPostSchema);
export default CommunityPost;
