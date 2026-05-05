import React, { useState } from "react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";

const AddSourceModal = ({ onClose, onSuccess, isDarkMode }) => {
    const [formData, setFormData] = useState({
        sourceName: "",
        source: "",
        subSource: "",
        sourceType: ""
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/source/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("Source created successfully");
                onSuccess();
            } else {
                toast.error(data.message || "Failed to create source");
            }
        } catch (error) {
            console.error("Error creating source:", error);
            toast.error("Error creating source");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
            <div className={`rounded-2xl w-full max-w-md border shadow-2xl transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className={`flex justify-between items-center p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                    <h3 className={`text-2xl font-black uppercase tracking-tighter italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Add <span className="text-cyan-500">Source</span></h3>
                    <button onClick={onClose} className={`${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'} transition-colors`}>
                        <FaTimes size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Source Name *</label>
                        <input
                            type="text"
                            name="sourceName"
                            required
                            value={formData.sourceName}
                            onChange={handleChange}
                            className={`w-full border rounded-lg p-3 outline-none focus:border-cyan-500 transition-all font-bold ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                        />
                    </div>
                    <div>
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Source *</label>
                        <input
                            type="text"
                            name="source"
                            required
                            value={formData.source}
                            onChange={handleChange}
                            className={`w-full border rounded-lg p-3 outline-none focus:border-cyan-500 transition-all font-bold ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                        />
                    </div>
                    <div>
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Sub Source *</label>
                        <input
                            type="text"
                            name="subSource"
                            required
                            value={formData.subSource}
                            onChange={handleChange}
                            className={`w-full border rounded-lg p-3 outline-none focus:border-cyan-500 transition-all font-bold ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                        />
                    </div>
                    <div>
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Source Type</label>
                        <input
                            type="text"
                            name="sourceType"
                            value={formData.sourceType}
                            onChange={handleChange}
                            className={`w-full border rounded-lg p-3 outline-none focus:border-cyan-500 transition-all font-bold ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                        />
                    </div>

                    <div className={`flex justify-end gap-3 pt-6 border-t transition-colors ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                        <button
                            type="button"
                            onClick={onClose}
                            className={`px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400"
                        >
                            {loading ? "Adding..." : "Add Source"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddSourceModal;
