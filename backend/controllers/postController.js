import Post from "../models/Post.js";
import User from "../models/User.js";
import Employee from "../models/HR/Employee.js";
import mongoose from "mongoose";
import { uploadToR2, getSignedFileUrl } from "../utils/r2Upload.js";

export const createPost = async (req, res) => {
    try {
        const { content, poll, tags } = req.body;
        const author = req.user.id;

        const images = [];
        if (req.files && req.files.length > 0) {
            console.log(`Creating post: Received ${req.files.length} files`);
            const uploadPromises = req.files.map(file => uploadToR2(file, "posts"));
            const uploadedUrls = await Promise.all(uploadPromises);
            console.log("Uploaded URLs:", uploadedUrls);
            images.push(...uploadedUrls.filter(url => url !== null));
        } else if (req.files) {
            console.log("Creating post: req.files exists but is empty");
        }

        let parsedPoll = null;
        if (poll) {
            parsedPoll = typeof poll === 'string' ? JSON.parse(poll) : poll;
            if (parsedPoll.options) {
                parsedPoll.options = parsedPoll.options.map(opt => ({ text: opt, votes: [] }));
            }
        }

        let parsedTags = [];
        if (tags) {
            parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
        }

        const newPost = await Post.create({
            author,
            content,
            images,
            poll: parsedPoll,
            tags: parsedTags
        });

        // Populate basic author info for immediate UI update
        const post = await Post.findById(newPost._id)
            .populate("author", "name email role designation teacherDepartment");

        const postObj = post.toObject();

        // Sign post images
        if (postObj.images && postObj.images.length > 0) {
            postObj.images = await Promise.all(postObj.images.map(img => getSignedFileUrl(img)));
        }

        // Add author profile details
        if (postObj.author) {
            const employee = await Employee.findOne({ user: postObj.author._id })
                .populate("designation", "name")
                .populate("department", "name");

            if (employee) {
                postObj.author.profileImage = employee.profileImage ? await getSignedFileUrl(employee.profileImage) : null;
                postObj.author.designationName = employee.designation?.name || postObj.author.designation || (postObj.author.role === 'superAdmin' ? 'SuperAdmin' : 'Staff');
                postObj.author.departmentName = employee.department?.name || postObj.author.teacherDepartment || (postObj.author.role === 'superAdmin' ? 'Management' : 'General');
            } else {
                postObj.author.profileImage = null;
                postObj.author.designationName = postObj.author.designation || (postObj.author.role === 'superAdmin' ? 'SuperAdmin' : 'User');
                postObj.author.departmentName = postObj.author.teacherDepartment || (postObj.author.role === 'superAdmin' ? 'Management' : 'General');
            }
        }

        res.status(201).json(postObj);
    } catch (error) {
        console.error("Create Post Error:", error);
        res.status(500).json({ message: "Failed to create post" });
    }
};

export const getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .populate("author", "name email role designation teacherDepartment")
            .populate("tags", "name email")
            .populate("likes", "name")
            .populate("comments.user", "name email");

        // Enhance author details with employee profile info (image, etc.)
        const enhancedPosts = await Promise.all(posts.map(async (post) => {
            const postObj = post.toObject();

            // Sign post images
            if (postObj.images && postObj.images.length > 0) {
                postObj.images = await Promise.all(postObj.images.map(img => getSignedFileUrl(img)));
            }

            if (postObj.author) {
                const employee = await Employee.findOne({ user: postObj.author._id })
                    .populate("designation", "name")
                    .populate("department", "name");

                if (employee) {
                    postObj.author.profileImage = employee.profileImage ? await getSignedFileUrl(employee.profileImage) : null;
                    postObj.author.designationName = employee.designation?.name || postObj.author.designation || (postObj.author.role === 'superAdmin' ? 'SuperAdmin' : 'Staff');
                    postObj.author.departmentName = employee.department?.name || postObj.author.teacherDepartment || (postObj.author.role === 'superAdmin' ? 'Management' : 'General');
                } else {
                    postObj.author.profileImage = null;
                    postObj.author.designationName = postObj.author.designation || (postObj.author.role === 'superAdmin' ? 'SuperAdmin' : 'User');
                    postObj.author.departmentName = postObj.author.teacherDepartment || (postObj.author.role === 'superAdmin' ? 'Management' : 'General');
                }
            }
            return postObj;
        }));

        res.json(enhancedPosts);
    } catch (error) {
        console.error("Get All Posts Error:", error);
        res.status(500).json({ message: "Failed to fetch posts" });
    }
};

export const likePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const index = post.likes.indexOf(req.user.id);
        if (index === -1) {
            post.likes.push(req.user.id);
        } else {
            post.likes.splice(index, 1);
        }

        await post.save();
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: "Error toggling like" });
    }
};

export const votePoll = async (req, res) => {
    try {
        const { optionId } = req.body;
        const post = await Post.findById(req.params.id);
        if (!post || !post.poll) return res.status(404).json({ message: "Poll not found" });

        // Remove previous votes from this user in this poll
        post.poll.options.forEach(opt => {
            const voteIndex = opt.votes.indexOf(req.user.id);
            if (voteIndex > -1) opt.votes.splice(voteIndex, 1);
        });

        // Add new vote
        const option = post.poll.options.id(optionId);
        if (option) {
            option.votes.push(req.user.id);
        }

        await post.save();
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: "Error voting" });
    }
};

export const addComment = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ message: "Comment text is required" });

        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        post.comments.push({
            user: req.user.id,
            text,
            createdAt: new Date()
        });

        await post.save();

        const populatedPost = await Post.findById(post._id)
            .populate("comments.user", "name email");

        res.json(populatedPost);
    } catch (error) {
        res.status(500).json({ message: "Error adding comment" });
    }
};

export const getUsersForTagging = async (req, res) => {
    try {
        const users = await User.find({}, "name email role").limit(50);
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Error fetching users" });
    }
};

export const deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        // Check if user is author
        if (post.author.toString() !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized to delete this post" });
        }

        await Post.findByIdAndDelete(req.params.id);
        res.json({ message: "Post deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting post" });
    }
};

export const updatePost = async (req, res) => {
    try {
        const { content, removedImages } = req.body;
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        // Check if user is author
        if (post.author.toString() !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized to update this post" });
        }

        // Handle image removals
        if (removedImages) {
            const toRemove = typeof removedImages === 'string' ? JSON.parse(removedImages) : removedImages;
            for (const imgUrl of toRemove) {
                await deleteFromR2(imgUrl);
                post.images = post.images.filter(img => img !== imgUrl);
            }
        }

        // Handle new image uploads
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(file => uploadToR2(file, "posts"));
            const uploadedUrls = await Promise.all(uploadPromises);
            post.images.push(...uploadedUrls.filter(url => url !== null));
        }

        if (content) post.content = content;
        await post.save();

        // Return enhanced post
        const updatedPost = await Post.findById(post._id)
            .populate("author", "name email role designation teacherDepartment");

        const postObj = updatedPost.toObject();

        // Sign images
        if (postObj.images && postObj.images.length > 0) {
            postObj.images = await Promise.all(postObj.images.map(img => getSignedFileUrl(img)));
        }

        res.json(postObj);
    } catch (error) {
        console.error("Update Post Error:", error);
        res.status(500).json({ message: "Error updating post" });
    }
};

export const deleteComment = async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const comment = post.comments.id(commentId);
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        // Check if user is author of comment or author of post
        if (comment.user.toString() !== req.user.id && post.author.toString() !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized to delete this comment" });
        }

        post.comments.pull(commentId);
        await post.save();

        const populatedPost = await Post.findById(postId)
            .populate("comments.user", "name email");

        res.json(populatedPost);
    } catch (error) {
        res.status(500).json({ message: "Error deleting comment" });
    }
};
