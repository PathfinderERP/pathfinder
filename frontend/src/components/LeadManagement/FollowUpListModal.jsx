import React, { useState, useEffect } from "react";
import { FaTimes, FaCalendarAlt, FaUser, FaBuilding, FaPhone, FaHistory, FaSearch, FaDownload } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const FollowUpListModal = ({ onClose, onShowHistory }) => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        centre: "",
        telecaller: "",
        date: ""
    });

    // Filter options data
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
            // Centres
            const centreRes = await fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers: { Authorization: `Bearer ${token}` } });
            if (centreRes.ok) setCentres(await centreRes.json());

            // Telecallers
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
                toast.error(data.message || "Failed to fetch follow-ups");
            }
        } catch (error) {
            console.error("Error fetching follow-ups:", error);
            toast.error("Error fetching follow-ups");
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setPage(1); // Reset to first page on filter change
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
        saveAs(data, "FollowUp_Leads.xlsx");
    };

    // Helper to get the relevant follow-up info to display
    const getLastFollowUpInfo = (lead) => {
        // If the new root field exists, use it for the date
        if (lead.nextFollowUpDate) {
             // Find the latest follow-up entry for 'updatedBy' and 'remarks'
             // Assuming the last one in the array is the latest.
             const lastEntry = (lead.followUps && lead.followUps.length > 0) 
                 ? lead.followUps[lead.followUps.length - 1] 
                 : {};
             
             return {
                 nextFollowUpDate: lead.nextFollowUpDate,
                 updatedBy: lastEntry.updatedBy, // specific to this follow-up
                 remarks: lastEntry.remarks
             };
        }

        // Fallback for older data
        if (lead.followUps && lead.followUps.length > 0) {
            return lead.followUps[lead.followUps.length - 1];
        }
        return null;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1a1f24] w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col border border-gray-800 animate-fadeIn">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-[#131619] rounded-t-2xl">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-3">
                        <FaHistory className="text-cyan-400" />
                        Follow-Up List
                    </h2>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-red-500/20 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Filters & Actions */}
                <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#1a1f24]">
                    <div className="relative group">
                         <FaBuilding className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                         <select
                            name="centre"
                            value={filters.centre}
                            onChange={handleFilterChange}
                            className="w-full bg-[#131619] border border-gray-700 text-gray-200 rounded-xl px-10 py-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all appearance-none cursor-pointer"
                        >
                            <option value="">All Centres</option>
                            {centres.map(c => <option key={c._id} value={c._id}>{c.centreName}</option>)}
                        </select>
                    </div>

                    <div className="relative group">
                        <FaUser className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                        <select
                            name="telecaller"
                            value={filters.telecaller}
                            onChange={handleFilterChange}
                            className="w-full bg-[#131619] border border-gray-700 text-gray-200 rounded-xl px-10 py-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all appearance-none cursor-pointer"
                        >
                            <option value="">All Telecallers</option>
                            {telecallers.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
                        </select>
                    </div>

                    <div className="relative group">
                        <FaCalendarAlt className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                        <input
                            type="date"
                            name="date"
                            value={filters.date}
                            onChange={handleFilterChange}
                            className="w-full bg-[#131619] border border-gray-700 text-gray-200 rounded-xl px-10 py-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                        />
                    </div>

                    <div className="flex gap-2">
                        <button 
                            onClick={clearFilters}
                            className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-medium transition-all border border-gray-700"
                        >
                            Clear
                        </button>
                        <button 
                            onClick={handleExport}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            <FaDownload size={14} /> Export
                        </button>
                    </div>
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-auto p-4 md:p-6">
                    <div className="overflow-x-auto rounded-xl border border-gray-800">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead className="bg-[#131619] text-gray-400 text-sm uppercase tracking-wider sticky top-0 z-10 transition-all">
                                <tr>
                                    <th className="px-6 py-4 font-semibold border-b border-gray-800 whitespace-nowrap">Student Name</th>
                                    <th className="px-6 py-4 font-semibold border-b border-gray-800 whitespace-nowrap">Mobile Number</th>
                                    <th className="px-6 py-4 font-semibold border-b border-gray-800 whitespace-nowrap">Centre</th>
                                    <th className="px-6 py-4 font-semibold border-b border-gray-800 whitespace-nowrap">Telecaller</th>
                                    <th className="px-6 py-4 font-semibold border-b border-gray-800 whitespace-nowrap">Next Follow Up</th>
                                    <th className="px-6 py-4 font-semibold border-b border-gray-800 text-right whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800 bg-[#1a1f24]">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-cyan-400 bg-[#1a1f24]">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                                                Loading list...
                                            </div>
                                        </td>
                                    </tr>
                                ) : leads.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500 bg-[#1a1f24]">
                                            No follow-ups found.
                                        </td>
                                    </tr>
                                ) : (
                                    leads.map((lead) => {
                                        const lastInfo = getLastFollowUpInfo(lead);
                                        return (
                                            <tr key={lead._id} className="hover:bg-[#131619] transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-white">{lead.name}</div>
                                                    <div className="text-xs text-gray-500">{lead.email}</div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-300 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <FaPhone size={12} className="text-gray-500" />
                                                        {lead.phoneNumber || "N/A"}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-300 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <FaBuilding size={12} className="text-gray-500" />
                                                        {lead.centre?.centreName || "N/A"}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-300 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <FaUser size={12} className="text-gray-500" />
                                                        {lastInfo?.updatedBy || lead.leadResponsibility || "Unknown"}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {lastInfo?.nextFollowUpDate ? (
                                                        <div className="text-orange-400 font-medium flex items-center gap-2">
                                                            <FaCalendarAlt size={12} />
                                                            {new Date(lastInfo.nextFollowUpDate).toLocaleDateString()}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-600 italic">Not scheduled</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                                    <button
                                                        onClick={() => onShowHistory(lead)}
                                                        className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 ml-auto"
                                                    >
                                                        <FaHistory /> All Follow Up
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
                    <div className="bg-[#131619] px-6 py-4 border-t border-gray-800 flex justify-between items-center rounded-b-2xl">
                        <span className="text-gray-500 text-sm">Page {page} of {totalPages}</span>
                        <div className="flex gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="px-3 py-1 bg-gray-800 text-white rounded disabled:opacity-50 hover:bg-gray-700 border border-gray-700"
                            >
                                Previous
                            </button>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1 bg-gray-800 text-white rounded disabled:opacity-50 hover:bg-gray-700 border border-gray-700"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FollowUpListModal;
