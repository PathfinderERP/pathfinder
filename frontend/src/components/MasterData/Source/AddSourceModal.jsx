import React, { useState } from "react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";

const AddSourceModal = ({ onClose, onSuccess }) => {
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1f24] rounded-xl w-full max-w-md border border-gray-700">
                <div className="flex justify-between items-center p-6 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-white">Add Source</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <FaTimes size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Source Name *</label>
                        <input
                            type="text"
                            name="sourceName"
                            required
                            value={formData.sourceName}
                            onChange={handleChange}
                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Source *</label>
                        <input
                            type="text"
                            name="source"
                            required
                            value={formData.source}
                            onChange={handleChange}
                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Sub Source *</label>
                        <input
                            type="text"
                            name="subSource"
                            required
                            value={formData.subSource}
                            onChange={handleChange}
                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Source Type</label>
                        <input
                            type="text"
                            name="sourceType"
                            value={formData.sourceType}
                            onChange={handleChange}
                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
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
