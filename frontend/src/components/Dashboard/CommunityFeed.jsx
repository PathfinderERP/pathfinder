import React, { useState, useEffect } from "react";
import { FaUpload, FaPaperPlane, FaImage, FaPoll, FaThumbsUp, FaComment, FaCheckCircle, FaChartBar, FaTrash, FaTimes, FaEye, FaHistory, FaVideo, FaPlay, FaUsers, FaEdit } from "react-icons/fa";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";
import PdfDocumentHub from "./PdfDocumentHub";

const CommunityFeed = () => {
    const { theme } = useTheme();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser] = useState(JSON.parse(localStorage.getItem("user") || "{}"));

    // Create Post State
    const [content, setContent] = useState("");
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [videos, setVideos] = useState([]);
    const [videoPreviews, setVideoPreviews] = useState([]);
    const [showPoll, setShowPoll] = useState(false);
    const [pollQuestion, setPollQuestion] = useState("");
    const [pollOptions, setPollOptions] = useState(["", ""]);
    const [activeUsers, setActiveUsers] = useState([]);

    const fetchPosts = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/community`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setPosts(data);
            }
        } catch (error) {
            console.error("Fetch community posts error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchSocialActivity = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(`${import.meta.env.VITE_API_URL}/posts/activity`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setActiveUsers(data);
                }
            } catch (error) {
                console.error("Fetch social activity error:", error);
            }
        };

        fetchPosts();
        fetchSocialActivity();
        const interval = setInterval(fetchSocialActivity, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleDeletePost = async (postId) => {
        if (!window.confirm("Are you sure you want to delete this message?")) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/community/${postId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success("Message deleted");
                setPosts(posts.filter(p => p._id !== postId));
            }
        } catch {
            toast.error("Error deleting message");
        }
    };

    const handlePostView = async (postId) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/community/${postId}/view`, {
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

    const handleSubmitPost = async (e) => {
        if (e) e.preventDefault();
        if (!content.trim() && images.length === 0 && videos.length === 0 && !pollQuestion) {
            toast.error("Please add some content to your message!");
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
        images.forEach(img => formData.append("images", img));
        videos.forEach(vid => formData.append("images", vid));
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/community`, {
                method: "POST",
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (response.ok) {
                toast.success("Message shared with community!");
                setContent("");
                setImages([]);
                setImagePreviews([]);
                setVideos([]);
                setVideoPreviews([]);
                setShowPoll(false);
                setPollQuestion("");
                setPollOptions(["", ""]);
                fetchPosts();
            }
        } catch (error) {
            toast.error("Something went wrong");
        }
    };

    const handleLike = async (postId) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/community/${postId}/like`, {
                method: "POST",
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const updatedPost = await response.json();
                setPosts(prev => prev.map(p => p._id === postId ? { ...p, likes: updatedPost.likes } : p));
            }
        } catch (error) {
            console.error("Like error:", error);
        }
    };

    const handleVote = async (postId, optionId) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/community/${postId}/vote`, {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ optionId })
            });
            if (response.ok) {
                const updatedPost = await response.json();
                setPosts(prev => prev.map(p => p._id === postId ? { ...p, poll: updatedPost.poll } : p));
                toast.success("Vote recorded!");
            }
        } catch (error) {
            console.error("Vote error:", error);
        }
    };

    const handleComment = async (postId, text) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/community/${postId}/comment`, {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });
            if (response.ok) {
                const updatedPost = await response.json();
                setPosts(prev => prev.map(p => p._id === postId ? { ...p, comments: updatedPost.comments } : p));
            }
        } catch (error) {
            console.error("Comment error:", error);
        }
    };

    return (
        <div className={`flex-1 h-full overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0f1214] text-white' : 'bg-[#f8fafc] text-gray-900'}`} data-theme={theme}>
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        <span className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-500">
                            <FaUsers />
                        </span>
                        Community Portal
                    </h1>
                    <p className={`mt-2 text-sm font-bold ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest`}>Shared messaging & collaboration space</p>
                </div>
                <div className="hidden md:flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500">Live Status</span>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className={`text-xs font-bold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{activeUsers.length} Members Active</span>
                    </div>
                </div>
            </div>

            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="col-span-1 lg:col-span-8 space-y-8">
                    <div className={`${theme === 'dark' ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'} rounded-3xl border shadow-2xl overflow-hidden transform transition-all hover:shadow-cyan-500/5`}>
                        <div className="p-6">
                            <div className="flex gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shrink-0">
                                    {currentUser.name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <textarea
                                        className={`w-full bg-transparent border-none ${theme === 'dark' ? 'text-white' : 'text-gray-900'} placeholder-gray-500 focus:ring-0 text-xl font-medium resize-none min-h-[120px]`}
                                        placeholder={`Whats's on your mind, ${currentUser.name?.split(' ')[0]}?`}
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                    />
                                    {(imagePreviews.length > 0 || videoPreviews.length > 0) && (
                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            {imagePreviews.map((src, i) => (
                                                <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-white/10">
                                                    <img src={src} alt="" className="w-full h-full object-cover" />
                                                    <button onClick={() => removeFile(i, 'image')} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg"><FaTimes size={10} /></button>
                                                </div>
                                            ))}
                                            {videoPreviews.map((src, i) => (
                                                <div key={i} className="relative aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center">
                                                    <FaPlay className="text-white/50" />
                                                    <button onClick={() => removeFile(i, 'video')} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg"><FaTimes size={10} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {showPoll && (
                                        <div className={`mb-6 p-6 rounded-2xl border ${theme === 'dark' ? 'bg-[#0f1214] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                            <input
                                                type="text"
                                                placeholder="Ask something to the community..."
                                                className="w-full border-b bg-transparent py-2 text-lg font-bold focus:outline-none focus:border-cyan-500 transition-colors mb-4"
                                                value={pollQuestion}
                                                onChange={(e) => setPollQuestion(e.target.value)}
                                            />
                                            <div className="space-y-2">
                                                {pollOptions.map((opt, i) => (
                                                    <input
                                                        key={i}
                                                        type="text"
                                                        placeholder={`Option ${i + 1}`}
                                                        className={`w-full px-4 py-2.5 rounded-xl border text-sm ${theme === 'dark' ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}
                                                        value={opt}
                                                        onChange={(e) => {
                                                            const newOpts = [...pollOptions];
                                                            newOpts[i] = e.target.value;
                                                            setPollOptions(newOpts);
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                            <button onClick={() => setPollOptions([...pollOptions, ""])} className="mt-4 text-[10px] font-black uppercase text-cyan-500 hover:text-cyan-400">+ Add Option</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className={`px-6 py-5 border-t flex items-center justify-between ${theme === 'dark' ? 'bg-[#131619]/50 border-gray-800' : 'bg-gray-50/50 border-gray-100'}`}>
                            <div className="flex items-center gap-6">
                                <label className="cursor-pointer text-gray-500 hover:text-cyan-500 flex items-center gap-2">
                                    <FaImage size={20} /><span className="text-[11px] font-black uppercase tracking-widest hidden sm:inline">Image</span>
                                    <input type="file" multiple className="hidden" accept="image/*" onChange={handleImageChange} />
                                </label>
                                <label className="cursor-pointer text-gray-500 hover:text-orange-500 flex items-center gap-2">
                                    <FaVideo size={20} /><span className="text-[11px] font-black uppercase tracking-widest hidden sm:inline">Video</span>
                                    <input type="file" multiple className="hidden" accept="video/*" onChange={handleImageChange} />
                                </label>
                                <button onClick={() => setShowPoll(!showPoll)} className={`flex items-center gap-2 ${showPoll ? 'text-purple-500' : 'text-gray-500 hover:text-purple-500'}`}>
                                    <FaPoll size={20} /><span className="text-[11px] font-black uppercase tracking-widest hidden sm:inline">Poll</span>
                                </button>
                            </div>
                            <button onClick={handleSubmitPost} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-cyan-500/20 active:scale-95 transition-all flex items-center gap-3">
                                Send Message <FaPaperPlane size={12} />
                            </button>
                        </div>
                    </div>
                    <div className="space-y-8">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                                <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
                                <p className="text-sm font-black text-cyan-500 uppercase tracking-[0.3em]">Synchronizing Portal</p>
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="text-center py-32 rounded-3xl border-2 border-dashed border-gray-800 bg-gray-800/20">
                                <FaUsers className="mx-auto text-5xl text-gray-300 mb-6" />
                                <h3 className="text-xl font-black text-gray-500">The community is quiet...</h3>
                            </div>
                        ) : (
                            posts.map(post => (
                                <CommunityPostCard
                                    key={post._id}
                                    post={post}
                                    onLike={() => handleLike(post._id)}
                                    onVote={(optId) => handleVote(post._id, optId)}
                                    onComment={(text) => handleComment(post._id, text)}
                                    onDelete={() => handleDeletePost(post._id)}
                                    onView={() => handlePostView(post._id)}
                                    currentUser={currentUser}
                                    theme={theme}
                                />
                            ))
                        )}
                    </div>
                </div>
                <div className="col-span-1 lg:col-span-4 space-y-8">
                    <div className={`${theme === 'dark' ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'} rounded-3xl border shadow-xl p-8`}>
                        <h3 className="text-sm font-black uppercase tracking-widest text-cyan-500 mb-6 flex items-center gap-2"><FaHistory /> Active Members</h3>
                        <div className="space-y-5">
                            {activeUsers.slice(0, 10).map(user => (
                                <div key={user._id} className="flex items-center gap-4 group">
                                    <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-xs font-black text-white">{user.name?.charAt(0)}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black truncate">{user.name}</p>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase truncate">{user.designation || "Team Member"}</p>
                                    </div>
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <PdfDocumentHub theme={theme} />
                </div>
            </div>
        </div>
    );
};

const CommunityPostCard = ({ post, onLike, onVote, onComment, onDelete, onView, currentUser, theme }) => {
    const isDark = theme === 'dark';
    const [commentText, setCommentText] = useState("");
    const [showComments, setShowComments] = useState(false);
    useEffect(() => { onView(); }, [onView]);
    const isLikedByMe = post.likes.some(u => (u._id || u) === currentUser._id);
    const hasVoted = post.poll?.options.some(opt => opt.votes.some(v => (v._id || v) === currentUser._id));

    return (
        <div className={`${isDark ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'} rounded-3xl border shadow-xl overflow-hidden animate-fade-in group`}>
            <div className="p-6 flex items-start justify-between gap-4">
                <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-900/30 flex items-center justify-center text-cyan-500 font-black text-lg border border-cyan-500/20">{post.author?.name?.charAt(0).toUpperCase()}</div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h4 className={`font-black text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{post.author?.name}</h4>
                            <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-500 text-[9px] font-black uppercase tracking-[0.2em]">{post.author?.role}</span>
                        </div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{post.author?.designationName} • {new Date(post.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
                {((post.author?._id || post.author) === currentUser._id || currentUser.role === "superAdmin") && (
                    <button onClick={onDelete} className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><FaTrash size={14} /></button>
                )}
            </div>
            <div className="px-6 pb-6 space-y-5">
                {post.content && <p className={`text-lg leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{post.content}</p>}
                {post.images?.length > 0 && (
                    <div className="grid grid-cols-1 gap-4 rounded-2xl overflow-hidden shadow-2xl">
                        {post.images.map((img, i) => <img key={i} src={img.startsWith('http') ? img : `${import.meta.env.VITE_API_URL}${img}`} className="w-full object-cover max-h-[500px]" alt="" />)}
                    </div>
                )}
                {post.poll && post.poll.question && (
                    <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                        <h5 className="font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2"><FaChartBar className="text-cyan-500" /> {post.poll.question}</h5>
                        <div className="space-y-3">
                            {post.poll.options.map(opt => {
                                const totalVotes = post.poll.options.reduce((sum, o) => sum + o.votes.length, 0);
                                const percentage = totalVotes > 0 ? (opt.votes.length / totalVotes) * 100 : 0;
                                const isMyVote = opt.votes.some(v => (v._id || v) === currentUser._id);
                                return (
                                    <button key={opt._id} disabled={hasVoted} onClick={() => onVote(opt._id)} className={`w-full relative p-4 rounded-xl border text-left flex items-center justify-between transition-all overflow-hidden ${isMyVote ? 'border-cyan-500 bg-cyan-500/10' : isDark ? 'border-gray-800 bg-gray-800/30' : 'border-gray-100 bg-white'}`}>
                                        <div className="absolute inset-y-0 left-0 bg-cyan-500/5" style={{ width: `${percentage}%` }} />
                                        <span className="relative z-10 font-bold text-sm flex items-center gap-2">{opt.text} {isMyVote && <FaCheckCircle className="text-cyan-500" size={12} />}</span>
                                        <span className="relative z-10 text-[10px] font-black text-gray-500">{Math.round(percentage)}%</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
            <div className={`px-6 py-4 flex items-center justify-between border-t ${isDark ? 'border-gray-800 bg-[#131619]/30' : 'border-gray-100 bg-gray-50/30'}`}>
                <div className="flex items-center gap-8">
                    <button onClick={onLike} className={`flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all ${isLikedByMe ? 'text-cyan-500' : 'text-gray-500 hover:text-white'}`}><FaThumbsUp size={16} /> {post.likes.length} Reactions</button>
                    <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-all"><FaComment size={16} /> {post.comments.length} Messages</button>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-cyan-500/40 uppercase tracking-widest"><FaEye /> {post.views?.length || 0} Views</div>
            </div>
            {showComments && (
                <div className={`p-6 border-t ${isDark ? 'bg-[#0f1214] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="space-y-4 max-h-48 overflow-y-auto mb-6 custom-scrollbar">
                        {post.comments.map((comm, idx) => (
                            <div key={idx} className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-500 flex items-center justify-center text-[10px] font-black shrink-0">{comm.user?.name?.charAt(0)}</div>
                                <div className={`px-4 py-2 rounded-2xl flex-1 ${isDark ? 'bg-gray-800/50' : 'bg-white shadow-sm'}`}>
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-[10px] font-black uppercase tracking-tight text-cyan-500">{comm.user?.name}</p>
                                        <span className="text-[8px] text-gray-500 font-bold">{new Date(comm.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-xs text-gray-400">{comm.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <input
                        type="text"
                        placeholder="Type a message..."
                        className={`w-full px-5 py-3 rounded-2xl text-xs font-bold outline-none border transition-all ${isDark ? 'bg-[#1a1f24] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && commentText.trim() && (onComment(commentText), setCommentText(""))}
                    />
                </div>
            )}
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.2); border-radius: 10px; }`}</style>
        </div>
    );
};

export default CommunityFeed;
