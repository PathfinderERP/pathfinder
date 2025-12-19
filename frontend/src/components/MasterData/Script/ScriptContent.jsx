import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus, FaTimes } from 'react-icons/fa';
import '../MasterDataWave.css';
import { hasPermission } from '../../../config/permissions';

const ScriptContent = () => {
    const [scripts, setScripts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentScript, setCurrentScript] = useState(null);
    const [formData, setFormData] = useState({ scriptName: "", scriptContent: "" });

    // Permissions
    const [canCreate, setCanCreate] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    const [canDelete, setCanDelete] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setCanCreate(hasPermission(parsedUser, 'masterData', 'script', 'create'));
            setCanEdit(hasPermission(parsedUser, 'masterData', 'script', 'edit'));
            setCanDelete(hasPermission(parsedUser, 'masterData', 'script', 'delete'));
        }
        fetchScripts();
    }, []);

    const fetchScripts = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/script/list`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setScripts(data);
            } else {
                setError(data.message || "Failed to fetch scripts");
            }
        } catch (err) {
            setError("Server error");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const openModal = (script = null) => {
        if (script) {
            setCurrentScript(script);
            setFormData({ scriptName: script.scriptName, scriptContent: script.scriptContent || "" });
        } else {
            setCurrentScript(null);
            setFormData({ scriptName: "", scriptContent: "" });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentScript(null);
        setFormData({ scriptName: "", scriptContent: "" });
        setError("");
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        const url = currentScript
            ? `${import.meta.env.VITE_API_URL}/script/update/${currentScript._id}`
            : `${import.meta.env.VITE_API_URL}/script/create`;
        const method = currentScript ? "PUT" : "POST";

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            const data = await response.json();

            if (response.ok) {
                fetchScripts();
                closeModal();
            } else {
                setError(data.message || "Operation failed");
            }
        } catch (err) {
            setError("Server error");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this script?")) return;

        const token = localStorage.getItem("token");
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/script/delete/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                fetchScripts();
            } else {
                setError("Failed to delete script");
            }
        } catch (err) {
            setError("Server error");
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Script Management</h2>
                {canCreate && (
                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition-colors"
                    >
                        <FaPlus /> Add Script
                    </button>
                )}
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg mb-6">
                    {error}
                </div>
            )}

            <div className="bg-[#1a1f24] rounded-xl border border-gray-800 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[#252b32] text-gray-400 text-sm uppercase">
                            <th className="p-4 font-medium">#</th>
                            <th className="p-4 font-medium">Script Name</th>
                            <th className="p-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {loading ? (
                            <tr>
                                <td colSpan="3" className="p-8 text-center text-gray-500">Loading...</td>
                            </tr>
                        ) : scripts.length === 0 ? (
                            <tr>
                                <td colSpan="3" className="p-8 text-center text-gray-500">No scripts found</td>
                            </tr>
                        ) : (
                            scripts.map((script, index) => (
                                <tr key={script._id} className="master-data-row-wave border-b border-gray-800 transition-colors">
                                    <td className="p-4 text-gray-400">{index + 1}</td>
                                    <td className="p-4 font-medium" style={{ color: "white" }}>{script.scriptName}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {canEdit && (
                                                <button
                                                    onClick={() => openModal(script)}
                                                    className="p-2 text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <FaEdit />
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button
                                                    onClick={() => handleDelete(script._id)}
                                                    className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <FaTrash />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-[#1a1f24] p-6 rounded-lg w-full max-w-md border border-gray-700 shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">
                                {currentScript ? "Edit Script" : "Add New Script"}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-white">
                                <FaTimes />
                            </button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="mb-4">
                                <label className="block text-gray-400 mb-2 text-sm">Script Name</label>
                                <input
                                    type="text"
                                    name="scriptName"
                                    value={formData.scriptName}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
                                    placeholder="Enter script name"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-400 mb-2 text-sm">Script Content</label>
                                <textarea
                                    name="scriptContent"
                                    value={formData.scriptContent}
                                    onChange={handleInputChange}
                                    rows="6"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500 resize-none"
                                    placeholder="Paste the master calling script here..."
                                    required
                                />
                                <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-widest">STT Analysis will compare recordings against this text</p>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScriptContent;
