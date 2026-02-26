import CommunityPost from "../models/CommunityPost.js";
import User from "../models/User.js";
import Employee from "../models/HR/Employee.js";
import { uploadToR2, getSignedFileUrl } from "../utils/r2Upload.js";

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

    if (postObj.author) {
        const employee = await Employee.findOne({ user: postObj.author._id })
            .populate("designation", "name")
            .populate("department", "departmentName");

        if (employee) {
            postObj.author.profileImage = employee.profileImage ? await getSignedFileUrl(employee.profileImage) : null;
            postObj.author.designationName = employee.designation?.name || postObj.author.designation || (postObj.author.role === 'superAdmin' ? 'SuperAdmin' : 'Staff');
            postObj.author.departmentName = employee.department?.departmentName || postObj.author.teacherDepartment || (postObj.author.role === 'superAdmin' ? 'Management' : 'General');
        } else {
            postObj.author.profileImage = null;
            postObj.author.designationName = postObj.author.designation || (postObj.author.role === 'superAdmin' ? 'SuperAdmin' : 'User');
            postObj.author.departmentName = postObj.author.teacherDepartment || (postObj.author.role === 'superAdmin' ? 'Management' : 'General');
        }
    }
    return postObj;
};

export const createPost = async (req, res) => {
    try {
        const { content, poll, tags } = req.body;
        const author = req.user.id;

        const images = [];
        const videos = [];
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(async (file) => {
                const url = await uploadToR2(file, "community");
                if (url) {
                    if (file.mimetype.startsWith('video/')) {
                        videos.push(url);
                    } else {
                        images.push(url);
                    }
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
            poll: parsedPoll,
            tags: parsedTags
        });

        const post = await CommunityPost.findById(newPost._id)
            .populate("author", "name email role designation teacherDepartment");

        const postObj = await enhancePostAuthor(post);
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
            .populate("tags", "name email")
            .populate("likes", "name email role designation teacherDepartment")
            .populate("comments.user", "name email")
            .populate("poll.options.votes", "name email role designation teacherDepartment");

        const enhancedPosts = await Promise.all(posts.map(async (p) => {
            if (p.author._id.toString() === req.user.id || p.author.toString() === req.user.id) {
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

        if (post.author.toString() !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized to delete this post" });
        }

        await CommunityPost.findByIdAndDelete(req.params.id);
        res.json({ message: "Post deleted successfully" });
    } catch (error) {
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
            .populate("comments.user", "name email")
            .populate("poll.options.votes", "name email role designation teacherDepartment");

        if (post.author._id.toString() === userId || post.author.toString() === userId) {
            await post.populate("views", "name email role designation teacherDepartment");
        }

        const postObj = await enhancePostAuthor(post);
        res.json(postObj);
    } catch (error) {
        res.status(500).json({ message: "Error recording view" });
    }
};
