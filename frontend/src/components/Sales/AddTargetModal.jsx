import React, { useState, useEffect } from "react";
import { FaTimes, FaSave } from "react-icons/fa";
import { toast } from "react-toastify";
import CustomMultiSelect from "../common/CustomMultiSelect";

const AddTargetModal = ({ target, viewMode, onClose, onSuccess, centres, sessions }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        centre: "", // String for single, Array for multi? Let's use a separate state for multi selection if needed, or stick to one format.
        financialYear: "2025-2026",
        year: new Date().getFullYear(),
        month: viewMode === "Yearly" ? "YEARLY" : viewMode === "Quarterly" ? "" : getCurrentMonth(),
        targetAmount: "",
        achievedAmount: "0"
    });
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedMonths, setSelectedMonths] = useState([]);

    useEffect(() => {
        if (!target && sessions && sessions.length > 0) {
            const now = new Date();
            const curMonth = now.getMonth();
            const curYear = now.getFullYear();
            const fyStart = curMonth >= 3 ? curYear : curYear - 1;
            const defaultFY = `${fyStart}-${fyStart + 1}`;

            const foundCurrent = sessions.find(s => s.sessionName === defaultFY);

            setFormData(prev => ({
                ...prev,
                financialYear: foundCurrent ? foundCurrent.sessionName : sessions[0].sessionName
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
            const centreObj = target.centre || {};
            setSelectedCentres([{ value: centreObj._id || target.centre, label: centreObj.centreName || "Selected Centre" }]);
            
            if (viewMode === "Quarterly" && target.month) {
                const parts = target.month.split(',').map(m => m.trim()).filter(Boolean);
                setSelectedMonths(parts.map(m => ({ value: m, label: m })));
            }
        }
    }, [target, viewMode]);

    const handleCentreChange = (selectedOptions) => {
        const selected = selectedOptions || [];
        setSelectedCentres(selected);
        if (target) {
            // In edit mode, usually only one is selected.
            setFormData({ ...formData, centre: selected.length > 0 ? selected[0].value : "" });
        } else {
            // In create mode, can be multiple.
            setFormData({ ...formData, centre: selected.map(o => o.value) });
        }
    };

    const handleQuarterlyMonthsChange = (selectedOptions) => {
        const selected = selectedOptions || [];
        setSelectedMonths(selected);
        setFormData({ ...formData, month: selected.map(o => o.value).join(",") });
    };

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

    const baseMonthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const months = viewMode === "Yearly" ? ["YEARLY"] : baseMonthNames;

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
                        <CustomMultiSelect
                            options={centres.map(c => ({ value: c._id, label: c.centreName }))}
                            value={selectedCentres}
                            onChange={handleCentreChange}
                            placeholder="Select Centre(s)..."
                            isMulti={!target} // Multiple only for creation
                            required={selectedCentres.length === 0}
                            menuPortalTarget={document.body}
                            menuPosition="fixed"
                        />
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
                                    sessions
                                        .filter(s => {
                                            const parts = s.sessionName.split('-');
                                            if (parts.length === 2) {
                                                const start = parseInt(parts[0]);
                                                const end = parseInt(parts[1]);
                                                return (end - start) === 1;
                                            }
                                            return true;
                                        })
                                        .map(s => (
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
                            <label className="block text-gray-400 text-sm mb-1">Month(s) *</label>
                            {viewMode === "Quarterly" ? (
                                <CustomMultiSelect
                                    options={baseMonthNames.map(m => ({ value: m, label: m }))}
                                    value={selectedMonths}
                                    onChange={handleQuarterlyMonthsChange}
                                    placeholder="Select Months..."
                                    isDisabled={!!target}
                                    menuPortalTarget={document.body}
                                    menuPosition="fixed"
                                />
                            ) : (
                                <select
                                    required
                                    value={formData.month}
                                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                                    className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2.5 text-white focus:border-cyan-500 outline-none"
                                >
                                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            )}
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
