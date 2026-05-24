import React, { useState, useEffect } from "react";
import { FaTimes, FaSave } from "react-icons/fa";
import { toast } from "react-toastify";
import CustomMultiSelect from "../common/CustomMultiSelect";

const AddComparisonTargetModal = ({ target, onClose, onSuccess, centres, sessions }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        centre: "",
        financialYear: "2025-2026",
        year: 2025,
        month: "April",
        targetAmount: "",
        achievedAmount: ""
    });
    const [selectedCentres, setSelectedCentres] = useState([]);

    // Populate default financial year and year
    useEffect(() => {
        if (!target && sessions && sessions.length > 0) {
            // Find "2025-2026" as default for comparison inputs
            const defaultFY = "2025-2026";
            const foundSession = sessions.find(s => s.sessionName === defaultFY);
            
            setFormData(prev => ({
                ...prev,
                financialYear: foundSession ? foundSession.sessionName : sessions[0].sessionName,
                year: 2025 // Default start year for FY 2025-2026
            }));
        }
    }, [sessions, target]);

    // Populate edit data
    useEffect(() => {
        if (target) {
            setFormData({
                centre: target.centre?._id || target.centre,
                financialYear: target.financialYear,
                year: target.year,
                month: target.month,
                targetAmount: target.target2526 || target.targetAmount || 0,
                achievedAmount: target.achieved2526 !== undefined ? target.achieved2526 : (target.achievedAmount || 0)
            });
            const centreObj = target.centre || {};
            setSelectedCentres([{ value: centreObj._id || target.centre, label: centreObj.centreName || "Selected Centre" }]);
        }
    }, [target]);

    const handleCentreChange = (selectedOptions) => {
        const selected = selectedOptions || [];
        setSelectedCentres(selected);
        if (target) {
            setFormData({ ...formData, centre: selected.length > 0 ? selected[0].value : "" });
        } else {
            setFormData({ ...formData, centre: selected.map(o => o.value) });
        }
    };

    // Auto-update calendar year when month or financial year changes
    useEffect(() => {
        if (!target && formData.financialYear) {
            const parts = formData.financialYear.split('-');
            if (parts.length === 2) {
                const startYear = parseInt(parts[0], 10);
                const endYear = parseInt(parts[1], 10);
                const firstHalfMonths = ["April", "May", "June", "July", "August", "September", "October", "November", "December"];
                
                setFormData(prev => ({
                    ...prev,
                    year: firstHalfMonths.includes(prev.month) ? startYear : endYear
                }));
            }
        }
    }, [formData.month, formData.financialYear, target]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const isEdit = !!target;
            const targetId = target ? (target.targetId2526 || target._id) : null;
            
            const url = isEdit && targetId
                ? `${import.meta.env.VITE_API_URL}/sales/centre-target/${targetId}`
                : `${import.meta.env.VITE_API_URL}/sales/centre-target`;

            const method = isEdit && targetId ? "PUT" : "POST";

            const payload = {
                ...formData,
                targetAmount: Number(formData.targetAmount) || 0,
                achievedAmount: Number(formData.achievedAmount) || 0
            };

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(isEdit ? "Comparison data updated" : "Comparison data created");
                onSuccess();
            } else {
                toast.error(data.message || "Operation failed");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error saving comparison target");
        } finally {
            setLoading(false);
        }
    };

    const baseMonthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-[#1a1f24] w-full max-w-lg rounded-xl border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] overflow-hidden">
                <div className="bg-[#131619] px-6 py-4 border-b border-gray-800 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">
                        {target ? "Edit Target & Achievement" : "Add Target & Achievement"}
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
                            isMulti={!target}
                            required={selectedCentres.length === 0}
                            menuPortalTarget={document.body}
                            menuPosition="fixed"
                        />
                    </div>

                    {/* Financial Year & Year */}
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
                                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value, 10) || 0 })}
                                className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2.5 text-white focus:border-cyan-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Month & Target Amount */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Month *</label>
                            <select
                                required
                                value={formData.month}
                                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                                className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2.5 text-white focus:border-cyan-500 outline-none"
                            >
                                {baseMonthNames.map(m => <option key={m} value={m}>{m}</option>)}
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

                    {/* Achievement Amount */}
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Achievement Amount *</label>
                        <input
                            type="number"
                            required
                            min="0"
                            placeholder="Type achievement amount..."
                            value={formData.achievedAmount}
                            onChange={(e) => setFormData({ ...formData, achievedAmount: e.target.value })}
                            className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2.5 text-white focus:border-cyan-500 outline-none"
                        />
                    </div>

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

export default AddComparisonTargetModal;
