import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus, FaTimes } from 'react-icons/fa';
import '../MasterDataWave.css';
import { hasPermission } from '../../../config/permissions';
import ExcelImportExport from "../../common/ExcelImportExport";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTheme } from '../../../context/ThemeContext';

const BatchContent = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentBatch, setCurrentBatch] = useState(null);
    const [formData, setFormData] = useState({ batchName: "" });

    // Mock permissions for now or import if available
    const canCreate = true;
    const canEdit = true;
    const canDelete = true;

    const fetchBatches = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/batch/list`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setBatches(data);
            } else {
                setError(data.message || "Failed to fetch batches");
            }
        } catch (err) {
            setError("Server error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBatches();
    }, []);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const openModal = (batch = null) => {
        if (batch) {
            setCurrentBatch(batch);
            setFormData({ batchName: batch.batchName });
        } else {
            setCurrentBatch(null);
            setFormData({ batchName: "" });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentBatch(null);
        setFormData({ batchName: "" });
        setError("");
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        const url = currentBatch
            ? `${import.meta.env.VITE_API_URL}/batch/update/${currentBatch._id}`
            : `${import.meta.env.VITE_API_URL}/batch/create`;
        const method = currentBatch ? "PUT" : "POST";

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
                fetchBatches();
                closeModal();
            } else {
                setError(data.message || "Operation failed");
            }
        } catch (err) {
            setError("Server error");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this batch?")) return;

        const token = localStorage.getItem("token");
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/batch/delete/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                fetchBatches();
            } else {
                setError("Failed to delete batch");
            }
        } catch (err) {
            setError("Server error");
        }
    };

    const handleBulkImport = async (importData) => {
        const token = localStorage.getItem("token");
        const response = await fetch(`${import.meta.env.VITE_API_URL}/batch/import`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(importData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Bulk import failed");
        }

        fetchBatches();
    };

    const batchColumns = [
        { header: "Batch Name", key: "batchName" }
    ];
    const batchMapping = {
        "Batch Name": "batchName"
    };

    return (
        <div className={`p-6 transition-colors duration-300 ${isDarkMode ? '' : 'bg-gray-50'}`}>
            <ToastContainer position="top-right" theme={isDarkMode ? "dark" : "light"} />
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className={`text-2xl font-black uppercase tracking-tighter italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Batch <span className="text-cyan-500">Management</span></h2>
                    <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm mt-1 font-bold`}>Manage student batches</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {canCreate && (
                        <ExcelImportExport
                            data={batches}
                            columns={batchColumns}
                            mapping={batchMapping}
                            onImport={handleBulkImport}
                            fileName="batches"
                        />
                    )}
                    {canCreate && (
                        <button
                            onClick={() => openModal()}
                            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            <FaPlus /> Add Batch
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg mb-6">
                    {error}
                </div>
            )}

            <div className={`rounded-xl border overflow-hidden transition-all duration-300 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isDarkMode ? 'bg-[#252b32] text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                            <th className="p-4">#</th>
                            <th className="p-4">Batch Name</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y transition-colors ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                        {loading ? (
                            <tr>
                                <td colSpan="3" className="p-8 text-center text-gray-500">Loading...</td>
                            </tr>
                        ) : batches.length === 0 ? (
                            <tr>
                                <td colSpan="3" className="p-8 text-center text-gray-500">No batches found</td>
                            </tr>
                        ) : (
                            batches.map((batch, index) => (
                                <tr key={batch._id} className={`master-data-row-wave transition-colors ${isDarkMode ? 'border-b border-gray-800 hover:bg-white/5' : 'border-b border-gray-100 hover:bg-gray-50'}`}>
                                    <td className={`p-4 font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{index + 1}</td>
                                    <td className={`p-4 font-black uppercase text-xs tracking-wide ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{batch.batchName}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {canEdit && (
                                                <button
                                                    onClick={() => openModal(batch)}
                                                    className="p-2 text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <FaEdit />
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button
                                                    onClick={() => handleDelete(batch._id)}
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
                    <div className={`p-8 rounded-2xl w-full max-w-md border shadow-2xl transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className={`text-2xl font-black uppercase tracking-tighter italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {currentBatch ? "Edit" : "Add"} <span className="text-cyan-500">Batch</span>
                            </h3>
                            <button onClick={closeModal} className={`${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'} transition-colors`}>
                                <FaTimes size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="mb-6">
                                <label className={`block mb-2 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Batch Name</label>
                                <input
                                    type="text"
                                    name="batchName"
                                    value={formData.batchName}
                                    onChange={handleInputChange}
                                    className={`w-full border rounded-xl p-3 outline-none focus:border-cyan-500 transition-all font-bold ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                    placeholder="Enter batch name"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className={`px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-widest text-xs rounded-lg transition-all shadow-lg shadow-cyan-500/20"
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

export default BatchContent;
