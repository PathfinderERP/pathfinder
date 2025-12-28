import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import {
    FaPlus, FaSearch, FaFilter, FaVideo, FaFilePdf,
    FaImage, FaFileAlt, FaDownload, FaTrash, FaEdit, FaEye, FaUsers, FaUserCheck, FaTimes, FaCloudUploadAlt
} from "react-icons/fa";
import { toast } from "react-toastify";
import usePermission from "../../hooks/usePermission";

const TrainingList = () => {
    const [trainings, setTrainings] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedTraining, setSelectedTraining] = useState(null);

    // Permission checks
    const canCreate = usePermission('hrManpower', 'training', 'create');
    const canEdit = usePermission('hrManpower', 'training', 'edit');
    const canDelete = usePermission('hrManpower', 'training', 'delete');

    // Form state
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        category: "General",
        visibility: "All",
        assignedTo: []
    });
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchTrainings();
        fetchEmployees();
    }, []);

    const fetchTrainings = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/training/hr-list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setTrainings(data);
            } else {
                toast.error("Failed to fetch training list");
            }
        } catch (error) {
            console.error("Error fetching trainings:", error);
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/employee`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setEmployees(data.employees || data);
            }
        } catch (error) {
            console.error("Error fetching employees:", error);
        }
    };

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setFiles(prev => [...prev, ...selectedFiles]);
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (files.length === 0 && !isEditMode) {
            toast.error("Please select at least one file");
            return;
        }

        setUploading(true);
        const data = new FormData();
        data.append("title", formData.title);
        data.append("description", formData.description);
        data.append("category", formData.category);
        data.append("visibility", formData.visibility);
        data.append("assignedTo", JSON.stringify(formData.assignedTo));

        files.forEach(file => {
            data.append("files", file);
        });

        try {
            const token = localStorage.getItem("token");
            const url = isEditMode
                ? `${import.meta.env.VITE_API_URL}/hr/training/${selectedTraining._id}`
                : `${import.meta.env.VITE_API_URL}/hr/training`;

            const response = await fetch(url, {
                method: isEditMode ? "PUT" : "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: data
            });

            if (response.ok) {
                toast.success(isEditMode ? "Training updated" : "Training material uploaded");
                setIsModalOpen(false);
                resetForm();
                fetchTrainings();
            } else {
                const errData = await response.json();
                toast.error(errData.message || "Operation failed");
            }
        } catch (error) {
            console.error("Submit error:", error);
            toast.error("Network error during upload");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete all resources in this training module?")) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/training/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success("Training material deleted");
                fetchTrainings();
            } else {
                toast.error("Failed to delete");
            }
        } catch (error) {
            toast.error("Network error");
        }
    };

    const resetForm = () => {
        setFormData({
            title: "",
            description: "",
            category: "General",
            visibility: "All",
            assignedTo: []
        });
        setFiles([]);
        setIsEditMode(false);
        setSelectedTraining(null);
    };

    const openEditModal = (training) => {
        setSelectedTraining(training);
        setFormData({
            title: training.title,
            description: training.description,
            category: training.category,
            visibility: training.visibility,
            assignedTo: training.assignedTo?.map(e => e._id) || []
        });
        setFiles([]); // For edit, only add if new files are selected
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    const getFileIcon = (type) => {
        switch (type) {
            case "Video": return <FaVideo className="text-blue-400" size={18} />;
            case "PDF": return <FaFilePdf className="text-red-400" size={18} />;
            case "Image": return <FaImage className="text-emerald-400" size={18} />;
            default: return <FaFileAlt className="text-gray-400" size={18} />;
        }
    };

    const filteredTrainings = trainings.filter(t =>
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout activePage="HR & Manpower">
            <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Training Management</h1>
                        <p className="text-gray-400 text-sm font-medium">Bulk upload and manage multi-resource training modules.</p>
                    </div>
                    {canCreate && (
                        <button
                            onClick={() => { resetForm(); setIsModalOpen(true); }}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-[#1a1f24] font-bold rounded-xl transition-all shadow-lg shadow-cyan-500/20"
                        >
                            <FaPlus /> Create Module
                        </button>
                    )}
                </div>

                {/* Search */}
                <div className="bg-[#131619] p-4 rounded-2xl border border-gray-800 mb-8 flex items-center shadow-inner">
                    <div className="relative flex-1">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search by title or category..."
                            className="w-full bg-transparent rounded-xl py-2.5 pl-11 pr-4 text-gray-300 focus:outline-none placeholder:text-gray-700 font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500"></div></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTrainings.map(training => (
                            <div key={training._id} className="bg-[#131619] border border-gray-800 rounded-3xl p-6 group hover:border-cyan-500/30 transition-all flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="px-3 py-1 bg-gray-800/50 rounded-lg text-[9px] font-black uppercase tracking-widest text-[#1a1f24] bg-cyan-500">
                                        {training.category}
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => openEditModal(training)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white"><FaEdit size={14} /></button>
                                        <button onClick={() => handleDelete(training._id)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white"><FaTrash size={14} /></button>
                                    </div>
                                </div>
                                <h3 className="text-white font-bold mb-2 uppercase tracking-tight">{training.title}</h3>
                                <p className="text-gray-500 text-xs mb-6 line-clamp-2 h-8 font-medium">{training.description}</p>

                                <div className="space-y-2 mt-auto">
                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 border-b border-gray-800 pb-1">Attachments ({training.files?.length || 0})</p>
                                    {training.files?.slice(0, 3).map((f, i) => (
                                        <div key={i} className="flex items-center justify-between text-[11px] text-gray-400 bg-gray-800/20 p-2 rounded-lg truncate">
                                            <div className="flex items-center gap-2 truncate">
                                                {getFileIcon(f.fileType)}
                                                <span className="truncate">{f.fileName}</span>
                                            </div>
                                            <a href={f.fileUrl} target="_blank" rel="noreferrer" className="text-cyan-500 hover:underline shrink-0">View</a>
                                        </div>
                                    ))}
                                    {training.files?.length > 3 && <p className="text-[10px] text-gray-600 font-bold ml-1">+ {training.files.length - 3} more files</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#131619] border border-gray-800 rounded-3xl w-full max-w-2xl overflow-hidden animate-fade-in shadow-2xl">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#1a1f24]/50">
                            <h2 className="text-lg font-black text-white uppercase tracking-wider">{isEditMode ? "Manage Module" : "New Training Module"}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white"><FaTimes size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[75vh] custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Title</label>
                                    <input required type="text" className="w-full bg-[#1a1f24] border border-gray-800 rounded-xl py-3 px-4 text-gray-300 focus:ring-1 focus:ring-cyan-500 outline-none" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Category</label>
                                    <input type="text" className="w-full bg-[#1a1f24] border border-gray-800 rounded-xl py-3 px-4 text-gray-300 focus:ring-1 focus:ring-cyan-500 outline-none" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Description</label>
                                <textarea className="w-full bg-[#1a1f24] border border-gray-800 rounded-xl py-3 px-4 text-gray-300 h-24 resize-none outline-none focus:ring-1 focus:ring-cyan-500" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            </div>

                            {/* File Upload Area */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Resources (Multi-select) {isEditMode && <span className="text-yellow-500/50 ml-2">Adds/Replaces all files</span>}</label>
                                <div className="relative border-2 border-dashed border-gray-800 rounded-2xl p-8 hover:border-cyan-500/40 transition-all group text-center cursor-pointer">
                                    <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                                    <FaCloudUploadAlt size={32} className="mx-auto text-gray-600 group-hover:text-cyan-500 mb-2 transition-colors" />
                                    <p className="text-xs text-gray-500 font-medium">Click to browse or drag and drop files</p>
                                    <p className="text-[9px] text-gray-700 font-black uppercase mt-1 tracking-widest">MP4, PDF, PNG, JPG (UP TO 10 FILES)</p>
                                </div>
                                {files.length > 0 && (
                                    <div className="grid grid-cols-1 gap-2 mt-4">
                                        {files.map((file, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-[#1a1f24] rounded-xl border border-gray-800">
                                                <div className="flex items-center gap-3 truncate pr-4">
                                                    <div className="p-1.5 bg-gray-800 rounded-md"><FaFileAlt size={12} className="text-gray-400" /></div>
                                                    <span className="text-xs text-gray-400 truncate font-medium">{file.name}</span>
                                                </div>
                                                <button type="button" onClick={() => removeFile(i)} className="text-red-500/50 hover:text-red-500"><FaTimes size={14} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 pt-6 border-t border-gray-800">
                                <div className="flex bg-[#1a1f24] p-1.5 rounded-xl border border-gray-800">
                                    <button type="button" onClick={() => setFormData({ ...formData, visibility: "All" })} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${formData.visibility === "All" ? "bg-cyan-500 text-black" : "text-gray-500 hover:text-gray-300"}`}>Public</button>
                                    <button type="button" onClick={() => setFormData({ ...formData, visibility: "Specific" })} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${formData.visibility === "Specific" ? "bg-cyan-500 text-black" : "text-gray-500 hover:text-gray-300"}`}>Restricted</button>
                                </div>
                                {formData.visibility === "Specific" && (
                                    <div className="grid grid-cols-2 gap-3 p-4 bg-[#1a1f24] rounded-2xl border border-gray-800 max-h-40 overflow-y-auto custom-scrollbar">
                                        {employees.map(emp => (
                                            <label key={emp._id} className="flex items-center gap-3 p-2 bg-black/20 rounded-lg cursor-pointer hover:bg-black/30 transition-all border border-gray-800/50">
                                                <input type="checkbox" checked={formData.assignedTo.includes(emp._id)} onChange={e => {
                                                    const newAssigned = e.target.checked ? [...formData.assignedTo, emp._id] : formData.assignedTo.filter(id => id !== emp._id);
                                                    setFormData({ ...formData, assignedTo: newAssigned });
                                                }} className="w-4 h-4 rounded border-gray-800 bg-gray-900 text-cyan-500" />
                                                <span className="text-[10px] text-gray-400 font-black uppercase tracking-tight truncate">{emp.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-800">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-gray-800 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:text-white transition-all">Cancel</button>
                                <button type="submit" disabled={uploading} className="px-8 py-3 bg-cyan-500 text-[#1a1f24] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-cyan-600 transition-all disabled:opacity-50 flex items-center gap-2">
                                    {uploading ? <div className="animate-spin h-3 w-3 border-2 border-black border-t-transparent rounded-full" /> : (isEditMode ? "Update Module" : "Publish Module")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <style>{`.animate-fade-in { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }`}</style>
        </Layout>
    );
};

export default TrainingList;
