import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus, FaTimes } from 'react-icons/fa';
import '../MasterDataWave.css';
import { hasPermission } from '../../../config/permissions';
import ExcelImportExport from "../../Common/ExcelImportExport";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const FollowUpFeedbackContent = () => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentFeedback, setCurrentFeedback] = useState(null);
    const [formData, setFormData] = useState({ name: "" });

    // Permission checks
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canCreate = hasPermission(user, 'masterData', 'followUpFeedback', 'create');
    const canEdit = hasPermission(user, 'masterData', 'followUpFeedback', 'edit');
    const canDelete = hasPermission(user, 'masterData', 'followUpFeedback', 'delete');

    const fetchFeedbacks = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/master-data/follow-up-feedback`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setFeedbacks(data);
            } else {
                setError(data.message || "Failed to fetch feedbacks");
            }
        } catch (err) {
            setError("Server error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedbacks();
    }, []);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const openModal = (feedback = null) => {
        if (feedback) {
            setCurrentFeedback(feedback);
            setFormData({ name: feedback.name });
        } else {
            setCurrentFeedback(null);
            setFormData({ name: "" });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentFeedback(null);
        setFormData({ name: "" });
        setError("");
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        const url = currentFeedback
            ? `${import.meta.env.VITE_API_URL}/master-data/follow-up-feedback/${currentFeedback._id}`
            : `${import.meta.env.VITE_API_URL}/master-data/follow-up-feedback`;
        const method = currentFeedback ? "PUT" : "POST";

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
                fetchFeedbacks();
                closeModal();
            } else {
                setError(data.message || "Operation failed");
            }
        } catch (err) {
            setError("Server error");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this feedback option?")) return;

        const token = localStorage.getItem("token");
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/master-data/follow-up-feedback/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                fetchFeedbacks();
            } else {
                setError("Failed to delete feedback");
            }
        } catch (err) {
            setError("Server error");
        }
    };

    const handleBulkImport = async (importData) => {
        const token = localStorage.getItem("token");
        const response = await fetch(`${import.meta.env.VITE_API_URL}/master-data/follow-up-feedback/import`, {
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

        fetchFeedbacks();
    };

    const feedbackColumns = [
        { header: "Feedback Name", key: "name" }
    ];
    const feedbackMapping = {
        "Feedback Name": "name"
    };

    return (
        <div className="p-6">
            <ToastContainer position="top-right" theme="dark" />
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Follow-Up Feedback</h2>
                    <p className="text-gray-400 text-sm mt-1 uppercase tracking-widest text-[10px]">Manage lead feedback options</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {canCreate && (
                        <ExcelImportExport
                            data={feedbacks}
                            columns={feedbackColumns}
                            mapping={feedbackMapping}
                            onImport={handleBulkImport}
                            fileName="followup_feedbacks"
                        />
                    )}
                    {canCreate && (
                        <button
                            onClick={() => openModal()}
                            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition-colors uppercase text-sm tracking-widest"
                        >
                            <FaPlus /> Add Feedback
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg mb-6">
                    {error}
                </div>
            )}

            <div className="bg-[#1a1f24] rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[#131619] text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-gray-800">
                            <th className="p-4">#</th>
                            <th className="p-4">Feedback Type / Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {loading ? (
                            <tr>
                                <td colSpan="3" className="p-8 text-center text-gray-500 font-mono uppercase tracking-widest text-xs">Synchronizing...</td>
                            </tr>
                        ) : feedbacks.length === 0 ? (
                            <tr>
                                <td colSpan="3" className="p-8 text-center text-gray-500 italic">No feedback options defined</td>
                            </tr>
                        ) : (
                            feedbacks.map((fb, index) => (
                                <tr key={fb._id} className="master-data-row-wave border-b border-gray-800 hover:bg-white/5 transition-all">
                                    <td className="p-4 text-gray-500 font-mono text-xs">{index + 1}</td>
                                    <td className="p-4 font-bold text-gray-200 uppercase text-xs tracking-wider">{fb.name}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {canEdit && (
                                                <button
                                                    onClick={() => openModal(fb)}
                                                    className="p-2 text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
                                                    title="Edit Status"
                                                >
                                                    <FaEdit size={14} />
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button
                                                    onClick={() => handleDelete(fb._id)}
                                                    className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                    title="Remove Status"
                                                >
                                                    <FaTrash size={14} />
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
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1f24] p-8 rounded-2xl w-full max-w-md border border-gray-800 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white uppercase tracking-tight">
                                {currentFeedback ? "Authorize FeedBack Edit" : "Register New Feedback"}
                            </h3>
                            <button onClick={closeModal} className="text-gray-500 hover:text-white transition-colors">
                                <FaTimes size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="mb-6">
                                <label className="block text-gray-500 mb-2 text-[10px] font-black uppercase tracking-[0.2em] ml-1">Feedback Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full bg-[#131619] border border-gray-800 rounded-xl p-4 text-white focus:outline-none focus:border-cyan-500 transition-all font-bold uppercase placeholder:text-gray-700"
                                    placeholder="E.G. HIGHLY INTERESTED"
                                    required
                                />
                                <p className="text-[9px] text-gray-600 mt-2 ml-1 italic">* This will appear in the Lead Management dropdown</p>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-xl font-black uppercase tracking-widest text-xs transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-black rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-cyan-600/20"
                                >
                                    {currentFeedback ? "Update Entry" : "Commit Entry"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FollowUpFeedbackContent;
