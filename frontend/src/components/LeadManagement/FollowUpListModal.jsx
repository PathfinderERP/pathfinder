import React, { useState, useEffect } from "react";
import { FaTimes, FaCalendarAlt, FaUser, FaBuilding, FaPhone, FaHistory, FaSearch, FaDownload, FaSync, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const FollowUpListModal = ({ onClose, onShowHistory, isDarkMode }) => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        centre: "",
        telecaller: "",
        date: ""
    });

    const [centres, setCentres] = useState([]);
    const [telecallers, setTelecallers] = useState([]);

    useEffect(() => {
        fetchFilterData();
    }, []);

    useEffect(() => {
        fetchFollowUpLeads();
    }, [page, filters]);

    const fetchFilterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const centreRes = await fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers: { Authorization: `Bearer ${token}` } });
            if (centreRes.ok) setCentres(await centreRes.json());

            const userRes = await fetch(`${import.meta.env.VITE_API_URL}/superAdmin/getAllUsers`, { headers: { Authorization: `Bearer ${token}` } });
            if (userRes.ok) {
                const data = await userRes.json();
                setTelecallers((data.users || []).filter(u => u.role === 'telecaller'));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchFollowUpLeads = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const queryParams = new URLSearchParams({
                page,
                limit: 10,
                ...(filters.centre && { centre: filters.centre }),
                ...(filters.telecaller && { telecaller: filters.telecaller }),
                ...(filters.date && { date: filters.date })
            });

            const res = await fetch(`${import.meta.env.VITE_API_URL}/leadManagement/follow-ups?${queryParams}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok) {
                setLeads(data.leads || []);
                setTotalPages(data.pagination?.totalPages || 1);
            } else {
                toast.error(data.message || "Failed to fetch follow up data");
            }
        } catch (error) {
            console.error("Error fetching follow-ups:", error);
            toast.error("An internal error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setPage(1);
    };

    const clearFilters = () => {
        setFilters({ centre: "", telecaller: "", date: "" });
        setPage(1);
    };

    const handleExport = () => {
        if (leads.length === 0) return toast.warning("No data to export");

        const dataToExport = leads.map(lead => {
            const lastInfo = getLastFollowUpInfo(lead);
            return {
                "Student Name": lead.name,
                "Mobile Number": lead.phoneNumber,
                "Email": lead.email,
                "Centre": lead.centre?.centreName || "N/A",
                "Course": lead.course?.courseName || "N/A",
                "Telecaller": lastInfo?.updatedBy || lead.leadResponsibility || "N/A",
                "Next Follow Up": lastInfo?.nextFollowUpDate ? new Date(lastInfo.nextFollowUpDate).toLocaleDateString() : "N/A",
                "Last Remark": lastInfo?.remarks || "N/A"
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "FollowUps");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
        saveAs(data, "Lead_FollowUp_Report.xlsx");
        toast.success("Report downloaded successfully");
    };

    const getLastFollowUpInfo = (lead) => {
        if (lead.nextFollowUpDate) {
            const lastEntry = (lead.followUps && lead.followUps.length > 0)
                ? lead.followUps[lead.followUps.length - 1]
                : {};

            return {
                nextFollowUpDate: lead.nextFollowUpDate,
                updatedBy: lastEntry.updatedBy,
                remarks: lastEntry.remarks
            };
        }
        if (lead.followUps && lead.followUps.length > 0) {
            return lead.followUps[lead.followUps.length - 1];
        }
        return null;
    };

    return (
        <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-md transition-all ${isDarkMode ? 'bg-black/80' : 'bg-white/70'}`}>
            <div className={`w-full max-w-6xl h-[90vh] rounded-[4px] border shadow-2xl flex flex-col transition-all overflow-hidden ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-cyan-500/10' : 'bg-white border-gray-200'}`}>

                {/* Header */}
                <div className={`flex items-center justify-between p-6 border-b transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                    <div>
                        <h2 className={`text-2xl font-black uppercase tracking-tighter italic flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <FaHistory className="text-cyan-500" />
                            Follow Up List
                        </h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1 italic">Track lead follow ups and communication history</p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-[4px] transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Filters */}
                <div className={`p-6 grid grid-cols-1 md:grid-cols-4 gap-6 border-b transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100'}`}>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-500 ml-1 tracking-widest">CENTRE</label>
                        <div className="relative group">
                            <FaBuilding className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-gray-600 group-focus-within:text-cyan-400' : 'text-gray-400 group-focus-within:text-cyan-600'}`} />
                            <select
                                name="centre"
                                value={filters.centre}
                                onChange={handleFilterChange}
                                className={`w-full pl-10 pr-4 py-3 rounded-[4px] border text-[11px] font-black uppercase tracking-widest focus:outline-none transition-all appearance-none cursor-pointer ${isDarkMode ? 'bg-[#0f1215] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                            >
                                <option value="">ALL CENTRES</option>
                                {centres.map(c => <option key={c._id} value={c._id}>{c.centreName}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-500 ml-1 tracking-widest">ASSIGNED AGENT</label>
                        <div className="relative group">
                            <FaUser className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-gray-600 group-focus-within:text-cyan-400' : 'text-gray-400 group-focus-within:text-cyan-600'}`} />
                            <select
                                name="telecaller"
                                value={filters.telecaller}
                                onChange={handleFilterChange}
                                className={`w-full pl-10 pr-4 py-3 rounded-[4px] border text-[11px] font-black uppercase tracking-widest focus:outline-none transition-all appearance-none cursor-pointer ${isDarkMode ? 'bg-[#0f1215] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                            >
                                <option value="">ALL TELECALLERS</option>
                                {telecallers.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-500 ml-1 tracking-widest">FOLLOW UP DATE</label>
                        <div className="relative group">
                            <FaCalendarAlt className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-gray-600 group-focus-within:text-cyan-400' : 'text-gray-400 group-focus-within:text-cyan-600'}`} />
                            <input
                                type="date"
                                name="date"
                                value={filters.date}
                                onChange={handleFilterChange}
                                className={`w-full pl-10 pr-4 py-3 rounded-[4px] border text-[11px] font-black uppercase tracking-widest focus:outline-none transition-all ${isDarkMode ? 'bg-[#0f1215] border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 items-end pb-0.5">
                        <button
                            onClick={clearFilters}
                            className={`flex-1 py-3 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all border active:scale-95 ${isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}`}
                        >
                            CLEAR
                        </button>
                        <button
                            onClick={handleExport}
                            className={`flex-1 py-3 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg ${isDarkMode ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/10' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20'}`}
                        >
                            <FaDownload size={12} /> EXPORT
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className={`flex-1 overflow-auto p-6 custom-scrollbar ${isDarkMode ? 'bg-[#0f1215]' : 'bg-gray-50'}`}>
                    <div className={`rounded-[4px] border overflow-hidden transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-[#131619] text-gray-500 border-gray-800' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                                <tr>
                                    <th className="px-6 py-5">STUDENT NAME</th>
                                    <th className="px-6 py-5">COMMUNICATION</th>
                                    <th className="px-6 py-5">CENTRE</th>
                                    <th className="px-6 py-5">ASSIGNED AGENT</th>
                                    <th className="px-6 py-5">NEXT FOLLOW UP</th>
                                    <th className="px-6 py-5 text-right">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <FaSync className="animate-spin text-cyan-500" size={30} />
                                                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-cyan-500 animate-pulse">Loading data...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : leads.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-20 text-center">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 italic opacity-50">No follow up records found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    leads.map((lead) => {
                                        const lastInfo = getLastFollowUpInfo(lead);
                                        return (
                                            <tr key={lead._id} className={`transition-all hover:bg-cyan-500/5 group`}>
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <div className={`text-[11px] font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{lead.name}</div>
                                                    <div className="text-[9px] text-gray-500 font-bold tracking-widest mt-0.5">{lead.email}</div>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <div className={`flex items-center gap-2 text-[11px] font-mono ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        <FaPhone size={10} className="text-cyan-500/50" />
                                                        {lead.phoneNumber || "N/A"}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <div className={`flex items-center gap-2 text-[10px] font-black uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        <FaBuilding size={10} className="text-cyan-500/50" />
                                                        {lead.centre?.centreName || "N/A"}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <div className={`flex items-center gap-2 text-[10px] font-black uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        <FaUser size={10} className="text-cyan-500/50" />
                                                        {lastInfo?.updatedBy || lead.leadResponsibility || "UNASSIGNED"}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    {lastInfo?.nextFollowUpDate ? (
                                                        <div className="text-orange-500 text-[10px] font-black tracking-widest uppercase flex items-center gap-2">
                                                            <FaCalendarAlt size={10} />
                                                            {new Date(lastInfo.nextFollowUpDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[9px] text-gray-500 italic uppercase font-black opacity-30">NOT SCHEDULED</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5 text-right whitespace-nowrap">
                                                    <button
                                                        onClick={() => onShowHistory(lead)}
                                                        className={`ml-auto px-4 py-2 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg active:scale-95 ${isDarkMode ? 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-cyan-500/20' : 'bg-cyan-600 text-white hover:bg-cyan-700 shadow-cyan-500/30'}`}
                                                    >
                                                        <FaHistory size={10} /> VIEW HISTORY
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className={`px-6 py-4 border-t flex justify-between items-center transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            PAGE {page} / {totalPages}
                        </div>
                        <div className="flex gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className={`p-2 rounded-[4px] border transition-all disabled:opacity-30 active:scale-95 ${isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                            >
                                <FaChevronLeft size={10} />
                            </button>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className={`p-2 rounded-[4px] border transition-all disabled:opacity-30 active:scale-95 ${isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                            >
                                <FaChevronRight size={10} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: ${isDarkMode ? '#0f1215' : '#f3f4f6'}; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#1f2937' : '#d1d5db'}; border-radius: 4px; }
            `}</style>
        </div>
    );
};

export default FollowUpListModal;
