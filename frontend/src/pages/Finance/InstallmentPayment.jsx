import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { hasPermission } from "../../config/permissions";
import { useTheme } from "../../context/ThemeContext";
import { FaSearch, FaEraser, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendarAlt, FaMoneyBillWave, FaCheckCircle, FaClock, FaExclamationTriangle, FaFileInvoice, FaFilter, FaDownload, FaChevronRight, FaEdit, FaPlus, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import Select from "react-select";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import BillGenerator from "../../components/Finance/BillGenerator";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Pagination from "../../components/common/Pagination";
import RazorpayPOSModal from "../../components/Finance/RazorpayPOSModal";
import RazorpaySMSModal from "../../components/Finance/RazorpaySMSModal";

const EditScheduleModal = ({ admission, onClose, onSave }) => {
    const { theme } = useTheme();
    const isDarkMode = theme === "dark";
    // Initialize with existing unpaid installments
    const [schedule, setSchedule] = useState(() => {
        const unpaid = admission.paymentBreakdown
            .filter(inst => inst.status !== "PAID" && inst.status !== "PENDING_CLEARANCE")
            .map(inst => ({
                installmentNumber: inst.installmentNumber,
                dueDate: inst.dueDate ? inst.dueDate.split('T')[0] : new Date().toISOString().split('T')[0],
                amount: inst.amount
            }));
        return unpaid.length > 0 ? unpaid : [{
            installmentNumber: (admission.paymentBreakdown.length > 0 ? Math.max(...admission.paymentBreakdown.map(i => i.installmentNumber)) + 1 : 1),
            dueDate: new Date().toISOString().split('T')[0],
            amount: admission.remainingAmount
        }];
    });

    const [isSaving, setIsSaving] = useState(false);

    const totalNew = schedule.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
    const isValid = Math.abs(totalNew - admission.remainingAmount) < 1;

    const handleAdd = () => {
        const lastNum = schedule.length > 0 ? Math.max(...schedule.map(i => i.installmentNumber)) : 0;
        const lastDate = schedule.length > 0 ? new Date(schedule[schedule.length - 1].dueDate) : new Date();
        const nextDate = new Date(lastDate.setMonth(lastDate.getMonth() + 1));

        setSchedule([...schedule, {
            installmentNumber: lastNum + 1,
            dueDate: nextDate.toISOString().split('T')[0],
            amount: 0
        }]);
    };

    const handleRemove = (index) => {
        setSchedule(schedule.filter((_, i) => i !== index));
    };

    const handleChange = (index, field, value) => {
        const newSchedule = [...schedule];
        newSchedule[index][field] = value;
        setSchedule(newSchedule);
    };

    const handleSubmit = async () => {
        if (!isValid || schedule.length === 0) return;
        setIsSaving(true);
        try {
            await onSave(schedule);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
            <div className={`border w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(6,182,212,0.1)] flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-[#0d0f11] border-gray-800' : 'bg-white border-gray-200'
                }`}>
                <div className={`p-8 border-b bg-gradient-to-r from-cyan-500/10 via-transparent to-transparent flex justify-between items-center ${isDarkMode ? 'border-gray-800' : 'border-gray-200'
                    }`}>
                    <div>
                        <h2 className={`text-2xl font-black italic uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Edit <span className="text-cyan-500">Schedule</span></h2>
                        <div className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Admission # {admission.admissionNumber}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Remaining Balance</div>
                        <div className="text-xl font-black text-cyan-500">₹{admission.remainingAmount.toLocaleString()}</div>
                    </div>
                </div>

                <div className={`p-8 overflow-y-auto custom-scrollbar flex-1 ${isDarkMode ? 'bg-black/20' : 'bg-gray-50'}`}>
                    <div className="space-y-4">
                        {schedule.map((inst, idx) => (
                            <div key={idx} className={`p-6 rounded-3xl flex flex-wrap md:flex-nowrap items-center gap-6 group transition-all border ${isDarkMode ? 'bg-gray-900/40 border-gray-800 hover:border-gray-700' : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
                                }`}>
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-cyan-500 font-black italic shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-gray-150'
                                    }`}>
                                    #{inst.installmentNumber}
                                </div>
                                <div className="flex-1 min-w-[150px]">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Due Date</label>
                                    <input
                                        type="date"
                                        value={inst.dueDate}
                                        onChange={(e) => handleChange(idx, 'dueDate', e.target.value)}
                                        className={`w-full border rounded-xl py-2 px-3 text-xs font-bold outline-none focus:border-cyan-500/50 transition-all ${isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                                            }`}
                                    />
                                </div>
                                <div className="flex-1 min-w-[120px]">
                                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={inst.amount}
                                        onFocus={(e) => e.target.select()}
                                        onChange={(e) => handleChange(idx, 'amount', e.target.value)}
                                        className={`w-full border rounded-xl py-2 px-3 text-xs font-black outline-none focus:border-cyan-500/50 transition-all ${isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                                            }`}
                                    />
                                </div>
                                <button
                                    onClick={() => handleRemove(idx)}
                                    className="h-10 w-10 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                                    title="Remove Installment"
                                >
                                    <FaTrash className="text-xs" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleAdd}
                        className={`w-full mt-6 py-4 border-2 border-dashed rounded-3xl font-black uppercase text-[10px] tracking-widest hover:text-cyan-500 transition-all flex items-center justify-center gap-2 ${isDarkMode ? 'border-gray-800 text-gray-500 hover:border-cyan-500/50' : 'border-gray-300 text-gray-400 hover:border-cyan-500/50'
                            }`}
                    >
                        <FaPlus /> Add New Installment
                    </button>
                </div>

                <div className={`p-8 border-t backdrop-blur-xl ${isDarkMode ? 'border-gray-800 bg-black/40' : 'border-gray-250 bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-6 px-2">
                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            New Total: <span className={isValid ? "text-emerald-500" : "text-red-500"}>₹{totalNew.toLocaleString()}</span>
                        </div>
                        {!isValid && (
                            <div className="text-[9px] font-black text-red-500 uppercase tracking-tight animate-pulse">
                                Difference: ₹{(admission.remainingAmount - totalNew).toLocaleString()}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className={`flex-1 py-4 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all border ${isDarkMode
                                    ? 'bg-gray-950 text-gray-500 border-gray-800 hover:bg-gray-900 hover:text-white'
                                    : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 hover:text-gray-900'
                                }`}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!isValid || schedule.length === 0 || isSaving}
                            className={`flex-1 py-4 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 ${isValid && schedule.length > 0 && !isSaving
                                ? "bg-gradient-to-r from-emerald-600 to-emerald-400 text-black shadow-emerald-500/20 hover:scale-105 active:scale-95"
                                : isDarkMode ? "bg-gray-800 text-gray-600 cursor-not-allowed" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                }`}
                        >
                            {isSaving ? "Saving..." : "Save New Schedule"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InstallmentPayment = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === "dark";
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [financialData, setFinancialData] = useState(null);
    const [billModal, setBillModal] = useState({ show: false, admission: null, installment: null });
    const [activeTab, setActiveTab] = useState("centreSummary"); // Default to Centre-wise Summary

    // Tab state: 'regular' | 'boardCourse'
    const [activeTab, setActiveTab] = useState('regular');

    // Board Course Admission tab state
    const [boardAdmissionsList, setBoardAdmissionsList] = useState([]);
    const [boardLoading, setBoardLoading] = useState(false);
    const [boardCurrentPage, setBoardCurrentPage] = useState(1);
    const [boardItemsPerPage, setBoardItemsPerPage] = useState(10);
    const [boardFilters, setBoardFilters] = useState({
        centre: [],
        course: [],
        department: [],
        startDate: "",
        endDate: "",
        installmentStatus: [],
        minRemaining: "",
        maxRemaining: "",
        searchTerm: ""
    });

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    // Check both permissions: Finance (for visibility) and Admissions (required by backend)
    // This ensures the button shows for updated Finance users, while backend errors are handled in the API call
    const canCreatePayment = hasPermission(user, 'financeFees', 'installmentPayment', 'create') || hasPermission(user, 'admissions', 'enrolledStudents', 'edit');

    // Admissions List & Filters
    const [admissionsList, setAdmissionsList] = useState([]);
    const [filters, setFilters] = useState({
        centre: [],
        course: [],
        department: [],
        startDate: "",
        endDate: "",
        installmentStatus: [],
        minRemaining: "",
        maxRemaining: "",
        searchTerm: ""
    });
    const [metadata, setMetadata] = useState({
        centres: [],
        courses: [],
        departments: []
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const itemsPerPageOptions = [
        { value: 10, label: "10 per page" },
        { value: 25, label: "25 per page" },
        { value: 50, label: "50 per page" },
        { value: 100, label: "100 per page" },
        { value: 500, label: "500 per page" },
    ];

    const [allowedCentres, setAllowedCentres] = useState(null); // null means all allowed (SuperAdmin)

    useEffect(() => {
        const init = async () => {
            const perms = await fetchUserPermissions();
            setAllowedCentres(perms);
            fetchMetadata(perms);
            fetchAdmissions(perms);
        };
        init();
    }, []);

    // Fetch board admissions when board tab becomes active
    useEffect(() => {
        if (activeTab === 'boardCourse' && boardAdmissionsList.length === 0) {
            fetchBoardAdmissions();
        }
    }, [activeTab]);

    const fetchBoardAdmissions = async () => {
        setBoardLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/board-admission/all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setBoardAdmissionsList(data);
            } else {
                toast.error('Failed to load board admissions');
            }
        } catch (err) {
            console.error(err);
            toast.error('Error loading board admissions');
        } finally {
            setBoardLoading(false);
        }
    };

    const fetchUserPermissions = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                // Check role strictly from profile
                if (data.user.role === 'superAdmin' || data.user.role === 'SuperAdmin') return null; // All access
                return data.user.centres?.map(c => c.centreName) || [];
            }
        } catch (error) {
            console.error(error);
        }
        return []; // Default no access if error or no centres
    };

    const fetchMetadata = async (allowedOverride) => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [centresRes, coursesRes, deptsRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/course`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/department`, { headers })
            ]);

            const centres = await centresRes.json();
            const courses = await coursesRes.json();
            const depts = await deptsRes.json();
            const filteredDepts = Array.isArray(depts) ? depts.filter(dept => dept.showInAdmission !== false) : [];

            // Filter centres based on permissions with case-insensitive comparison
            const perms = allowedOverride !== undefined ? allowedOverride : allowedCentres;
            let filteredCentres = Array.isArray(centres) ? centres : [];

            if (perms !== null && Array.isArray(perms)) {
                // Normalize permission centre names (trim and lowercase)
                const normalizedPerms = perms.map(c => (c || "").trim().toLowerCase());
                // Filter centres by comparing normalized names
                filteredCentres = filteredCentres.filter(c => {
                    const centreName = (c.centreName || "").trim().toLowerCase();
                    return normalizedPerms.includes(centreName);
                });
            }

            // Exclude deactive centres
            filteredCentres = filteredCentres.filter(c => c.status !== 'deactive');

            setMetadata({
                centres: filteredCentres,
                courses: (Array.isArray(courses) ? courses : []).filter(c => c.department?.showInAdmission !== false),
                departments: filteredDepts
            });
        } catch (error) {
            console.error("Error fetching metadata:", error);
        }
    };

    const fetchAdmissions = async (allowedOverride) => {
        setLoading(true);
        setCurrentPage(1); // Reset to first page on new search
        try {
            const token = localStorage.getItem("token");
            const queryParams = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (Array.isArray(value) && value.length > 0) {
                    value.forEach(v => queryParams.append(key, v));
                } else if (value && !Array.isArray(value)) {
                    queryParams.append(key, value);
                }
            });

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/finance/installment/all-admissions?${queryParams.toString()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.ok) {
                const data = await response.json();
                setAdmissionsList(data);
            } else {
                toast.error("Failed to load admissions");
            }
        } catch (error) {
            console.error("Fetch Admissions Error:", error);
            toast.error("Error loading admissions");
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const resetFilters = () => {
        setFilters({
            centre: [],
            course: [],
            department: [],
            startDate: "",
            endDate: "",
            installmentStatus: [],
            minRemaining: "",
            maxRemaining: "",
            searchTerm: ""
        });
        fetchAdmissions();
    };

    const statusOptions = [
        { value: 'PAID', label: 'PAID' },
        { value: 'PENDING', label: 'PENDING' },
        { value: 'PARTIAL', label: 'PARTIAL' },
        { value: 'OVERDUE', label: 'OVERDUE' },
        { value: 'PENDING_CLEARANCE', label: 'IN PROCESS' },
        { value: 'REJECTED', label: 'REJECTED' },
    ];

    // Get complete financial details
    const handleSelectStudent = async (studentId) => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/finance/installment/student/${studentId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.ok) {
                const data = await response.json();
                setFinancialData(data);
                setSelectedStudent(data.studentInfo);
            } else {
                toast.error("Failed to load financial details");
            }
        } catch (error) {
            console.error("Load Error:", error);
            toast.error("Error loading financial details");
        } finally {
            setLoading(false);
        }
    };
    const isDetailedView = filters.startDate || filters.endDate || (filters.installmentStatus && filters.installmentStatus.length > 0);
    const isBoardDetailedView = boardFilters.startDate || boardFilters.endDate || (boardFilters.installmentStatus && boardFilters.installmentStatus.length > 0);

    const displayedList = React.useMemo(() => {
        if (!isDetailedView) {
            return admissionsList;
        }

        const start = filters.startDate ? new Date(filters.startDate) : new Date(0);
        start.setHours(0, 0, 0, 0);
        const end = filters.endDate ? new Date(filters.endDate) : new Date(8640000000000000);
        end.setHours(23, 59, 59, 999);

        const flatInstallments = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        admissionsList.forEach(adm => {
            if (adm.paymentBreakdown && adm.paymentBreakdown.length > 0) {
                adm.paymentBreakdown.forEach(inst => {
                    // Date Match
                    let dateMatch = true;
                    if (filters.startDate || filters.endDate) {
                        if (inst.dueDate) {
                            const d = new Date(inst.dueDate);
                            dateMatch = d >= start && d <= end;
                        } else {
                            dateMatch = false;
                        }
                    }

                    // Status Match
                    let statusMatch = true;
                    if (filters.installmentStatus && filters.installmentStatus.length > 0) {
                        const dueDate = new Date(inst.dueDate);
                        dueDate.setHours(0, 0, 0, 0);
                        const isOverdue = (inst.status !== "PAID" && inst.status !== "PENDING_CLEARANCE" && dueDate < today);
                        const currentStatus = isOverdue ? 'OVERDUE' : inst.status;
                        statusMatch = filters.installmentStatus.includes(currentStatus);
                    }

                    if (dateMatch && statusMatch) {
                        flatInstallments.push({
                            ...inst,
                            admissionId: adm.admissionId,
                            admissionNumber: adm.admissionNumber,
                            studentId: adm.studentId,
                            studentName: adm.studentName,
                            email: adm.email,
                            mobile: adm.mobile,
                            course: adm.course,
                            department: adm.department,
                            centre: adm.centre,
                            admissionDate: adm.admissionDate,
                            admissionTotalFees: adm.totalFees,
                            admissionTotalPaid: adm.totalPaid,
                            admissionRemaining: adm.remainingAmount,
                            admissionPaymentStatus: adm.paymentStatus
                        });
                    }
                });
            }
        });

        return flatInstallments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }, [admissionsList, isDetailedView, filters.startDate, filters.endDate, filters.installmentStatus]);

    const displayedBoardList = React.useMemo(() => {
        let filtered = boardAdmissionsList;

        if (boardFilters.centre && boardFilters.centre.length > 0) {
            filtered = filtered.filter(adm => boardFilters.centre.includes(adm.centre));
        }

        if (boardFilters.course && boardFilters.course.length > 0) {
            filtered = filtered.filter(adm => boardFilters.course.includes(adm.boardCourseName));
        }

        if (boardFilters.department && boardFilters.department.length > 0) {
            filtered = filtered.filter(adm => boardFilters.department.includes(adm.programme));
        }

        if (boardFilters.minRemaining !== "") {
            filtered = filtered.filter(adm => {
                const totalExpected = adm.totalExpectedAmount || 0;
                const totalPaid = adm.totalPaidAmount || 0;
                const totalDue = Math.max(0, totalExpected - totalPaid);
                return totalDue >= parseFloat(boardFilters.minRemaining);
            });
        }

        if (boardFilters.maxRemaining !== "") {
            filtered = filtered.filter(adm => {
                const totalExpected = adm.totalExpectedAmount || 0;
                const totalPaid = adm.totalPaidAmount || 0;
                const totalDue = Math.max(0, totalExpected - totalPaid);
                return totalDue <= parseFloat(boardFilters.maxRemaining);
            });
        }

        if (boardFilters.searchTerm) {
            const sq = boardFilters.searchTerm.toLowerCase();
            filtered = filtered.filter(adm => {
                const name = (adm.studentId?.studentsDetails?.[0]?.studentName || adm.studentName || '').toLowerCase();
                const admNo = (adm.admissionNumber || '').toLowerCase();
                const mobile = (adm.studentId?.studentsDetails?.[0]?.mobileNum || adm.mobileNum || '').toString();
                return name.includes(sq) || admNo.includes(sq) || mobile.includes(sq);
            });
        }

        if (!isBoardDetailedView) {
            return filtered;
        }

        // Flatten installments if filtering by date/status
        const start = boardFilters.startDate ? new Date(boardFilters.startDate) : new Date(0);
        start.setHours(0, 0, 0, 0);
        const end = boardFilters.endDate ? new Date(boardFilters.endDate) : new Date(8640000000000000);
        end.setHours(23, 59, 59, 999);

        const flatInstallments = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        filtered.forEach(adm => {
            if (adm.installments && adm.installments.length > 0) {
                adm.installments.forEach(inst => {
                    // Date Match
                    let dateMatch = true;
                    if (boardFilters.startDate || boardFilters.endDate) {
                        if (inst.dueDate) {
                            const d = new Date(inst.dueDate);
                            dateMatch = d >= start && d <= end;
                        } else {
                            dateMatch = false;
                        }
                    }

                    // Status Match
                    let statusMatch = true;
                    if (boardFilters.installmentStatus && boardFilters.installmentStatus.length > 0) {
                        const dueDate = new Date(inst.dueDate);
                        dueDate.setHours(0, 0, 0, 0);
                        const isOverdue = (inst.status !== "PAID" && inst.status !== "PENDING_CLEARANCE" && dueDate < today);
                        const currentStatus = isOverdue ? 'OVERDUE' : inst.status;
                        statusMatch = boardFilters.installmentStatus.includes(currentStatus);
                    }

                    if (dateMatch && statusMatch) {
                        const studentName = adm.studentId?.studentsDetails?.[0]?.studentName || adm.studentName || 'N/A';
                        const mobile = adm.studentId?.studentsDetails?.[0]?.mobileNum || adm.mobileNum || 'N/A';
                        const email = adm.studentId?.studentsDetails?.[0]?.emailId || adm.email || '';

                        flatInstallments.push({
                            ...inst,
                            boardCourseAdmissionId: adm._id,
                            admissionNumber: adm.admissionNumber,
                            studentId: adm.studentId?._id || adm.studentId,
                            studentName: studentName,
                            email: email,
                            mobile: mobile,
                            course: adm.boardCourseName || adm.programme,
                            department: adm.programme,
                            centre: adm.centre,
                            admissionDate: adm.admissionDate,
                            admissionTotalFees: adm.totalExpectedAmount,
                            admissionTotalPaid: adm.totalPaidAmount,
                            admissionRemaining: Math.max(0, (adm.totalExpectedAmount || 0) - (adm.totalPaidAmount || 0)),
                            admissionPaymentStatus: (Math.max(0, (adm.totalExpectedAmount || 0) - (adm.totalPaidAmount || 0)) < 1) ? 'PAID' : 'PENDING'
                        });
                    }
                });
            }
        });

        return flatInstallments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }, [boardAdmissionsList, isBoardDetailedView, boardFilters]);

    const stats = React.useMemo(() => {
        if (activeTab === 'boardCourse') {
            if (isBoardDetailedView) {
                const totalFees = displayedBoardList.reduce((sum, inst) => sum + (parseFloat(inst.amount || inst.payableAmount || 0)), 0);
                const totalPaid = displayedBoardList.reduce((sum, inst) => sum + (parseFloat(inst.paidAmount || 0)), 0);
                const totalDue = totalFees - totalPaid;
                return { totalFees, totalPaid, totalDue };
            } else {
                const totalFees = displayedBoardList.reduce((sum, adm) => sum + (parseFloat(adm.totalExpectedAmount || 0)), 0);
                const totalPaid = displayedBoardList.reduce((sum, adm) => sum + (parseFloat(adm.totalPaidAmount || 0)), 0);
                const totalDue = totalFees - totalPaid;
                return { totalFees, totalPaid, totalDue };
            }
        }

        if (isDetailedView) {
            const totalFees = displayedList.reduce((sum, inst) => sum + (parseFloat(inst.amount) || 0), 0);
            const totalPaid = displayedList.reduce((sum, inst) => sum + (parseFloat(inst.paidAmount) || 0), 0);
            const totalDue = totalFees - totalPaid;
            return { totalFees, totalPaid, totalDue };
        } else {
            const totalFees = admissionsList.reduce((sum, a) => sum + (parseFloat(a.totalFees) || 0), 0);
            const totalPaid = admissionsList.reduce((sum, a) => sum + (parseFloat(a.totalPaid) || 0), 0);
            const totalDue = admissionsList.reduce((sum, a) => sum + (parseFloat(a.remainingAmount) || 0), 0);
            return { totalFees, totalPaid, totalDue };
        }
    }, [activeTab, admissionsList, displayedList, isDetailedView, boardAdmissionsList, displayedBoardList, isBoardDetailedView]);

    const centreStats = React.useMemo(() => {
        const counts = {};
        if (activeTab === 'boardCourse') {
            if (isBoardDetailedView) {
                displayedBoardList.forEach(inst => {
                    const c = inst.centre || "Unknown";
                    if (!counts[c]) {
                        counts[c] = { totalFees: 0, totalPaid: 0, totalDue: 0 };
                    }
                    const amt = parseFloat(inst.amount || inst.payableAmount) || 0;
                    const paid = parseFloat(inst.paidAmount) || 0;
                    counts[c].totalFees += amt;
                    counts[c].totalPaid += paid;
                    counts[c].totalDue += (amt - paid);
                });
            } else {
                displayedBoardList.forEach(a => {
                    const c = a.centre || "Unknown";
                    if (!counts[c]) {
                        counts[c] = { totalFees: 0, totalPaid: 0, totalDue: 0 };
                    }
                    counts[c].totalFees += (parseFloat(a.totalExpectedAmount) || 0);
                    counts[c].totalPaid += (parseFloat(a.totalPaidAmount) || 0);
                    counts[c].totalDue += Math.max(0, (parseFloat(a.totalExpectedAmount) || 0) - (parseFloat(a.totalPaidAmount) || 0));
                });
            }
        } else {
            if (isDetailedView) {
                displayedList.forEach(inst => {
                    const c = inst.centre || "Unknown";
                    if (!counts[c]) {
                        counts[c] = { totalFees: 0, totalPaid: 0, totalDue: 0 };
                    }
                    const amt = parseFloat(inst.amount) || 0;
                    const paid = parseFloat(inst.paidAmount) || 0;
                    counts[c].totalFees += amt;
                    counts[c].totalPaid += paid;
                    counts[c].totalDue += (amt - paid);
                });
            } else {
                admissionsList.forEach(a => {
                    const c = a.centre || "Unknown";
                    if (!counts[c]) {
                        counts[c] = { totalFees: 0, totalPaid: 0, totalDue: 0 };
                    }
                    counts[c].totalFees += (parseFloat(a.totalFees) || 0);
                    counts[c].totalPaid += (parseFloat(a.totalPaid) || 0);
                    counts[c].totalDue += (parseFloat(a.remainingAmount) || 0);
                });
            }
        }
        return Object.entries(counts).map(([name, data]) => ({
            name,
            ...data
        })).sort((a, b) => a.name.localeCompare(b.name));
    }, [activeTab, admissionsList, displayedList, isDetailedView, boardAdmissionsList, displayedBoardList, isBoardDetailedView]);

    const exportToExcel = () => {
        if (displayedList.length === 0) {
            toast.info("No data to export");
            return;
        }

        if (isDetailedView) {
            const dataToExport = displayedList.map(inst => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dueDate = new Date(inst.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                const isOverdue = (inst.status !== "PAID" && inst.status !== "PENDING_CLEARANCE" && dueDate < today);
                const dueStatus = inst.status === "PAID" ? "PAID" : (isOverdue ? "OVERDUE" : "UPCOMING");

                return {
                    "Due Date": new Date(inst.dueDate).toLocaleDateString('en-GB'),
                    "Installment #": `Installment ${inst.installmentNumber}`,
                    "Amount Due (₹)": Math.max(0, parseFloat(inst.amount) || 0),
                    "Amount Paid (₹)": Math.max(0, parseFloat(inst.paidAmount) || 0),
                    "Inst. Status": inst.status,
                    "Due Status": dueStatus,
                    "Student Name": inst.studentName,
                    "Admission Code": inst.admissionNumber,
                    "Course": inst.course,
                    "Department": inst.department,
                    "Centre": inst.centre,
                    "Mobile": inst.mobile,
                    "Email": inst.email
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered Installments Report");

            const columnWidths = Object.keys(dataToExport[0] || {}).map(key => ({
                wch: Math.max(key.length, ...dataToExport.map(row => (row[key] || "").toString().length)) + 2
            }));
            worksheet["!cols"] = columnWidths;

            const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
            const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
            saveAs(data, `Filtered_Installments_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success("Filtered report exported successfully!");
            return;
        }

        const dataToExport = [];

        admissionsList.forEach(adm => {
            if (!adm.paymentBreakdown || adm.paymentBreakdown.length === 0) {
                // If no installments, still export the student info
                dataToExport.push({
                    "Admission Code": adm.admissionNumber,
                    "Student Name": adm.studentName,
                    "Email": adm.email,
                    "Mobile": adm.mobile,
                    "Course": adm.course,
                    "Department": adm.department,
                    "Centre": adm.centre,
                    "Admission Date": new Date(adm.admissionDate).toLocaleDateString(),
                    "Total Fees (₹)": adm.totalFees,
                    "Total Paid (₹)": adm.totalPaid,
                    "Remaining (₹)": Math.max(0, parseFloat(adm.remainingAmount) || 0),
                    "Overall Status": adm.paymentStatus,
                    "Installment #": "N/A",
                    "Due Date": "N/A",
                    "Amount Due": "N/A",
                    "Amount Paid": "N/A",
                    "Inst. Status": "N/A"
                });
            } else {
                adm.paymentBreakdown.forEach((inst, idx) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dueDate = new Date(inst.dueDate);
                    dueDate.setHours(0, 0, 0, 0);
                    const isOverdue = (inst.status !== "PAID" && inst.status !== "PENDING_CLEARANCE" && dueDate < today);
                    const dueStatus = inst.status === "PAID" ? "PAID" : (isOverdue ? "OVERDUE" : "UPCOMING");

                    dataToExport.push({
                        "Admission Code": idx === 0 ? adm.admissionNumber : "", // Only show for first installment row
                        "Student Name": idx === 0 ? adm.studentName : "",
                        "Email": idx === 0 ? adm.email : "",
                        "Mobile": idx === 0 ? adm.mobile : "",
                        "Course": idx === 0 ? adm.course : "",
                        "Department": idx === 0 ? adm.department : "",
                        "Centre": idx === 0 ? adm.centre : "",
                        "Admission Date": idx === 0 ? new Date(adm.admissionDate).toLocaleDateString() : "",
                        "Total Fees (₹)": idx === 0 ? adm.totalFees : "",
                        "Total Paid (₹)": idx === 0 ? adm.totalPaid : "",
                        "Remaining (₹)": idx === 0 ? Math.max(0, parseFloat(adm.remainingAmount) || 0) : "",
                        "Overall Status": idx === 0 ? adm.paymentStatus : "",
                        "Installment #": `Installment ${inst.installmentNumber}`,
                        "Due Date": new Date(inst.dueDate).toLocaleDateString('en-GB'),
                        "Amount Due": Math.max(0, parseFloat(inst.amount) || 0),
                        "Amount Paid": Math.max(0, parseFloat(inst.paidAmount) || 0),
                        "Inst. Status": inst.status,
                        "Due Status": dueStatus
                    });
                });
            }
            // Add a separator row for better readability
            dataToExport.push({
                "Admission Code": "---", "Student Name": "---", "Email": "---", "Mobile": "---", "Course": "---",
                "Department": "---", "Centre": "---", "Admission Date": "---", "Total Fees (₹)": "---",
                "Total Paid (₹)": "---", "Remaining (₹)": "---", "Overall Status": "---",
                "Installment #": "---", "Due Date": "---", "Amount Due": "---", "Amount Paid": "---", "Inst. Status": "---", "Due Status": "---"
            });
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Detailed Financial Report");

        // Auto-size columns
        const columnWidths = Object.keys(dataToExport[0]).map(key => ({
            wch: Math.max(key.length, ...dataToExport.map(row => (row[key] || "").toString().length)) + 2
        }));
        worksheet["!cols"] = columnWidths;

        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
        saveAs(data, `Detailed_Student_Financial_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Detailed report exported successfully!");
    };

    const exportCentreSummaryToExcel = () => {
        if (centreStats.length === 0) {
            toast.info("No data to export");
            return;
        }

        const dataToExport = centreStats.map(c => {
            const progress = c.totalFees > 0 ? (c.totalPaid / c.totalFees) * 100 : 0;
            return {
                "Centre Name": c.name,
                "Total Installment Amount (₹)": Math.round(c.totalFees),
                "Paid Amount (₹)": Math.round(c.totalPaid),
                "Remaining Amount (₹)": Math.round(c.totalDue),
                "Recovery Progress (%)": Math.round(progress) + "%"
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Centre-wise Summary Report");

        // Auto-size columns
        const columnWidths = Object.keys(dataToExport[0] || {}).map(key => ({
            wch: Math.max(key.length, ...dataToExport.map(row => (row[key] || "").toString().length)) + 2
        }));
        worksheet["!cols"] = columnWidths;

        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
        saveAs(data, `Centre_wise_Installment_Summary_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Centre summary report exported successfully!");
    };

    const resetBoardFilters = () => {
        setBoardFilters({
            centre: [],
            course: [],
            department: [],
            startDate: "",
            endDate: "",
            installmentStatus: [],
            minRemaining: "",
            maxRemaining: "",
            searchTerm: ""
        });
        setBoardCurrentPage(1);
    };

    const exportBoardToExcel = () => {
        if (displayedBoardList.length === 0) {
            toast.info("No data to export");
            return;
        }

        if (isBoardDetailedView) {
            const dataToExport = displayedBoardList.map(inst => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dueDate = new Date(inst.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                const isOverdue = (inst.status !== "PAID" && inst.status !== "PENDING_CLEARANCE" && dueDate < today);
                const dueStatus = inst.status === "PAID" ? "PAID" : (isOverdue ? "OVERDUE" : "UPCOMING");

                return {
                    "Due Date": new Date(inst.dueDate).toLocaleDateString('en-GB'),
                    "Installment #": `Month ${inst.monthNumber}`,
                    "Amount Due (₹)": Math.max(0, parseFloat(inst.payableAmount || inst.amount) || 0),
                    "Amount Paid (₹)": Math.max(0, parseFloat(inst.paidAmount) || 0),
                    "Inst. Status": inst.status,
                    "Due Status": dueStatus,
                    "Student Name": inst.studentName,
                    "Admission Code": inst.admissionNumber,
                    "Board Course": inst.course,
                    "Department/Programme": inst.department,
                    "Centre": inst.centre,
                    "Mobile": inst.mobile,
                    "Email": inst.email
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered Board Installments");

            const columnWidths = Object.keys(dataToExport[0] || {}).map(key => ({
                wch: Math.max(key.length, ...dataToExport.map(row => (row[key] || "").toString().length)) + 2
            }));
            worksheet["!cols"] = columnWidths;

            const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
            const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
            saveAs(data, `Filtered_Board_Installments_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success("Filtered board report exported successfully!");
            return;
        }

        const dataToExport = [];

        displayedBoardList.forEach(adm => {
            const studentName = adm.studentId?.studentsDetails?.[0]?.studentName || adm.studentName || 'N/A';
            const mobile = adm.studentId?.studentsDetails?.[0]?.mobileNum || adm.mobileNum || 'N/A';
            const email = adm.studentId?.studentsDetails?.[0]?.emailId || adm.email || '';
            const totalExpected = adm.totalExpectedAmount || 0;
            const totalPaid = adm.totalPaidAmount || 0;
            const totalDue = Math.max(0, totalExpected - totalPaid);

            if (!adm.installments || adm.installments.length === 0) {
                dataToExport.push({
                    "Admission Code": adm.admissionNumber,
                    "Student Name": studentName,
                    "Email": email,
                    "Mobile": mobile,
                    "Board Course": adm.boardCourseName || '—',
                    "Department/Programme": adm.programme,
                    "Centre": adm.centre,
                    "Admission Date": new Date(adm.admissionDate).toLocaleDateString(),
                    "Total Fees (₹)": totalExpected,
                    "Total Paid (₹)": totalPaid,
                    "Remaining (₹)": totalDue,
                    "Overall Status": totalDue < 1 ? "PAID" : "PENDING",
                    "Installment #": "N/A",
                    "Due Date": "N/A",
                    "Amount Due": "N/A",
                    "Amount Paid": "N/A",
                    "Inst. Status": "N/A"
                });
            } else {
                adm.installments.forEach((inst, idx) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dueDate = new Date(inst.dueDate);
                    dueDate.setHours(0, 0, 0, 0);
                    const isOverdue = (inst.status !== "PAID" && inst.status !== "PENDING_CLEARANCE" && dueDate < today);
                    const dueStatus = inst.status === "PAID" ? "PAID" : (isOverdue ? "OVERDUE" : "UPCOMING");

                    dataToExport.push({
                        "Admission Code": idx === 0 ? adm.admissionNumber : "",
                        "Student Name": idx === 0 ? studentName : "",
                        "Email": idx === 0 ? email : "",
                        "Mobile": idx === 0 ? mobile : "",
                        "Board Course": idx === 0 ? (adm.boardCourseName || '—') : "",
                        "Department/Programme": idx === 0 ? adm.programme : "",
                        "Centre": idx === 0 ? adm.centre : "",
                        "Admission Date": idx === 0 ? new Date(adm.admissionDate).toLocaleDateString() : "",
                        "Total Fees (₹)": idx === 0 ? totalExpected : "",
                        "Total Paid (₹)": idx === 0 ? totalPaid : "",
                        "Remaining (₹)": idx === 0 ? totalDue : "",
                        "Overall Status": idx === 0 ? (totalDue < 1 ? "PAID" : "PENDING") : "",
                        "Installment #": `Month ${inst.monthNumber}`,
                        "Due Date": new Date(inst.dueDate).toLocaleDateString('en-GB'),
                        "Amount Due": Math.max(0, parseFloat(inst.payableAmount || inst.standardAmount) || 0),
                        "Amount Paid": Math.max(0, parseFloat(inst.paidAmount) || 0),
                        "Inst. Status": inst.status,
                        "Due Status": dueStatus
                    });
                });
            }
            dataToExport.push({
                "Admission Code": "---", "Student Name": "---", "Email": "---", "Mobile": "---", "Board Course": "---",
                "Department/Programme": "---", "Centre": "---", "Admission Date": "---", "Total Fees (₹)": "---",
                "Total Paid (₹)": "---", "Remaining (₹)": "---", "Overall Status": "---",
                "Installment #": "---", "Due Date": "---", "Amount Due": "---", "Amount Paid": "---", "Inst. Status": "---", "Due Status": "---"
            });
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Board Financial Report");

        const columnWidths = Object.keys(dataToExport[0] || {}).map(key => ({
            wch: Math.max(key.length, ...dataToExport.map(row => (row[key] || "").toString().length)) + 2
        }));
        worksheet["!cols"] = columnWidths;

        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
        saveAs(data, `Board_Financial_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Board report exported successfully!");
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "PAID":
            case "COMPLETED":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-emerald-500 bg-emerald-500/10 border-emerald-500/20 inline-flex items-center gap-1"><FaCheckCircle /> {status}</span>;
            case "PENDING":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-yellow-500 bg-yellow-500/10 border-yellow-500/20 inline-flex items-center gap-1"><FaClock /> {status}</span>;
            case "OVERDUE":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-red-500 bg-red-500/10 border-red-500/20 inline-flex items-center gap-1"><FaExclamationTriangle /> {status}</span>;
            case "PARTIAL":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-orange-500 bg-orange-500/10 border-orange-500/20 inline-flex items-center gap-1"><FaClock /> {status}</span>;
            case "PENDING_CLEARANCE":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-yellow-500 bg-yellow-500/10 border-yellow-500/20 inline-flex items-center gap-1"><FaClock /> IN PROCESS</span>;
            case "REJECTED":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-red-500 bg-red-500/10 border-red-500/20 inline-flex items-center gap-1"><FaExclamationTriangle /> REJECTED</span>;
            default:
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-gray-500 bg-gray-500/10 border-gray-500/20">{status}</span>;
        }
    };

    const getDueStatusBadge = (adm) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const overdueInstallments = adm.paymentBreakdown?.filter(inst =>
            inst.status !== "PAID" && inst.status !== "PENDING_CLEARANCE" && new Date(inst.dueDate) < today
        );

        if (overdueInstallments?.length > 0) {
            return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-red-500 bg-red-500/10 border-red-500/20 inline-flex items-center gap-1"><FaExclamationTriangle /> {overdueInstallments.length} OVERDUE</span>;
        }

        const nextDue = adm.paymentBreakdown?.filter(inst =>
            inst.status !== "PAID" && inst.status !== "PENDING_CLEARANCE" && new Date(inst.dueDate) >= today
        ).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

        if (nextDue) {
            return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-cyan-500 bg-cyan-500/10 border-cyan-500/20 inline-flex items-center gap-1"><FaClock /> DUE {new Date(nextDue.dueDate).toLocaleDateString('en-GB')}</span>;
        }

        const isCompleted = adm.paymentStatus === "COMPLETED" || (adm.remainingAmount <= 0);
        if (isCompleted) {
            return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-emerald-500 bg-emerald-500/10 border-emerald-500/20 inline-flex items-center gap-1"><FaCheckCircle /> NO DUES</span>;
        }

        return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-gray-500 bg-gray-500/10 border-gray-500/20">NO UPCOMING</span>;
    };

    // Payment Modal State
    const [showPayModal, setShowPayModal] = useState(false);
    const [showEditScheduleModal, setShowEditScheduleModal] = useState(false);
    const [editingAdmission, setEditingAdmission] = useState(null);
    const [activeInstallment, setActiveInstallment] = useState(null);
    const [activeAdmissionId, setActiveAdmissionId] = useState(null);
    const [showPOSModal, setShowPOSModal] = useState(false);
    const [showSMSModal, setShowSMSModal] = useState(false);
    const [payFormData, setPayFormData] = useState({
        paidAmount: 0,
        paymentMethod: "CASH",
        transactionId: "",
        accountHolderName: "",
        chequeDate: "",
        remarks: "",
        carryForward: false
    });

    const handleOpenPayModal = (admissionId, inst) => {
        setActiveAdmissionId(admissionId);
        setActiveInstallment(inst);
        setPayFormData({
            paidAmount: inst.amount,
            paymentMethod: "CASH",
            transactionId: "",
            accountHolderName: "",
            chequeDate: "",
            receivedDate: new Date().toISOString().split('T')[0],
            remarks: "",
            carryForward: false
        });
        setShowPayModal(true);
    };

    const handleRecordPayment = async (overrideData = null) => {
        const dataToSubmit = overrideData || payFormData;

        // Validation for Online/Digital/Bank methods
        const mandatoryRefMethods = ['UPI', 'CARD', 'BANK_TRANSFER'];
        if (mandatoryRefMethods.includes(dataToSubmit.paymentMethod) && !dataToSubmit.transactionId?.trim()) {
            toast.error(`Transaction ID / Ref is mandatory for ${dataToSubmit.paymentMethod} payments`);
            return;
        }


        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/admission/${activeAdmissionId}/payment/${activeInstallment.installmentNumber}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(dataToSubmit)
                }
            );

            if (response.ok) {
                const data = await response.json();
                toast.success(dataToSubmit.paymentMethod === "CHEQUE" ? "Cheque recorded! Pending clearance." : "Payment successful!");
                setShowPayModal(false);

                // Show bill generator (Acknowledgement for cheques, Bill for others)
                setBillModal({
                    show: true,
                    admission: data.admission,
                    installment: {
                        installmentNumber: activeInstallment.installmentNumber,
                        amount: activeInstallment.amount,
                        paidAmount: dataToSubmit.paidAmount,
                        paidDate: new Date(),
                        receivedDate: dataToSubmit.receivedDate,
                        paymentMethod: dataToSubmit.paymentMethod,
                        transactionId: dataToSubmit.transactionId,
                        status: dataToSubmit.paymentMethod === "CHEQUE" ? "PENDING_CLEARANCE" : "PAID"
                    }
                });

                // Refresh financial details
                handleSelectStudent(selectedStudent.studentId);
                // Refresh list
                fetchAdmissions();
            } else {
                const err = await response.json();
                toast.error(
                    err.message.includes("Access denied")
                        ? "Permission Denied. You need 'Installment Payment' (Finance) or 'Enrolled Students' (Admissions) permission."
                        : err.message || "Failed to record payment"
                );
            }
        } catch (error) {
            console.error("Payment Error:", error);
            toast.error("Error connecting to server");
        }
    };

    // React-select custom styles — theme-aware
    const selectStyles = {
        control: (base) => ({
            ...base,
            backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.4)' : '#ffffff',
            borderColor: isDarkMode ? '#1f2937' : '#e5e7eb',
            borderRadius: '0.75rem',
            padding: '0.25rem',
            '&:hover': { borderColor: 'rgba(6, 182, 212, 0.5)' }
        }),
        menu: (base) => ({
            ...base,
            backgroundColor: isDarkMode ? '#131619' : '#ffffff',
            border: isDarkMode ? '1px solid #1f2937' : '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            overflow: 'hidden'
        }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isFocused ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
            color: state.isFocused ? '#06b6d4' : isDarkMode ? '#9ca3af' : '#374151',
            fontWeight: 'bold',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            '&:active': { backgroundColor: 'rgba(6, 182, 212, 0.2)' }
        }),
        multiValue: (base) => ({
            ...base,
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
            borderRadius: '0.5rem',
            border: '1px solid rgba(6, 182, 212, 0.3)'
        }),
        multiValueLabel: (base) => ({
            ...base,
            color: '#06b6d4',
            fontWeight: 'bold',
            fontSize: '0.65rem',
            textTransform: 'uppercase',
            padding: '0.25rem 0.5rem'
        }),
        multiValueRemove: (base) => ({
            ...base,
            color: '#06b6d4',
            '&:hover': { backgroundColor: '#06b6d4', color: '#000' }
        }),
        placeholder: (base) => ({
            ...base,
            color: '#6b7280',
            fontWeight: 'bold',
            fontSize: '0.75rem',
            textTransform: 'uppercase'
        }),
        input: (base) => ({
            ...base,
            color: isDarkMode ? '#fff' : '#111827',
            fontWeight: 'bold',
            fontSize: '0.75rem'
        })
    };

    return (
        <Layout activePage="Finance & Fees">
            <div className="p-4 md:p-10 max-w-[1800px] mx-auto min-h-screen pb-20">
                {/* Header */}
                <div className="mb-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div>
                        <h1 className={`text-4xl font-black italic uppercase tracking-tighter mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Installment <span className="text-cyan-500">Payment</span>
                        </h1>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                            {selectedStudent ? "Financial Details for " + selectedStudent.name : "Manage Student Payments & Financial Records"}
                        </p>

                    </div>


                    {!selectedStudent && (
                        <div className="flex flex-col xl:flex-row gap-4">
                            {/* Financial Summary Card */}
                            <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'} border rounded-2xl p-5 flex flex-col justify-between flex-1 min-w-[540px] shadow-sm`}>
                                <div className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Financial Summary</div>
                                <div className="flex justify-between items-center gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[8px] font-black text-gray-500 uppercase tracking-wider mb-1 truncate" title="Total Installment Fees Amount">Total Installment Fees Amount</div>
                                        <div className={`text-base xl:text-lg font-black italic truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{Math.round(stats.totalFees).toLocaleString('en-IN')}</div>
                                    </div>
                                    <div className={`flex-1 border-x px-3 min-w-0 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                                        <div className="text-[8px] font-black text-emerald-500/70 uppercase tracking-wider mb-1 truncate" title="Total Installment Amount Paid As Of Now">Total Installment Amount Paid As Of Now</div>
                                        <div className="text-base xl:text-lg font-black text-emerald-500 italic truncate">₹{Math.round(stats.totalPaid).toLocaleString('en-IN')}</div>
                                    </div>
                                    <div className="flex-1 text-right pl-3 min-w-0">
                                        <div className="text-[8px] font-black text-red-500/70 uppercase tracking-wider mb-1 truncate" title="Total Installment Due As Of Now">Total Installment Due As Of Now</div>
                                        <div className="text-base xl:text-lg font-black text-red-500 italic truncate">₹{Math.round(stats.totalDue).toLocaleString('en-IN')}</div>
                                    </div>
                                </div>
                                <div className={`mt-3 h-1 rounded-full overflow-hidden flex ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                                    <div
                                        className="h-full bg-emerald-500"
                                        style={{
                                            width: `${(stats.totalPaid / (stats.totalFees || 1)) * 100}%`
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Payment Analytics Card */}
                            <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'} border rounded-2xl p-4 flex-1 min-w-[420px] shadow-sm`}>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Payment Analytics</div>
                                <ResponsiveContainer width="100%" height={90}>
                                    <BarChart
                                        data={[
                                            {
                                                name: 'Installment Completed',
                                                amount: Math.round(stats.totalPaid),
                                                color: '#10b981'
                                            },
                                            {
                                                name: 'Installment Due Amount',
                                                amount: Math.round(stats.totalDue),
                                                color: '#ef4444'
                                            }
                                        ]}
                                        margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            stroke="#6b7280"
                                            style={{ fontSize: '10px', fontWeight: 'bold' }}
                                            tick={{ fill: '#9ca3af' }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            stroke="#6b7280"
                                            style={{ fontSize: '9px' }}
                                            tick={{ fill: '#9ca3af' }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(val) => val >= 10000000 ? `₹${(val / 10000000).toFixed(1)}Cr` : val >= 100000 ? `₹${(val / 100000).toFixed(1)}L` : val >= 1000 ? `₹${(val / 1000).toFixed(0)}K` : `₹${val}`}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-[#1f2937] border border-gray-700 p-3 rounded-xl shadow-2xl text-white min-w-[160px] animate-fade-in pointer-events-none">
                                                            <div className="font-black text-xs border-b border-gray-700 pb-1.5 mb-2 uppercase tracking-wider" style={{ color: data.color }}>
                                                                {data.name}
                                                            </div>
                                                            <div className="text-[11px] font-bold text-gray-300 flex justify-between gap-4 py-0.5">
                                                                <span>Total Amount:</span>
                                                                <span className="text-white font-black">₹{data.amount?.toLocaleString('en-IN')}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                                            {
                                                [
                                                    { name: 'Installment Completed', color: '#10b981' },
                                                    { name: 'Installment Due Amount', color: '#ef4444' }
                                                ].map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                                                ))
                                            }
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {selectedStudent && (
                        <button
                            onClick={() => {
                                setFinancialData(null);
                                setSelectedStudent(null);
                            }}
                            className="px-6 py-3 bg-gray-800 text-gray-300 font-bold uppercase text-xs rounded-xl hover:bg-gray-700 transition-all border border-gray-700"
                        >
                            Back to Student List
                        </button>
                    )}
                </div>

                {/* ─── Tab Navigation ─── */}
                {!selectedStudent && (
                    <div className={`flex items-center gap-1 p-1 rounded-2xl border mb-8 w-fit ${isDarkMode ? 'bg-gray-900/60 border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
                        <button
                            onClick={() => setActiveTab('regular')}
                            className={`px-5 py-2.5 rounded-xl font-black uppercase text-xs tracking-widest transition-all ${activeTab === 'regular'
                                    ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                                    : isDarkMode ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-800 hover:bg-white'
                                }`}
                        >
                            📋 Regular Installment
                        </button>
                        <button
                            onClick={() => setActiveTab('boardCourse')}
                            className={`px-5 py-2.5 rounded-xl font-black uppercase text-xs tracking-widest transition-all ${activeTab === 'boardCourse'
                                    ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                                    : isDarkMode ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-800 hover:bg-white'
                                }`}
                        >
                            🎓 Board Course Admission Installment
                        </button>
                    </div>
                )}

                {/* ─── Board Course Admission Tab Content ─── */}
                {!selectedStudent && activeTab === 'boardCourse' && (
                    <div>
                        {/* Board Admission Filters */}
                        <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'} border rounded-3xl p-6 mb-8 shadow-sm`}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 items-end">
                                {/* Date Range */}
                                <div className="lg:col-span-1">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Installment From</label>
                                    <input
                                        type="date"
                                        value={boardFilters.startDate}
                                        onChange={(e) => setBoardFilters(prev => ({ ...prev, startDate: e.target.value }))}
                                        className={`w-full border rounded-xl py-3 px-4 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all ${isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                                    />
                                </div>
                                <div className="lg:col-span-1">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Installment To</label>
                                    <input
                                        type="date"
                                        value={boardFilters.endDate}
                                        onChange={(e) => setBoardFilters(prev => ({ ...prev, endDate: e.target.value }))}
                                        className={`w-full border rounded-xl py-3 px-4 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all ${isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                                    />
                                </div>

                                {/* Department Filter - Multi-select */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Department</label>
                                    <Select
                                        isMulti
                                        options={[...new Set(boardAdmissionsList.map(a => a.programme).filter(Boolean))].sort().map(p => ({ value: p, label: p }))}
                                        value={boardFilters.department.map(val => ({ value: val, label: val }))}
                                        onChange={(selected) => setBoardFilters(prev => ({ ...prev, department: selected ? selected.map(s => s.value) : [] }))}
                                        styles={selectStyles}
                                        placeholder="ALL DEPARTMENTS"
                                        isClearable
                                    />
                                </div>

                                {/* Course Filter - Multi-select */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Course</label>
                                    <Select
                                        isMulti
                                        options={[...new Set(boardAdmissionsList.map(a => a.boardCourseName).filter(Boolean))].sort().map(c => ({ value: c, label: c }))}
                                        value={boardFilters.course.map(val => ({ value: val, label: val }))}
                                        onChange={(selected) => setBoardFilters(prev => ({ ...prev, course: selected ? selected.map(s => s.value) : [] }))}
                                        styles={selectStyles}
                                        placeholder="ALL COURSES"
                                        isClearable
                                    />
                                </div>

                                {/* Centre Filter - Multi-select */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Centre</label>
                                    <Select
                                        isMulti
                                        options={[...new Set(boardAdmissionsList.map(a => a.centre).filter(Boolean))].sort().map(c => ({ value: c, label: c }))}
                                        value={boardFilters.centre.map(val => ({ value: val, label: val }))}
                                        onChange={(selected) => setBoardFilters(prev => ({ ...prev, centre: selected ? selected.map(s => s.value) : [] }))}
                                        styles={selectStyles}
                                        placeholder="ALL CENTRES"
                                        isClearable
                                    />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setBoardCurrentPage(1); }}
                                        className="flex-1 py-3 bg-cyan-500 text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-cyan-400 transition-all"
                                    >
                                        Apply
                                    </button>
                                    <button
                                        onClick={exportBoardToExcel}
                                        className="p-3 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 rounded-xl hover:bg-emerald-500 hover:text-black transition-all"
                                        title="Export Excel"
                                    >
                                        <FaDownload />
                                    </button>
                                </div>
                            </div>

                            {/* Additional Filters: Amount Range */}
                            <div className={`mt-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-end border-t pt-6 ${isDarkMode ? 'border-gray-800/50' : 'border-gray-200'}`}>
                                <div className={`md:col-span-2 flex items-center gap-4 p-4 rounded-2xl border ${isDarkMode ? 'bg-black/20 border-gray-800/50' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Min Remaining Fee</label>
                                        <input
                                            type="number"
                                            placeholder="₹ Min (e.g. 5000)"
                                            value={boardFilters.minRemaining}
                                            onChange={(e) => setBoardFilters(prev => ({ ...prev, minRemaining: e.target.value }))}
                                            className={`w-full border rounded-xl py-2 px-4 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all ${isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                        />
                                    </div>
                                    <div className="text-gray-700 mt-6">-</div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Max Remaining Fee</label>
                                        <input
                                            type="number"
                                            placeholder="₹ Max (e.g. 50000)"
                                            value={boardFilters.maxRemaining}
                                            onChange={(e) => setBoardFilters(prev => ({ ...prev, maxRemaining: e.target.value }))}
                                            className={`w-full border rounded-xl py-2 px-4 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all ${isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-1">
                                    <div className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-[0.2em] ml-1">Installment Status</div>
                                    <Select
                                        isMulti
                                        options={statusOptions}
                                        value={statusOptions.filter(opt => boardFilters.installmentStatus.includes(opt.value))}
                                        onChange={(selected) => setBoardFilters(prev => ({ ...prev, installmentStatus: selected ? selected.map(s => s.value) : [] }))}
                                        placeholder="FILTER STATUS..."
                                        styles={selectStyles}
                                    />
                                </div>

                                <div className="md:col-span-1 self-end">
                                    <button
                                        onClick={resetBoardFilters}
                                        className={`w-full py-4 font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl transition-all border flex items-center justify-center gap-2 ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 border-gray-300'}`}
                                    >
                                        <FaEraser /> Reset All Filters
                                    </button>
                                </div>
                            </div>

                            {/* Text Search & Items Per Page */}
                            <div className="mt-8 flex flex-col md:flex-row gap-4">
                                <div className="relative group flex-1">
                                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-cyan-500 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="SEARCH BY STUDENT NAME, ADMISSION NO, MOBILE..."
                                        value={boardFilters.searchTerm}
                                        onChange={(e) => setBoardFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                                        className={`w-full border rounded-2xl py-4 pl-12 pr-4 font-bold text-sm uppercase tracking-wider outline-none focus:border-cyan-500/50 transition-all ${isDarkMode ? 'bg-black/20 border-gray-800 text-gray-200 focus:bg-black/40' : 'bg-gray-50 border-gray-300 text-gray-700 focus:bg-white'}`}
                                    />
                                </div>
                                <div className="w-full md:w-64">
                                    <Select
                                        options={itemsPerPageOptions}
                                        value={itemsPerPageOptions.find(opt => opt.value === boardItemsPerPage)}
                                        onChange={(opt) => {
                                            setBoardItemsPerPage(opt.value);
                                            setBoardCurrentPage(1);
                                        }}
                                        styles={selectStyles}
                                        isSearchable={false}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Board Admissions Table */}
                        {(() => {
                            const totalPages = Math.ceil(displayedBoardList.length / boardItemsPerPage);
                            const paginated = displayedBoardList.slice((boardCurrentPage - 1) * boardItemsPerPage, boardCurrentPage * boardItemsPerPage);

                            return (
                                <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'} border rounded-3xl overflow-hidden shadow-2xl`}>
                                    {/* Summary Stats */}
                                    <div className={`px-6 py-4 border-b flex flex-wrap gap-6 items-center ${isDarkMode ? 'border-gray-800 bg-gray-900/30' : 'border-gray-100 bg-gray-50'}`}>
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                                {isBoardDetailedView ? "Total Installments" : "Total Students"}
                                            </div>
                                            <div className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{displayedBoardList.length}</div>
                                        </div>
                                        <div className={`w-px h-8 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`} />
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Total Expected</div>
                                            <div className="text-xl font-black text-cyan-500">₹{Math.round(stats.totalFees).toLocaleString('en-IN')}</div>
                                        </div>
                                        <div className={`w-px h-8 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`} />
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Total Collected</div>
                                            <div className="text-xl font-black text-emerald-500">₹{Math.round(stats.totalPaid).toLocaleString('en-IN')}</div>
                                        </div>
                                        <div className={`w-px h-8 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`} />
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Total Due</div>
                                            <div className="text-xl font-black text-red-500">₹{Math.round(stats.totalDue).toLocaleString('en-IN')}</div>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className={`border-b ${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                                    <th className={`p-5 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{isBoardDetailedView ? "Installment Due" : "Admission No."}</th>
                                                    <th className={`p-5 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Student</th>
                                                    <th className={`p-5 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{isBoardDetailedView ? "Course / Dept" : "Board Course"}</th>
                                                    <th className={`p-5 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Centre</th>
                                                    <th className={`p-5 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{isBoardDetailedView ? "Inst. Amount" : "Financials"}</th>
                                                    <th className={`p-5 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{isBoardDetailedView ? "Inst. Status" : "Installment Progress"}</th>
                                                    {/* {isBoardDetailedView && (
                                                        <th className={`p-5 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Admission Status</th>
                                                    )} */}
                                                    <th className={`p-5 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-right`}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                                                {boardLoading ? (
                                                    <tr>
                                                        <td colSpan={isBoardDetailedView ? 8 : 7} className="p-20 text-center">
                                                            <div className="flex justify-center flex-col items-center gap-4">
                                                                <div className="animate-spin h-10 w-10 border-4 border-cyan-500 border-t-transparent rounded-full shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
                                                                <span className="text-gray-500 font-black uppercase tracking-widest text-xs animate-pulse">Loading Board Admissions...</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : paginated.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={isBoardDetailedView ? 8 : 7} className="p-20 text-center italic text-gray-600 font-bold uppercase tracking-widest">No board admission records found</td>
                                                    </tr>
                                                ) : paginated.map((item, idx) => {
                                                    if (isBoardDetailedView) {
                                                        const isFullyPaid = item.admissionRemaining < 1;
                                                        return (
                                                            <tr
                                                                key={idx}
                                                                className="hover:bg-cyan-500/5 transition-all cursor-pointer group"
                                                                onClick={() => navigate(`/manage-board-admission/${item.boardCourseAdmissionId}`)}
                                                            >
                                                                <td className="p-5">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-500 font-black text-xs">Month {item.monthNumber}</span>
                                                                        <span className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{new Date(item.dueDate).toLocaleDateString('en-GB')}</span>
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-500 mt-1 uppercase font-bold">{item.admissionNumber}</div>
                                                                </td>
                                                                <td className="p-5">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-black font-black uppercase">
                                                                            {item.studentName?.charAt(0) || "S"}
                                                                        </div>
                                                                        <div>
                                                                            <div className={`font-black uppercase text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.studentName}</div>
                                                                            <div className="text-[10px] text-gray-500 mt-0.5">{item.mobile} • {item.email}</div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-5">
                                                                    <div className={`font-bold text-xs uppercase ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>{item.course}</div>
                                                                    <div className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-tighter">{item.department}</div>
                                                                </td>
                                                                <td className="p-5">
                                                                    <span className={`text-xs font-black uppercase px-2 py-1 rounded-lg ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{item.centre || 'N/A'}</span>
                                                                </td>
                                                                <td className="p-5">
                                                                    <div className="space-y-1">
                                                                        <div className="text-[11px] flex justify-between gap-3">
                                                                            <span className="text-gray-500 font-bold">DUE:</span>
                                                                            <span className={`font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{parseFloat(item.payableAmount || item.amount || 0).toLocaleString()}</span>
                                                                        </div>
                                                                        <div className={`text-[11px] flex justify-between gap-3 border-t pt-1 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                                                                            <span className="text-emerald-500 font-bold">PAID:</span>
                                                                            <span className="text-emerald-500 font-black">₹{parseFloat(item.paidAmount || 0).toLocaleString()}</span>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-5">
                                                                    {getStatusBadge(item.status)}
                                                                </td>
                                                                {/* <td className="p-5">
                                                                    {getStatusBadge(isFullyPaid ? "PAID" : "PENDING")}
                                                                </td> */}
                                                                <td className="p-5 text-right">
                                                                    <button
                                                                        onClick={e => { e.stopPropagation(); navigate(`/manage-board-admission/${item.boardCourseAdmissionId}`); }}
                                                                        className="px-4 py-2 bg-cyan-500/10 text-cyan-500 border border-cyan-500/30 rounded-xl font-black text-[10px] uppercase hover:bg-cyan-500 hover:text-black transition-all"
                                                                    >
                                                                        Manage
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    }

                                                    const adm = item;
                                                    const studentName = adm.studentId?.studentsDetails?.[0]?.studentName || adm.studentName || 'N/A';
                                                    const mobile = adm.studentId?.studentsDetails?.[0]?.mobileNum || adm.mobileNum || 'N/A';
                                                    const totalInstallments = adm.installments?.length || 0;
                                                    const paidInstallments = adm.installments?.filter(i => i.status === 'PAID').length || 0;
                                                    const progressPct = totalInstallments > 0 ? Math.round((paidInstallments / totalInstallments) * 100) : 0;
                                                    const totalExpected = adm.totalExpectedAmount || 0;
                                                    const totalPaid = adm.totalPaidAmount || 0;
                                                    const totalDue = Math.max(0, totalExpected - totalPaid);
                                                    const isFullyPaid = totalDue < 1;

                                                    return (
                                                        <tr
                                                            key={adm._id}
                                                            className="hover:bg-cyan-500/5 transition-all cursor-pointer group"
                                                            onClick={() => navigate(`/manage-board-admission/${adm._id}`)}
                                                        >
                                                            <td className="p-5">
                                                                <span className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-400 font-black text-xs uppercase">{adm.admissionNumber || '—'}</span>
                                                                <div className="text-[10px] text-gray-500 mt-1 font-bold uppercase">{adm.programme || ''} · {adm.lastClass || ''}</div>
                                                            </td>
                                                            <td className="p-5">
                                                                <div className={`font-black text-sm uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'} group-hover:text-cyan-500 transition-colors`}>{studentName}</div>
                                                                <div className="text-[10px] text-gray-500 font-bold mt-0.5">{mobile}</div>
                                                            </td>
                                                            <td className="p-5">
                                                                <div className={`text-xs font-bold line-clamp-2 max-w-[220px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} title={adm.boardCourseName}>
                                                                    {adm.boardCourseName || '—'}
                                                                </div>
                                                                <div className="text-[10px] text-gray-500 font-bold mt-1 uppercase">{adm.academicSession || ''}</div>
                                                            </td>
                                                            <td className="p-5">
                                                                <span className={`text-xs font-black uppercase px-2 py-1 rounded-lg ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{adm.centre || 'N/A'}</span>
                                                            </td>
                                                            <td className="p-5">
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-2 text-[10px] font-bold">
                                                                        <span className="text-gray-500 uppercase">Expected:</span>
                                                                        <span className={`font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{Math.round(totalExpected).toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-[10px] font-bold">
                                                                        <span className="text-gray-500 uppercase">Paid:</span>
                                                                        <span className="text-emerald-500 font-black">₹{Math.round(totalPaid).toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-[10px] font-bold">
                                                                        <span className="text-gray-500 uppercase">Due:</span>
                                                                        <span className={`font-black ${isFullyPaid ? 'text-emerald-500' : 'text-red-500'}`}>₹{Math.round(totalDue).toLocaleString('en-IN')}</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-5">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                                                                        <div
                                                                            className={`h-full rounded-full transition-all ${isFullyPaid ? 'bg-emerald-500' : 'bg-cyan-500'}`}
                                                                            style={{ width: `${progressPct}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className={`text-[10px] font-black whitespace-nowrap ${isFullyPaid ? 'text-emerald-500' : isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                                        {paidInstallments}/{totalInstallments}
                                                                    </span>
                                                                </div>
                                                                <div className="text-[10px] text-gray-500 font-bold mt-1 uppercase">{progressPct}% complete</div>
                                                            </td>
                                                            <td className="p-5 text-right">
                                                                <button
                                                                    onClick={e => { e.stopPropagation(); navigate(`/manage-board-admission/${adm._id}`); }}
                                                                    className="px-4 py-2 bg-cyan-500/10 text-cyan-500 border border-cyan-500/30 rounded-xl font-black text-[10px] uppercase hover:bg-cyan-500 hover:text-black transition-all"
                                                                >
                                                                    Manage
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Board Pagination */}
                                    {totalPages > 1 && (
                                        <div className={`px-6 py-4 border-t flex items-center justify-between ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                            <div className="text-[11px] font-bold text-gray-500 uppercase">
                                                Showing {Math.min((boardCurrentPage - 1) * boardItemsPerPage + 1, displayedBoardList.length)}–{Math.min(boardCurrentPage * boardItemsPerPage, displayedBoardList.length)} of {displayedBoardList.length}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setBoardCurrentPage(p => Math.max(1, p - 1))}
                                                    disabled={boardCurrentPage === 1}
                                                    className={`px-4 py-2 rounded-xl font-black text-xs uppercase transition-all border ${boardCurrentPage === 1 ? (isDarkMode ? 'opacity-30 border-gray-800 text-gray-600' : 'opacity-30 border-gray-200 text-gray-400') : (isDarkMode ? 'border-gray-700 text-gray-300 hover:border-cyan-500 hover:text-cyan-500' : 'border-gray-300 text-gray-600 hover:border-cyan-500 hover:text-cyan-500')}`}
                                                >← Prev</button>
                                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                    const page = boardCurrentPage <= 3 ? i + 1 : boardCurrentPage + i - 2;
                                                    if (page < 1 || page > totalPages) return null;
                                                    return (
                                                        <button
                                                            key={page}
                                                            onClick={() => setBoardCurrentPage(page)}
                                                            className={`w-10 h-10 rounded-xl font-black text-xs transition-all border ${page === boardCurrentPage
                                                                    ? 'bg-cyan-500 text-black border-cyan-500'
                                                                    : isDarkMode ? 'border-gray-700 text-gray-300 hover:border-cyan-500/50' : 'border-gray-200 text-gray-600 hover:border-cyan-400'
                                                                }`}
                                                        >{page}</button>
                                                    );
                                                })}
                                                <button
                                                    onClick={() => setBoardCurrentPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={boardCurrentPage === totalPages}
                                                    className={`px-4 py-2 rounded-xl font-black text-xs uppercase transition-all border ${boardCurrentPage === totalPages ? (isDarkMode ? 'opacity-30 border-gray-800 text-gray-600' : 'opacity-30 border-gray-200 text-gray-400') : (isDarkMode ? 'border-gray-700 text-gray-300 hover:border-cyan-500 hover:text-cyan-500' : 'border-gray-300 text-gray-600 hover:border-cyan-500 hover:text-cyan-500')}`}
                                                >Next →</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                )}

                {!selectedStudent && activeTab === 'regular' ? (
                    <>
                        {/* Tab Switcher */}
                        <div className="flex justify-start items-center mb-6 gap-2 border-b border-gray-800/40 pb-4">
                            <button
                                onClick={() => setActiveTab("centreSummary")}
                                className={`px-5 py-2.5 rounded-xl font-black uppercase text-xs tracking-widest transition-all ${
                                    activeTab === "centreSummary"
                                        ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
                                        : isDarkMode
                                            ? "bg-[#131619] text-gray-400 hover:text-white border border-gray-800"
                                            : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200"
                                }`}
                            >
                                Centre-wise Summary
                            </button>
                            <button
                                onClick={() => setActiveTab("detailedList")}
                                className={`px-5 py-2.5 rounded-xl font-black uppercase text-xs tracking-widest transition-all ${
                                    activeTab === "detailedList"
                                        ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
                                        : isDarkMode
                                            ? "bg-[#131619] text-gray-400 hover:text-white border border-gray-800"
                                            : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200"
                                }`}
                            >
                                Detailed Payments
                            </button>
                        </div>

                        {activeTab === "centreSummary" && (
                            <>
                                {/* Filters Section */}
                                <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'} border rounded-3xl p-6 mb-8 shadow-sm animate-fade-in`}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 items-end">
                                        {/* Date Range */}
                                        <div className="lg:col-span-1">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Installment From</label>
                                            <input
                                                type="date"
                                                name="startDate"
                                                value={filters.startDate}
                                                onChange={handleFilterChange}
                                                className={`w-full border rounded-xl py-3 px-4 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all ${isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                                            />
                                        </div>
                                        <div className="lg:col-span-1">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Installment To</label>
                                            <input
                                                type="date"
                                                name="endDate"
                                                value={filters.endDate}
                                                onChange={handleFilterChange}
                                                className={`w-full border rounded-xl py-3 px-4 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all ${isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                                            />
                                        </div>

                                        {/* Dept Filter - Multi-select */}
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Department</label>
                                            <Select
                                                isMulti
                                                options={metadata.departments.map(d => ({ value: d._id, label: d.departmentName }))}
                                                value={filters.department.map(id => {
                                                    const dept = metadata.departments.find(d => d._id === id);
                                                    return dept ? { value: dept._id, label: dept.departmentName } : null;
                                                }).filter(Boolean)}
                                                onChange={(selected) => setFilters(prev => ({ ...prev, department: selected ? selected.map(s => s.value) : [] }))}
                                                styles={selectStyles}
                                                placeholder="ALL DEPARTMENTS"
                                                isClearable
                                            />
                                        </div>

                                        {/* Course Filter - Multi-select */}
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Course</label>
                                            <Select
                                                isMulti
                                                options={metadata.courses.map(c => ({ value: c._id, label: c.courseName }))}
                                                value={filters.course.map(id => {
                                                    const course = metadata.courses.find(c => c._id === id);
                                                    return course ? { value: course._id, label: course.courseName } : null;
                                                }).filter(Boolean)}
                                                onChange={(selected) => setFilters(prev => ({ ...prev, course: selected ? selected.map(s => s.value) : [] }))}
                                                styles={selectStyles}
                                                placeholder="ALL COURSES"
                                                isClearable
                                            />
                                        </div>

                                        {/* Centre Filter - Multi-select */}
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Centre</label>
                                            <Select
                                                isMulti
                                                options={metadata.centres.map(c => ({ value: c.centreName, label: c.centreName }))}
                                                value={filters.centre.map(name => ({ value: name, label: name }))}
                                                onChange={(selected) => setFilters(prev => ({ ...prev, centre: selected ? selected.map(s => s.value) : [] }))}
                                                styles={selectStyles}
                                                placeholder="ALL CENTRES"
                                                isClearable
                                            />
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => fetchAdmissions()}
                                                className="flex-1 py-3 bg-cyan-500 text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-cyan-400 transition-all"
                                            >
                                                Apply
                                            </button>
                                            <button
                                                onClick={exportCentreSummaryToExcel}
                                                className="p-3 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 rounded-xl hover:bg-emerald-500 hover:text-black transition-all"
                                                title="Export Centre Summary Excel"
                                            >
                                                <FaDownload />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Additional Filters: Amount Range */}
                                    <div className={`mt-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-end border-t pt-6 ${isDarkMode ? 'border-gray-800/50' : 'border-gray-200'}`}>
                                        <div className={`md:col-span-2 flex items-center gap-4 p-4 rounded-2xl border ${isDarkMode ? 'bg-black/20 border-gray-800/50' : 'bg-gray-50 border-gray-200'}`}>
                                            <div className="flex-1">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Min Remaining Fee</label>
                                                <input
                                                    type="number"
                                                    name="minRemaining"
                                                    placeholder="₹ Min (e.g. 5000)"
                                                    value={filters.minRemaining}
                                                    onChange={handleFilterChange}
                                                    className={`w-full border rounded-xl py-2 px-4 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all ${isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                                />
                                            </div>
                                            <div className="text-gray-700 mt-6">-</div>
                                            <div className="flex-1">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Max Remaining Fee</label>
                                                <input
                                                    type="number"
                                                    name="maxRemaining"
                                                    placeholder="₹ Max (e.g. 50000)"
                                                    value={filters.maxRemaining}
                                                    onChange={handleFilterChange}
                                                    className={`w-full border rounded-xl py-2 px-4 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all ${isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                                />
                                            </div>
                                        </div>
                                        <div className="md:col-span-1">
                                            <div className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-[0.2em] ml-1">Installment Status</div>
                                            <Select
                                                isMulti
                                                options={statusOptions}
                                                value={statusOptions.filter(opt => filters.installmentStatus.includes(opt.value))}
                                                onChange={(selected) => setFilters(prev => ({ ...prev, installmentStatus: selected ? selected.map(s => s.value) : [] }))}
                                                placeholder="FILTER STATUS..."
                                                styles={selectStyles}
                                            />
                                        </div>

                                        <div className="md:col-span-1 self-end">
                                            <button
                                                onClick={resetFilters}
                                                className={`w-full py-4 font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl transition-all border flex items-center justify-center gap-2 ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 border-gray-300'}`}
                                            >
                                                <FaEraser /> Reset All Filters
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'} border rounded-3xl overflow-hidden shadow-2xl`}>
                                    <div className="p-6 border-b border-gray-800/40 flex justify-between items-center">
                                        <h3 className={`text-lg font-black uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                            Centre-wise Installment Summary
                                        </h3>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-cyan-500/10 text-cyan-500 px-3 py-1 rounded-full">
                                            Total Centres: {centreStats.length}
                                        </span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className={`border-b ${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                                    <th className={`p-6 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Centre Name</th>
                                                    <th className={`p-6 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Installment Amount</th>
                                                    <th className={`p-6 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Paid Amount</th>
                                                    <th className={`p-6 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Remaining Amount</th>
                                                    <th className={`p-6 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Recovery Progress</th>
                                                </tr>
                                            </thead>
                                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                                                {loading ? (
                                                    <tr>
                                                        <td colSpan="5" className="p-20 text-center">
                                                            <div className="flex justify-center flex-col items-center gap-4">
                                                                <div className="animate-spin h-10 w-10 border-4 border-cyan-500 border-t-transparent rounded-full shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
                                                                <span className="text-gray-500 font-black uppercase tracking-widest text-xs animate-pulse">Loading Data...</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : centreStats.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="5" className="p-20 text-center italic text-gray-600 font-bold uppercase tracking-widest">No center summary data found</td>
                                                    </tr>
                                                ) : (
                                                    centreStats.map((c, idx) => {
                                                        const progress = c.totalFees > 0 ? (c.totalPaid / c.totalFees) * 100 : 0;
                                                        return (
                                                            <tr key={idx} className="hover:bg-cyan-500/5 transition-all">
                                                                <td className="p-6">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest ${isDarkMode ? 'bg-gray-800/50 border border-gray-700/50 text-gray-200' : 'bg-gray-100 border border-gray-200 text-gray-700'}`}>
                                                                            <FaMapMarkerAlt className="text-cyan-500" />
                                                                            {c.name}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-6 font-black text-sm">
                                                                    <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>₹{Math.round(c.totalFees).toLocaleString('en-IN')}</span>
                                                                </td>
                                                                <td className="p-6 font-black text-sm text-emerald-500">
                                                                    ₹{Math.round(c.totalPaid).toLocaleString('en-IN')}
                                                                </td>
                                                                <td className="p-6 font-black text-sm text-red-500">
                                                                    ₹{Math.round(c.totalDue).toLocaleString('en-IN')}
                                                                </td>
                                                                <td className="p-6">
                                                                    <div className="flex items-center gap-3 min-w-[150px]">
                                                                        <div className={`flex-1 h-2 rounded-full overflow-hidden flex ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                                                                            <div 
                                                                                className="h-full bg-emerald-500 rounded-full" 
                                                                                style={{ width: `${progress}%` }} 
                                                                            />
                                                                        </div>
                                                                        <span className="text-[10px] font-black text-emerald-500">{Math.round(progress)}%</span>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === "detailedList" && (
                            <>
                                {/* Filters Section */}
                                <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'} border rounded-3xl p-6 mb-8 shadow-sm`}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 items-end">
                                        {/* Date Range */}
                                        <div className="lg:col-span-1">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Installment From</label>
                                            <input
                                                type="date"
                                                name="startDate"
                                                value={filters.startDate}
                                                onChange={handleFilterChange}
                                                className={`w-full border rounded-xl py-3 px-4 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all ${isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                                            />
                                        </div>
                                        <div className="lg:col-span-1">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Installment To</label>
                                            <input
                                                type="date"
                                                name="endDate"
                                                value={filters.endDate}
                                                onChange={handleFilterChange}
                                                className={`w-full border rounded-xl py-3 px-4 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all ${isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                                            />
                                        </div>

                                        {/* Dept Filter - Multi-select */}
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Department</label>
                                            <Select
                                                isMulti
                                                options={metadata.departments.map(d => ({ value: d._id, label: d.departmentName }))}
                                                value={filters.department.map(id => {
                                                    const dept = metadata.departments.find(d => d._id === id);
                                                    return dept ? { value: dept._id, label: dept.departmentName } : null;
                                                }).filter(Boolean)}
                                                onChange={(selected) => setFilters(prev => ({ ...prev, department: selected ? selected.map(s => s.value) : [] }))}
                                                styles={selectStyles}
                                                placeholder="ALL DEPARTMENTS"
                                                isClearable
                                            />
                                        </div>

                                        {/* Course Filter - Multi-select */}
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Course</label>
                                            <Select
                                                isMulti
                                                options={metadata.courses.map(c => ({ value: c._id, label: c.courseName }))}
                                                value={filters.course.map(id => {
                                                    const course = metadata.courses.find(c => c._id === id);
                                                    return course ? { value: course._id, label: course.courseName } : null;
                                                }).filter(Boolean)}
                                                onChange={(selected) => setFilters(prev => ({ ...prev, course: selected ? selected.map(s => s.value) : [] }))}
                                                styles={selectStyles}
                                                placeholder="ALL COURSES"
                                                isClearable
                                            />
                                        </div>

                                        {/* Centre Filter - Multi-select */}
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Centre</label>
                                            <Select
                                                isMulti
                                                options={metadata.centres.map(c => ({ value: c.centreName, label: c.centreName }))}
                                                value={filters.centre.map(name => ({ value: name, label: name }))}
                                                onChange={(selected) => setFilters(prev => ({ ...prev, centre: selected ? selected.map(s => s.value) : [] }))}
                                                styles={selectStyles}
                                                placeholder="ALL CENTRES"
                                                isClearable
                                            />
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => fetchAdmissions()}
                                                className="flex-1 py-3 bg-cyan-500 text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-cyan-400 transition-all"
                                            >
                                                Apply
                                            </button>
                                            <button
                                                onClick={exportToExcel}
                                                className="p-3 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 rounded-xl hover:bg-emerald-500 hover:text-black transition-all"
                                                title="Export Excel"
                                            >
                                                <FaDownload />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Additional Filters: Amount Range */}
                                    <div className={`mt-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-end border-t pt-6 ${isDarkMode ? 'border-gray-800/50' : 'border-gray-200'}`}>
                                        <div className={`md:col-span-2 flex items-center gap-4 p-4 rounded-2xl border ${isDarkMode ? 'bg-black/20 border-gray-800/50' : 'bg-gray-50 border-gray-200'}`}>
                                            <div className="flex-1">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Min Remaining Fee</label>
                                                <input
                                                    type="number"
                                                    name="minRemaining"
                                                    placeholder="₹ Min (e.g. 5000)"
                                                    value={filters.minRemaining}
                                                    onChange={handleFilterChange}
                                                    className={`w-full border rounded-xl py-2 px-4 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all ${isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                                />
                                            </div>
                                            <div className="text-gray-700 mt-6">-</div>
                                            <div className="flex-1">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Max Remaining Fee</label>
                                                <input
                                                    type="number"
                                                    name="maxRemaining"
                                                    placeholder="₹ Max (e.g. 50000)"
                                                    value={filters.maxRemaining}
                                                    onChange={handleFilterChange}
                                                    className={`w-full border rounded-xl py-2 px-4 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all ${isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                                />
                                            </div>
                                        </div>
                                        <div className="md:col-span-1">
                                            <div className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-[0.2em] ml-1">Installment Status</div>
                                            <Select
                                                isMulti
                                                options={statusOptions}
                                                value={statusOptions.filter(opt => filters.installmentStatus.includes(opt.value))}
                                                onChange={(selected) => setFilters(prev => ({ ...prev, installmentStatus: selected ? selected.map(s => s.value) : [] }))}
                                                placeholder="FILTER STATUS..."
                                                styles={selectStyles}
                                            />
                                        </div>

                                        <div className="md:col-span-1 self-end">
                                            <button
                                                onClick={resetFilters}
                                                className={`w-full py-4 font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl transition-all border flex items-center justify-center gap-2 ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 border-gray-300'}`}
                                            >
                                                <FaEraser /> Reset All Filters
                                            </button>
                                        </div>
                                    </div>

                                    {/* Text Search & Items Per Page */}
                                    <div className="mt-8 flex flex-col md:flex-row gap-4">
                                        <div className="relative group flex-1">
                                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-cyan-500 transition-colors" />
                                            <input
                                                type="text"
                                                name="searchTerm"
                                                placeholder="SEARCH BY NAME, EMAIL, OR ADMISSION NUMBER..."
                                                value={filters.searchTerm}
                                                onChange={handleFilterChange}
                                                onKeyPress={(e) => e.key === "Enter" && fetchAdmissions()}
                                                className={`w-full border rounded-2xl py-4 pl-12 pr-4 font-bold text-sm uppercase tracking-wider outline-none focus:border-cyan-500/50 transition-all ${isDarkMode ? 'bg-black/20 border-gray-800 text-gray-200 focus:bg-black/40' : 'bg-gray-50 border-gray-300 text-gray-700 focus:bg-white'}`}
                                            />
                                        </div>
                                        <div className="w-full md:w-64">
                                            <Select
                                                options={itemsPerPageOptions}
                                                value={itemsPerPageOptions.find(opt => opt.value === itemsPerPage)}
                                                onChange={(opt) => {
                                                    setItemsPerPage(opt.value);
                                                    setCurrentPage(1);
                                                }}
                                                styles={selectStyles}
                                                isSearchable={false}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Students List Table */}
                                <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'} border rounded-3xl overflow-hidden shadow-2xl`}>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className={`border-b ${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                                    <th className={`p-6 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{isDetailedView ? "Installment Due" : "Enrollment No."}</th>
                                                    <th className={`p-6 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Student</th>
                                                    <th className={`p-6 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Course / Dept</th>
                                                    <th className={`p-6 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Centre</th>
                                                    <th className={`p-6 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{isDetailedView ? "Inst. Amount" : "Financials"}</th>
                                                    <th className={`p-6 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{isDetailedView ? "Inst. Status" : "Payment Status"}</th>
                                                    <th className={`p-6 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{isDetailedView ? "Admission Status" : "Due Status"}</th>
                                                    <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                                                {loading ? (
                                                    <tr>
                                                        <td colSpan="8" className="p-20 text-center">
                                                            <div className="flex justify-center flex-col items-center gap-4">
                                                                <div className="animate-spin h-10 w-10 border-4 border-cyan-500 border-t-transparent rounded-full shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
                                                                <span className="text-gray-500 font-black uppercase tracking-widest text-xs animate-pulse">Loading Data...</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : displayedList.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="8" className="p-20 text-center italic text-gray-600 font-bold uppercase tracking-widest">No records found matching your criteria</td>
                                                    </tr>
                                                ) : (
                                                    displayedList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item, idx) => {
                                                        if (isDetailedView) {
                                                            return (
                                                                <tr
                                                                    key={idx}
                                                                    className="hover:bg-cyan-500/5 transition-all cursor-pointer group"
                                                                    onClick={() => handleSelectStudent(item.studentId)}
                                                                >
                                                                    <td className="p-6">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-500 font-black text-xs">#{item.installmentNumber}</span>
                                                                            <span className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{new Date(item.dueDate).toLocaleDateString('en-GB')}</span>
                                                                        </div>
                                                                        <div className="text-[10px] text-gray-500 mt-1 uppercase font-bold">{item.admissionNumber}</div>
                                                                    </td>
                                                                    <td className="p-6">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-black font-black uppercase">
                                                                                {item.studentName?.charAt(0) || "S"}
                                                                            </div>
                                                                            <div>
                                                                                <div className={`font-black uppercase text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.studentName}</div>
                                                                                <div className="text-[10px] text-gray-500 mt-0.5">{item.mobile} • {item.email}</div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-6">
                                                                        <div className={`font-bold text-xs uppercase ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>{item.course}</div>
                                                                        <div className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-tighter">{item.department}</div>
                                                                    </td>
                                                                    <td className="p-6">
                                                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-gray-800/50 border border-gray-700/50 text-gray-400' : 'bg-gray-100 border border-gray-200 text-gray-600'}`}>
                                                                            <FaMapMarkerAlt className="text-cyan-500" />
                                                                            {item.centre}
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-6">
                                                                        <div className="space-y-1">
                                                                            <div className="text-[11px] flex justify-between gap-3">
                                                                                <span className="text-gray-500 font-bold">DUE:</span>
                                                                                <span className={`font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{parseFloat(item.amount || 0).toLocaleString()}</span>
                                                                            </div>
                                                                            <div className={`text-[11px] flex justify-between gap-3 border-t pt-1 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                                                                                <span className="text-emerald-500 font-bold">PAID:</span>
                                                                                <span className="text-emerald-500 font-black">₹{parseFloat(item.paidAmount || 0).toLocaleString()}</span>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-6">
                                                                        {getStatusBadge(item.status)}
                                                                    </td>
                                                                    <td className="p-6">
                                                                        {getStatusBadge(item.admissionPaymentStatus || "PENDING")}
                                                                    </td>
                                                                    <td className="p-6 text-right">
                                                                        <button className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all border shadow-lg shadow-black/20 text-cyan-500 group-hover:bg-cyan-500 group-hover:text-black group-hover:border-cyan-400 ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-100 border-gray-300'}`}>
                                                                            <FaChevronRight className="text-xs" />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        }

                                                        const adm = item;
                                                        return (
                                                            <tr
                                                                key={idx}
                                                                className="hover:bg-cyan-500/5 transition-all cursor-pointer group"
                                                                onClick={() => handleSelectStudent(adm.studentId)}
                                                            >
                                                                <td className="p-6">
                                                                    <span className="text-cyan-500 font-black font-mono text-sm tracking-tighter">{adm.admissionNumber}</span>
                                                                    <div className="text-[10px] text-gray-500 mt-1 uppercase font-bold">{new Date(adm.admissionDate).toLocaleDateString('en-GB')}</div>
                                                                </td>
                                                                <td className="p-6">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-black font-black uppercase">
                                                                            {adm.studentName.charAt(0)}
                                                                        </div>
                                                                        <div>
                                                                            <div className={`font-black uppercase text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{adm.studentName}</div>
                                                                            <div className="text-[10px] text-gray-500 mt-0.5">{adm.mobile} • {adm.email}</div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-6">
                                                                    <div className={`font-bold text-xs uppercase ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>{adm.course}</div>
                                                                    <div className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-tighter">{adm.department}</div>
                                                                </td>
                                                                <td className="p-6">
                                                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-gray-800/50 border border-gray-700/50 text-gray-400' : 'bg-gray-100 border border-gray-200 text-gray-600'}`}>
                                                                        <FaMapMarkerAlt className="text-cyan-500" />
                                                                        {adm.centre}
                                                                    </div>
                                                                </td>
                                                                <td className="p-6">
                                                                    <div className="space-y-1">
                                                                        <div className="text-[10px] flex justify-between gap-4">
                                                                            <span className="text-gray-500 font-bold">TOTAL:</span>
                                                                            <span className={`font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{adm.totalFees.toLocaleString()}</span>
                                                                        </div>
                                                                        <div className="text-[10px] flex justify-between gap-4">
                                                                            <span className="text-emerald-500 font-bold">PAID:</span>
                                                                            <span className="text-emerald-500 font-black">₹{adm.totalPaid.toLocaleString()}</span>
                                                                        </div>
                                                                        <div className={`text-[10px] flex justify-between gap-4 border-t pt-1 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                                                                            <span className="text-orange-500 font-bold">DUE:</span>
                                                                            <span className="text-orange-500 font-black">₹{adm.remainingAmount.toLocaleString()}</span>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-6">
                                                                    {getStatusBadge(adm.paymentStatus)}
                                                                </td>
                                                                <td className="p-6">
                                                                    {getDueStatusBadge(adm)}
                                                                </td>
                                                                <td className="p-6 text-right">
                                                                    <button className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all border shadow-lg shadow-black/20 text-cyan-500 group-hover:bg-cyan-500 group-hover:text-black group-hover:border-cyan-400 ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-100 border-gray-300'}`}>
                                                                        <FaChevronRight className="text-xs" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    {!loading && displayedList.length > 0 && (
                                        <Pagination
                                            currentPage={currentPage}
                                            totalItems={displayedList.length}
                                            itemsPerPage={itemsPerPage}
                                            onPageChange={setCurrentPage}
                                        />
                                    )}
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    <>
                        {/* Financial Details View (Previously implemented) */}
                        {loading && (
                            <div className="flex justify-center p-20">
                                <div className="animate-spin h-12 w-12 border-t-2 border-cyan-500 rounded-full"></div>
                            </div>
                        )}

                        {!loading && financialData && (
                            <>
                                {/* Student Info Card */}
                                <div className={`border border-cyan-500/20 rounded-[2.5rem] p-8 mb-8 relative overflow-hidden shadow-2xl ${isDarkMode ? 'bg-gradient-to-br from-[#131619] to-[#0a0c0e]' : 'bg-gradient-to-br from-white to-gray-50'}`}>
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] -ml-32 -mb-32"></div>

                                    <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
                                        <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-4xl font-black text-black shadow-xl shadow-cyan-500/20">
                                            {selectedStudent.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 text-center md:text-left">
                                            <h2 className={`text-4xl font-black italic uppercase tracking-tighter mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedStudent.name}</h2>
                                            <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                                <div className={`border px-4 py-2 rounded-xl flex items-center gap-3 ${isDarkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
                                                    <FaEnvelope className="text-cyan-500" />
                                                    <span className={`font-bold text-xs uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{selectedStudent.email}</span>
                                                </div>
                                                <div className={`border px-4 py-2 rounded-xl flex items-center gap-3 ${isDarkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
                                                    <FaPhone className="text-cyan-500" />
                                                    <span className={`font-bold text-xs uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{selectedStudent.mobile}</span>
                                                </div>
                                                <div className={`border px-4 py-2 rounded-xl flex items-center gap-3 ${isDarkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
                                                    <FaMapMarkerAlt className="text-cyan-500" />
                                                    <span className={`font-bold text-xs uppercase ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{selectedStudent.centre}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Summary Stats */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-10">
                                        <div className={`backdrop-blur-xl border rounded-2xl p-5 hover:border-cyan-500/30 transition-all group ${isDarkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 group-hover:text-cyan-500 transition-colors">Total Admissions</div>
                                            <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{financialData.summary.totalAdmissions}</div>
                                        </div>
                                        <div className={`backdrop-blur-xl border rounded-2xl p-5 hover:border-cyan-500/30 transition-all group ${isDarkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 group-hover:text-cyan-500 transition-colors">Total Fees</div>
                                            <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{financialData.summary.totalFeesAcrossAll.toLocaleString()}</div>
                                        </div>
                                        <div className={`backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-5 hover:border-emerald-500/40 transition-all group ${isDarkMode ? 'bg-black/40' : 'bg-emerald-50'}`}>
                                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 text-emerald-500/70">Total Paid</div>
                                            <div className="text-2xl font-black text-emerald-500">₹{financialData.summary.totalPaidAcrossAll.toLocaleString()}</div>
                                        </div>
                                        <div className={`backdrop-blur-xl border border-orange-500/20 rounded-2xl p-5 hover:border-orange-500/40 transition-all group ${isDarkMode ? 'bg-black/40' : 'bg-orange-50'}`}>
                                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 text-orange-500/70">Total Remaining</div>
                                            <div className="text-2xl font-black text-orange-500">₹{financialData.summary.totalRemainingAcrossAll.toLocaleString()}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Admissions List */}
                                {financialData.admissions.map((admission, admIndex) => (
                                    <div key={admIndex} className={`border rounded-[2.5rem] p-8 mb-8 relative overflow-hidden group hover:border-gray-700 transition-all shadow-xl ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'}`}>
                                        {/* Admission Header */}
                                        <div className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 pb-8 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                                            <div className="flex items-center gap-6">
                                                <div className="h-16 w-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-2xl text-cyan-500 group-hover:bg-cyan-500 group-hover:text-black transition-all">
                                                    <FaFileInvoice />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-4 mb-2">
                                                        <h3 className={`text-2xl font-black italic tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{admission.course}</h3>
                                                        {getStatusBadge(admission.paymentStatus)}
                                                    </div>
                                                    <div className="text-xs font-black text-gray-500 uppercase tracking-widest">
                                                        Admission # <span className="text-cyan-500">{admission.admissionNumber}</span> • {admission.academicSession}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-1 gap-4 text-right">
                                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Admission Date</div>
                                                <div className={`font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{new Date(admission.admissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                                            </div>
                                        </div>

                                        {/* Fee Breakdown */}
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                                            <div className={`border rounded-2xl p-4 ${isDarkMode ? 'bg-black/30 border-gray-800/50' : 'bg-gray-50 border-gray-200'}`}>
                                                <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Base Fees</div>
                                                <div className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{admission.baseFees.toLocaleString()}</div>
                                            </div>
                                            <div className={`border rounded-2xl p-4 ${isDarkMode ? 'bg-black/30 border-gray-800/50' : 'bg-gray-50 border-gray-200'}`}>
                                                <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 text-red-500/70">Waiver</div>
                                                <div className="text-lg font-black text-red-500">-₹{admission.discountAmount.toLocaleString()}</div>
                                            </div>
                                            <div className={`border rounded-2xl p-4 ${isDarkMode ? 'bg-black/30 border-gray-800/50' : 'bg-gray-50 border-gray-200'}`}>
                                                <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">GST</div>
                                                <div className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{(admission.cgstAmount + admission.sgstAmount).toLocaleString()}</div>
                                            </div>
                                            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-4">
                                                <div className="text-[9px] font-black text-cyan-500 uppercase tracking-widest mb-2">Net Payable</div>
                                                <div className="text-lg font-black text-cyan-500">₹{admission.totalFees.toLocaleString()}</div>
                                            </div>
                                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex justify-between items-center group/dp">
                                                <div>
                                                    <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2">Down Payment</div>
                                                    <div className="text-lg font-black text-emerald-500">₹{admission.downPayment.toLocaleString()}</div>
                                                </div>
                                                {admission.downPayment > 0 && (
                                                    <button
                                                        onClick={() => setBillModal({
                                                            show: true,
                                                            admission: { ...admission, _id: admission.admissionId },
                                                            installment: {
                                                                installmentNumber: 0,
                                                                amount: admission.downPayment,
                                                                paidAmount: admission.downPayment,
                                                                paidDate: admission.admissionDate,
                                                                paymentMethod: "Admission Payment",
                                                                status: admission.downPaymentStatus || "PAID"
                                                            }
                                                        })}
                                                        className="p-3 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-black rounded-xl border border-emerald-500/20 transition-all opacity-0 group-hover/dp:opacity-100"
                                                        title="Generate Down Payment Receipt"
                                                    >
                                                        <FaFileInvoice className="text-lg" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Board Monthly Subject History */}
                                        {admission.admissionType === "BOARD" && admission.monthlySubjectHistory && admission.monthlySubjectHistory.length > 0 && (
                                            <div className="mb-10">
                                                <h4 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                                    <div className="h-1 w-8 bg-purple-500 rounded-full"></div>
                                                    Monthly Payment History
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {admission.monthlySubjectHistory.map((history, hIdx) => {
                                                        const monthDate = new Date(history.month + "-01");
                                                        const monthName = monthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

                                                        return (
                                                            <div key={hIdx} className={`border rounded-[2rem] p-6 hover:border-purple-500/30 transition-all group/month ${isDarkMode ? 'bg-black/20 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                                                <div className="flex justify-between items-start mb-6">
                                                                    <div>
                                                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Month {hIdx + 1} / {admission.courseDurationMonths || 0}</div>
                                                                        <h5 className={`text-xl font-black italic tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{monthName}</h5>
                                                                    </div>
                                                                    {history.isPaid ? (
                                                                        <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-emerald-500 bg-emerald-500/10 border-emerald-500/20">PAID</span>
                                                                    ) : (
                                                                        <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-orange-500 bg-orange-500/10 border-orange-500/20">PENDING</span>
                                                                    )}
                                                                </div>

                                                                <div className="space-y-3 mb-6">
                                                                    {history.subjects.map((sub, sIdx) => (
                                                                        <div key={sIdx} className="flex justify-between items-center text-[11px]">
                                                                            <span className="text-gray-400 font-bold uppercase tracking-tight">{sub.name}</span>
                                                                            <span className={`font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{sub.price.toLocaleString()}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                <div className={`pt-4 border-t flex justify-between items-center ${isDarkMode ? 'border-gray-800/50' : 'border-gray-200'}`}>
                                                                    <div>
                                                                        <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Aggregate</div>
                                                                        <div className="text-lg font-black text-cyan-500">₹{history.totalAmount.toLocaleString()}</div>
                                                                    </div>
                                                                    {history.isPaid && (
                                                                        <button
                                                                            onClick={() => {
                                                                                const monthDate = new Date(history.month + "-01");
                                                                                const monthName = monthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                                                                                // Try both YYYY-MM and formatted Month Name for lookup
                                                                                const actualPayment = admission.paymentHistory?.find(p =>
                                                                                    p.billingMonth === history.month ||
                                                                                    p.billingMonth === monthName
                                                                                );

                                                                                setBillModal({
                                                                                    show: true,
                                                                                    admission: { ...admission, _id: admission.admissionId },
                                                                                    installment: {
                                                                                        installmentNumber: hIdx + 1,
                                                                                        billingMonth: monthName,
                                                                                        amount: history.totalAmount,
                                                                                        paidAmount: actualPayment ? actualPayment.paidAmount : history.totalAmount,
                                                                                        paidDate: actualPayment ? actualPayment.createdAt : new Date(),
                                                                                        paymentMethod: actualPayment ? actualPayment.paymentMethod : "Monthly Fee",
                                                                                        status: actualPayment ? actualPayment.status : "PAID"
                                                                                    }
                                                                                });
                                                                            }}
                                                                            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 text-black font-black text-[10px] uppercase rounded-xl hover:scale-105 transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                                                                        >
                                                                            <FaFileInvoice className="text-xs" />
                                                                            Extract Bill
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Installment Details - Only for Normal Admissions */}
                                        {admission.admissionType !== "BOARD" && (
                                            <div className="mb-10">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h4 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                                        <div className="h-1 w-8 bg-cyan-500 rounded-full"></div>
                                                        Installment Schedule
                                                    </h4>
                                                    {canCreatePayment && admission.remainingAmount > 0 && (
                                                        <button
                                                            onClick={() => {
                                                                setEditingAdmission(admission);
                                                                setShowEditScheduleModal(true);
                                                            }}
                                                            className="px-4 py-2 bg-gray-800 text-gray-300 font-bold uppercase text-[10px] rounded-xl hover:bg-gray-700 transition-all border border-gray-700 flex items-center gap-2"
                                                        >
                                                            <FaEdit className="text-cyan-500" /> Edit Schedule
                                                        </button>
                                                    )}
                                                </div>
                                                <div className={`border rounded-[2rem] overflow-hidden ${isDarkMode ? 'bg-black/20 border-gray-800' : 'bg-white border-gray-200'}`}>
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className={`border-b ${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                                                <th className="p-5 text-[9px] font-black text-gray-500 uppercase tracking-widest">Installment</th>
                                                                <th className="p-5 text-[9px] font-black text-gray-500 uppercase tracking-widest">Due Date</th>
                                                                <th className="p-5 text-[9px] font-black text-gray-500 uppercase tracking-widest">Amount</th>
                                                                <th className="p-5 text-[9px] font-black text-gray-500 uppercase tracking-widest">Paid</th>
                                                                <th className="p-5 text-[9px] font-black text-gray-500 uppercase tracking-widest">Method</th>
                                                                <th className="p-5 text-[9px] font-black text-gray-500 uppercase tracking-widest">Status</th>
                                                                <th className="p-5 text-[9px] font-black text-gray-500 uppercase tracking-widest">Due Status</th>
                                                                <th className="p-5 text-[9px] font-black text-gray-500 uppercase tracking-widest text-right">Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                                                            {admission.paymentBreakdown && admission.paymentBreakdown.map((installment, idx) => {
                                                                const today = new Date();
                                                                today.setHours(0, 0, 0, 0);
                                                                const dueDate = new Date(installment.dueDate);
                                                                dueDate.setHours(0, 0, 0, 0);
                                                                const isOverdue = (installment.status !== "PAID" && installment.status !== "PENDING_CLEARANCE" && dueDate < today);

                                                                return (
                                                                    <tr key={idx} className="hover:bg-cyan-500/[0.03] transition-colors">
                                                                        <td className="p-5 font-black text-cyan-500 text-sm italic">#{installment.installmentNumber}</td>
                                                                        <td className={`p-5 text-xs font-bold uppercase tracking-tighter ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{new Date(installment.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                                        <td className={`p-5 font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{installment.amount.toLocaleString()}</td>
                                                                        <td className="p-5 text-emerald-400 font-black">₹{installment.paidAmount?.toLocaleString() || 0}</td>
                                                                        <td className="p-5 text-gray-500 text-[10px] font-bold uppercase tracking-widest">{installment.paymentMethod || "-"}</td>
                                                                        <td className="p-5">{getStatusBadge(installment.status)}</td>
                                                                        <td className="p-5">
                                                                            {installment.status === "PAID" ? (
                                                                                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-emerald-500 bg-emerald-500/10 border-emerald-500/20">PAID</span>
                                                                            ) : isOverdue ? (
                                                                                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-red-500 bg-red-500/10 border-red-500/20">OVERDUE</span>
                                                                            ) : (
                                                                                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-cyan-500 bg-cyan-500/10 border-cyan-500/20">UPCOMING</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="p-5 text-right flex items-center justify-end gap-2">
                                                                            {(installment.status === "PENDING" || installment.status === "OVERDUE") && canCreatePayment && (
                                                                                <button
                                                                                    onClick={() => handleOpenPayModal(admission.admissionId, installment)}
                                                                                    className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 text-black font-black text-[10px] uppercase rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-cyan-500/20"
                                                                                >
                                                                                    Pay Now
                                                                                </button>
                                                                            )}
                                                                            {(installment.status === "PAID" || installment.status === "COMPLETED" || installment.status === "PENDING_CLEARANCE" || (installment.paidAmount > 0)) && (
                                                                                <button
                                                                                    onClick={() => setBillModal({
                                                                                        show: true,
                                                                                        admission: { ...admission, _id: admission.admissionId },
                                                                                        installment: {
                                                                                            installmentNumber: installment.installmentNumber,
                                                                                            amount: installment.amount,
                                                                                            paidAmount: installment.paidAmount,
                                                                                            paidDate: installment.paidDate || new Date(),
                                                                                            paymentMethod: installment.paymentMethod,
                                                                                            status: installment.status
                                                                                        }
                                                                                    })}
                                                                                    className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-lg border border-emerald-500/20 transition-all group/btn"
                                                                                    title="View Bill"
                                                                                >
                                                                                    <FaFileInvoice className="group-hover/btn:scale-110 transition-transform" />
                                                                                </button>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {/* Payment History - Only for Normal Admissions (Board students use the card view above) */}
                                        {admission.admissionType !== "BOARD" && admission.paymentHistory && admission.paymentHistory.length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                                    <div className="h-1 w-8 bg-emerald-500 rounded-full"></div>
                                                    Payment History ({admission.paymentHistory.length})
                                                </h4>
                                                <div className={`border rounded-[2rem] overflow-hidden ${isDarkMode ? 'bg-black/20 border-gray-800' : 'bg-white border-gray-200'}`}>
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className={`border-b text-[9px] font-black text-gray-500 uppercase tracking-widest ${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                                                <th className="p-5">Date</th>
                                                                <th className="p-5">Inst #</th>
                                                                <th className="p-5">Details</th>
                                                                <th className="p-5">Amount</th>
                                                                <th className="p-5">Method</th>
                                                                <th className="p-5">Status</th>
                                                                <th className="p-5 text-right">Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-800/50">
                                                            {admission.paymentHistory.map((payment, idx) => (
                                                                <tr key={idx} className="hover:bg-emerald-500/[0.03] transition-colors">
                                                                    <td className={`p-5 text-[10px] font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{new Date(payment.createdAt).toLocaleDateString('en-GB')}</td>
                                                                    <td className="p-5 text-cyan-500 font-black italic text-xs">#{payment.installmentNumber}</td>
                                                                    <td className="p-5 text-gray-400 text-[10px] font-bold uppercase tracking-tighter">
                                                                        {payment.installmentNumber === 0 ? (
                                                                            <span className="text-emerald-500 font-black">Down Payment</span>
                                                                        ) : payment.billingMonth ? (
                                                                            <span>Monthly Fee: <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{payment.billingMonth}</span></span>
                                                                        ) : (
                                                                            `Installment #${payment.installmentNumber}`
                                                                        )}
                                                                    </td>
                                                                    <td className={`p-5 font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{payment.paidAmount.toLocaleString()}</td>
                                                                    <td className="p-5 text-gray-500 text-[10px] font-bold uppercase tracking-widest">{payment.paymentMethod}</td>
                                                                    <td className="p-5">{getStatusBadge(payment.status)}</td>
                                                                    <td className="p-5 text-right">
                                                                        <button
                                                                            onClick={() => setBillModal({
                                                                                show: true,
                                                                                admission: { ...admission, _id: admission.admissionId },
                                                                                installment: {
                                                                                    installmentNumber: payment.installmentNumber,
                                                                                    billingMonth: payment.billingMonth,
                                                                                    amount: payment.amount,
                                                                                    paidAmount: payment.paidAmount,
                                                                                    paidDate: payment.createdAt,
                                                                                    paymentMethod: payment.paymentMethod,
                                                                                    status: payment.status
                                                                                }
                                                                            })}
                                                                            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-lg border border-emerald-500/20 transition-all group/btn"
                                                                            title="View Bill"
                                                                        >
                                                                            <FaFileInvoice className="group-hover/btn:scale-110 transition-transform" />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </>
                        )}
                    </>
                )}

                {/* Record Payment Modal */}
                {showPayModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                        <div className={`border w-full max-w-lg rounded-[3rem] overflow-hidden animate-in zoom-in-95 duration-300 shadow-[0_0_100px_rgba(6,182,212,0.1)] flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-[#0d0f11] border-gray-800' : 'bg-white border-gray-200'}`}>
                            <div className={`p-10 border-b bg-gradient-to-r from-cyan-500/10 via-transparent to-transparent flex justify-between items-start ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                                <div>
                                    <h2 className={`text-3xl font-black italic uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Record <span className="text-cyan-500">Payment</span></h2>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-2">Installment # {activeInstallment?.installmentNumber}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Due Amount</div>
                                    <div className="text-2xl font-black text-cyan-500">₹{activeInstallment?.amount.toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="p-10 grid grid-cols-1 gap-6 overflow-y-auto custom-scrollbar flex-1">
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block">Amount to Record (₹)</label>
                                    <input
                                        type="number"
                                        value={payFormData.paidAmount}
                                        onChange={(e) => setPayFormData({ ...payFormData, paidAmount: e.target.value })}
                                        className={`w-full border rounded-2xl py-4 px-6 text-lg font-black outline-none focus:border-cyan-500/50 transition-all shadow-inner ${isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block">Received Date</label>
                                    <input
                                        type="date"
                                        value={payFormData.receivedDate}
                                        onChange={(e) => setPayFormData({ ...payFormData, receivedDate: e.target.value })}
                                        className={`w-full border rounded-2xl py-4 px-6 text-sm font-black outline-none focus:border-cyan-500/50 transition-all ${isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                    />
                                    <p className="text-[9px] text-gray-500 mt-2 uppercase font-black">Actual date when money was received</p>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block">Payment Method</label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE", "RAZORPAY_POS", "RAZORPAY_SMS"].map(method => (
                                            <button
                                                key={method}
                                                type="button"
                                                onClick={() => setPayFormData({ ...payFormData, paymentMethod: method })}
                                                className={`py-3 px-1 rounded-xl text-[9px] font-black border transition-all ${payFormData.paymentMethod === method
                                                    ? "bg-cyan-500 border-cyan-400 text-black shadow-lg shadow-cyan-500/20"
                                                    : `border transition-all font-black text-[9px] py-3 px-1 rounded-xl ${isDarkMode ? 'bg-black/40 border-gray-800 text-gray-500 hover:border-gray-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-400'}`
                                                    }`}
                                            >
                                                {method.replace('_', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {payFormData.paymentMethod === "CHEQUE" ? (
                                    <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Cheque Number</label>
                                                <input
                                                    type="text"
                                                    value={payFormData.transactionId}
                                                    onChange={(e) => setPayFormData({ ...payFormData, transactionId: e.target.value })}
                                                    className={`w-full border rounded-xl py-3 px-4 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all font-mono ${isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                                    placeholder="CHQXXXXXX"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Cheque Date</label>
                                                <input
                                                    type="date"
                                                    value={payFormData.chequeDate}
                                                    onChange={(e) => setPayFormData({ ...payFormData, chequeDate: e.target.value })}
                                                    className={`w-full border rounded-xl py-3 px-4 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all ${isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Bank Name</label>
                                            <input
                                                type="text"
                                                value={payFormData.accountHolderName}
                                                onChange={(e) => setPayFormData({ ...payFormData, accountHolderName: e.target.value })}
                                                className={`w-full border rounded-xl py-3 px-4 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all ${isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                                                placeholder="e.g. HDFC, ICICI, SBI..."
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">
                                            Ref / Transaction ID {(['UPI', 'CARD', 'BANK_TRANSFER'].includes(payFormData.paymentMethod)) && <span className="text-red-500">*</span>}
                                        </label>
                                        <input
                                            type="text"
                                            value={payFormData.transactionId}
                                            onChange={(e) => setPayFormData({ ...payFormData, transactionId: e.target.value })}
                                            className={`w-full border rounded-xl py-3 px-4 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all font-mono ${isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                            placeholder={(['UPI', 'CARD', 'BANK_TRANSFER'].includes(payFormData.paymentMethod)) ? `Enter ${payFormData.paymentMethod} Transaction ID (Mandatory)` : "Optional transaction reference"}
                                            required={['UPI', 'CARD', 'BANK_TRANSFER'].includes(payFormData.paymentMethod)}
                                        />
                                    </div>

                                )}

                                {parseFloat(payFormData.paidAmount) < (activeInstallment?.amount || 0) && (
                                    <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl flex items-center justify-between">
                                        <div className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
                                            Carry forward balance?
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={payFormData.carryForward}
                                            onChange={(e) => setPayFormData({ ...payFormData, carryForward: e.target.checked })}
                                            className="h-5 w-5 rounded border-gray-800 bg-black/40 text-cyan-500 focus:ring-cyan-500/50"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Remarks</label>
                                    <textarea
                                        value={payFormData.remarks}
                                        onChange={(e) => setPayFormData({ ...payFormData, remarks: e.target.value })}
                                        className={`w-full border rounded-2xl py-4 px-6 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all resize-none h-24 shadow-inner ${isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                        placeholder="Add payment notes..."
                                    />
                                </div>
                            </div>

                            <div className={`p-10 border-t flex gap-4 backdrop-blur-xl ${isDarkMode ? 'border-gray-800 bg-black/40' : 'border-gray-200 bg-gray-50'}`}>
                                <button
                                    onClick={() => setShowPayModal(false)}
                                    className={`flex-1 py-4 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all border ${isDarkMode ? 'bg-gray-900 text-gray-500 hover:bg-gray-800 hover:text-white border-gray-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 border-gray-300'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (payFormData.paymentMethod === 'RAZORPAY_POS') {
                                            setShowPOSModal(true);
                                        } else if (payFormData.paymentMethod === 'RAZORPAY_SMS') {
                                            setShowSMSModal(true);
                                        } else {
                                            handleRecordPayment();
                                        }
                                    }}
                                    className="flex-1 py-4 bg-gradient-to-r from-cyan-600 to-cyan-400 text-black font-black uppercase text-[10px] tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-cyan-500/30"
                                >
                                    Confirm Payment
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bill Generator Modal */}
                {billModal.show && (
                    <BillGenerator
                        admission={billModal.admission}
                        installment={billModal.installment}
                        onClose={() => setBillModal({ show: false, admission: null, installment: null })}
                    />
                )}

                {/* Edit Schedule Modal */}
                {showEditScheduleModal && (
                    <EditScheduleModal
                        admission={editingAdmission}
                        onClose={() => {
                            setShowEditScheduleModal(false);
                            setEditingAdmission(null);
                        }}
                        onSave={async (newSchedule) => {
                            try {
                                const token = localStorage.getItem("token");
                                const response = await fetch(
                                    `${import.meta.env.VITE_API_URL}/finance/installment/update-schedule/${editingAdmission.admissionId}`,
                                    {
                                        method: "PUT",
                                        headers: {
                                            "Content-Type": "application/json",
                                            Authorization: `Bearer ${token}`
                                        },
                                        body: JSON.stringify({ newSchedule })
                                    }
                                );

                                if (response.ok) {
                                    toast.success("Installment schedule updated successfully!");
                                    setShowEditScheduleModal(false);
                                    setEditingAdmission(null);
                                    handleSelectStudent(selectedStudent.studentId);
                                    fetchAdmissions();
                                } else {
                                    const err = await response.json();
                                    toast.error(err.message || "Failed to update schedule");
                                }
                            } catch (error) {
                                console.error("Update Schedule Error:", error);
                                toast.error("Error connecting to server");
                            }
                        }}
                    />
                )}

                {/* Razorpay POS Modal */}
                <RazorpayPOSModal
                    isOpen={showPOSModal}
                    onClose={() => setShowPOSModal(false)}
                    amount={payFormData.paidAmount}
                    invoiceId={`INV-${Date.now()}`}
                    studentInfo={selectedStudent}
                    admissionId={activeAdmissionId}
                    admissionType="NORMAL"
                    onPaymentSuccess={(posData) => {
                        console.log("POS Success Callback Data:", posData);
                        // Exhaustive extraction of any potential transaction identifier
                        const finalTransactionId = posData.externalTransactionId ||
                            posData.txnId ||
                            posData.transactionId ||
                            posData.receiptNumber ||
                            posData.p2pRequestId ||
                            posData.origP2pRequestId;

                        console.log("Extracted Transaction ID:", finalTransactionId);

                        const updatedData = {
                            ...payFormData,
                            paymentMethod: "RAZORPAY_POS",
                            transactionId: finalTransactionId,
                            p2pRequestId: posData.p2pRequestId,
                            remarks: (payFormData.remarks ? payFormData.remarks + " | " : "") +
                                `POS payment completed (Req: ${posData.p2pRequestId || 'N/A'})`
                        };

                        console.log("Submitting payment record with data:", updatedData);
                        setPayFormData(updatedData);
                        handleRecordPayment(updatedData);
                    }}
                />

                {/* Razorpay SMS Modal */}
                <RazorpaySMSModal
                    isOpen={showSMSModal}
                    onClose={() => setShowSMSModal(false)}
                    amount={payFormData.paidAmount}
                    installmentNumber={activeInstallment?.installmentNumber}
                    admissionId={activeAdmissionId}
                    studentInfo={selectedStudent}
                    admissionType="NORMAL"
                    onPaymentSuccess={(smsData) => {
                        console.log("SMS Success Callback Data:", smsData);
                        const finalId = smsData.id || smsData.paymentId;
                        const updatedData = {
                            ...payFormData,
                            paymentMethod: "RAZORPAY_SMS",
                            transactionId: finalId,
                            remarks: (payFormData.remarks ? payFormData.remarks + " | " : "") +
                                `SMS payment completed (ID: ${finalId})`
                        };

                        console.log("Submitting SMS payment record with data:", updatedData);
                        setPayFormData(updatedData);
                        handleRecordPayment(updatedData);
                    }}
                />
            </div>
        </Layout>
    );
};

export default InstallmentPayment;