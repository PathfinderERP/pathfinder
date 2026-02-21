import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaUpload, FaPaperPlane, FaImage, FaPoll, FaAt, FaThumbsUp, FaComment, FaCheckCircle, FaChartBar, FaEnvelope, FaBuilding, FaTrash, FaEllipsisV, FaEdit, FaChevronLeft, FaChevronRight, FaTimes, FaExpand, FaEye, FaHistory, FaVideo, FaUser, FaPhone, FaBriefcase, FaMapMarkerAlt, FaDownload, FaPlay } from "react-icons/fa";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";
import PdfDocumentHub from "./PdfDocumentHub";
import { useRef } from "react";

const SocialFeed = () => {
    const { theme } = useTheme();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser] = useState(JSON.parse(localStorage.getItem("user") || "{}"));
    const [taggableUsers, setTaggableUsers] = useState([]);

    // Create Post State
    const [content, setContent] = useState("");
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [videos, setVideos] = useState([]);
    const [videoPreviews, setVideoPreviews] = useState([]);
    const [showPoll, setShowPoll] = useState(false);
    const [pollQuestion, setPollQuestion] = useState("");
    const [pollOptions, setPollOptions] = useState(["", ""]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [showTagList, setShowTagList] = useState(false);
    const [activeUsers, setActiveUsers] = useState([]);
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
    const navigate = useNavigate();

    // Participant Modal State (for both likes and votes)
    const [participantModalData, setParticipantModalData] = useState(null);

    useEffect(() => {
        fetchPosts();
        fetchUsers();
        recordSocialVisit();
        fetchSocialActivity();
        const interval = setInterval(fetchSocialActivity, 60000); // Refresh activity every minute
        return () => clearInterval(interval);
    }, []);

    const fetchPosts = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/posts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setPosts(data);
            }
        } catch (error) {
            console.error("Fetch posts error:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/posts/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setTaggableUsers(data);
            }
        } catch (error) {
            console.error("Fetch users error:", error);
        }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm("Are you sure you want to delete this post?")) return;

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/posts/${postId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.ok) {
                toast.success("Post deleted successfully");
                setPosts(posts.filter(p => p._id !== postId));
            } else {
                const data = await response.json();
                toast.error(data.message || "Failed to delete post");
            }
        } catch {
            toast.error("Error deleting post");
        }
    };

    const handleUpdatePost = async (postId, formData) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/posts/${postId}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            if (response.ok) {
                const updatedPost = await response.json();
                setPosts(posts.map(p => p._id === postId ? updatedPost : p));
                toast.success("Post updated successfully");
                return true;
            } else {
                const data = await response.json();
                toast.error(data.message || "Failed to update post");
                return false;
            }
        } catch {
            toast.error("Error updating post");
            return false;
        }
    };

    const handleDeleteComment = async (postId, commentId) => {
        if (!window.confirm("Delete this comment?")) return;

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/posts/${postId}/comment/${commentId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.ok) {
                const updatedPost = await response.json();
                setPosts(posts.map(p => p._id === postId ? { ...p, comments: updatedPost.comments } : p));
                toast.success("Comment deleted");
            } else {
                toast.error("Failed to delete comment");
            }
        } catch {
            toast.error("Error deleting comment");
        }
    };

    const handlePostView = async (postId) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/posts/${postId}/view`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                const updatedPost = await response.json();
                setPosts(prev => prev.map(p => p._id === postId ? updatedPost : p));
            }
        } catch (error) {
            console.error("View record error:", error);
        }
    };

    const recordSocialVisit = async () => {
        try {
            const token = localStorage.getItem("token");
            await fetch(`${import.meta.env.VITE_API_URL}/posts/visit`, {
                method: "POST",
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (error) {
            console.error("Visit record error:", error);
        }
    };

    const fetchSocialActivity = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/posts/activity`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 401) {
                // Token expired - redirect to login
                localStorage.clear();
                navigate("/login");
                return;
            }
            if (response.ok) {
                const data = await response.json();
                setActiveUsers(data);
            }
        } catch (error) {
            console.error("Fetch social activity error:", error);
        }
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        const imageFiles = files.filter(f => f.type.startsWith('image/'));
        const videoFiles = files.filter(f => f.type.startsWith('video/'));

        if (imageFiles.length > 0) {
            setImages(prev => [...prev, ...imageFiles]);
            const previews = imageFiles.map(file => URL.createObjectURL(file));
            setImagePreviews(prev => [...prev, ...previews]);
        }

        if (videoFiles.length > 0) {
            setVideos(prev => [...prev, ...videoFiles]);
            const previews = videoFiles.map(file => URL.createObjectURL(file));
            setVideoPreviews(prev => [...prev, ...previews]);
        }
    };

    const removeFile = (index, type) => {
        if (type === 'image') {
            setImages(prev => prev.filter((_, i) => i !== index));
            setImagePreviews(prev => prev.filter((_, i) => i !== index));
        } else {
            setVideos(prev => prev.filter((_, i) => i !== index));
            setVideoPreviews(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleRemoveImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmitPost = async (e) => {
        if (e) e.preventDefault();
        if (!content.trim() && images.length === 0 && videos.length === 0 && !pollQuestion) {
            toast.error("Please add some content to your post!");
            return;
        }

        const formData = new FormData();
        formData.append("content", content);
        if (showPoll && pollQuestion) {
            formData.append("poll", JSON.stringify({
                question: pollQuestion,
                options: pollOptions.filter(opt => opt.trim() !== "")
            }));
        }
        if (selectedTags.length > 0) {
            formData.append("tags", JSON.stringify(selectedTags.map(t => t._id)));
        }

        images.forEach(img => formData.append("images", img));
        videos.forEach(vid => formData.append("images", vid)); // Backend handles separation check on mimetype

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/posts`, {
                method: "POST",
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (response.ok) {
                toast.success("Post shared successfully!");
                setContent("");
                setImages([]);
                setImagePreviews([]);
                setVideos([]);
                setVideoPreviews([]);
                setShowPoll(false);
                setPollQuestion("");
                setPollOptions(["", ""]);
                setSelectedTags([]);
                fetchPosts();
            } else {
                toast.error("Failed to share post");
            }
        } catch (error) {
            console.error("Post creation error:", error);
            toast.error("Something went wrong");
        }
    };

    const handleLike = async (postId) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/posts/${postId}/like`, {
                method: "POST",
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                fetchPosts();
            }
        } catch (error) {
            console.error("Like error:", error);
        }
    };

    const handleVote = async (postId, optionId) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/posts/${postId}/vote`, {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ optionId })
            });
            if (response.ok) {
                fetchPosts();
                toast.success("Vote recorded! Each person can vote only once.");
            } else {
                const data = await response.json();
                toast.error(data.message || "Failed to vote");
            }
        } catch (error) {
            console.error("Vote error:", error);
            toast.error("An error occurred while voting");
        }
    };

    const handleComment = async (postId, text) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/posts/${postId}/comment`, {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });
            if (response.ok) {
                fetchPosts();
            }
        } catch (error) {
            console.error("Comment error:", error);
        }
    };

    return (
        <div className={`flex-1 h-full overflow-y-auto p-2 sm:p-4 md:p-8 custom-scrollbar transition-colors duration-300 ${theme === 'dark' ? 'bg-[#131619] text-white' : 'bg-gray-50 text-gray-900'}`} data-theme={theme}>
            <div className="max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8">
                {/* Left Column: User Profile Card */}
                <div className="lg:col-span-3 h-fit lg:sticky lg:top-8 hidden lg:block">
                    <ProfileCard user={currentUser} theme={theme} navigate={navigate} />
                </div>

                {/* Center Column: Social Feed */}
                <div className="col-span-1 lg:col-span-5 space-y-8">

                    {/* Create Post Section */}
                    <div className={`${theme === 'dark' ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'} rounded-xl border shadow-xl overflow-hidden`}>
                        <div className="p-6">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-full bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold overflow-hidden shrink-0">
                                    {currentUser.profileImage ? (
                                        <img src={currentUser.profileImage} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{currentUser.name?.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <textarea
                                        className={`w-full bg-transparent border-none ${theme === 'dark' ? 'text-white' : 'text-gray-900'} placeholder-gray-500 focus:ring-0 text-lg resize-none min-h-[100px]`}
                                        placeholder="What's on your mind?"
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                    />

                                    {(imagePreviews.length > 0 || videoPreviews.length > 0) && (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                                            {imagePreviews.map((src, i) => (
                                                <div key={i} className="relative group aspect-square">
                                                    <img src={src} alt="" className={`w-full h-full object-cover rounded-lg border ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`} />
                                                    <button
                                                        onClick={() => removeFile(i, 'image')}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform"
                                                    >
                                                        <FaTrash size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                            {videoPreviews.map((src, i) => (
                                                <div key={i} className="relative group aspect-square">
                                                    <div className="w-full h-full bg-black rounded-lg flex items-center justify-center overflow-hidden">
                                                        <video src={src} className="w-full h-full object-cover opacity-60" />
                                                        <FaPlay className="absolute text-white/50" size={20} />
                                                    </div>
                                                    <button
                                                        onClick={() => removeFile(i, 'video')}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform"
                                                    >
                                                        <FaTrash size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {showPoll && (
                                        <div className={`mb-4 p-4 rounded-lg border space-y-3 ${theme === 'dark' ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                            <input
                                                type="text"
                                                placeholder="Poll Question"
                                                className={`w-full border rounded-lg p-2 text-sm ${theme === 'dark' ? 'bg-[#1a1f24] border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                                                value={pollQuestion}
                                                onChange={(e) => setPollQuestion(e.target.value)}
                                            />
                                            {pollOptions.map((opt, i) => (
                                                <input
                                                    key={i}
                                                    type="text"
                                                    placeholder={`Option ${i + 1}`}
                                                    className={`w-full border rounded-lg p-2 text-xs ${theme === 'dark' ? 'bg-[#1a1f24] border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                                                    value={opt}
                                                    onChange={(e) => {
                                                        const newOpts = [...pollOptions];
                                                        newOpts[i] = e.target.value;
                                                        setPollOptions(newOpts);
                                                    }}
                                                />
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => setPollOptions([...pollOptions, ""])}
                                                className="text-xs text-cyan-400 font-bold hover:underline"
                                                disabled={pollOptions.length >= 5}
                                            >
                                                + Add Option
                                            </button>
                                        </div>
                                    )}

                                    {selectedTags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {selectedTags.map(user => (
                                                <span key={user._id} className="px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-500/20">
                                                    @{user.name}
                                                    <button className="ml-2 hover:text-white" onClick={() => setSelectedTags(selectedTags.filter(t => t._id !== user._id))}>×</button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 dark:bg-[#131619]/50 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <label className="cursor-pointer text-gray-400 hover:text-cyan-400 transition-colors flex items-center gap-2">
                                    <FaImage size={18} />
                                    <span className="text-xs font-bold hidden sm:inline">Photo</span>
                                    <input type="file" multiple className="hidden" accept="image/*" onChange={handleImageChange} />
                                </label>
                                <label className="cursor-pointer text-gray-400 hover:text-cyan-400 transition-colors flex items-center gap-1.5 sm:gap-2">
                                    <FaVideo size={16} />
                                    <span className="text-[10px] font-bold hidden xs:inline">Video</span>
                                    <input type="file" multiple className="hidden" accept="video/*" onChange={handleImageChange} />
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowPoll(!showPoll)}
                                    className={`flex items-center gap-1.5 sm:gap-2 transition-colors ${showPoll ? 'text-cyan-400' : 'text-gray-400 hover:text-cyan-400'}`}
                                >
                                    <FaPoll size={16} />
                                    <span className="text-[10px] font-bold hidden xs:inline">Poll</span>
                                </button>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowTagList(!showTagList)}
                                        className={`flex items-center gap-1.5 sm:gap-2 transition-colors ${showTagList ? 'text-cyan-400' : 'text-gray-400 hover:text-cyan-400'}`}
                                    >
                                        <FaAt size={16} />
                                        <span className="text-[10px] font-bold hidden xs:inline">Tag</span>
                                    </button>

                                    {showTagList && (
                                        <div className={`absolute top-10 left-0 w-64 max-h-60 overflow-y-auto border rounded-lg shadow-2xl z-50 p-2 custom-scrollbar ${theme === 'dark' ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest p-2 border-b border-gray-800 mb-2">Tag Someone</p>
                                            {taggableUsers.filter(u => !selectedTags.some(t => t._id === u._id)).map(user => (
                                                <button
                                                    key={user._id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedTags([...selectedTags, user]);
                                                        setShowTagList(false);
                                                    }}
                                                    className={`w-full text-left p-2 rounded flex items-center gap-3 transition-colors ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold">
                                                        {user.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className={`text-xs font-bold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{user.name}</p>
                                                        <p className={`text-[10px] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{user.role}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleSubmitPost}
                                className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 sm:px-6 py-2 rounded-lg font-bold text-xs sm:text-sm shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center gap-2"
                            >
                                <span className="hidden xs:inline">Share</span> <FaPaperPlane size={12} />
                            </button>
                        </div>
                    </div>

                    {/* Posts Feed */}
                    <div className="space-y-8">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Loading Feed...</p>
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="text-center py-20 bg-white dark:bg-[#1a1f24] rounded-xl border border-gray-200 dark:border-gray-800">
                                <p className="text-gray-500 font-bold">No posts yet. Be the first to share something!</p>
                            </div>
                        ) : (
                            posts.map(post => (
                                <PostCard
                                    key={post._id}
                                    post={post}
                                    onLike={() => handleLike(post._id)}
                                    onVote={(optId) => handleVote(post._id, optId)}
                                    onComment={(text) => handleComment(post._id, text)}
                                    onDelete={() => handleDeletePost(post._id)}
                                    onUpdate={(formData) => handleUpdatePost(post._id, formData)}
                                    onDeleteComment={(commentId) => handleDeleteComment(post._id, commentId)}
                                    onViewParticipants={(title, users) => setParticipantModalData({ title, users })}
                                    onView={() => handlePostView(post._id)}
                                    currentUser={currentUser}
                                    theme={theme}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Participant Details Modal */}
                {participantModalData && (
                    <ParticipantModal
                        data={participantModalData}
                        onClose={() => setParticipantModalData(null)}
                        theme={theme}
                    />
                )}

                {/* Right Column: PDF Document Hub & Social Activity */}
                <div className="lg:col-span-4 h-fit lg:sticky lg:top-8 space-y-8 hidden lg:block">
                    <SocialActivity activeUsers={activeUsers} theme={theme} />
                    <PdfDocumentHub theme={theme} />
                </div>
            </div>

            {/* Mobile Right Sidebar Toggle Button */}
            <button
                onClick={() => setIsRightSidebarOpen(true)}
                className="lg:hidden fixed right-0 top-1/2 -translate-y-1/2 z-[45] bg-cyan-600 hover:bg-cyan-500 text-white p-4 rounded-l-2xl shadow-2xl flex flex-col items-center gap-2 transition-all duration-300 active:scale-90 group"
            >
                <div className="flex flex-col items-center">
                    <FaChevronLeft className="animate-pulse" size={14} />
                    <span className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-black uppercase tracking-widest mt-2 group-hover:tracking-[0.2em] transition-all">Dash Info</span>
                </div>
            </button>

            {/* Mobile Right Sidebar Drawer */}
            <div className={`fixed inset-0 z-[100] lg:hidden transition-all duration-500 ${isRightSidebarOpen ? 'visible' : 'invisible'}`}>
                {/* Overlay */}
                <div
                    className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 ${isRightSidebarOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setIsRightSidebarOpen(false)}
                />

                {/* Drawer Content */}
                <div className={`absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-gray-50 dark:bg-[#131619] shadow-2xl transition-transform duration-500 transform ${isRightSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="h-full flex flex-col">
                        {/* Drawer Header */}
                        <div className={`p-6 border-b flex items-center justify-between ${theme === 'dark' ? 'bg-[#1a1f24] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-500">Dashboard Intelligence</h2>
                            </div>
                            <button
                                onClick={() => setIsRightSidebarOpen(false)}
                                className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {/* Drawer Body - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Your Profile Summary</p>
                                <ProfileCard user={currentUser} theme={theme} navigate={navigate} />
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Network Activity</p>
                                <SocialActivity activeUsers={activeUsers} theme={theme} />
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Knowledge Assets</p>
                                <PdfDocumentHub theme={theme} />
                            </div>
                        </div>

                        {/* Drawer Footer */}
                        <div className={`p-4 border-t text-center ${theme === 'dark' ? 'bg-[#1a1f24]/50 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter italic">Updated in real-time • ERP Social System v2.0</p>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(6, 182, 212, 0.1); border-radius: 10px; }
                .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(6, 182, 212, 0.3); }
            `}</style>
        </div>
    );
};

const ImageCarousel = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (images.length <= 1 || isFullscreen || isPaused) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % images.length);
        }, 3000);

        return () => clearInterval(interval);
    }, [images.length, isFullscreen, isPaused]);

    const nextImage = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    if (!images || images.length === 0) return null;

    return (
        <div
            className="relative group w-full"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Main Display Container */}
            <div
                className="relative aspect-video w-full cursor-zoom-in overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-black/20 group"
                onClick={() => setIsFullscreen(true)}
            >
                {/* Background Blur Image (for premium effect on odd aspect ratios) */}
                <div
                    className="absolute inset-0 blur-2xl opacity-30 scale-110"
                    style={{
                        backgroundImage: `url(${images[currentIndex].startsWith('http') ? images[currentIndex] : `${import.meta.env.VITE_API_URL}${images[currentIndex]}`})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    }}
                />

                <img
                    src={images[currentIndex].startsWith('http') ? images[currentIndex] : `${import.meta.env.VITE_API_URL}${images[currentIndex]}`}
                    alt=""
                    className="relative w-full h-full object-contain transition-all duration-700 ease-in-out"
                    key={currentIndex}
                />

                {/* View Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="p-3 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                        <FaExpand size={20} />
                    </div>
                </div>

                {/* Navigation Arrows */}
                {images.length > 1 && (
                    <>
                        <button
                            onClick={prevImage}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 dark:bg-black/30 backdrop-blur-xl border border-white/20 dark:border-white/5 text-white opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all hover:bg-white/20 dark:hover:bg-cyan-500/20 hover:border-cyan-500/30"
                        >
                            <FaChevronLeft size={18} />
                        </button>
                        <button
                            onClick={nextImage}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 dark:bg-black/30 backdrop-blur-xl border border-white/20 dark:border-white/5 text-white opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all hover:bg-white/20 dark:hover:bg-cyan-500/20 hover:border-cyan-500/30"
                        >
                            <FaChevronRight size={18} />
                        </button>

                        {/* Indicators & Counter */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                            <div className="flex gap-1.5 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10">
                                {images.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1.5 rounded-full transition-all duration-500 ${i === currentIndex ? 'bg-cyan-400 w-4 shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'bg-white/30 w-1.5'}`}
                                    />
                                ))}
                            </div>
                            <span className="text-[10px] font-black text-white px-2 py-1 rounded bg-black/40 backdrop-blur-md border border-white/10">
                                {currentIndex + 1} / {images.length}
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Fullscreen Overlay Modal */}
            {isFullscreen && (
                <div
                    className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center animate-fade-in"
                    onClick={() => setIsFullscreen(false)}
                >
                    <button
                        className="absolute top-8 right-8 p-4 text-white/50 hover:text-white transition-all hover:rotate-90 duration-300 z-10"
                        onClick={() => setIsFullscreen(false)}
                    >
                        <FaTimes size={32} />
                    </button>

                    <div className="relative w-full h-full flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={images[currentIndex].startsWith('http') ? images[currentIndex] : `${import.meta.env.VITE_API_URL}${images[currentIndex]}`}
                            alt=""
                            className="max-h-[90vh] max-w-[95vw] object-contain shadow-[0_0_100px_rgba(6,182,212,0.1)] rounded-lg"
                            key={currentIndex}
                        />

                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={prevImage}
                                    className="absolute left-4 sm:left-12 p-6 rounded-full bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all border border-white/10 backdrop-blur-xl"
                                >
                                    <FaChevronLeft size={36} />
                                </button>
                                <button
                                    onClick={nextImage}
                                    className="absolute right-4 sm:right-12 p-6 rounded-full bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all border border-white/10 backdrop-blur-xl"
                                >
                                    <FaChevronRight size={36} />
                                </button>

                                <div className="absolute bottom-10 px-8 py-3 rounded-full bg-white/5 border border-white/10 text-white font-black text-sm tracking-[0.2em] backdrop-blur-xl">
                                    IMAGE <span className="text-cyan-400">{currentIndex + 1}</span> OF <span className="text-cyan-400">{images.length}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const VoterAvatar = ({ name, size = "md" }) => {
    const variants = {
        sm: "h-5 w-5 text-[7px]",
        md: "h-8 w-8 text-xs",
        lg: "h-12 w-12 text-lg"
    };
    return (
        <div className={`${variants[size]} rounded-full bg-cyan-600 flex items-center justify-center font-black text-white shrink-0 border-2 border-white dark:border-gray-800 shadow-sm`}>
            {(name || "A").charAt(0).toUpperCase()}
        </div>
    );
};

const ParticipantModal = ({ data, onClose, theme }) => {
    const isDark = theme === 'dark';
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden transform transition-all animate-scale-up ${isDark ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                {/* Header */}
                <div className={`px-6 py-4 border-b flex justify-between items-center ${isDark ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-cyan-500">{data.title}</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-lg transition-all">
                        <FaTimes />
                    </button>
                </div>

                {/* Voter List */}
                <div className="p-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {data.users.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="text-gray-500 font-bold text-sm italic">No participants yet</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {Array.from(new Map(data.users.map(u => [u._id || u, u])).values()).map((user) => (
                                <div
                                    key={user._id || user}
                                    className={`flex items-center gap-4 p-3 rounded-xl transition-all ${isDark ? 'hover:bg-gray-800/10' : 'hover:bg-gray-50/50'}`}
                                >
                                    <VoterAvatar name={user.name} />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 text-left">
                                            <h4 className={`text-sm font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{user.name}</h4>
                                            <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest ${isDark ? 'bg-gray-800 text-gray-400 border border-gray-700' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                                                {user.role}
                                            </span>
                                        </div>
                                        <p className={`text-[10px] font-bold text-left ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{user.email}</p>
                                        <div className="flex items-center justify-between">
                                            <p className={`text-[9px] font-black uppercase tracking-tight text-cyan-500/70`}>
                                                {user.designation || user.teacherDepartment || "Staff Member"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`px-6 py-4 border-t text-center ${isDark ? 'bg-[#131619]/50 border-gray-800' : 'bg-gray-50/50 border-gray-200'}`}>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Total {data.users.length} Participants</p>
                </div>
            </div>
            <style>{`
                @keyframes scaleUp { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

const PostCard = ({ post, onLike, onVote, onComment, onDelete, onUpdate, onDeleteComment, onViewParticipants, onView, currentUser, theme }) => {
    const [commentText, setCommentText] = useState("");
    const [showComments, setShowComments] = useState(false);

    useEffect(() => {
        if (onView) {
            onView();
        }
    }, []);

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(post.content || "");
    const [newImages, setNewImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [removedImages, setRemovedImages] = useState([]);
    const [isUpdating, setIsUpdating] = useState(false);

    const isLikedByMe = post.likes.some(u => u === currentUser._id || u._id === currentUser._id);
    const hasVoted = post.poll?.options.some(opt => opt.votes.some(v => (v._id || v) === currentUser._id));
    const isAuthor = post.author?._id === currentUser._id || post.author === currentUser._id;

    const handleCommentSubmit = (e) => {
        if (e.key === 'Enter' && commentText.trim()) {
            onComment(commentText);
            setCommentText("");
        }
    };

    const handleEditImageChange = (e) => {
        const files = Array.from(e.target.files);
        setNewImages(prev => [...prev, ...files]);
        const previews = files.map(file => URL.createObjectURL(file));
        setImagePreviews(prev => [...prev, ...previews]);
    };

    const handleRemoveExistingImage = (imgUrl) => {
        setRemovedImages(prev => [...prev, imgUrl]);
    };

    const handleUpdate = async () => {
        setIsUpdating(true);
        const formData = new FormData();
        formData.append("content", editContent);
        if (removedImages.length > 0) {
            formData.append("removedImages", JSON.stringify(removedImages));
        }
        newImages.forEach(img => {
            formData.append("images", img);
        });

        const success = await onUpdate(formData);
        if (success) {
            setIsEditing(false);
            setNewImages([]);
            setImagePreviews([]);
            setRemovedImages([]);
        }
        setIsUpdating(false);
    };

    return (
        <div className={`${theme === 'dark' ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'} rounded-xl border shadow-lg overflow-hidden animate-fade-in transition-all hover:shadow-cyan-500/5`}>
            {/* Post Header */}
            <div className="p-4 sm:p-6 flex items-start justify-between gap-4">
                <div className="flex gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold overflow-hidden border border-cyan-500/20 shrink-0">
                        {post.author?.profileImage ? (
                            <img
                                src={post.author.profileImage.startsWith('http') ? post.author.profileImage : `${import.meta.env.VITE_API_URL}${post.author.profileImage}`}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <span className={post.author?.profileImage ? 'hidden' : ''}>{post.author?.name?.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-gray-900 dark:text-white font-black text-base sm:text-lg truncate max-w-[150px] sm:max-w-none">{post.author?.name}</h4>
                            <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[9px] font-black uppercase tracking-widest border border-cyan-500/20 shrink-0">
                                {post.author?.role}
                            </span>

                            {/* Action Buttons for Author or SuperAdmin */}
                            {(post.author?._id === currentUser._id || currentUser.role === "superAdmin") && !isEditing && (
                                <div className="flex items-center gap-2 sm:gap-3 ml-auto sm:ml-4">
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-black text-[9px] uppercase tracking-widest transition-all hover:scale-105 bg-cyan-500/5 px-2 py-1 rounded-md border border-cyan-500/10"
                                        title="Edit Post"
                                    >
                                        <FaEdit size={10} /> <span className="hidden xs:inline">Edit</span>
                                    </button>
                                    <button
                                        onClick={onDelete}
                                        className="flex items-center gap-1 text-red-500 hover:text-red-600 font-black text-[9px] uppercase tracking-widest transition-all hover:scale-105 bg-red-500/5 px-2 py-1 rounded-md border border-red-500/10"
                                        title="Delete Post"
                                    >
                                        <FaTrash size={10} /> <span className="hidden xs:inline">Delete</span>
                                    </button>
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-500 font-bold truncate">
                            {post.author?.designationName} • {post.author?.departmentName}
                        </p>
                        <p className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                            {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                {/* Right Side - Author Info */}
                <div className="hidden sm:flex flex-col items-end gap-1.5 self-start pt-1">
                    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all hover:border-cyan-500/30 group ${theme === 'dark' ? 'bg-gray-800/40 border-gray-700/50' : 'bg-gray-50 border-gray-200'}`}>
                        <FaEnvelope className="text-cyan-500 text-[10px] group-hover:scale-110 transition-transform" />
                        <span className={`text-[10px] font-black lowercase truncate max-w-[180px] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {post.author?.email}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1 rounded-[4px] bg-cyan-500/5 border border-cyan-500/10">
                        <FaBuilding className="text-cyan-500/60 text-[9px]" />
                        <span className={`text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-cyan-400/80' : 'text-cyan-600'}`}>
                            {post.author?.departmentName || "General"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-6 pb-6 space-y-4">
                {isEditing ? (
                    <div className="space-y-4">
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className={`w-full border rounded-xl p-4 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 min-h-[120px] transition-all ${theme === 'dark' ? 'bg-[#131619] border-gray-800 text-gray-100' : 'bg-white border-gray-200 text-gray-900'}`}
                            placeholder="Edit your post..."
                        />

                        {/* Current & New Images */}
                        <div className="flex flex-wrap gap-2">
                            {/* Existing Images */}
                            {post.images?.filter(img => !removedImages.includes(img)).map((img, i) => (
                                <div key={i} className="relative w-24 h-24">
                                    <img src={img.startsWith('http') ? img : `${import.meta.env.VITE_API_URL}${img}`} className="w-full h-full object-cover rounded-lg border border-gray-800" alt="" />
                                    <button
                                        onClick={() => handleRemoveExistingImage(img)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:scale-110 transition-transform"
                                    >
                                        <FaTrash size={10} />
                                    </button>
                                </div>
                            ))}
                            {/* Existing Videos */}
                            {post.videos?.filter(vid => !removedImages.includes(vid)).map((vid, i) => (
                                <div key={i} className="relative w-24 h-24 bg-black rounded-lg">
                                    <video src={vid.startsWith('http') ? vid : `${import.meta.env.VITE_API_URL}${vid}`} className="w-full h-full object-cover rounded-lg" />
                                    <button
                                        onClick={() => handleRemoveExistingImage(vid)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:scale-110 transition-transform"
                                    >
                                        <FaTrash size={10} />
                                    </button>
                                </div>
                            ))}
                            {/* New Previews (merged image/video) */}
                            {imagePreviews.map((pre, i) => (
                                <div key={i} className="relative w-24 h-24">
                                    <img src={pre} className="w-full h-full object-cover rounded-lg border border-cyan-500/50" alt="" />
                                    <button
                                        onClick={() => {
                                            setNewImages(newImages.filter((_, idx) => idx !== i));
                                            setImagePreviews(imagePreviews.filter((_, idx) => idx !== i));
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:scale-110 transition-transform"
                                    >
                                        <FaTrash size={10} />
                                    </button>
                                </div>
                            ))}
                            <label className="w-24 h-24 border-2 border-dashed border-gray-800 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-cyan-500/50 hover:text-cyan-500 cursor-pointer transition-all">
                                <FaUpload size={20} />
                                <span className="text-[10px] mt-1 font-bold uppercase">ADD</span>
                                <input type="file" multiple hidden onChange={handleEditImageChange} accept="image/*,video/*" />
                            </label>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    setEditContent(post.content || "");
                                    setRemovedImages([]);
                                    setNewImages([]);
                                    setImagePreviews([]);
                                }}
                                className="px-4 py-2 rounded-lg border border-gray-800 text-gray-400 hover:bg-white/5 font-bold text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdate}
                                disabled={isUpdating}
                                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                            >
                                {isUpdating ? "Updating..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {post.content && (
                            <p className={`text-lg leading-relaxed whitespace-pre-wrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                {post.content}
                            </p>
                        )}

                        {post.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {post.tags.map(tag => (
                                    <span key={tag._id} className="text-cyan-400 font-bold text-sm">@{tag.name}</span>
                                ))}
                            </div>
                        )}

                        {post.images?.length > 0 && (
                            <ImageCarousel images={post.images} />
                        )}

                        {post.videos?.length > 0 && (
                            <div className="space-y-4">
                                {post.videos.map((vid, i) => (
                                    <VideoPlayer key={i} src={vid} theme={theme} />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {post.poll && post.poll.question && (
                    <div className={`p-6 rounded-xl border space-y-4 ${theme === 'dark' ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-3">
                            <FaChartBar className="text-cyan-500" />
                            <h5 className={`font-bold text-base sm:text-lg ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>{post.poll.question}</h5>
                        </div>
                        <div className="space-y-3">
                            {post.poll.options.map(opt => {
                                const totalVotes = post.poll.options.reduce((sum, o) => sum + o.votes.length, 0);
                                const percentage = totalVotes > 0 ? (opt.votes.length / totalVotes) * 100 : 0;
                                const isVotedByMe = opt.votes.some(v => (v._id || v) === currentUser._id);

                                return (
                                    <div key={opt._id} className="space-y-1.5">
                                        <button
                                            disabled={hasVoted}
                                            onClick={() => onVote(opt._id)}
                                            className={`w-full relative group p-3 rounded-lg border text-left transition-all ${isVotedByMe ? 'border-cyan-500 bg-cyan-500/10' :
                                                theme === 'dark' ? 'border-gray-800 bg-black/20 hover:border-gray-600' : 'border-gray-200 bg-white hover:border-gray-400'
                                                }`}
                                        >
                                            <div
                                                className={`absolute inset-y-0 left-0 rounded-l-lg transition-all duration-1000 ${isVotedByMe ? 'bg-cyan-500/20' : 'bg-gray-800/30'}`}
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                            <div className="relative flex justify-between items-center gap-2 text-sm">
                                                <span className="font-bold flex items-center gap-2 min-w-0">
                                                    <span className="truncate">{opt.text}</span>
                                                    {isVotedByMe && <FaCheckCircle className="text-cyan-400 shrink-0" size={12} />}
                                                </span>
                                                <span className="text-xs text-gray-500 font-black shrink-0">{Math.round(percentage)}%</span>
                                            </div>
                                        </button>

                                        {/* Show Voters if user has voted */}
                                        {hasVoted && opt.votes.length > 0 && (
                                            <button
                                                onClick={() => onViewParticipants(`Voters for: ${opt.text}`, opt.votes)}
                                                className="flex items-center gap-2 px-1 hover:bg-cyan-500/5 rounded-md transition-colors w-fit group/voters"
                                                title="View voter details"
                                            >
                                                <div className="flex -space-x-1.5 overflow-hidden">
                                                    {opt.votes.slice(0, 6).map((voter, idx) => (
                                                        <div
                                                            key={voter._id || idx}
                                                            title={voter.name}
                                                            className="inline-block h-5 w-5 rounded-full ring-2 ring-white dark:ring-[#1a1f24] bg-cyan-600 flex items-center justify-center text-[7px] font-black text-white shrink-0 shadow-sm"
                                                        >
                                                            {(voter.name || "A").charAt(0).toUpperCase()}
                                                        </div>
                                                    ))}
                                                </div>
                                                {opt.votes.length > 0 && (
                                                    <span className={`text-[8px] font-black uppercase tracking-tight transition-colors group-hover/voters:text-cyan-400 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                                        {opt.votes.slice(0, 2).map(v => v.name).join(", ")}
                                                        {opt.votes.length > 2 ? ` & ${opt.votes.length - 2} others` : " voted"}
                                                    </span>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest text-right">
                            {post.poll.options.reduce((sum, o) => sum + o.votes.length, 0)} Total Votes
                        </p>
                    </div>
                )}
            </div>

            {/* Interaction Bar */}
            <div className={`px-4 sm:px-6 py-3 sm:py-4 border-t flex flex-wrap items-center gap-4 sm:gap-6 ${theme === 'dark' ? 'bg-[#131619]/30 border-gray-800' : 'bg-gray-50/50 border-gray-200'}`}>
                <div className="flex items-center gap-2 group/likes">
                    <button
                        onClick={onLike}
                        className={`flex items-center gap-1.5 font-bold text-xs sm:text-sm transition-all active:scale-125 ${isLikedByMe ? 'text-cyan-500 dark:text-cyan-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        title={isLikedByMe ? "Unlike" : "Like"}
                    >
                        <FaThumbsUp size={14} />
                    </button>
                    <button
                        onClick={() => onViewParticipants("People who liked", post.likes)}
                        className={`text-xs sm:text-sm font-black transition-colors hover:text-cyan-400 ${isLikedByMe ? 'text-cyan-500' : 'text-gray-500'}`}
                    >
                        {post.likes.length} <span className="hidden xs:inline">Likes</span>
                    </button>
                </div>
                <button
                    onClick={() => setShowComments(!showComments)}
                    className="flex items-center gap-2 font-bold text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                    <FaComment size={14} /> {post.comments.length} <span className="hidden xs:inline">Comments</span>
                </button>
                {isAuthor && (
                    <button
                        onClick={() => onViewParticipants("People who viewed", post.views || [])}
                        className="flex items-center gap-2 font-bold text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        <FaEye size={14} /> {post.views?.length || 0} <span className="hidden xs:inline">Viewers</span>
                    </button>
                )}
            </div>

            {/* Comments Section */}
            {
                showComments && (
                    <div className={`p-6 border-t space-y-6 ${theme === 'dark' ? 'bg-[#131619]/50 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar">
                            {post.comments.map((comment, i) => (
                                <div key={i} className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold shrink-0">
                                        {comment.user?.name?.charAt(0)}
                                    </div>
                                    <div className={`p-3 rounded-xl border flex-1 shadow-sm ${theme === 'dark' ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                                        <div className="flex justify-between items-center mb-1">
                                            <h5 className={`text-xs font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{comment.user?.name}</h5>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] text-gray-500 dark:text-gray-400 font-bold">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                                {(comment.user?._id === currentUser.id || comment.user === currentUser.id || post.author?._id === currentUser.id) && (
                                                    <button
                                                        onClick={() => onDeleteComment(comment._id)}
                                                        className="text-red-500 hover:text-red-600 transition-colors"
                                                    >
                                                        <FaTrash size={8} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{comment.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-cyan-900 flex items-center justify-center text-xs font-bold text-cyan-400 shrink-0">
                                {currentUser.name?.charAt(0)}
                            </div>
                            <input
                                type="text"
                                placeholder="Write a comment..."
                                className={`flex-1 border rounded-lg px-4 py-2 text-sm focus:border-cyan-500/50 outline-none ${theme === 'dark' ? 'bg-[#1a1f24] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyPress={handleCommentSubmit}
                            />
                        </div>
                    </div>
                )
            }
        </div >
    );
};

// ─── LinkedIn-Style Profile Card ──────────────────────────────────────────────
const ProfileCard = ({ user, theme, navigate }) => {
    const isDark = theme === 'dark';
    return (
        <div className={`${isDark ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'} rounded-2xl border shadow-xl overflow-hidden transition-all duration-300 hover:shadow-cyan-500/10`}>
            {/* Banner */}
            <div className="h-24 bg-gradient-to-r from-cyan-600 to-blue-600 relative">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />
            </div>

            {/* Profile Pic Overlay */}
            <div className="px-6 -mt-12 pb-6 relative z-10">
                <div className="relative inline-block group">
                    <div className={`w-24 h-24 rounded-2xl border-4 ${isDark ? 'border-[#1a1f24] bg-[#131619]' : 'border-white bg-gray-50'} flex items-center justify-center shadow-xl overflow-hidden transition-transform duration-300 group-hover:scale-105`}>
                        {user.profileImage ? (
                            <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                                <span className="text-3xl font-black text-white">{user.name?.charAt(0).toUpperCase()}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-4">
                    <h3 className={`font-black text-xl tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{user.name}</h3>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-500 mt-1">{user.role}</p>
                </div>

                <div className="mt-8 space-y-4">
                    <div className="flex items-center gap-3 group">
                        <div className={`p-2 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'} text-cyan-500`}>
                            <FaEnvelope size={12} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Email Address</p>
                            <p className={`text-xs font-bold truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{user.email}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 group">
                        <div className={`p-2 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'} text-purple-500`}>
                            <FaBriefcase size={12} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Position & Team</p>
                            <p className={`text-xs font-bold truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                {user.designation || 'Staff'} • {user.teacherDepartment || 'General'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 group">
                        <div className={`p-2 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'} text-emerald-500`}>
                            <FaMapMarkerAlt size={12} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Work Location</p>
                            <p className={`text-xs font-bold truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                {user.centres?.[0]?.name || 'Primary Center'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 group">
                        <div className={`p-2 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'} text-orange-500`}>
                            <FaPhone size={12} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Contact Number</p>
                            <p className={`text-xs font-bold truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{user.mobNum || 'Not provided'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`px-6 py-5 border-t ${isDark ? 'border-gray-800 bg-[#131619]/50' : 'border-gray-100 bg-gray-50/50'}`}>
                <button
                    onClick={() => navigate('/employee/details')}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-cyan-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                    View My Profile
                </button>
            </div>
        </div>
    );
};

// ─── Pro Video Player ────────────────────────────────────────────────────────
const VideoPlayer = ({ src, theme }) => {
    const isDark = theme === 'dark';
    const videoRef = useRef(null);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isPlaying, setIsPlaying] = useState(false);

    const togglePlay = () => {
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handleSpeedChange = (rate) => {
        setPlaybackRate(rate);
        videoRef.current.playbackRate = rate;
    };

    const handleDownload = async () => {
        try {
            const response = await fetch(src);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `video_${Date.now()}.mp4`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            window.open(src, '_blank');
        }
    };

    return (
        <div className="relative group rounded-2xl overflow-hidden bg-black aspect-video border border-gray-200 dark:border-gray-800 shadow-2xl">
            <video
                ref={videoRef}
                src={src}
                className="w-full h-full cursor-pointer"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onClick={togglePlay}
            />

            {/* Standard HTML5 Controls Overlay (hidden by default, shown on hover if needed but native is better for volume/fullscr) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            {/* Premium Control Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between gap-4 z-20">
                <div className="flex items-center gap-3">
                    <button
                        onClick={togglePlay}
                        className="p-3 rounded-full bg-cyan-500 text-white shadow-lg shadow-cyan-500/40 hover:scale-110 active:scale-90 transition-all pointer-events-auto"
                    >
                        {isPlaying ? <FaTimes size={14} /> : <FaPlay size={14} className="ml-0.5" />}
                    </button>

                    {/* Speed Selector */}
                    <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md rounded-lg p-1 border border-white/10 pointer-events-auto">
                        {[1, 1.5, 2].map(rate => (
                            <button
                                key={rate}
                                onClick={() => handleSpeedChange(rate)}
                                className={`px-2 py-1 rounded-md text-[9px] font-black tracking-tighter transition-all ${playbackRate === rate ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                {rate}x
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2 pointer-events-auto">
                    <button
                        onClick={handleDownload}
                        className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-white hover:bg-cyan-500 hover:border-cyan-500 transition-all"
                        title="Download Video"
                    >
                        <FaDownload size={14} />
                    </button>
                    {/* Native controls cover volume and fullscr best, but we provide the download button as a premium extra */}
                </div>
            </div>

            {/* Play Overlay if not playing */}
            {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-20 h-20 rounded-full bg-cyan-500/20 backdrop-blur-sm border border-cyan-500/40 flex items-center justify-center text-cyan-400 animate-pulse">
                        <FaPlay size={30} className="ml-2" />
                    </div>
                </div>
            )}

            {/* Video metadata overlay */}
            <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[10px] font-black text-white uppercase tracking-widest">Premium Playback • {playbackRate}x</p>
            </div>
        </div>
    );
};

const SocialActivity = ({ activeUsers, theme }) => {
    const isDark = theme === 'dark';
    return (
        <div className={`${isDark ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'} rounded-2xl border shadow-xl overflow-hidden`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-2">
                    <FaHistory className="text-cyan-500" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-cyan-500">Dashboard Interaction</h3>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
                    <span className="text-[10px] font-black text-cyan-500 uppercase">{activeUsers.length} Online</span>
                </div>
            </div>
            <div className="p-4 space-y-4">
                <p className={`text-[10px] font-bold uppercase tracking-tight ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Active Dashboard Visitors (Last 1 Hour)
                </p>
                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {activeUsers.length === 0 ? (
                        <p className="text-xs text-center py-4 italic text-gray-500">No recent activity</p>
                    ) : (
                        activeUsers.map((user) => (
                            <div key={user._id} className="flex items-center gap-3 group">
                                <VoterAvatar name={user.name} size="sm" />
                                <div className="flex-1 overflow-hidden">
                                    <h4 className={`text-xs font-black truncate transition-colors group-hover:text-cyan-400 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{user.name}</h4>
                                    <p className={`text-[9px] font-bold truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {user.designation || user.teacherDepartment || "Staff Member"}
                                    </p>
                                </div>
                                <div className="text-[8px] font-black uppercase tracking-widest text-cyan-500/50">Active</div>
                            </div>
                        ))
                    )}
                </div>
            </div>
            <div className={`px-6 py-3 border-t text-center ${isDark ? 'bg-[#131619]/50 border-gray-800' : 'bg-gray-50/50 border-gray-200'}`}>
                <p className="text-[9px] font-bold text-gray-500 italic uppercase">Network pulse updated every minute</p>
            </div>
        </div>
    );
};

export default SocialFeed;
