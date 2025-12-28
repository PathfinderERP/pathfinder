import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaFilePdf, FaFileImage, FaFileVideo, FaFileAlt, FaDownload, FaUserCircle, FaTimes } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate } from "react-router-dom";

const DocumentCenter = () => {
    const navigate = useNavigate();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const token = localStorage.getItem("token");
            // Using 127.0.0.1 to avoid localhost IPv6 issues
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/hr/documents/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDocuments(res.data || []); // Ensure array
        } catch (error) {
            console.error(error);
            if (error.response?.status === 404) {
                // API not found
            } else {
                toast.error("Failed to load documents");
            }
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (type) => {
        const t = (type || "").toLowerCase();
        if (t.includes("pdf")) return <FaFilePdf className="text-red-500 text-4xl" />;
        if (t.includes("image")) return <FaFileImage className="text-blue-500 text-4xl" />;
        if (t.includes("video")) return <FaFileVideo className="text-purple-500 text-4xl" />;
        return <FaFileAlt className="text-gray-400 text-4xl" />;
    };

    return (
        <div className="p-8 bg-[#1B2026] min-h-screen text-white relative">
            <ToastContainer theme="dark" />

            {/* Close Button */}
            <button
                onClick={() => navigate(-1)}
                className="absolute top-5 right-5 p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-full transition-colors z-50"
            >
                <FaTimes size={20} />
            </button>

            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800 pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                        Document Center
                    </h1>
                    <p className="text-gray-400 mt-1">Access all your organization's important files and resources.</p>
                </div>

                {/* Search/Filter placeholder */}
                <div className="mt-4 md:mt-0">
                    <input
                        type="text"
                        placeholder="Search documents..."
                        className="bg-gray-800 border border-gray-700 rounded-full px-5 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none w-64"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
                </div>
            ) : documents.length === 0 ? (
                <div className="text-center py-20 bg-gray-800/30 rounded-2xl border border-gray-800 border-dashed">
                    <FaFileAlt className="text-6xl text-gray-600 mx-auto mb-4" />
                    <p className="text-xl text-gray-500">No documents available for you.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {documents.map((doc) => (
                        <div
                            key={doc._id}
                            className="group bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-500/20 transition-all duration-300 transform hover:-translate-y-2 relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-gray-900 rounded-lg shadow-inner">
                                    {getIcon(doc.files[0]?.fileType || "")}
                                </div>
                                <span className="text-xs font-mono text-gray-500 bg-gray-900/50 px-2 py-1 rounded">
                                    {new Date(doc.createdAt).toLocaleDateString()}
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-gray-100 mb-2 line-clamp-2 min-h-[3.5rem]" title={doc.title}>
                                {doc.title}
                            </h3>
                            <p className="text-sm text-gray-400 mb-4 line-clamp-2 h-10">
                                {doc.description || "No description provided."}
                            </p>

                            <div className="border-t border-gray-700 pt-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FaUserCircle className="text-gray-500" />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold text-gray-300">{doc.uploadedByName || "Admin"}</span>
                                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{doc.uploadedByDepartment || "HR"}</span>
                                    </div>
                                </div>
                                <a
                                    href={doc.files[0]?.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-cyan-500/10 text-cyan-400 rounded-full hover:bg-cyan-500 hover:text-white transition-colors"
                                    title="Download/View"
                                >
                                    <FaDownload size={14} />
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DocumentCenter;
