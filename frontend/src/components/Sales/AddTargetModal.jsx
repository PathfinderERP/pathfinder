import React, { useState, useEffect } from "react";
import { FaTimes, FaSave } from "react-icons/fa";
import { toast } from "react-toastify";

const AddTargetModal = ({ target, onClose, onSuccess, centres, sessions }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        centre: "",
        financialYear: "2025-2026",
        year: new Date().getFullYear(),
        month: getCurrentMonth(),
        targetAmount: "",
        achievedAmount: "0"
    });

    useEffect(() => {
        if (!target && sessions && sessions.length > 0) {
            setFormData(prev => ({
                ...prev,
                financialYear: sessions[0].sessionName
            }));
        }
    }, [sessions, target]);

    function getCurrentMonth() {
        return new Date().toLocaleString('default', { month: 'long' });
    }

    useEffect(() => {
        if (target) {
            setFormData({
                centre: target.centre?._id || target.centre,
                financialYear: target.financialYear,
                year: target.year,
                month: target.month,
                targetAmount: target.targetAmount,
                achievedAmount: target.achievedAmount || 0
            });
        }
    }, [target]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const url = target
                ? `${import.meta.env.VITE_API_URL}/sales/centre-target/${target._id}`
                : `${import.meta.env.VITE_API_URL}/sales/centre-target`;

            const method = target ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(target ? "Target updated" : "Target created");
                onSuccess();
            } else {
                toast.error(data.message || "Operation failed");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error saving target");
        } finally {
            setLoading(false);
        }
    };

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-[#1a1f24] w-full max-w-lg rounded-xl border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] overflow-hidden">
                <div className="bg-[#131619] px-6 py-4 border-b border-gray-800 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">
                        {target ? "Edit Target" : "Add Target"}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <FaTimes size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Centre Selection */}
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Centre *</label>
                        <select
                            required
                            disabled={!!target} // Maybe allow changing? But usually target locks to centre
                            value={formData.centre}
                            onChange={(e) => setFormData({ ...formData, centre: e.target.value })}
                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2.5 text-white focus:border-cyan-500 outline-none"
                        >
                            <option value="">Select Centre</option>
                            {centres.map(c => <option key={c._id} value={c._id}>{c.centreName}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Financial Year</label>
                            <select
                                value={formData.financialYear}
                                onChange={(e) => setFormData({ ...formData, financialYear: e.target.value })}
                                className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2.5 text-white focus:border-cyan-500 outline-none"
                            >
                                {sessions && sessions.length > 0 ? (
                                    sessions.map(s => (
                                        <option key={s._id} value={s.sessionName}>{s.sessionName}</option>
                                    ))
                                ) : (
                                    <option value="">No sessions available</option>
                                )}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Year</label>
                            <input
                                type="number"
                                required
                                value={formData.year}
                                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2.5 text-white focus:border-cyan-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Month *</label>
                            <select
                                required
                                value={formData.month}
                                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                                className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2.5 text-white focus:border-cyan-500 outline-none"
                            >
                                {months.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Target Amount *</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={formData.targetAmount}
                                onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                                className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2.5 text-white focus:border-cyan-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Achieved Amount is auto-calculated and not editable */}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? "Saving..." : <><FaSave /> Save Target</>}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddTargetModal;
