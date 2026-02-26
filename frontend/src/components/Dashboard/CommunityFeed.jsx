import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    FaUpload, FaPaperPlane, FaImage, FaPoll, FaThumbsUp, FaComment,
    FaCheckCircle, FaChartBar, FaTrash, FaTimes, FaEye, FaHistory,
    FaVideo, FaPlay, FaUsers, FaEdit, FaSmile, FaCheckDouble, FaCrop,
    FaFileDownload, FaDownload, FaFileAlt
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";
import EmojiPicker from 'emoji-picker-react';
import Cropper from 'react-easy-crop';
import PdfDocumentHub from "./PdfDocumentHub";
import io from "socket.io-client";
import chatBgLight from "../../assets/chat-bg-light.png";
import chatBgDark from "../../assets/chat-bg-dark.png";

const getSocketURL = () => {
    const url = import.meta.env.VITE_API_URL || "http://localhost:5000";
    return url.replace(/\/api$/, "");
};

const socket = io(getSocketURL(), {
    withCredentials: true,
    transports: ["websocket", "polling"],
    autoConnect: false // We will connect manually in useEffect
});

const CommunityFeed = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser] = useState(JSON.parse(localStorage.getItem("user") || "{}"));
    const messagesEndRef = useRef(null);

    // Create Post State
    const [content, setContent] = useState("");
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [videos, setVideos] = useState([]);
    const [videoPreviews, setVideoPreviews] = useState([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [activeUsers, setActiveUsers] = useState([]);
    const [typingStatus, setTypingStatus] = useState(null);
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const [extraFiles, setExtraFiles] = useState([]);
    const [extraFilePreviews, setExtraFilePreviews] = useState([]);
    const [showMembersList, setShowMembersList] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState(null); // { url, type }
    const typingTimeoutRef = useRef(null);
    const pendingViews = useRef(new Set());

    // Cropping State
    const [cropImage, setCropImage] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchPosts = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/community`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setPosts(data);
                if (loading) setTimeout(scrollToBottom, 500);
            }
        } catch (error) {
            console.error("Fetch community posts error:", error);
        } finally {
            setLoading(false);
        }
    }, [loading]);

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

        const joinRoom = () => {
            console.log("Attempting to join community room...");
            socket.emit("join_room", "community");
        };

        if (socket.connected) {
            joinRoom();
        }

        socket.on("connect", () => {
            console.log("Socket connected:", socket.id);
            joinRoom();
        });

        socket.on("connect_error", (err) => {
            console.error("Socket connection error:", err);
        });

        socket.on("new_post", (newPost) => {
            console.log("New post received via socket:", newPost._id);
            setPosts(prev => {
                if (prev.some(p => p._id === newPost._id)) return prev;
                return [newPost, ...prev];
            });
        });

        socket.on("post_updated", (updatedPost) => {
            setPosts(prev => prev.map(p => p._id === updatedPost._id ? updatedPost : p));
        });

        socket.on("user_typing", ({ user, isTyping }) => {
            const currentUserId = currentUser?._id || currentUser?.id;
            const typingUserId = user?._id || user?.id;
            if (String(typingUserId) !== String(currentUserId)) {
                setTypingStatus(isTyping ? user : null);
            }
        });

        socket.connect();
        fetchPosts();
        fetchSocialActivity();

        const activityInterval = setInterval(fetchSocialActivity, 30000);

        return () => {
            socket.off("connect");
            socket.off("connect_error");
            socket.off("new_post");
            socket.off("post_updated");
            socket.off("user_typing");
            socket.emit("leave_room", "community");
            clearInterval(activityInterval);
        };
    }, [fetchPosts, currentUser?._id, currentUser?.id]);

    // Persistent Auto-Scroll
    useEffect(() => {
        if (posts.length > 0) {
            scrollToBottom();
        }
    }, [posts]);

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
                // Note: The UI update will happen via the 'post_updated' socket event
            }
        } catch {
            toast.error("Error deleting message");
        }
    };

    const handlePostView = async (postId) => {
        if (pendingViews.current.has(postId)) return;
        pendingViews.current.add(postId);

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
        } finally {
            pendingViews.current.delete(postId);
        }
    };

    const handleTyping = () => {
        socket.emit("typing", { user: currentUser, room: "community" });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit("stop_typing", { user: currentUser, room: "community" });
        }, 2000);
    };

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 300);
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        const imageFiles = files.filter(f => f.type.startsWith('image/'));
        const videoFiles = files.filter(f => f.type.startsWith('video/'));
        const otherFiles = files.filter(f => !f.type.startsWith('image/') && !f.type.startsWith('video/'));

        if (imageFiles.length > 0) {
            const reader = new FileReader();
            reader.addEventListener('load', () => setCropImage(reader.result));
            reader.readAsDataURL(imageFiles[0]);
            // Still add to images for multi-select if needed, but cropper handles first
        }

        if (videoFiles.length > 0) {
            setVideos(prev => [...prev, ...videoFiles]);
            const previews = videoFiles.map(file => URL.createObjectURL(file));
            setVideoPreviews(prev => [...prev, ...previews]);
        }

        if (otherFiles.length > 0) {
            setExtraFiles(prev => [...prev, ...otherFiles]);
            setExtraFilePreviews(prev => [...prev, ...otherFiles.map(f => ({ name: f.name, size: (f.size / 1024).toFixed(1) + ' KB' }))]);
        }
    };

    const onCropComplete = useCallback((_croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createImage = (url) =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.setAttribute('crossOrigin', 'anonymous');
            image.src = url;
        });

    const getCroppedImg = async (imageSrc, pixelCrop) => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        );

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg');
        });
    };

    const handleCropSave = async () => {
        try {
            const croppedBlob = await getCroppedImg(cropImage, croppedAreaPixels);
            const croppedFile = new File([croppedBlob], `cropped_${Date.now()}.jpg`, { type: 'image/jpeg' });

            setImages(prev => [...prev, croppedFile]);
            setImagePreviews(prev => [...prev, URL.createObjectURL(croppedBlob)]);
            setCropImage(null);
        } catch (e) {
            console.error(e);
            toast.error("Failed to crop image");
        }
    };

    const removeFile = (index, type) => {
        if (type === 'image') {
            setImages(prev => prev.filter((_, i) => i !== index));
            setImagePreviews(prev => prev.filter((_, i) => i !== index));
        } else if (type === 'video') {
            setVideos(prev => prev.filter((_, i) => i !== index));
            setVideoPreviews(prev => prev.filter((_, i) => i !== index));
        } else {
            setExtraFiles(prev => prev.filter((_, i) => i !== index));
            setExtraFilePreviews(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleSubmitPost = async (e) => {
        if (e) e.preventDefault();
        if (!content.trim() && images.length === 0 && videos.length === 0 && extraFiles.length === 0) {
            return;
        }
        const formData = new FormData();
        formData.append("content", content);
        images.forEach(img => formData.append("files", img));
        videos.forEach(vid => formData.append("files", vid));
        extraFiles.forEach(file => formData.append("files", file));

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/community`, {
                method: "POST",
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (response.ok) {
                setContent("");
                setImages([]);
                setImagePreviews([]);
                setVideos([]);
                setVideoPreviews([]);
                setExtraFiles([]);
                setExtraFilePreviews([]);
                setShowEmojiPicker(false);
                fetchPosts();
            }
        } catch {
            toast.error("Something went wrong");
        }
    };

    const onEmojiClick = (emojiData) => {
        setContent(prev => prev + emojiData.emoji);
    };

    const handleReact = async (postId, emoji) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/community/${postId}/react`, {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ emoji })
            });
            if (response.ok) {
                const updatedPost = await response.json();
                setPosts(prev => prev.map(p => p._id === postId ? updatedPost : p));
            }
        } catch (error) {
            console.error("React error:", error);
        }
    };

    return (
        <div className={`flex flex-col h-full transition-colors duration-300 ${isDark ? 'bg-[#0b141a]' : 'bg-[#e5ddd5]'}`} data-theme={theme}>
            {/* Cropper Modal */}
            {cropImage && (
                <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4">
                    <div className="relative w-full h-[70vh] max-w-2xl bg-gray-900 rounded-[3px] overflow-hidden shadow-2xl">
                        <Cropper
                            image={cropImage}
                            crop={crop}
                            zoom={zoom}
                            aspect={4 / 3}
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                        />
                    </div>
                    <div className="mt-8 flex gap-4 w-full max-w-2xl">
                        <button onClick={() => setCropImage(null)} className="flex-1 py-4 rounded-[3px] bg-gray-800 text-white font-black uppercase text-xs tracking-widest hover:bg-gray-700 transition-all">Cancel</button>
                        <button onClick={handleCropSave} className="flex-1 py-4 rounded-[3px] bg-cyan-600 text-white font-black uppercase text-xs tracking-widest hover:bg-cyan-500 transition-all shadow-xl shadow-cyan-500/20">Apply Crop</button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className={`shrink-0 z-40 flex items-center justify-between px-6 py-3 border-b shadow-lg transition-all backdrop-blur-md ${isDark ? 'bg-[#202c33]/90 border-gray-700' : 'bg-[#f0f2f5]/90 border-gray-300'}`}>
                <div
                    className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity flex-1"
                    onClick={() => setShowMembersList(!showMembersList)}
                >
                    <div className="flex -space-x-3 items-center">
                        {activeUsers.slice(0, 5).map((user) => (
                            <div key={user._id} className="w-10 h-10 rounded-full border-2 border-[#202c33] bg-cyan-500 flex items-center justify-center text-xs font-black text-white shadow-lg overflow-hidden shrink-0">
                                {user.profileImage ? (
                                    <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                                ) : user.name?.charAt(0)}
                            </div>
                        ))}
                        {activeUsers.length > 5 && (
                            <div className="w-10 h-10 rounded-full border-2 border-[#202c33] bg-gray-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg shrink-0">
                                +{activeUsers.length - 5}
                            </div>
                        )}
                    </div>
                    <div className="ml-2 overflow-hidden">
                        <h2 className={`font-bold text-sm truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>
                            {activeUsers.length > 0 ? activeUsers.map(u => u.name.split(' ')[0]).join(', ') : 'Community'}
                        </h2>
                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            {activeUsers.length} Online
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-gray-400">
                    <span className="text-[11px] font-black uppercase tracking-widest hidden md:block">WhatsApp Mode</span>
                    <button
                        onClick={() => setShowMembersList(!showMembersList)}
                        className="w-10 h-10 rounded-[3px] bg-cyan-500/10 flex items-center justify-center text-cyan-500 hover:bg-cyan-500/20 transition-all"
                    >
                        <FaUsers size={20} />
                    </button>
                </div>

                {/* Members Dropdown/Popup */}
                {showMembersList && (
                    <>
                        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={() => setShowMembersList(false)} />
                        <div className={`absolute top-16 left-6 right-6 md:left-auto md:right-6 md:w-80 max-h-[60vh] rounded-[3px] shadow-2xl z-50 overflow-hidden border animate-fade-in ${isDark ? 'bg-[#233138] border-gray-700' : 'bg-white border-gray-200'}`}>
                            <div className="p-4 border-b border-gray-700/10 flex justify-between items-center">
                                <h3 className={`font-black text-xs uppercase tracking-[0.2em] ${isDark ? 'text-cyan-500' : 'text-cyan-600'}`}>Members Online</h3>
                                <button onClick={() => setShowMembersList(false)} className="text-gray-500 hover:text-red-500 transition-colors">
                                    <FaTimes size={14} />
                                </button>
                            </div>
                            <div className="overflow-y-auto max-h-[50vh] custom-scrollbar">
                                {activeUsers.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500 italic text-xs">No users online</div>
                                ) : (
                                    activeUsers.map(user => (
                                        <div key={user._id} className="p-3 px-4 flex items-center gap-3 hover:bg-black/5 transition-colors border-b border-gray-700/5 last:border-0 cursor-default">
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs font-black text-cyan-500 overflow-hidden border border-cyan-500/10">
                                                    {user.profileImage ? (
                                                        <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                                                    ) : user.name?.charAt(0)}
                                                </div>
                                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-[#233138] rounded-full" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>{user.name}</p>
                                                <div className="flex flex-wrap gap-1 mt-0.5">
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded-[3px] bg-cyan-500/10 text-cyan-500 font-bold uppercase tracking-tighter">
                                                        {user.designationName || 'Member'}
                                                    </span>
                                                    {user.departmentName && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-[3px] bg-emerald-500/10 text-emerald-500 font-bold uppercase tracking-tighter">
                                                            {user.departmentName}
                                                        </span>
                                                    )}
                                                    {user.centerName && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-[3px] bg-amber-500/10 text-amber-500 font-bold uppercase tracking-tighter">
                                                            {user.centerName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Chat Area */}
            <div
                className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative"
                onScroll={handleScroll}
                style={{
                    backgroundImage: `linear-gradient(${isDark ? 'rgba(11, 20, 26, 0.85), rgba(11, 20, 26, 0.85)' : 'rgba(229, 221, 213, 0.85), rgba(229, 221, 213, 0.85)'}), url(${isDark ? chatBgDark : chatBgLight})`,
                    backgroundSize: '400px',
                    backgroundRepeat: 'repeat',
                    backgroundAttachment: 'fixed',
                    backgroundBlendMode: 'overlay'
                }}
            >
                <div className="max-w-4xl mx-auto space-y-6 relative z-10">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-[3px]"></div>
                                <div className="absolute inset-0 border-4 border-cyan-500 border-t-transparent rounded-[3px] animate-spin"></div>
                            </div>
                            <p className="mt-4 text-xs font-black text-cyan-500 uppercase tracking-widest animate-pulse">Initializing Community Hub...</p>
                        </div>
                    ) : (
                        (() => {
                            let lastDate = null;
                            const sortedPosts = [...posts].reverse();
                            return sortedPosts.map((post) => {
                                const postDate = new Date(post.createdAt).toLocaleDateString();
                                const showSeparator = lastDate !== postDate;
                                lastDate = postDate;

                                const authorId = post.author?._id || post.author;
                                const currentId = currentUser?._id || currentUser?.id;
                                const isOwn = authorId && currentId && String(authorId) === String(currentId);

                                return (
                                    <React.Fragment key={post._id}>
                                        {showSeparator && (
                                            <div className="flex justify-center my-8">
                                                <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${isDark ? 'bg-[#1a2329] text-gray-400 border border-white/5' : 'bg-white/80 text-gray-500 border border-black/5'}`}>
                                                    {postDate === new Date().toLocaleDateString() ? 'Today' :
                                                        postDate === new Date(Date.now() - 86400000).toLocaleDateString() ? 'Yesterday' :
                                                            postDate}
                                                </div>
                                            </div>
                                        )}
                                        <WhatsAppMessageBubble
                                            post={post}
                                            isOwn={isOwn}
                                            onReact={(emoji) => handleReact(post._id, emoji)}
                                            onDelete={() => handleDeletePost(post._id)}
                                            onView={() => handlePostView(post._id)}
                                            onMediaClick={(url, type) => setSelectedMedia({ url, type })}
                                            currentUser={currentUser}
                                            isDark={isDark}
                                        />
                                    </React.Fragment>
                                );
                            });
                        })()
                    )}

                    {typingStatus && (
                        <div className="flex items-center gap-3 animate-fade-in pl-2">
                            <div className="flex gap-1.5 p-2 px-3 rounded-2xl bg-[#202c33] border border-white/5 shadow-xl">
                                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"></div>
                            </div>
                            <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-tight">{typingStatus.name} is typing...</span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {showScrollBtn && (
                    <button
                        onClick={scrollToBottom}
                        className="fixed bottom-32 right-8 md:right-12 w-12 h-12 bg-cyan-600 text-white rounded-[3px] shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 animate-fade-in"
                    >
                        <FaHistory size={16} className="rotate-90" />
                    </button>
                )}
            </div>

            {/* Image/File Fullscreen Modal */}
            {selectedMedia && (
                <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4">
                    <div className="absolute top-6 right-6 flex gap-4">
                        <a
                            href={selectedMedia.url}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-12 h-12 rounded-[3px] bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-xl"
                            title="Download"
                        >
                            <FaDownload size={20} />
                        </a>
                        <button
                            onClick={() => setSelectedMedia(null)}
                            className="w-12 h-12 rounded-[3px] bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-xl"
                        >
                            <FaTimes size={20} />
                        </button>
                    </div>
                    <div className="max-w-4xl max-h-[80vh] w-full flex items-center justify-center">
                        {selectedMedia.type === 'video' ? (
                            <video src={selectedMedia.url} controls autoPlay className="max-h-full max-w-full rounded-[3px]" />
                        ) : (
                            <img src={selectedMedia.url} alt="Fullscreen" className="max-h-full max-w-full object-contain rounded-[3px] shadow-2xl" />
                        )}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className={`${isDark ? 'bg-[#202c33]' : 'bg-[#f0f2f5]'} p-3 md:px-6 md:py-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-300'} z-30`}>
                {(imagePreviews.length > 0 || videoPreviews.length > 0 || extraFilePreviews.length > 0) && (
                    <div className="flex gap-3 mb-3 overflow-x-auto p-2 no-scrollbar">
                        {imagePreviews.map((src, i) => (
                            <div key={i} className="relative w-24 h-24 rounded-[3px] overflow-hidden shrink-0 border-2 border-cyan-500 group">
                                <img src={src} alt="" className="w-full h-full object-cover" />
                                <button onClick={() => removeFile(i, 'image')} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-[3px] opacity-0 group-hover:opacity-100 transition-opacity"><FaTimes size={8} /></button>
                            </div>
                        ))}
                        {videoPreviews.map((src, i) => (
                            <div key={i} className="relative w-24 h-24 bg-black rounded-[3px] overflow-hidden shrink-0 border-2 border-cyan-500 flex items-center justify-center group">
                                <FaPlay className="text-white/50" />
                                <button onClick={() => removeFile(i, 'video')} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-[3px] opacity-0 group-hover:opacity-100 transition-opacity"><FaTimes size={8} /></button>
                            </div>
                        ))}
                        {extraFilePreviews.map((file, i) => (
                            <div key={i} className="relative w-24 h-24 bg-cyan-600/10 border-2 border-cyan-500 rounded-[3px] overflow-hidden shrink-0 flex flex-col items-center justify-center p-2 group text-center">
                                <FaFileAlt className="text-cyan-500 mb-1" size={24} />
                                <p className="text-[8px] font-bold text-cyan-600 truncate w-full">{file.name}</p>
                                <p className="text-[7px] text-cyan-700/60 font-black">{file.size}</p>
                                <button onClick={() => removeFile(i, 'file')} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-[3px] opacity-0 group-hover:opacity-100 transition-opacity"><FaTimes size={8} /></button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-end gap-3 max-w-6xl mx-auto">
                    <div className="flex items-center gap-2 mb-2">
                        <button
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className={`p-2 transition-colors ${showEmojiPicker ? 'text-cyan-500' : 'text-gray-400 hover:text-gray-300'}`}
                        >
                            <FaSmile size={24} />
                        </button>
                        <label className="p-2 cursor-pointer text-gray-400 hover:text-gray-300">
                            <FaImage size={24} />
                            <input type="file" multiple className="hidden" accept="image/*" onChange={handleFileChange} />
                        </label>
                        <label className="p-2 cursor-pointer text-gray-400 hover:text-gray-300">
                            <FaVideo size={24} />
                            <input type="file" multiple className="hidden" accept="video/*" onChange={handleFileChange} />
                        </label>
                        <label className="p-2 cursor-pointer text-gray-400 hover:text-gray-300">
                            <FaFileAlt size={24} />
                            <input type="file" multiple className="hidden" accept="*" onChange={handleFileChange} />
                        </label>
                    </div>

                    <div className="flex-1 relative">
                        {showEmojiPicker && (
                            <div className="absolute bottom-16 left-0 z-50 shadow-2xl">
                                <EmojiPicker
                                    onEmojiClick={onEmojiClick}
                                    theme={isDark ? 'dark' : 'light'}
                                    width={300}
                                    height={400}
                                />
                            </div>
                        )}
                        <textarea
                            className={`w-full max-h-32 px-4 py-3 rounded-[3px] resize-none outline-none text-sm transition-all ${isDark ? 'bg-[#2a3942] text-white focus:bg-[#324552]' : 'bg-white text-gray-800'}`}
                            placeholder="Type a message..."
                            value={content}
                            onChange={(e) => {
                                setContent(e.target.value);
                                handleTyping();
                            }}
                            onFocus={handleTyping}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmitPost();
                                }
                            }}
                            rows={1}
                        />
                    </div>

                    <button
                        onClick={handleSubmitPost}
                        className={`mb-1 p-3.5 rounded-[3px] transition-all flex items-center justify-center ${content.trim() || images.length > 0 || videos.length > 0 || extraFiles.length > 0 ? 'bg-cyan-600 text-white shadow-lg' : 'bg-[#2a3942] text-gray-500'}`}
                        disabled={!content.trim() && images.length === 0 && videos.length === 0 && extraFiles.length === 0}
                    >
                        <FaPaperPlane size={18} />
                    </button>
                </div>
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 188, 212, 0.2); border-radius: 10px; }
                @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

const WhatsAppMessageBubble = ({ post, isOwn, onReact, onDelete, onView, onMediaClick, currentUser, isDark }) => {
    const bubbleRef = useRef(null);

    useEffect(() => {
        // Only observe if not own and not already viewed
        if (isOwn || post.views?.some(v => (v._id || v) === currentUser._id)) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    // Slight delay to ensure it's a deliberate view
                    const timer = setTimeout(() => {
                        onView();
                    }, 500);
                    return () => clearTimeout(timer);
                }
            },
            { threshold: 0.5 } // 50% visibility
        );

        const currentBubble = bubbleRef.current;
        if (currentBubble) observer.observe(currentBubble);

        return () => {
            if (currentBubble) observer.unobserve(currentBubble);
        };
    }, [isOwn, post.views, currentUser._id, onView]);

    const reactionsList = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
    const reactionCounts = post.reactions?.reduce((acc, curr) => {
        acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
        return acc;
    }, {});

    const viewCount = post.views?.length || 0;

    return (
        <div ref={bubbleRef} className={`flex w-full mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar for others */}
                {!isOwn && (
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px] font-black text-cyan-500 overflow-hidden shrink-0 border border-cyan-500/10 self-end mb-1">
                        {post.author?.profileImage ? (
                            <img src={post.author.profileImage} alt="" className="w-full h-full object-cover" />
                        ) : post.author?.name?.charAt(0)}
                    </div>
                )}

                <div className={`flex flex-col group relative ${isOwn ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-center gap-2 mb-1 px-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className="text-[10px] font-black text-cyan-500 uppercase tracking-tighter">
                            {isOwn ? 'You' : post.author?.name}
                        </span>
                        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest opacity-80 whitespace-nowrap">
                            • {post.author?.designationName || 'Member'}
                            {post.author?.centerName && ` @ ${post.author?.centerName}`}
                        </span>
                    </div>

                    <div className="relative">
                        <div className={`absolute -top-10 ${isOwn ? 'right-0' : 'left-0'} flex gap-1 bg-white dark:bg-[#1a2329] p-1 rounded-[3px] shadow-xl border dark:border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity z-10`}>
                            {reactionsList.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => onReact(emoji)}
                                    className="hover:scale-125 transition-transform p-1 text-sm rounded-[3px]"
                                >
                                    {emoji}
                                </button>
                            ))}
                            {isOwn && (
                                <button onClick={onDelete} className="p-1 px-2 text-red-500 hover:bg-red-500/10 rounded-[3px]">
                                    <FaTrash size={10} />
                                </button>
                            )}
                        </div>

                        <div className={`px-4 py-2 rounded-[6px] shadow-sm relative transition-all duration-300 ${post.isDeleted
                            ? (isDark ? 'bg-black/20 text-gray-500 italic' : 'bg-gray-100/50 text-gray-400 italic')
                            : (isOwn
                                ? (isDark ? 'bg-[#005c4b] text-white rounded-tr-none' : 'bg-[#dcf8c6] text-gray-800 rounded-tr-none')
                                : (isDark ? 'bg-[#202c33]/95 backdrop-blur-sm text-white rounded-tl-none border border-white/5' : 'bg-white/95 backdrop-blur-sm text-gray-800 rounded-tl-none border border-black/5')
                            )
                            }`}>
                            {/* WhatsApp Tail */}
                            {!post.isDeleted && (
                                <div className={`absolute top-0 w-3 h-3 ${isOwn
                                    ? (isDark ? 'bg-[#005c4b] -right-1.5' : 'bg-[#dcf8c6] -right-1.5')
                                    : (isDark ? 'bg-[#202c33] -left-1.5' : 'bg-white -left-1.5')
                                    }`} style={{ clipPath: isOwn ? 'polygon(0 0, 0 100%, 100% 0)' : 'polygon(100% 0, 100% 100%, 0 0)' }}></div>
                            )}

                            {!post.isDeleted && post.images?.length > 0 && (
                                <div className={`mb-2 -mx-2 -mt-1 rounded-[3px] overflow-hidden border border-black/10 grid gap-1 ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                    {post.images.map((img, i) => (
                                        <div key={i} className="relative group cursor-pointer overflow-hidden" onClick={() => onMediaClick(img.startsWith('http') ? img : `${import.meta.env.VITE_API_URL}${img}`, 'image')}>
                                            <img src={img.startsWith('http') ? img : `${import.meta.env.VITE_API_URL}${img}`} className="w-full object-cover max-h-64 h-full transform hover:scale-105 transition-transform duration-500" alt="" />
                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <FaEye className="text-white" size={24} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {!post.isDeleted && post.videos?.length > 0 && (
                                <div className="mb-2 -mx-2 -mt-1 rounded-[3px] overflow-hidden bg-black border border-black/10 grid grid-cols-1 gap-1 relative aspect-video cursor-pointer" onClick={() => onMediaClick(post.videos[0].startsWith('http') ? post.videos[0] : `${import.meta.env.VITE_API_URL}${post.videos[0]}`, 'video')}>
                                    {post.videos.map((vid, i) => (
                                        <video key={i} src={vid.startsWith('http') ? vid : `${import.meta.env.VITE_API_URL}${vid}`} className="w-full max-h-64" />
                                    ))}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group hover:bg-black/40 transition-all">
                                        <div className="w-12 h-12 rounded-[3px] bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                                            <FaPlay className="text-white ml-1" size={16} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!post.isDeleted && post.files?.length > 0 && (
                                <div className="mb-2 space-y-1">
                                    {post.files.map((file, i) => (
                                        <div key={i} className={`flex items-center justify-between gap-3 p-3 rounded-[3px] border ${isOwn ? 'bg-black/10 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-10 h-10 rounded-[3px] bg-cyan-500/10 flex items-center justify-center shrink-0">
                                                    <FaFileAlt className="text-cyan-500" size={18} />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className={`text-xs font-bold truncate ${isOwn ? 'text-white' : 'text-gray-800'}`}>{file.name}</p>
                                                    <p className={`text-[10px] ${isOwn ? 'text-white/60' : 'text-gray-400'} font-medium`}>Attachment</p>
                                                </div>
                                            </div>
                                            <a
                                                href={file.url}
                                                download={file.name}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`p-2 rounded-[3px] hover:bg-cyan-500 group transition-all ${isOwn ? 'text-white/60 hover:text-white' : 'text-gray-400 hover:text-white'}`}
                                            >
                                                <FaFileDownload size={16} />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center gap-2 text-sm leading-relaxed break-words whitespace-pre-wrap">
                                {post.isDeleted && <FaCheckCircle size={10} className="shrink-0" />}
                                {post.content}
                            </div>

                            <div className="flex items-center justify-end gap-1.5 mt-1 opacity-60">
                                <span className="text-[9px] font-medium">
                                    {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isOwn && !post.isDeleted && (
                                    <span className={viewCount > 0 ? 'text-cyan-400' : 'text-gray-400'}>
                                        <FaCheckDouble size={11} />
                                    </span>
                                )}
                            </div>
                        </div>

                        {isOwn && viewCount > 0 && (
                            <div className="absolute -left-20 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-[8px] py-1 px-2 rounded-md pointer-events-none whitespace-nowrap">
                                Viewed by {viewCount} members
                            </div>
                        )}
                    </div>

                    {post.reactions?.length > 0 && (
                        <div className={`mt-1 flex flex-wrap gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            {Object.entries(reactionCounts).map(([emoji, count]) => {
                                const myReaction = post.reactions.some(r => r.emoji === emoji && (r.user?._id === currentUser._id || r.user === currentUser._id));
                                return (
                                    <div
                                        key={emoji}
                                        onClick={() => onReact(emoji)}
                                        className={`flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10px] cursor-pointer transition-all border ${myReaction
                                            ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-500'
                                            : 'bg-white/10 border-white/10 text-gray-400'
                                            }`}
                                    >
                                        <span>{emoji}</span>
                                        <span className="font-bold">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommunityFeed;
