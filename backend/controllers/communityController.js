import CommunityPost from "../models/CommunityPost.js";
import User from "../models/User.js";
import Employee from "../models/HR/Employee.js";
import { uploadToR2, getSignedFileUrl } from "../utils/r2Upload.js";
import { getIO } from "../utils/socket.js";

const enhancePostAuthor = async (post) => {
    const postObj = post.toObject();

    // Sign post images
    if (postObj.images && postObj.images.length > 0) {
        postObj.images = await Promise.all(postObj.images.map(img => getSignedFileUrl(img)));
    }

    // Sign post videos
    if (postObj.videos && postObj.videos.length > 0) {
        postObj.videos = await Promise.all(postObj.videos.map(vid => getSignedFileUrl(vid)));
    }

    // Sign post files
    if (postObj.files && postObj.files.length > 0) {
        postObj.files = await Promise.all(postObj.files.map(async (file) => ({
            ...file,
            url: await getSignedFileUrl(file.url)
        })));
    }

    if (postObj.author) {
        const employee = await Employee.findOne({ user: postObj.author._id })
            .populate("designation", "name")
            .populate("department", "departmentName")
            .populate("primaryCentre", "centreName")
            .populate("centres", "centreName");

        if (employee) {
            postObj.author.profileImage = employee.profileImage ? await getSignedFileUrl(employee.profileImage) : null;
            postObj.author.designationName = employee.designation?.name || postObj.author.designation || (postObj.author.role === 'superAdmin' ? 'SuperAdmin' : 'Staff');
            postObj.author.departmentName = employee.department?.departmentName || postObj.author.teacherDepartment || (postObj.author.role === 'superAdmin' ? 'Management' : 'General');
            postObj.author.centerName = employee.primaryCentre?.centreName || (employee.centres?.[0]?.centreName) || 'Main Center';
        } else {
            postObj.author.profileImage = null;
            postObj.author.designationName = postObj.author.designation || (postObj.author.role === 'superAdmin' ? 'SuperAdmin' : 'User');
            postObj.author.departmentName = postObj.author.teacherDepartment || (postObj.author.role === 'superAdmin' ? 'Management' : 'General');
            postObj.author.centerName = 'External';
        }
    }
    if (postObj.replyTo) {
        // Simple enhancement for replied-to post
        if (postObj.replyTo.images && postObj.replyTo.images.length > 0) {
            postObj.replyTo.images = await Promise.all(postObj.replyTo.images.map(img => getSignedFileUrl(img)));
        }
        if (postObj.replyTo.videos && postObj.replyTo.videos.length > 0) {
            postObj.replyTo.videos = await Promise.all(postObj.replyTo.videos.map(vid => getSignedFileUrl(vid)));
        }
        // No full author signing, just basic name
    }

    return postObj;
};

export const createPost = async (req, res) => {
    try {
        const { content, poll, tags, replyTo } = req.body;
        const author = req.user.id;

        const images = [];
        const videos = [];
        const files = [];

        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(async (file) => {
                try {
                    const url = await uploadToR2(file, "community");
                    if (url) {
                        if (file.mimetype.startsWith('video/')) {
                            videos.push(url);
                        } else if (file.mimetype.startsWith('image/')) {
                            images.push(url);
                        } else {
                            files.push({
                                name: file.originalname,
                                url: url
                            });
                        }
                    }
                } catch (error) {
                    console.error("Single file upload error:", error);
                }
            });
            await Promise.all(uploadPromises);
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

        const newPost = await CommunityPost.create({
            author,
            content,
            images,
            videos,
            files,
            poll: parsedPoll,
            tags: parsedTags,
            replyTo: replyTo || undefined
        });

        const post = await CommunityPost.findById(newPost._id)
            .populate("author", "name email role designation teacherDepartment")
            .populate({
                path: 'replyTo',
                populate: { path: 'author', select: 'name' }
            });

        const postObj = await enhancePostAuthor(post);

        // Broadcast to everyone
        getIO().to("community").emit("new_post", postObj);

        res.status(201).json(postObj);
    } catch (error) {
        console.error("Create Community Post Error:", error);
        res.status(500).json({ message: "Failed to create post" });
    }
};

export const getAllPosts = async (req, res) => {
    try {
        const posts = await CommunityPost.find()
            .sort({ createdAt: -1 })
            .populate("author", "name email role designation teacherDepartment")
            .populate({
                path: 'replyTo',
                populate: { path: 'author', select: 'name' }
            })
            .populate("tags", "name email")
            .populate("likes", "name email role designation teacherDepartment")
            .populate("reactions.user", "name email role designation teacherDepartment")
            .populate("comments.user", "name email")
            .populate("poll.options.votes", "name email role designation teacherDepartment");

        const enhancedPosts = await Promise.all(posts.map(async (p) => {
            const userId = req.user.id;
            const isAuthor = p.author._id.toString() === userId || p.author.toString() === userId;
            const isSuperAdmin = req.user.role === 'superAdmin';

            if (isAuthor || isSuperAdmin) {
                await p.populate("views", "name email role designation teacherDepartment");
            }
            return await enhancePostAuthor(p);
        }));

        res.json(enhancedPosts);
    } catch (error) {
        console.error("Get All Community Posts Error:", error);
        res.status(500).json({ message: "Failed to fetch posts" });
    }
};

export const reactToPost = async (req, res) => {
    try {
        const { emoji } = req.body;
        const post = await CommunityPost.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const reactionIndex = post.reactions.findIndex(r => r.user.toString() === req.user.id);

        if (reactionIndex > -1) {
            if (post.reactions[reactionIndex].emoji === emoji) {
                // Remove if same emoji
                post.reactions.splice(reactionIndex, 1);
            } else {
                // Update emoji if different
                post.reactions[reactionIndex].emoji = emoji;
            }
        } else {
            // Add new reaction
            post.reactions.push({ user: req.user.id, emoji });
        }

        await post.save();

        const populatedPost = await CommunityPost.findById(post._id)
            .populate("author", "name email role designation teacherDepartment")
            .populate("reactions.user", "name email role designation teacherDepartment")
            .populate("likes", "name email role designation teacherDepartment")
            .populate("comments.user", "name email");

        const postObj = await enhancePostAuthor(populatedPost);

        // Broadcast update
        getIO().to("community").emit("post_updated", postObj);

        res.json(postObj);
    } catch (error) {
        console.error("React error:", error);
        res.status(500).json({ message: "Error toggling reaction" });
    }
};

export const likePost = async (req, res) => {
    try {
        const post = await CommunityPost.findById(req.params.id);
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
        const post = await CommunityPost.findById(req.params.id);
        if (!post || !post.poll) return res.status(404).json({ message: "Poll not found" });

        const alreadyVoted = post.poll.options.some(opt => opt.votes.includes(req.user.id));
        if (alreadyVoted) {
            return res.status(400).json({ message: "You have already voted in this poll" });
        }

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

        const post = await CommunityPost.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        post.comments.push({
            user: req.user.id,
            text,
            createdAt: new Date()
        });

        await post.save();

        const populatedPost = await CommunityPost.findById(post._id)
            .populate("comments.user", "name email");

        res.json(populatedPost);
    } catch (error) {
        res.status(500).json({ message: "Error adding comment" });
    }
};

export const deletePost = async (req, res) => {
    try {
        const post = await CommunityPost.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        // Only author or superAdmin can delete
        if (post.author.toString() !== req.user.id && req.user.role !== 'superAdmin') {
            return res.status(403).json({ message: "Unauthorized to delete this post" });
        }

        // WhatsApp Style: Hard-clear everything but keep record
        post.isDeleted = true;
        post.content = "🚫 This message was deleted";
        post.images = [];
        post.videos = [];
        post.poll = undefined;
        post.tags = [];
        post.reactions = [];
        post.likes = [];
        post.comments = [];

        await post.save();

        const populatedPost = await CommunityPost.findById(post._id)
            .populate("author", "name email role designation teacherDepartment");

        const postObj = await enhancePostAuthor(populatedPost);

        // Broadcast the "deletion"
        getIO().to("community").emit("post_updated", postObj);

        res.json(postObj);
    } catch (error) {
        console.error("Delete Post Error:", error);
        res.status(500).json({ message: "Error deleting post" });
    }
};

export const recordPostView = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;

        await CommunityPost.findByIdAndUpdate(postId, {
            $addToSet: { views: userId }
        });

        const post = await CommunityPost.findById(postId)
            .populate("author", "name email role designation teacherDepartment")
            .populate("tags", "name email")
            .populate("likes", "name email role designation teacherDepartment")
            .populate("reactions.user", "name email role designation teacherDepartment")
            .populate("comments.user", "name email")
            .populate("poll.options.votes", "name email role designation teacherDepartment");

        const isAuthor = post.author._id.toString() === userId || post.author.toString() === userId;
        const isSuperAdmin = req.user.role === 'superAdmin';

        if (isAuthor || isSuperAdmin) {
            await post.populate("views", "name email role designation teacherDepartment");
        }

        const postObj = await enhancePostAuthor(post);

        // Broadcast view update
        getIO().to("community").emit("post_updated", postObj);

        res.json(postObj);
    } catch (error) {
        res.status(500).json({ message: "Error recording view" });
    }
};
