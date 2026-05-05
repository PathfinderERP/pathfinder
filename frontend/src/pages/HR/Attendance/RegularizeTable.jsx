import React, { useState, useEffect } from "react";
import Layout from "../../../components/Layout";
import { FaCheck, FaTimes, FaSpinner, FaHistory, FaSearch, FaUserEdit, FaPlus, FaCamera, FaMapMarkedAlt, FaExternalLinkAlt } from "react-icons/fa";
import { toast } from "react-toastify";
import { useTheme } from "../../../context/ThemeContext";

const RegularizeTable = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: "" });
    const [localFilters, setLocalFilters] = useState({ date: "", center: "", name: "", empId: "" });
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [reviewData, setReviewData] = useState({ status: "Approved", remark: "", fromTime: "", toTime: "", attendanceMode: "custom" });
    const [previewImage, setPreviewImage] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/attendance/regularizations?status=${filters.status}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setRequests(data);
            }
        } catch (error) {
            toast.error("Failed to load requests");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/attendance/regularizations/${selectedRequest._id}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: reviewData.status,
                    reviewRemark: reviewData.remark,
                    fromTime: reviewData.fromTime,
                    toTime: reviewData.toTime
                })
            });

            if (response.ok) {
                toast.success(`Request ${reviewData.status.toLowerCase()}`);
                setShowStatusModal(false);
                fetchRequests();
            }
        } catch (error) {
            toast.error("Error updating status");
        }
    };

    const handleDownloadImage = async (url, filename) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename || 'verification-image.jpg';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            toast.success("Download started");
        } catch (error) {
            toast.error("Failed to download image");
            // Fallback for cross-origin issues
            window.open(url, '_blank');
        }
    };

    return (
        <Layout activePage="HR & Manpower">
            <div className="p-6 space-y-6 animate-fade-in">
                <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl shadow-sm border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100'}`}>
                    <div>
                        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Attendance Regularization</h1>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Approve or reject employee attendance correction requests</p>
                    </div>
                </div>

                {/* Filters */}
                <div className={`flex flex-wrap gap-4 p-4 rounded-xl shadow-sm border items-center ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100'}`}>
                    <input 
                        type="date" 
                        value={localFilters.date} 
                        onChange={(e) => setLocalFilters({ ...localFilters, date: e.target.value })}
                        className={`px-4 py-2 rounded-lg text-sm outline-none border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200'}`}
                        title="Filter by Date"
                    />
                    <select
                        value={localFilters.center}
                        onChange={(e) => setLocalFilters({ ...localFilters, center: e.target.value })}
                        className={`px-4 py-2 rounded-lg text-sm outline-none min-w-[150px] border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200'}`}
                    >
                        <option value="">All Centers</option>
                        {[...new Set(requests.flatMap(r => [r.employeeId?.primaryCentre?.centreName, ...(r.employeeId?.centerArray || [])]).filter(Boolean))].map(center => (
                            <option key={center} value={center}>{center}</option>
                        ))}
                    </select>
                    <input 
                        type="text" 
                        placeholder="Search EMP ID..." 
                        value={localFilters.empId} 
                        onChange={(e) => setLocalFilters({ ...localFilters, empId: e.target.value })}
                        className={`px-4 py-2 rounded-lg text-sm outline-none min-w-[150px] flex-1 max-w-[200px] border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200'}`}
                    />
                    <input 
                        type="text" 
                        placeholder="Search Name..." 
                        value={localFilters.name} 
                        onChange={(e) => setLocalFilters({ ...localFilters, name: e.target.value })}
                        className={`px-4 py-2 rounded-lg text-sm outline-none min-w-[150px] flex-1 max-w-[200px] border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200'}`}
                    />
                    <select
                        value={filters.status}
                        onChange={(e) => { setFilters({ ...filters, status: e.target.value }); }}
                        className={`px-4 py-2 rounded-lg text-sm outline-none w-full sm:w-auto border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200'}`}
                    >
                        <option value="">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                    <button onClick={() => { setLocalFilters({ date: "", center: "", name: "", empId: "" }); setFilters({status: ""}) }} className={`px-6 py-2 rounded-lg text-sm font-bold shadow-sm whitespace-nowrap ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>Reset All</button>
                    <button onClick={fetchRequests} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm whitespace-nowrap">Refresh DB</button>
                </div>

                <div className={`rounded-2xl shadow-sm border overflow-hidden ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`border-b ${isDarkMode ? 'bg-gray-800/50 border-gray-800' : 'bg-gray-50/50 border-gray-100'}`}>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Sl No.</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Employee Name</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Date</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Type</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Timings</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Verification</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Remark</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Approve</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                {loading ? (
                                    <tr><td colSpan="10" className="px-6 py-10 text-center text-blue-600"><FaSpinner className="animate-spin mx-auto" size={30} /></td></tr>
                                ) : requests.filter(request => {
                                    const reqDate = new Date(request.date).toISOString().split('T')[0];
                                    if (localFilters.date && reqDate !== localFilters.date) return false;
                                    if (localFilters.center) {
                                        const pCenter = request.employeeId?.primaryCentre?.centreName;
                                        const cArray = request.employeeId?.centerArray || [];
                                        if (pCenter !== localFilters.center && !cArray.includes(localFilters.center)) return false;
                                    }
                                    if (localFilters.name && !request.employeeId?.name?.toLowerCase().includes(localFilters.name.toLowerCase())) return false;
                                    if (localFilters.empId && !request.employeeId?.employeeId?.toLowerCase().includes(localFilters.empId.toLowerCase())) return false;
                                    return true;
                                }).length > 0 ? (
                                    requests.filter(request => {
                                        const reqDate = new Date(request.date).toISOString().split('T')[0];
                                        if (localFilters.date && reqDate !== localFilters.date) return false;
                                        if (localFilters.center) {
                                            const pCenter = request.employeeId?.primaryCentre?.centreName;
                                            const cArray = request.employeeId?.centerArray || [];
                                            if (pCenter !== localFilters.center && !cArray.includes(localFilters.center)) return false;
                                        }
                                        if (localFilters.name && !request.employeeId?.name?.toLowerCase().includes(localFilters.name.toLowerCase())) return false;
                                        if (localFilters.empId && !request.employeeId?.employeeId?.toLowerCase().includes(localFilters.empId.toLowerCase())) return false;
                                        return true;
                                    }).map((request, index) => (
                                        <tr key={request._id} className={isDarkMode ? 'hover:bg-gray-800/20' : 'hover:bg-gray-50/50'}>
                                            <td className="px-6 py-4 text-sm text-gray-500 font-medium">{index + 1}</td>
                                            <td className="px-6 py-4">
                                                <div className={`font-bold uppercase text-sm tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{request.employeeId?.name || "N/A"}</div>
                                                <div className="text-[10px] text-gray-500 font-medium tracking-widest">{request.employeeId?.employeeId || "UNKNOWN ID"}</div>
                                            </td>
                                            <td className={`px-6 py-4 text-center text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {new Date(request.date).toLocaleDateString('en-GB')}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${request.type === 'On Duty' ? (isDarkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-100 text-purple-600') :
                                                    request.type === 'Missed Punch' ? (isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-100 text-orange-600') :
                                                        (isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-600')
                                                    }`}>
                                                    {request.type || 'On Duty'}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {request.fromTime && request.toTime ? (
                                                    <span className={`font-mono text-xs px-2 py-1 rounded ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                                        {request.fromTime} - {request.toTime}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    {request.photos && request.photos.length > 0 ? (
                                                        <div className="flex gap-1 flex-wrap justify-center">
                                                            {request.photos.slice(0, 3).map((photo, idx) => (
                                                                <img
                                                                    key={idx}
                                                                    src={photo}
                                                                    alt={`Proof ${idx + 1}`}
                                                                    className="w-8 h-8 rounded object-cover border border-gray-200 cursor-pointer hover:border-blue-500 hover:ring-2 hover:ring-blue-500/20 transition-all"
                                                                    onClick={() => { setPreviewImage(photo); setShowPreviewModal(true); }}
                                                                />
                                                            ))}
                                                            {request.photos.length > 3 && (
                                                                <div className={`w-8 h-8 rounded flex items-center justify-center text-[9px] font-black text-gray-500 cursor-pointer ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
                                                                    onClick={() => { setPreviewImage(request.photos[3]); setShowPreviewModal(true); }}
                                                                >+{request.photos.length - 3}</div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[8px] text-gray-400 font-bold">NO PHOTO</span>
                                                    )}
                                                    {request.latitude && request.longitude ? (
                                                        <a 
                                                            href={`https://www.google.com/maps?q=${request.latitude},${request.longitude}`} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-blue-500 hover:text-blue-700"
                                                            title="View on Map"
                                                        >
                                                            <FaMapMarkedAlt size={12} />
                                                        </a>
                                                    ) : (
                                                        <span className="text-[8px] text-gray-400 font-bold">NO GPS</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className={`px-6 py-4 text-sm truncate max-w-[200px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} title={request.reason}>
                                                {request.reason}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${request.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                                    request.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {request.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center gap-2">
                                                    {request.status === 'Pending' ? (
                                                        <>
                                                            <button onClick={() => { setSelectedRequest(request); setReviewData({ status: 'Approved', remark: '', fromTime: request.fromTime || "", toTime: request.toTime || "", attendanceMode: "custom" }); setShowStatusModal(true); }} className="p-1.5 bg-green-500 text-white rounded-lg shadow-sm hover:scale-105 transition-transform"><FaCheck size={12} /></button>
                                                            <button onClick={() => { setSelectedRequest(request); setReviewData({ status: 'Rejected', remark: '', fromTime: request.fromTime || "", toTime: request.toTime || "", attendanceMode: "custom" }); setShowStatusModal(true); }} className="p-1.5 bg-red-500 text-white rounded-lg shadow-sm hover:scale-105 transition-transform"><FaTimes size={12} /></button>
                                                        </>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-gray-400">RESOLVED</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => { setSelectedRequest(request); setReviewData({ status: request.status, remark: request.reviewRemark || "", fromTime: request.fromTime || "", toTime: request.toTime || "", attendanceMode: "custom" }); setShowStatusModal(true); }} className={`p-2 text-blue-600 rounded-lg ${isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50'}`}><FaUserEdit size={14} /></button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400 text-sm italic">No regularization requests found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showStatusModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className={`w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                        <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                            <h2 className={`text-lg font-bold uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Review Regularization</h2>
                            <button onClick={() => setShowStatusModal(false)} className="text-gray-400 hover:text-white"><FaPlus size={20} className="rotate-45" /></button>
                        </div>
                        <form onSubmit={handleStatusUpdate} className="p-6 space-y-4">
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setReviewData({ ...reviewData, status: 'Approved' })} className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 ${reviewData.status === 'Approved' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-100 text-gray-400'}`}>Approve</button>
                                <button type="button" onClick={() => setReviewData({ ...reviewData, status: 'Rejected' })} className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 ${reviewData.status === 'Rejected' ? 'bg-red-500 border-red-500 text-white' : 'border-gray-100 text-gray-400'}`}>Reject</button>
                            </div>
                            
                            {/* Verification Display in Modal */}
                            {selectedRequest && ((selectedRequest.photos && selectedRequest.photos.length > 0) || (selectedRequest.latitude && selectedRequest.longitude)) && (
                                <div className={`p-4 rounded-xl border space-y-3 ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Verification Details ({selectedRequest.photos?.length || 0} Photo{selectedRequest.photos?.length !== 1 ? 's' : ''})</p>
                                    {selectedRequest.photos && selectedRequest.photos.length > 0 && (
                                        <div className="grid grid-cols-3 gap-2">
                                            {selectedRequest.photos.map((photo, idx) => (
                                                <div key={idx} className={`aspect-square rounded-lg overflow-hidden border shadow-sm relative group cursor-pointer ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}
                                                    onClick={() => { setPreviewImage(photo); setShowPreviewModal(true); }}
                                                >
                                                    <img src={photo} className="w-full h-full object-cover" alt={`Verification ${idx + 1}`} />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                        <FaExternalLinkAlt className="text-white" size={14} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex-1 space-y-2">
                                        {selectedRequest.latitude && (
                                            <div className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                📍 {selectedRequest.latitude.toFixed(6)}, {selectedRequest.longitude.toFixed(6)}
                                            </div>
                                        )}
                                        {selectedRequest.latitude && (
                                            <a 
                                                href={`https://www.google.com/maps?q=${selectedRequest.latitude},${selectedRequest.longitude}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md hover:bg-blue-600 transition-colors"
                                            >
                                                Open In Maps <FaExternalLinkAlt size={8} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Existing Attendance Display */}
                            {selectedRequest?.existingAttendance && selectedRequest.existingAttendance.workingHours > 0 && (
                                <div className={`p-4 rounded-xl border space-y-2 mb-2 animate-fade-in ${isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-100'}`}>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>Existing Logged Attendance</p>
                                    <div className="flex gap-4 items-center justify-between">
                                        <div className="flex-1">
                                            <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                                {selectedRequest.existingAttendance.workingHours} <span className="text-xs font-medium text-gray-500">Hours Recorded</span>
                                            </p>
                                            <div className="flex gap-4 text-[10px] text-gray-500 font-medium">
                                                {selectedRequest.existingAttendance?.checkIn?.time && (
                                                    <span>In: {new Date(selectedRequest.existingAttendance.checkIn.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                )}
                                                {selectedRequest.existingAttendance?.checkOut?.time && (
                                                    <span>Out: {new Date(selectedRequest.existingAttendance.checkOut.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className={`rounded-lg px-4 py-2 border text-center shadow-sm ${isDarkMode ? 'bg-gray-800 border-blue-700' : 'bg-white border-blue-200'}`}>
                                            <p className="text-[9px] uppercase tracking-widest font-black text-gray-400">Remaining to 9H</p>
                                            <p className="text-lg font-black text-blue-600">
                                                {Math.max(0, 9 - selectedRequest.existingAttendance.workingHours)} <span className="text-[10px] text-blue-400">Hrs</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase text-gray-500 ml-1 tracking-widest">Attendance Mode</label>
                                <div className="flex gap-6 px-1">
                                    <label className={`flex items-center gap-2 text-sm cursor-pointer ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        <input 
                                            type="radio" 
                                            name="attendanceMode" 
                                            className="accent-blue-500 w-4 h-4 cursor-pointer"
                                            checked={reviewData.attendanceMode === 'full'} 
                                            onChange={() => setReviewData({...reviewData, attendanceMode: 'full', fromTime: '09:30', toTime: '18:30'})} 
                                        /> 
                                        <span className="font-bold text-[11px] uppercase tracking-wider">Full Day (9:30 - 18:30)</span>
                                    </label>
                                    <label className={`flex items-center gap-2 text-sm cursor-pointer ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        <input 
                                            type="radio" 
                                            name="attendanceMode"
                                            className="accent-blue-500 w-4 h-4 cursor-pointer" 
                                            checked={reviewData.attendanceMode === 'custom'} 
                                            onChange={() => setReviewData({...reviewData, attendanceMode: 'custom'})} 
                                        /> 
                                        <span className="font-bold text-[11px] uppercase tracking-wider">Remaining / Custom Time</span>
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 animate-fade-in">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">From Time</label>
                                    <input type="time" value={reviewData.fromTime} onChange={(e) => setReviewData({ ...reviewData, fromTime: e.target.value })} className={`w-full px-4 py-2 rounded-xl outline-none text-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200'}`} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">To Time</label>
                                    <input type="time" value={reviewData.toTime} onChange={(e) => setReviewData({ ...reviewData, toTime: e.target.value })} className={`w-full px-4 py-2 rounded-xl outline-none text-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200'}`} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-gray-500 ml-1">Admin Remark</label>
                                <textarea rows="3" value={reviewData.remark} onChange={(e) => setReviewData({ ...reviewData, remark: e.target.value })} className={`w-full px-4 py-3 rounded-xl outline-none text-sm resize-none border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200'}`} placeholder="Reason for approval/rejection..." />
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setShowStatusModal(false)} className={`flex-1 px-4 py-3 rounded-xl font-bold border ${isDarkMode ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20">Submit Review</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Image Preview Modal */}
            {showPreviewModal && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
                    onClick={() => setShowPreviewModal(false)}
                >
                    <div 
                        className="relative max-w-4xl w-full flex flex-col items-center gap-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setShowPreviewModal(false)}
                            className="absolute -top-12 right-0 text-white/60 hover:text-white transition-colors"
                        >
                            <FaPlus size={32} className="rotate-45" />
                        </button>

                        <div className={`w-full p-2 rounded-2xl shadow-2xl relative group overflow-hidden border border-white/10 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                            <img 
                                src={previewImage} 
                                alt="Verification Evidence" 
                                className="w-full h-auto max-h-[70vh] object-contain rounded-xl"
                            />
                        </div>

                        <div className="flex gap-4">
                            <button 
                                onClick={() => handleDownloadImage(previewImage, `regularization_proof_${selectedRequest?.employeeId?.name || 'employee'}.jpg`)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
                            >
                                <FaPlus className="rotate-0" /> Download Proof Image
                            </button>
                            <button 
                                onClick={() => setShowPreviewModal(false)}
                                className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest border border-white/10 active:scale-95 transition-all"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default RegularizeTable;
