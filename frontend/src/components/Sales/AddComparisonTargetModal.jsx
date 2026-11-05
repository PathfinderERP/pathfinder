import React, { useState, useEffect } from "react";
import { FaTimes, FaSave } from "react-icons/fa";
import { toast } from "react-toastify";
import CustomMultiSelect from "../common/CustomMultiSelect";

const AddComparisonTargetModal = ({ target, onClose, onSuccess, centres, sessions }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        centre: "",
        financialYear: "2026-2027",
        year: 2026,
        month: "April",
        targetAmount: "",
        achievedAmount: ""
    });
    const [selectedCentres, setSelectedCentres] = useState([]);

    // Helper to extract values for a given financial year from the comparison target object
    const getValuesForFY = (fy, targetObj) => {
        if (!targetObj) return { targetAmount: "", achievedAmount: "", year: null };
        if (fy === "2026-2027") {
            return {
                targetAmount: targetObj.target2627 !== undefined ? targetObj.target2627 : (targetObj.targetAmount !== undefined ? targetObj.targetAmount : ""),
                achievedAmount: targetObj.achieved2627 !== undefined ? targetObj.achieved2627 : (targetObj.achievedAmount !== undefined ? targetObj.achievedAmount : ""),
                year: targetObj.year2627 !== undefined ? targetObj.year2627 : null
            };
        } else if (fy === "2025-2026") {
            return {
                targetAmount: targetObj.target2526 !== undefined ? targetObj.target2526 : (targetObj.targetAmount !== undefined ? targetObj.targetAmount : ""),
                achievedAmount: targetObj.achieved2526 !== undefined ? targetObj.achieved2526 : (targetObj.achievedAmount !== undefined ? targetObj.achievedAmount : ""),
                year: targetObj.year2526 !== undefined ? targetObj.year2526 : null
            };
        } else {
            return {
                targetAmount: targetObj.targetAmount !== undefined ? targetObj.targetAmount : "",
                achievedAmount: targetObj.achievedAmount !== undefined ? targetObj.achievedAmount : "",
                year: targetObj.year !== undefined ? targetObj.year : null
            };
        }
    };

    // Helper to get values for a specific month and financial year (supports multi-month aggregated targets)
    const getValuesForMonthAndFY = (mName, fy, targetObj) => {
        const obj = targetObj || target;
        if (!obj) return { targetAmount: "", achievedAmount: "", year: null };
        if (obj.monthlyBreakdown && obj.monthlyBreakdown.length > 0) {
            const matched = obj.monthlyBreakdown.find(m => m.month === mName);
            if (matched) {
                return getValuesForFY(fy, matched);
            }
        }
        return getValuesForFY(fy, obj);
    };

    // Calculate calendar year for FY and month
    const calculateYear = (financialYear, month, fallbackYear) => {
        if (financialYear && month) {
            const parts = financialYear.split('-');
            if (parts.length === 2) {
                const startYear = parseInt(parts[0], 10);
                const endYear = parseInt(parts[1], 10);
                const firstHalfMonths = ["April", "May", "June", "July", "August", "September", "October", "November", "December"];
                if (month === "YEARLY" || month === "Annual") return startYear;
                if (month.includes(",")) {
                    const firstMonth = month.split(',')[0].trim();
                    return firstHalfMonths.includes(firstMonth) ? startYear : endYear;
                }
                return firstHalfMonths.includes(month) ? startYear : endYear;
            }
        }
        return fallbackYear || new Date().getFullYear();
    };

    // Populate edit or create data
    useEffect(() => {
        if (!target) {
            const defaultFY = (sessions && sessions.find(s => s.sessionName === "2026-2027")) ? "2026-2027" : (sessions && sessions[0]?.sessionName) || "2026-2027";
            const initialMonth = "April";
            setFormData({
                centre: "",
                financialYear: defaultFY,
                year: calculateYear(defaultFY, initialMonth, 2026),
                month: initialMonth,
                targetAmount: "",
                achievedAmount: ""
            });
            setSelectedCentres([]);
        } else {
            const initialFY = target.initialFY || (target.targetId2627 ? "2026-2027" : (target.targetId2526 ? "2025-2026" : (target.financialYear || "2026-2027")));
            let targetMonth = "April";
            if (target.month) {
                if (target.month.includes(',')) {
                    targetMonth = target.month.split(',')[0].trim();
                } else if (target.month !== "All Months") {
                    targetMonth = target.month;
                }
            }
            const fyVals = getValuesForMonthAndFY(targetMonth, initialFY, target);
            const computedYear = fyVals.year || calculateYear(initialFY, targetMonth, 2026);

            setFormData({
                centre: target.centre?._id || target.centre,
                financialYear: initialFY,
                year: computedYear,
                month: targetMonth,
                targetAmount: fyVals.targetAmount,
                achievedAmount: fyVals.achievedAmount
            });

            const centreObj = target.centre || {};
            setSelectedCentres([{ value: centreObj._id || target.centre, label: centreObj.centreName || "Selected Centre" }]);
        }
    }, [target, sessions]);

    const handleFinancialYearChange = (newFY) => {
        const fyVals = getValuesForMonthAndFY(formData.month, newFY, target);
        const computedYear = fyVals.year || calculateYear(newFY, formData.month, formData.year);
        setFormData(prev => ({
            ...prev,
            financialYear: newFY,
            year: computedYear,
            targetAmount: fyVals.targetAmount,
            achievedAmount: fyVals.achievedAmount
        }));
    };

    const handleCentreChange = (selectedOptions) => {
        const selected = selectedOptions || [];
        setSelectedCentres(selected);
        if (target) {
            setFormData(prev => ({ ...prev, centre: selected.length > 0 ? selected[0].value : "" }));
        } else {
            setFormData(prev => ({ ...prev, centre: selected.map(o => o.value) }));
        }
    };

    const handleMonthChange = (newMonth) => {
        const computedYear = calculateYear(formData.financialYear, newMonth, formData.year);
        const fyVals = getValuesForMonthAndFY(newMonth, formData.financialYear, target);
        setFormData(prev => ({
            ...prev,
            month: newMonth,
            year: computedYear,
            targetAmount: fyVals.targetAmount !== undefined && fyVals.targetAmount !== "" ? fyVals.targetAmount : prev.targetAmount,
            achievedAmount: fyVals.achievedAmount !== undefined && fyVals.achievedAmount !== "" ? fyVals.achievedAmount : prev.achievedAmount
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const isEdit = !!target;

            // Determine targetId if this row already has a record for the selected FY and Month
            let targetId = null;
            if (target) {
                let rec = target;
                if (target.monthlyBreakdown && target.monthlyBreakdown.length > 0) {
                    const found = target.monthlyBreakdown.find(m => m.month === formData.month);
                    if (found) rec = found;
                }
                if (formData.financialYear === "2026-2027" && rec.targetId2627) {
                    targetId = rec.targetId2627;
                } else if (formData.financialYear === "2025-2026" && rec.targetId2526) {
                    targetId = rec.targetId2526;
                } else if (rec._id && !rec.targetId2526 && !rec.targetId2627) {
                    targetId = rec._id;
                }
            }

            const centreId = typeof formData.centre === 'string' ? formData.centre : (formData.centre?._id || selectedCentres[0]?.value);

            let url = "";
            let method = "POST";

            if (targetId) {
                // Direct update of existing target
                url = `${import.meta.env.VITE_API_URL}/sales/centre-target/${targetId}`;
                method = "PUT";
            } else if (centreId && formData.month) {
                // Upsert via virt_ endpoint (finds or creates for this centre, financialYear, month)
                url = `${import.meta.env.VITE_API_URL}/sales/centre-target/virt_${centreId}`;
                method = "PUT";
            } else {
                url = `${import.meta.env.VITE_API_URL}/sales/centre-target`;
                method = "POST";
            }

            const payload = {
                ...formData,
                centre: centreId,
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
                toast.success(isEdit ? "Target successfully updated" : "Target successfully created");
                onSuccess();
            } else {
                toast.error(data.message || "Operation failed");
            }
        } catch (error) {
            console.error("Save Target Error:", error);
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
                    <div>
                        <h3 className="text-xl font-bold text-white">
                            {target ? `Edit Target: ${target.centre?.centreName || 'Centre'}` : "Add Target & Achievement"}
                        </h3>
                        {target && (
                            <p className="text-xs text-cyan-400 font-medium mt-0.5">
                                Month: {formData.month} | Active FY: {formData.financialYear}
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <FaTimes size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Quick Financial Year Switcher when editing */}
                    {target && (
                        <div className="space-y-1">
                            <label className="block text-gray-400 text-xs font-semibold">Select Year to Edit:</label>
                            <div className="flex items-center gap-2 p-1 bg-black/40 rounded-lg border border-gray-800">
                                <button
                                    type="button"
                                    onClick={() => handleFinancialYearChange("2026-2027")}
                                    className={`flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all ${
                                        formData.financialYear === "2026-2027"
                                            ? "bg-yellow-500 text-black shadow-md font-black"
                                            : "text-gray-400 hover:text-white"
                                    }`}
                                >
                                    FY 2026-2027 {(() => {
                                        const v = getValuesForMonthAndFY(formData.month, "2026-2027", target);
                                        return (v.targetAmount !== "" && v.targetAmount !== undefined && v.targetAmount !== null)
                                            ? `(₹${Number(v.targetAmount).toLocaleString()})`
                                            : "";
                                    })()}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleFinancialYearChange("2025-2026")}
                                    className={`flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all ${
                                        formData.financialYear === "2025-2026"
                                            ? "bg-blue-600 text-white shadow-md font-black"
                                            : "text-gray-400 hover:text-white"
                                    }`}
                                >
                                    FY 2025-2026 {(() => {
                                        const v = getValuesForMonthAndFY(formData.month, "2025-2026", target);
                                        return (v.targetAmount !== "" && v.targetAmount !== undefined && v.targetAmount !== null)
                                            ? `(₹${Number(v.targetAmount).toLocaleString()})`
                                            : "";
                                    })()}
                                </button>
                            </div>
                        </div>
                    )}

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
                                onChange={(e) => handleFinancialYearChange(e.target.value)}
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
                            <label className="block text-gray-400 text-sm mb-1">Calendar Year</label>
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
                                onChange={(e) => handleMonthChange(e.target.value)}
                                className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2.5 text-white focus:border-cyan-500 outline-none"
                            >
                                {baseMonthNames.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Target Amount (₹) *</label>
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
                        <label className="block text-gray-400 text-sm mb-1">Achievement Amount (₹) *</label>
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
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 mt-4 transition-colors"
                    >
                        {loading ? "Saving..." : <><FaSave /> Save Target</>}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddComparisonTargetModal;
