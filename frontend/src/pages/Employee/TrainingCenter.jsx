import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import {
    FaSearch, FaVideo, FaFilePdf, FaImage, FaFileAlt,
    FaEye, FaDownload, FaInfoCircle, FaClock, FaTimes, FaExternalLinkAlt
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";

const TrainingCenter = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [trainings, setTrainings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");

    // Preview Modal State
    const [previewFile, setPreviewFile] = useState(null);

    useEffect(() => {
        fetchTrainings();
    }, []);

    const fetchTrainings = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/training/my-training`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setTrainings(data);
            } else {
                toast.error("Failed to fetch training materials");
            }
        } catch (error) {
            console.error("Fetch error:", error);
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    };

    const getFileIcon = (type) => {
        switch (type) {
            case "Video": return <FaVideo className="text-blue-400" size={20} />;
            case "PDF": return <FaFilePdf className="text-red-400" size={20} />;
            case "Image": return <FaImage className="text-emerald-400" size={20} />;
            default: return <FaFileAlt className="text-gray-400" size={20} />;
        }
    };

    const categories = ["All", ...new Set(trainings.map(t => t.category))];

    const filteredTrainings = trainings.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === "All" || t.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const openPreview = (file) => {
        setPreviewFile(file);
        document.body.style.overflow = 'hidden';
    };

    const closePreview = () => {
        setPreviewFile(null);
        document.body.style.overflow = 'unset';
    };

    return (
        <Layout activePage="Employee Center">
            <div className={`p-4 md:p-6 max-w-[1600px] mx-auto min-h-screen transition-colors duration-300 ${isDarkMode ? '' : 'text-gray-800'}`}>
                {/* Header Banner */}
                <div className={`relative overflow-hidden rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 mb-8 md:mb-12 shadow-2xl border transition-all duration-500 ${isDarkMode ? 'bg-gradient-to-br from-[#1a1f24] to-[#131619] border-gray-800' : 'bg-gradient-to-br from-cyan-600 to-blue-700 border-cyan-500/20'}`}>
                    <div className="relative z-10 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 text-cyan-500 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-4 md:mb-6 border border-cyan-500/20">
                            Learning Management
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight uppercase">KNOWLEDGE BASE</h1>
                        <p className={`font-medium leading-relaxed max-w-lg text-sm md:text-base ${isDarkMode ? 'text-gray-400' : 'text-cyan-100'}`}>
                            Access our library of educational resources, guidelines, and training modules designed to empower your career growth.
                        </p>
                    </div>
                    {/* Decorative elements */}
                    <div className="absolute top-[-100px] right-[-100px] w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-[-50px] right-[50px] w-64 h-64 bg-blue-500/5 rounded-full blur-3xl"></div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col lg:flex-row gap-6 mb-8 md:mb-12 items-center justify-between">
                    <div className="relative w-full lg:max-w-md group">
                        <FaSearch className={`absolute left-5 top-1/2 -translate-y-1/2 group-focus-within:text-cyan-500 transition-colors ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                        <input
                            type="text"
                            placeholder="FIND A MODULE OR TOPIC..."
                            className={`w-full border rounded-2xl py-4 pl-14 pr-6 text-xs font-bold uppercase tracking-widest outline-none transition-all shadow-inner ${isDarkMode ? 'bg-[#131619] border-gray-800 text-gray-200 placeholder:text-gray-700 focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-100 focus:border-cyan-300'}`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex overflow-x-auto gap-3 pb-4 custom-scrollbar w-full lg:w-auto">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-6 md:px-8 py-3 md:py-3.5 rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap border ${selectedCategory === cat
                                    ? "bg-cyan-500 text-[#1a1f24] border-cyan-500 shadow-xl shadow-cyan-500/20"
                                    : (isDarkMode ? "bg-[#131619] text-gray-500 border-gray-800 hover:border-gray-600 hover:text-gray-300 shadow-sm" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700 shadow-sm")
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Training Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20 md:p-32 gap-6">
                        <div className="relative">
                            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="h-2 w-2 bg-cyan-500 rounded-full animate-ping"></div>
                            </div>
                        </div>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Syncing Library...</p>
                    </div>
                ) : filteredTrainings.length === 0 ? (
                    <div className={`border-2 border-dashed rounded-[2rem] md:rounded-[3rem] p-12 md:p-24 text-center ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-100/50 border-gray-200'}`}>
                        <div className={`w-16 md:w-20 h-16 md:h-20 rounded-full flex items-center justify-center mx-auto mb-6 border shadow-inner ${isDarkMode ? 'bg-gray-800/30 border-gray-800' : 'bg-white border-gray-100'}`}>
                            <FaInfoCircle className={`${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} size={28} />
                        </div>
                        <h3 className={`font-black text-xl md:text-2xl mb-3 tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>QUIET IN THE LIBRARY</h3>
                        <p className={`text-sm max-w-sm mx-auto leading-relaxed ${isDarkMode ? 'text-gray-600' : 'text-gray-500'}`}>No modules match your current search or assignment list.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 md:gap-8">
                        {filteredTrainings.map(training => (
                            <div key={training._id} className={`border rounded-[2rem] md:rounded-[2.5rem] flex flex-col hover:border-cyan-500/40 hover:-translate-y-2 transition-all duration-500 group overflow-hidden shadow-2xl relative h-full ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'}`}>
                                {/* Visual Accent */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/10 to-transparent rotate-45 translate-x-16 -translate-y-16 group-hover:bg-cyan-500/20 transition-all duration-500"></div>

                                <div className="p-6 md:p-8 flex-1 flex flex-col relative z-10">
                                    <div className="flex justify-between items-center mb-6">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full ${isDarkMode ? 'text-[#1a1f24] bg-cyan-500' : 'text-white bg-cyan-600'}`}>
                                            {training.category}
                                        </span>
                                        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                                            <FaClock className="text-cyan-500/30" />
                                            {new Date(training.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>

                                    <h3 className={`font-black text-xl mb-3 group-hover:text-cyan-500 transition-colors tracking-tight leading-tight uppercase ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {training.title}
                                    </h3>
                                    <p className={`text-xs mb-8 line-clamp-3 leading-relaxed font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                                        {training.description || "Comprehensive module covering essential protocols and workflow procedures."}
                                    </p>

                                    {/* Files Section within Card */}
                                    <div className={`space-y-3 mt-auto pt-6 border-t ${isDarkMode ? 'border-gray-800/50' : 'border-gray-100'}`}>
                                        <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>Module Content ({training.files?.length || 0})</p>
                                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                            {training.files?.map((file, idx) => (
                                                <div key={idx} className={`group/file flex items-center justify-between p-3 border rounded-xl transition-all ${isDarkMode ? 'bg-[#1a1f24]/50 hover:bg-[#1a1f24] border-gray-800' : 'bg-gray-50 hover:bg-gray-100 border-gray-200'}`}>
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className={`shrink-0 p-2 rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-white'}`}>
                                                            {getFileIcon(file.fileType)}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className={`text-[10px] font-bold truncate pr-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{file.fileName}</span>
                                                            <span className={`text-[8px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>{(file.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            onClick={() => openPreview(file)}
                                                            className="p-2 text-gray-500 hover:text-cyan-400 transition-colors"
                                                            title="Preview"
                                                        >
                                                            <FaEye size={14} />
                                                        </button>
                                                        <a
                                                            href={file.downloadUrl}
                                                            download={file.fileName}
                                                            className="p-2 text-gray-500 hover:text-cyan-400 transition-colors"
                                                            title="Download"
                                                        >
                                                            <FaDownload size={14} />
                                                        </a>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Support Card */}
            <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
                <div className={`mt-12 md:mt-20 p-6 md:p-10 border rounded-[2rem] md:rounded-[3rem] flex flex-col md:flex-row items-center justify-between gap-8 shadow-3xl transition-all duration-500 ${isDarkMode ? 'bg-gradient-to-br from-[#131619] to-black border-gray-800' : 'bg-white border-gray-200 shadow-xl'}`}>
                    <div className="flex items-center gap-6 md:gap-8 text-center md:text-left">
                        <div className={`w-14 md:w-16 h-14 md:h-16 rounded-2xl md:rounded-3xl flex items-center justify-center text-cyan-500 border shadow-inner ${isDarkMode ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-cyan-50 border-cyan-100'}`}>
                            <FaInfoCircle size={24} />
                        </div>
                        <div>
                            <h4 className={`font-black text-base md:text-lg mb-2 tracking-tight uppercase ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>ENCOUNTERING ISSUES?</h4>
                            <p className={`text-[10px] md:text-xs font-medium max-w-sm leading-relaxed ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Our support team is available Mon-Fri to assist with any resource accessibility problems.</p>
                        </div>
                    </div>
                    <button className={`w-full md:w-auto px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl border transition-all shadow-lg ${isDarkMode ? 'bg-gray-800/50 text-gray-300 hover:text-white border-gray-700 hover:bg-gray-800' : 'bg-gray-900 text-white border-gray-800 hover:bg-black'}`}>
                        Reach Support
                    </button>
                </div>
            </div>

            {/* PREVIEW MODAL */}
            {previewFile && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/95 backdrop-blur-md animate-fade-in">
                    <div className={`relative border rounded-[2rem] md:rounded-[3rem] w-full max-w-6xl h-full max-h-[90vh] flex flex-col overflow-hidden shadow-[0_0_100px_rgba(6,182,212,0.15)] ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'}`}>

                        {/* Modal Header */}
                        <div className={`flex items-center justify-between p-6 md:p-8 border-b ${isDarkMode ? 'bg-[#1a1f24]/50 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                            <div className="flex items-center gap-4 min-w-0">
                                <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
                                    {getFileIcon(previewFile.fileType)}
                                </div>
                                <div className="min-w-0">
                                    <h2 className={`font-black text-sm md:text-lg uppercase tracking-wider truncate pr-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{previewFile.fileName}</h2>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{previewFile.fileType} • {(previewFile.fileSize / (1024 * 1024)).toFixed(2)} MB</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <a
                                    href={previewFile.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`p-3 rounded-xl transition-all border hidden md:block ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-cyan-400 border-gray-700' : 'bg-white text-gray-500 hover:text-cyan-600 border-gray-200 shadow-sm'}`}
                                    title="Open in new tab"
                                >
                                    <FaExternalLinkAlt size={18} />
                                </a>
                                <button
                                    onClick={closePreview}
                                    className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-500/20"
                                >
                                    <FaTimes size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body - Viewer */}
                        <div className="flex-1 bg-black/40 relative overflow-hidden flex items-center justify-center p-4 md:p-8">
                            {previewFile.fileType === "Video" ? (
                                <video
                                    controls
                                    controlsList="nodownload"
                                    className="max-w-full max-h-full rounded-2xl shadow-2xl"
                                    autoPlay
                                >
                                    <source src={previewFile.fileUrl} type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                            ) : previewFile.fileType === "Image" ? (
                                <img
                                    src={previewFile.fileUrl}
                                    alt={previewFile.fileName}
                                    className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                                />
                            ) : previewFile.fileType === "PDF" ? (
                                <iframe
                                    src={`${previewFile.fileUrl}#toolbar=0`}
                                    className="w-full h-full rounded-2xl border-0 bg-white"
                                    title="PDF Preview"
                                />
                            ) : (
                                <div className="text-center py-20">
                                    <FaFileAlt size={64} className="text-gray-700 mx-auto mb-6" />
                                    <h3 className="text-white font-black text-xl mb-4">NO PREVIEW AVAILABLE</h3>
                                    <a
                                        href={previewFile.downloadUrl}
                                        className="inline-flex items-center gap-2 px-8 py-3 bg-cyan-500 text-black font-black text-[10px] uppercase tracking-widest rounded-xl"
                                    >
                                        <FaDownload /> Download to View
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.98); }
                    to { opacity: 1; transform: scale(1); }
                }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #0891b2; }
            `}</style>
        </Layout>
    );
};

export default TrainingCenter;
