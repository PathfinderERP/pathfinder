
import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaFilePdf, FaFileImage, FaFileVideo, FaFileAlt, FaDownload, FaUserCircle, FaTimes } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";

const DocumentCenter = () => {
    const navigate = useNavigate();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedDoc, setSelectedDoc] = useState(null); // For Preview Modal

    useEffect(() => {
        const loadPageData = async () => {
            setLoading(true);
            await Promise.all([fetchDocuments(), fetchProfile()]);
            setLoading(false);
        };
        loadPageData();
    }, []);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem("token");
            const apiUrl = import.meta.env.VITE_API_URL.replace("localhost", "127.0.0.1");
            const response = await fetch(`${apiUrl}/hr/employee/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setUserProfile(data);
            }
        } catch (error) {
            console.error("Error loading profile:", error);
        }
    };

    const fetchDocuments = async () => {
        try {
            const token = localStorage.getItem("token");
            const apiUrl = import.meta.env.VITE_API_URL.replace("localhost", "127.0.0.1");
            const res = await axios.get(`${apiUrl}/hr/documents/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDocuments(res.data || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load documents");
        }
    };

    const getIcon = (type) => {
        const t = (type || "").toLowerCase();
        if (t.includes("pdf")) return <FaFilePdf className="text-red-500 text-4xl" />;
        if (t.includes("image")) return <FaFileImage className="text-blue-500 text-4xl" />;
        if (t.includes("video")) return <FaFileVideo className="text-purple-500 text-4xl" />;
        return <FaFileAlt className="text-gray-400 text-4xl" />;
    };

    const filteredDocuments = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout activePage="Employee Center">
            <div className="p-4 md:p-8 bg-[#0F172A] min-h-screen text-slate-200 relative font-sans">
                <ToastContainer theme="dark" />

                {/* Premium Header Section */}
                <div className="max-w-7xl mx-auto mb-12">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/20">
                                <FaFileAlt size={28} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-3">
                                    Document <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Hub</span>
                                </h1>
                                <p className="text-slate-400 font-medium">Organization resources and personal documents.</p>
                            </div>
                        </div>

                        {/* User Profile Info */}
                        {userProfile && (
                            <div className="flex items-center gap-4 bg-slate-800/40 p-2 pr-6 rounded-full border border-slate-700/50 backdrop-blur-sm group hover:border-slate-600 transition-all duration-300">
                                <div className="w-12 h-12 rounded-full border-2 border-indigo-500/50 overflow-hidden shadow-inner">
                                    {userProfile.profileImage ? (
                                        <img src={userProfile.profileImage} alt="User" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-700">
                                            <FaUserCircle size={24} className="text-indigo-400" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white leading-tight group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{userProfile.name}</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{userProfile.employeeId}</span>
                                        <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                        <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">{userProfile.department?.name || "Corporate"}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent mb-8"></div>

                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-10">
                        <div className="relative w-full md:w-96 group">
                            <input
                                type="text"
                                placeholder="Explore your documents..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl px-12 py-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-500"
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => navigate(-1)} className="px-6 py-3 bg-slate-800/50 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all flex items-center gap-2 text-sm font-bold">
                                <FaTimes /> Close Center
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col justify-center items-center h-96 gap-4">
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                                <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                            </div>
                            <p className="text-slate-500 font-black uppercase tracking-widest text-xs animate-pulse">Synchronizing documents...</p>
                        </div>
                    ) : filteredDocuments.length === 0 ? (
                        <div className="text-center py-24 bg-slate-800/20 rounded-[32px] border border-slate-800 border-dashed backdrop-blur-sm">
                            <div className="relative inline-block mb-6">
                                <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl"></div>
                                <FaFileAlt className="text-7xl text-slate-700 relative z-10 mx-auto" />
                            </div>
                            <p className="text-2xl font-black text-slate-500">No matches found</p>
                            <p className="text-slate-600 mt-2 max-w-xs mx-auto">We couldn't find any documents matching your current criteria.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {filteredDocuments.map((doc) => (
                                <div
                                    key={doc._id}
                                    className="group bg-slate-800/40 rounded-[28px] p-6 border border-slate-700/50 hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 backdrop-blur-md flex flex-col"
                                >
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="p-4 bg-slate-900 rounded-2xl shadow-inner group-hover:scale-110 transition-transform duration-500 ring-1 ring-slate-700/50">
                                            {getIcon(doc.files[0]?.fileType || "")}
                                        </div>
                                        <div className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
                                            {new Date(doc.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="text-lg font-black text-white mb-2 line-clamp-2 leading-tight group-hover:text-indigo-400 transition-colors" title={doc.title}>
                                            {doc.title}
                                        </h3>
                                        <p className="text-sm text-slate-400 mb-6 line-clamp-2 h-10 font-medium leading-relaxed">
                                            {doc.description || "No detailed description available for this resource."}
                                        </p>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-slate-700/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-indigo-400 ring-1 ring-slate-600 overflow-hidden">
                                                {doc.uploaderImage ? (
                                                    <img src={doc.uploaderImage} alt="Uploader" className="w-full h-full object-cover" />
                                                ) : (
                                                    <FaUserCircle size={16} />
                                                )}
                                            </div>
                                            <div className="flex flex-col max-w-[120px]">
                                                <span className="text-xs font-black text-slate-200 truncate">{doc.uploadedByName || "Corporate HR"}</span>
                                                <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">{doc.uploadedByDepartment || "System"}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setSelectedDoc(doc)}
                                                className="py-3 px-4 bg-slate-900/50 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-slate-700 flex items-center justify-center gap-2"
                                            >
                                                <FaFileAlt size={12} className="text-indigo-400" /> Preview
                                            </button>
                                            <a
                                                href={doc.files[0]?.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="py-3 px-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                                            >
                                                <FaDownload size={12} /> Get File
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Preview Modal */}
                {selectedDoc && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 backdrop-blur-xl bg-slate-950/80 animate-in fade-in duration-300">
                        <div className="absolute inset-0" onClick={() => setSelectedDoc(null)}></div>
                        <div className="relative w-full max-w-6xl h-full flex flex-col bg-slate-900 rounded-[40px] border border-slate-700/50 shadow-2xl overflow-hidden scale-in">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-700/50 px-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                                        {getIcon(selectedDoc.files[0]?.fileType)}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white uppercase tracking-tight">{selectedDoc.title}</h2>
                                        <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest">Digital Preview Access</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <a
                                        href={selectedDoc.files[0]?.url}
                                        download
                                        className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl transition-all"
                                        title="Download"
                                    >
                                        <FaDownload />
                                    </a>
                                    <button
                                        onClick={() => setSelectedDoc(null)}
                                        className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all"
                                    >
                                        <FaTimes size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 bg-slate-950 overflow-auto flex items-center justify-center p-4 sm:p-8">
                                {selectedDoc.files[0]?.fileType.includes("image") ? (
                                    <img
                                        src={selectedDoc.files[0]?.url}
                                        alt="Preview"
                                        className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                                    />
                                ) : selectedDoc.files[0]?.fileType.includes("pdf") ? (
                                    <iframe
                                        src={`${selectedDoc.files[0]?.url}#toolbar=0`}
                                        className="w-full h-full rounded-xl border-none"
                                        title="PDF Preview"
                                    ></iframe>
                                ) : selectedDoc.files[0]?.fileType.includes("video") ? (
                                    <video
                                        src={selectedDoc.files[0]?.url}
                                        controls
                                        className="max-w-full max-h-full rounded-xl shadow-2xl"
                                    ></video>
                                ) : (
                                    <div className="text-center">
                                        <div className="p-8 bg-slate-900 rounded-[40px] border border-slate-800 inline-block shadow-2xl">
                                            <FaFileAlt size={80} className="text-slate-700 mx-auto mb-6" />
                                            <p className="text-xl font-black text-slate-400 uppercase tracking-widest">Preview Unavailable</p>
                                            <p className="text-slate-600 mt-2">This file type must be downloaded to view.</p>
                                            <a
                                                href={selectedDoc.files[0]?.url}
                                                className="mt-8 inline-flex items-center gap-2 px-8 py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest transition-all"
                                            >
                                                <FaDownload /> Download File
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 bg-slate-900 border-t border-slate-700/50 px-8 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center ring-1 ring-slate-700 overflow-hidden">
                                        {selectedDoc.uploaderImage ? (
                                            <img src={selectedDoc.uploaderImage} alt="Uploader" className="w-full h-full object-cover" />
                                        ) : (
                                            <FaUserCircle className="text-indigo-400" />
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-white">{selectedDoc.uploadedByName}</span>
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{selectedDoc.uploadedByDepartment}</span>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Secure Organization Repository</p>
                            </div>
                        </div>
                    </div>
                )}

                <style>{`
                    .scale-in {
                        animation: scaleIn 0.4s cubic-bezier(0.165, 0.84, 0.44, 1) forwards;
                    }
                    @keyframes scaleIn {
                        from { transform: scale(0.95) translateY(10px); opacity: 0; }
                        to { transform: scale(1) translateY(0); opacity: 1; }
                    }
                    .group:hover .shadow-indigo-500\\/10 {
                        box-shadow: 0 25px 50px -12px rgba(99, 102, 241, 0.15);
                    }
                    ::-webkit-scrollbar {
                        width: 6px;
                    }
                    ::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    ::-webkit-scrollbar-thumb {
                        background: #334155;
                        border-radius: 10px;
                    }
                    ::-webkit-scrollbar-thumb:hover {
                        background: #475569;
                    }
                `}</style>
            </div>
        </Layout>
    );
};

export default DocumentCenter;
