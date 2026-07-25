import React, { useState, useEffect } from 'react';
import { FaTimes, FaPhoneAlt, FaEnvelope, FaClock, FaHistory, FaBuilding, FaUser, FaCheckCircle, FaArrowLeft, FaBookOpen, FaRupeeSign, FaLayerGroup } from 'react-icons/fa';
import LeadJourneyModal from '../LeadManagement/LeadJourneyModal';

const DailyTrackingDetailsModal = ({ isOpen, onClose, title, data = [], loading, isDarkMode, activeCenters = [] }) => {
    const [selectedSubCategory, setSelectedSubCategory] = useState(null);
    const [selectedCentreFilter, setSelectedCentreFilter] = useState(null);
    const [showJourneyModal, setShowJourneyModal] = useState(false);
    const [journeyLeadIdOrPhone, setJourneyLeadIdOrPhone] = useState(null);

    // Reset filters when modal opens/closes or title changes
    useEffect(() => {
        setSelectedSubCategory(null);
        setSelectedCentreFilter(null);
    }, [isOpen, title]);

    const handleViewJourney = (idOrPhone) => {
        setJourneyLeadIdOrPhone(idOrPhone);
        setShowJourneyModal(true);
    };

    const getJourneyIdentifier = (item) => {
        if (item.phone && item.phone !== 'N/A' && item.phone !== '-') return item.phone;
        const isValidObjectId = (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
        if (isValidObjectId(item.id)) return item.id;
        return null;
    };

    if (!isOpen) return null;

    const isCollectionType = title && title.toLowerCase().includes("collection");

    const safeData = Array.isArray(data) ? data : [];
    const admissionTotal = safeData.filter(item => item.isAdmission).reduce((sum, item) => sum + (item.amount || 0), 0);
    const installmentTotal = safeData.filter(item => !item.isAdmission).reduce((sum, item) => sum + (item.amount || 0), 0);

    // Build Centre-wise Collection Breakdown List
    const centerCollectionMap = {};
    if (Array.isArray(activeCenters) && activeCenters.length > 0) {
        activeCenters.forEach(c => {
            const cName = c.name || c.centreName || "N/A";
            centerCollectionMap[cName] = {
                centreName: cName,
                admission: safeData.length === 0 ? (c.collectionsAdmissionVal || 0) : 0,
                installment: safeData.length === 0 ? (c.collectionsInstallmentVal || 0) : 0,
                total: safeData.length === 0 ? (c.collectionsVal || 0) : 0,
                paymentCount: 0
            };
        });
    }

    if (safeData.length > 0) {
        safeData.forEach(item => {
            const cName = item.centreName || "N/A";
            if (!centerCollectionMap[cName]) {
                centerCollectionMap[cName] = {
                    centreName: cName,
                    admission: 0,
                    installment: 0,
                    total: 0,
                    paymentCount: 0
                };
            }
            const amt = item.amount || 0;
            if (item.isAdmission) {
                centerCollectionMap[cName].admission += amt;
            } else {
                centerCollectionMap[cName].installment += amt;
            }
            centerCollectionMap[cName].total += amt;
            centerCollectionMap[cName].paymentCount += 1;
        });
    }

    const centerCollectionList = Object.values(centerCollectionMap).sort((a, b) => b.total - a.total);

    // Filter student payment list based on selected sub-category and selected centre
    let filteredList = safeData;
    if (isCollectionType) {
        if (selectedSubCategory) {
            filteredList = filteredList.filter(item => selectedSubCategory === "admission" ? item.isAdmission : !item.isAdmission);
        }
        if (selectedCentreFilter) {
            filteredList = filteredList.filter(item => (item.centreName || "").trim().toLowerCase() === selectedCentreFilter.trim().toLowerCase());
        }
    }

    const getTagStyles = (tag) => {
        if (tag?.startsWith('₹')) {
            return {
                bg: isDarkMode ? 'bg-cyan-500/10' : 'bg-cyan-50',
                text: 'text-cyan-400 dark:text-cyan-400 font-extrabold',
                border: 'border-cyan-500/20'
            };
        }
        
        switch (tag?.toUpperCase()) {
            case 'HOT LEAD':
            case 'HOT':
                return { bg: isDarkMode ? 'bg-red-500/10' : 'bg-red-50', text: 'text-red-500', border: 'border-red-500/20' };
            case 'WARM LEAD':
            case 'WARM':
                return { bg: isDarkMode ? 'bg-orange-500/10' : 'bg-orange-50', text: 'text-orange-500', border: 'border-orange-500/20' };
            case 'NEUTRAL LEAD':
            case 'NEUTRAL':
                return { bg: isDarkMode ? 'bg-purple-500/10' : 'bg-purple-50', text: 'text-purple-500', border: 'border-purple-500/20' };
            case 'COLD LEAD':
            case 'COLD':
                return { bg: isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50', text: 'text-blue-500', border: 'border-blue-500/20' };
            case 'INVALID LEAD':
            case 'INVALID':
                return { bg: isDarkMode ? 'bg-gray-500/10' : 'bg-gray-50', text: 'text-gray-400', border: 'border-gray-500/20' };
            case 'NORMAL ADM':
            case 'BOARD ADM':
                return { bg: isDarkMode ? 'bg-purple-500/10' : 'bg-purple-50', text: 'text-purple-500', border: 'border-purple-500/20' };
            case 'WALK-IN':
                return { bg: isDarkMode ? 'bg-indigo-500/10' : 'bg-indigo-50', text: 'text-indigo-500', border: 'border-indigo-500/20' };
            default:
                return { bg: isDarkMode ? 'bg-gray-500/10' : 'bg-gray-50', text: isDarkMode ? 'text-gray-300' : 'text-gray-600', border: 'border-gray-500/20' };
        }
    };

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md transition-all ${isDarkMode ? 'bg-black/70' : 'bg-white/60'}`}>
            <div className={`w-full max-w-5xl h-[88vh] flex flex-col rounded-[2px] border shadow-2xl scale-in ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                {/* Header */}
                <div className={`px-6 py-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                        {(selectedSubCategory || selectedCentreFilter) && (
                            <button
                                onClick={() => {
                                    setSelectedSubCategory(null);
                                    setSelectedCentreFilter(null);
                                }}
                                className={`mr-2 p-2 rounded-lg transition-all ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                title="Reset all filters"
                            >
                                <FaArrowLeft size={16} />
                            </button>
                        )}
                        <div>
                            <h2 className={`text-xl font-black italic uppercase tracking-tighter flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                <div className="w-2 h-8 bg-cyan-500 rounded-full animate-pulse"></div>
                                {isCollectionType
                                    ? (selectedSubCategory
                                        ? selectedSubCategory === "admission" ? "Admission Fee Collections" : "Installment Collections"
                                        : "Total Collection Analysis")
                                    : title
                                }
                            </h2>
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-1">
                                {isCollectionType
                                    ? `Showing collection breakdown across ${centerCollectionList.length} centres`
                                    : "Detailed breakdown of recorded activities"
                                }
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-[2px] transition-all hover:rotate-90 ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                    {loading ? (
                        <div className="py-20 text-center flex flex-col items-center justify-center">
                            <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading activities...</p>
                        </div>
                    ) : isCollectionType ? (
                        <>
                            {/* Top Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div
                                    onClick={() => {
                                        setSelectedSubCategory(null);
                                        setSelectedCentreFilter(null);
                                    }}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                        !selectedSubCategory && !selectedCentreFilter
                                            ? 'bg-cyan-500/10 border-cyan-500/50 shadow-lg'
                                            : isDarkMode ? 'bg-[#131619] border-gray-800 hover:border-gray-700' : 'bg-gray-50 border-gray-200'
                                    }`}
                                >
                                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Collection</p>
                                    <div className="text-2xl font-black text-cyan-400 mt-1">₹{(admissionTotal + installmentTotal).toLocaleString()}</div>
                                    <p className="text-[9px] font-bold text-gray-500 mt-1">{safeData.length} Payments Recorded</p>
                                </div>

                                <div
                                    onClick={() => setSelectedSubCategory(selectedSubCategory === "admission" ? null : "admission")}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                        selectedSubCategory === "admission"
                                            ? 'bg-cyan-500/20 border-cyan-400 shadow-lg'
                                            : isDarkMode ? 'bg-[#131619] border-gray-800 hover:border-gray-700' : 'bg-gray-50 border-gray-200'
                                    }`}
                                >
                                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Admission Collection</p>
                                    <div className="text-2xl font-black text-cyan-400 mt-1">₹{admissionTotal.toLocaleString()}</div>
                                    <p className="text-[9px] font-bold text-gray-500 mt-1">Click to filter admission fee</p>
                                </div>

                                <div
                                    onClick={() => setSelectedSubCategory(selectedSubCategory === "installment" ? null : "installment")}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                        selectedSubCategory === "installment"
                                            ? 'bg-emerald-500/20 border-emerald-400 shadow-lg'
                                            : isDarkMode ? 'bg-[#131619] border-gray-800 hover:border-gray-700' : 'bg-gray-50 border-gray-200'
                                    }`}
                                >
                                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Installment Collection</p>
                                    <div className="text-2xl font-black text-emerald-400 mt-1">₹{installmentTotal.toLocaleString()}</div>
                                    <p className="text-[9px] font-bold text-gray-500 mt-1">Click to filter recurring fee</p>
                                </div>
                            </div>

                            {/* Centre-Wise Collection Breakdown Section */}
                            <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                                    <div>
                                        <h3 className={`text-base font-black italic uppercase tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                            <FaBuilding className="text-cyan-500" />
                                            Centre-Wise Collection Breakdown ({centerCollectionList.length} Centres)
                                        </h3>
                                        <p className="text-[10px] font-semibold text-gray-400">Centers in active zone/filter and their collection amounts</p>
                                    </div>
                                    {selectedCentreFilter && (
                                        <button
                                            onClick={() => setSelectedCentreFilter(null)}
                                            className="px-3 py-1 rounded text-xs font-bold bg-cyan-500 text-black hover:bg-cyan-400 transition-all flex items-center gap-1"
                                        >
                                            Showing: {selectedCentreFilter} <FaTimes size={10} />
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {centerCollectionList.map((c, i) => {
                                        const isSelected = selectedCentreFilter && selectedCentreFilter.trim().toLowerCase() === c.centreName.trim().toLowerCase();
                                        return (
                                            <div
                                                key={i}
                                                onClick={() => setSelectedCentreFilter(isSelected ? null : c.centreName)}
                                                className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                                                    isSelected
                                                        ? 'border-cyan-400 bg-cyan-500/10 shadow-md ring-1 ring-cyan-400'
                                                        : isDarkMode ? 'bg-[#1a1f24] border-gray-800 hover:border-cyan-500/30' : 'bg-white border-gray-200 hover:border-cyan-300 shadow-sm'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-bold text-sm uppercase text-cyan-400 truncate pr-2">{c.centreName}</h4>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold ${c.total > 0 ? 'bg-cyan-500/20 text-cyan-300' : 'bg-gray-800 text-gray-500'}`}>
                                                        ₹{c.total.toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="mt-2 text-[11px] space-y-1 text-gray-400">
                                                    <div className="flex justify-between">
                                                        <span>Admission:</span>
                                                        <span className="font-semibold text-gray-300">₹{c.admission.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Installment:</span>
                                                        <span className="font-semibold text-gray-300">₹{c.installment.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                <div className="mt-2 pt-2 border-t border-gray-800/50 flex justify-between items-center text-[10px] font-bold text-cyan-500">
                                                    <span>{c.paymentCount} payments</span>
                                                    <span>{isSelected ? 'Selected ✓' : 'Click to filter →'}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Detailed Student Payment Cards */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center px-1">
                                    <h4 className={`text-sm font-black uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Student Payment Details ({filteredList.length})
                                    </h4>
                                    {(selectedSubCategory || selectedCentreFilter) && (
                                        <button
                                            onClick={() => {
                                                setSelectedSubCategory(null);
                                                setSelectedCentreFilter(null);
                                            }}
                                            className="text-xs font-bold text-cyan-400 hover:underline"
                                        >
                                            Reset Filters
                                        </button>
                                    )}
                                </div>

                                {filteredList.length === 0 ? (
                                    <div className="py-10 text-center border rounded-lg border-gray-800">
                                        <FaHistory className={`mx-auto mb-2 text-2xl ${isDarkMode ? 'text-gray-700' : 'text-gray-300'}`} />
                                        <p className="text-xs font-bold text-gray-500">No payment records match active selection</p>
                                    </div>
                                ) : (
                                    filteredList.map((item, index) => {
                                        const styles = getTagStyles(item.tag);
                                        return (
                                            <div key={index} className={`group p-4 rounded-lg border transition-all hover:scale-[1.005] ${isDarkMode ? 'bg-[#131619] border-gray-800 hover:border-cyan-500/30' : 'bg-white border-gray-100 hover:shadow-lg'}`}>
                                                <div className="flex flex-col lg:flex-row justify-between gap-4">
                                                    <div className="flex-1 space-y-2">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`px-3 py-0.5 rounded text-[10px] font-black uppercase border ${styles.bg} ${styles.text} ${styles.border} flex items-center gap-1.5`}>
                                                                <FaCheckCircle size={10} />
                                                                {item.tag || 'UNCATEGORIZED'}
                                                            </span>
                                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                                <FaClock className="inline mr-1" />
                                                                {new Date(item.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(item.dateTime).toLocaleDateString()}
                                                            </span>
                                                        </div>

                                                        <h3 className={`text-base font-black italic uppercase ${isDarkMode ? 'text-white group-hover:text-cyan-400' : 'text-gray-900'}`}>
                                                            {item.name}
                                                        </h3>

                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-gray-400 font-semibold">
                                                            <div className="flex items-center gap-1.5"><FaPhoneAlt className="text-cyan-500 shrink-0" />{item.phone || 'N/A'}</div>
                                                            <div className="flex items-center gap-1.5 truncate"><FaEnvelope className="text-cyan-500 shrink-0" /><span className="truncate">{item.email || 'N/A'}</span></div>
                                                            <div className="flex items-center gap-1.5"><FaBuilding className="text-cyan-500 shrink-0" /><span className="font-bold text-cyan-400">{item.centreName || 'N/A'}</span></div>
                                                        </div>

                                                        {item.course && item.course !== "N/A" && (
                                                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-400">
                                                                <FaBookOpen className="shrink-0" />
                                                                <span>Course: {item.course}</span>
                                                            </div>
                                                        )}

                                                        <div className={`p-3 rounded border-l-2 border-cyan-500 text-xs ${isDarkMode ? 'bg-[#0a0a0b] text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
                                                            <p className="text-[9px] font-black uppercase text-gray-500 mb-0.5">Payment Details / Remarks</p>
                                                            {item.feedback}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col justify-between items-end gap-3 min-w-[140px]">
                                                        <div className="text-right">
                                                            <p className="text-[9px] font-black uppercase text-gray-500 mb-0.5">Handled By</p>
                                                            <p className="text-xs font-bold text-cyan-500 uppercase flex items-center gap-1 justify-end">
                                                                <FaUser size={10} /> {item.handledBy}
                                                            </p>
                                                        </div>
                                                        {getJourneyIdentifier(item) && (
                                                            <button
                                                                onClick={() => handleViewJourney(getJourneyIdentifier(item))}
                                                                className="bg-purple-500 hover:bg-purple-400 text-white px-3 py-1 rounded text-[9px] font-black uppercase tracking-wider shadow-md active:scale-95 transition-all"
                                                            >
                                                                Journey
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    ) : filteredList.length === 0 ? (
                        <div className="py-20 text-center">
                            <FaHistory className={`mx-auto mb-4 text-4xl ${isDarkMode ? 'text-gray-800' : 'text-gray-200'}`} />
                            <p className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>No activities found for this category</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredList.map((item, index) => {
                                const styles = getTagStyles(item.tag);
                                return (
                                    <div key={index} className={`group p-5 rounded-[2px] border transition-all hover:scale-[1.01] ${isDarkMode ? 'bg-[#131619] border-gray-800 hover:border-cyan-500/30' : 'bg-white border-gray-100 hover:shadow-lg'}`}>
                                        <div className="flex flex-col lg:flex-row justify-between gap-4">
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-3 py-1 rounded-[2px] text-[9px] font-black uppercase tracking-widest border ${styles.bg} ${styles.text} ${styles.border} flex items-center gap-2`}>
                                                        <FaCheckCircle size={10} />
                                                        {item.tag || 'UNCATEGORIZED'}
                                                    </span>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                                                        <FaClock className="inline mr-1" />
                                                        {new Date(item.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} - {new Date(item.dateTime).toLocaleDateString()}
                                                    </span>
                                                </div>

                                                <h3 className={`text-lg font-black italic tracking-tight uppercase ${isDarkMode ? 'text-white group-hover:text-cyan-400' : 'text-gray-900'}`}>
                                                    {item.name}
                                                </h3>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                                                        <FaPhoneAlt className="text-cyan-500 shrink-0" />
                                                        {item.phone || 'N/A'}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 truncate">
                                                        <FaEnvelope className="text-cyan-500 shrink-0" />
                                                        <span className="truncate">{item.email || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                                                        <FaBuilding className="text-cyan-500 shrink-0" />
                                                        {item.centreName || 'N/A'}
                                                    </div>
                                                </div>

                                                {item.course && item.course !== "N/A" && (
                                                    <div className="flex items-center gap-2 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 mt-1">
                                                        <FaBookOpen className="shrink-0" />
                                                        <span>Course: {item.course}</span>
                                                    </div>
                                                )}

                                                <div className={`p-4 rounded-[2px] border-l-2 border-cyan-500 ${isDarkMode ? 'bg-[#0a0a0b]' : 'bg-gray-50'}`}>
                                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Description / Remarks</p>
                                                    <p className={`text-xs font-medium leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.feedback}</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col justify-between items-end gap-4 min-w-[150px]">
                                                <div className="text-right">
                                                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>Handled By</p>
                                                    <p className="text-[11px] font-black text-cyan-500 uppercase tracking-widest flex items-center gap-1.5 justify-end">
                                                        <FaUser size={10} className="inline" />
                                                        {item.handledBy}
                                                    </p>
                                                </div>
                                                {getJourneyIdentifier(item) && (
                                                    <button
                                                        onClick={() => handleViewJourney(getJourneyIdentifier(item))}
                                                        className="bg-purple-500 hover:bg-purple-400 text-white px-2.5 py-1 rounded-[2px] text-[8px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/20 active:scale-95 transition-all whitespace-nowrap"
                                                    >
                                                        Journey
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`px-6 py-4 border-t flex justify-between items-center ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Total Entries: {filteredList.length}
                    </p>
                    <button
                        onClick={onClose}
                        className={`px-8 py-2.5 rounded-[2px] text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 ${isDarkMode ? 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-200'}`}
                    >
                        Close Portal
                    </button>
                </div>
            </div>

            {showJourneyModal && (
                <LeadJourneyModal
                    leadId={journeyLeadIdOrPhone}
                    onClose={() => {
                        setShowJourneyModal(false);
                        setJourneyLeadIdOrPhone(null);
                    }}
                    isDarkMode={isDarkMode}
                />
            )}

            <style>{`
                @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .scale-in { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#333' : '#d1d5db'}; border-radius: 4px; }
            `}</style>
        </div>
    );
};

export default DailyTrackingDetailsModal;
