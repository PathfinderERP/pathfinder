import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaCloudUploadAlt, FaFileAlt, FaCheck, FaTimes, FaArrowLeft } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";

const DocumentUpload = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [targetAudience, setTargetAudience] = useState("All");
    const [targetDepartment, setTargetDepartment] = useState("");
    const [targetDesignation, setTargetDesignation] = useState("");
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);

    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);

    useEffect(() => {
        fetchMasterData();
    }, []);

    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return navigate("/");

            const config = { headers: { Authorization: `Bearer ${token}` } };

            // Using 127.0.0.1 to avoid localhost IPv6 issues
            const deptRes = await axios.get(`${import.meta.env.VITE_API_URL}/department`, config);
            const desigRes = await axios.get(`${import.meta.env.VITE_API_URL}/designation`, config);

            setDepartments(deptRes.data.departments || deptRes.data || []);
            setDesignations(desigRes.data || []);
        } catch (error) {
            console.error("Error fetching master data", error);
        }
    };

    const handleFileChange = (e) => {
        setFiles([...e.target.files]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (files.length === 0) return toast.error("Please select a file");

        const formData = new FormData();
        formData.append("title", title);
        formData.append("description", description);
        formData.append("targetAudience", targetAudience);
        if (targetAudience === "Department") formData.append("targetDepartment", targetDepartment);
        if (targetAudience === "Designation") formData.append("targetDesignation", targetDesignation);

        for (let i = 0; i < files.length; i++) {
            formData.append("files", files[i]);
        }

        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            console.log("Submitting to API...");

            // Using 127.0.0.1 to avoid localhost IPv6 issues
            await axios.post(`${import.meta.env.VITE_API_URL}/hr/documents/upload`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success("Document uploaded successfully!");
            setTitle("");
            setDescription("");
            setFiles([]);
            setTargetAudience("All");
        } catch (error) {
            console.error("Upload Error:", error);
            if (error.response && (error.response.status === 404 || error.response.status === 401)) {
                // Check if it is a 404 from route missing OR user not found
                if (error.response.data && error.response.data.message === "User not found.") {
                    toast.error("Session invalid. Please login again.");
                } else if (error.response.status === 401) {
                    toast.error("Unauthorized. Please login again.");
                } else {
                    toast.error("Server API not found (404). Please contact admin.");
                }
            } else {
                toast.error(error.response?.data?.message || "Upload failed");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 bg-gray-900 min-h-screen text-white relative">
            <ToastContainer theme="dark" />

            {/* BIG RED CLOSE BUTTON */}
            <button
                onClick={() => navigate(-1)}
                className="absolute top-5 right-5 p-3 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg z-50 transition-transform transform hover:scale-110"
                title="Close"
            >
                <FaTimes size={24} />
            </button>

            <div className="max-w-4xl mx-auto bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700 mt-8">
                <div className="mb-8 border-b border-gray-700 pb-4 flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white transition-colors">
                        <FaArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            Upload Document
                        </h1>
                        <p className="text-gray-400 mt-2">Share files, policies, and resources.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Title & Desc */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Document Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                placeholder="e.g. Leave Policy 2025"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Target Audience</label>
                            <select
                                value={targetAudience}
                                onChange={(e) => setTargetAudience(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                            >
                                <option value="All">All Employees</option>
                                <option value="Department">Specific Department</option>
                                <option value="Designation">Specific Designation</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Description (Optional)</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows="3"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                placeholder="Brief description..."
                            ></textarea>
                        </div>
                    </div>

                    {/* Conditionals */}
                    {targetAudience === "Department" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Select Department</label>
                            <select
                                value={targetDepartment}
                                onChange={(e) => setTargetDepartment(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                required
                            >
                                <option value="">-- Select Department --</option>
                                {departments.map((dept) => (
                                    <option key={dept._id} value={dept.name}>{dept.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {targetAudience === "Designation" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Select Designation</label>
                            <select
                                value={targetDesignation}
                                onChange={(e) => setTargetDesignation(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                required
                            >
                                <option value="">-- Select Designation --</option>
                                {designations.map((desig) => (
                                    <option key={desig._id} value={desig.title || desig.name}>{desig.title || desig.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* File Upload Area */}
                    <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 flex flex-col items-center justify-center bg-gray-800/50 hover:bg-gray-800 transition-colors relative cursor-pointer group">
                        <input
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <FaCloudUploadAlt className="text-5xl text-cyan-500 mb-4 group-hover:scale-110 transition-transform" />
                        <p className="text-lg font-medium text-gray-300">
                            {files.length > 0 ? `${files.length} file(s) selected` : "Drag drop files here, or click to select"}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">PDF, Images, Video (Max 50MB)</p>

                        {files.length > 0 && (
                            <div className="mt-4 w-full">
                                {Array.from(files).map((f, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm text-cyan-300">
                                        <FaFileAlt /> {f.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-4 gap-4">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="px-6 py-3 rounded-lg font-bold text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`
                                flex items-center gap-2 px-8 py-3 rounded-lg font-bold shadow-lg shadow-cyan-500/20 
                                transition-all transform hover:-translate-y-0.5
                                ${loading
                                    ? "bg-gray-600 cursor-not-allowed text-gray-400"
                                    : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-cyan-500/40"}
                            `}
                        >
                            {loading ? "Uploading..." : <><FaCheck /> Upload Document</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DocumentUpload;
