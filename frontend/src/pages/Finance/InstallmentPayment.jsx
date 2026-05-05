import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { hasPermission } from "../../config/permissions";
import { FaSearch, FaEraser, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendarAlt, FaMoneyBillWave, FaCheckCircle, FaClock, FaExclamationTriangle, FaFileInvoice, FaFilter, FaDownload, FaChevronRight, FaEdit, FaPlus, FaTrash, FaTimes, FaWallet, FaUniversity, FaCreditCard, FaCoins } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import Select from "react-select";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useTheme } from "../../context/ThemeContext";
import BillGenerator from "../../components/Finance/BillGenerator";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Pagination from "../../components/common/Pagination";
import RazorpayPOSModal from "../../components/Finance/RazorpayPOSModal";
import RazorpaySMSModal from "../../components/Finance/RazorpaySMSModal";

const EditScheduleModal = ({ admission, onClose, onSave, isDarkMode }) => {
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
        <div className={`fixed inset-0 z-[1000] flex items-center justify-center p-4 backdrop-blur-md transition-all duration-500 animate-in fade-in ${isDarkMode ? 'bg-black/90' : 'bg-gray-900/60'}`}>
            <div className={`border w-full max-w-2xl rounded-[3rem] overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-500 shadow-[0_60px_120px_rgba(0,0,0,0.8)] transition-all ${isDarkMode ? 'bg-[#0f1215] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div className={`p-10 border-b flex justify-between items-center transition-all duration-500 ${isDarkMode ? 'border-gray-800 bg-white/[0.02]' : 'border-gray-100 bg-gray-50'}`}>
                    <div>
                        <h2 className={`text-3xl font-black italic uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Edit <span className="text-cyan-500">Schedule</span></h2>
                        <div className="text-[10px] text-gray-500 font-black uppercase tracking-[0.25em] mt-2 italic">Admission Ref # {admission.admissionNumber}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 italic">Net Outstanding</div>
                        <div className="text-2xl font-black text-cyan-500 italic tabular-nums tracking-tighter">₹{admission.remainingAmount.toLocaleString()}</div>
                    </div>
                </div>

                <div className={`p-10 overflow-y-auto custom-scrollbar flex-1 space-y-6 transition-all duration-500 ${isDarkMode ? 'bg-black/20' : 'bg-gray-50/20 shadow-inner'}`}>
                    {schedule.map((inst, idx) => (
                        <div key={idx} className={`border p-8 rounded-[2.5rem] flex flex-wrap md:flex-nowrap items-center gap-8 group transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800 hover:border-cyan-500/30' : 'bg-white border-gray-100 hover:border-cyan-500/20 hover:bg-gray-50/50 shadow-sm'}`}>
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-cyan-500 font-black italic text-xl shadow-xl transition-all group-hover:scale-110 ${isDarkMode ? 'bg-white/10 border border-white/5' : 'bg-white border border-gray-100 shadow-cyan-900/5'}`}>
                                #{inst.installmentNumber}
                            </div>
                            <div className="flex-1 min-w-[150px]">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] mb-3 block italic">Maturity Date</label>
                                <input
                                    type="date"
                                    value={inst.dueDate}
                                    onChange={(e) => handleChange(idx, 'dueDate', e.target.value)}
                                    className={`w-full border rounded-2xl py-3.5 px-5 text-xs font-black outline-none transition-all duration-300 [color-scheme:dark] ${isDarkMode ? 'bg-black/40 border-gray-800 text-white focus:border-cyan-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500 shadow-inner'}`}
                                />
                            </div>
                            <div className="flex-1 min-w-[120px]">
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] mb-3 block italic">Instrument Value (₹)</label>
                                <input
                                    type="number"
                                    value={inst.amount}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => handleChange(idx, 'amount', e.target.value)}
                                    className={`w-full border rounded-2xl py-3.5 px-5 text-sm font-black outline-none transition-all duration-300 tabular-nums ${isDarkMode ? 'bg-black/40 border-gray-800 text-white focus:border-cyan-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500 shadow-inner'}`}
                                />
                            </div>
                            <button
                                onClick={() => handleRemove(idx)}
                                className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${isDarkMode ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-black border border-red-500/20 md:opacity-0 group-hover:opacity-100 shadow-lg shadow-red-500/10' : 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white border border-red-100 md:opacity-0 group-hover:opacity-100'}`}
                                title="De-list Instrument"
                            >
                                <FaTrash className="text-sm" />
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={handleAdd}
                        className={`w-full mt-4 py-6 border-2 border-dashed rounded-[2.5rem] font-black uppercase text-[10px] tracking-[0.3em] transition-all duration-500 flex items-center justify-center gap-3 active:scale-[0.98] ${isDarkMode ? 'border-gray-800 text-gray-600 hover:border-cyan-500/50 hover:text-cyan-500 hover:bg-cyan-500/[0.02]' : 'border-gray-200 text-gray-400 hover:border-cyan-500/30 hover:text-cyan-600 hover:bg-cyan-500/[0.01]'}`}
                    >
                        <FaPlus size={10} /> APPEND_NEW_INSTRUMENT
                    </button>
                </div>

                <div className={`p-10 border-t backdrop-blur-xl transition-all duration-500 ${isDarkMode ? 'border-gray-800 bg-white/[0.02]' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-8 px-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] italic">Calculated Aggregate</span>
                            <div className={`text-2xl font-black italic tabular-nums tracking-tighter ${isValid ? "text-emerald-500" : "text-red-500"}`}>₹{totalNew.toLocaleString()}</div>
                        </div>
                        {!isValid && (
                            <div className="text-right">
                                <span className="text-[9px] font-black text-red-500/70 uppercase tracking-[0.2em] italic mb-1 block animate-pulse">Variance Detected</span>
                                <div className="text-lg font-black text-red-500 tabular-nums tracking-tighter italic">₹{(admission.remainingAmount - totalNew).toLocaleString()}</div>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className={`flex-1 py-4 font-black uppercase text-[10px] tracking-[0.25em] rounded-2xl transition-all duration-300 active:scale-95 border ${isDarkMode ? 'bg-[#0f1215] border-gray-800 text-gray-500 hover:bg-white/5 hover:text-white' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-900 shadow-sm'}`}
                        >
                            DISCARD_REVISION
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!isValid || schedule.length === 0 || isSaving}
                            className={`flex-1 py-4 font-black uppercase text-[10px] tracking-[0.25em] rounded-2xl transition-all duration-500 shadow-2xl flex items-center justify-center gap-3 active:scale-95 ${isValid && schedule.length > 0 && !isSaving
                                ? "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-emerald-600/30 hover:from-emerald-500 hover:to-cyan-500"
                                : (isDarkMode ? "bg-white/5 text-gray-700 cursor-not-allowed border-gray-800" : "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200")
                                }`}
                        >
                            {isSaving ? "SYNCING_MAP..." : "AUTHORIZE_SCHEDULE"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InstallmentPayment = () => {
    const { isDarkMode } = useTheme();
    const [loading, setLoading] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [financialData, setFinancialData] = useState(null);
    const [billModal, setBillModal] = useState({ show: false, admission: null, installment: null });

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canCreatePayment = hasPermission(user, 'financeFees', 'installmentPayment', 'create') || hasPermission(user, 'admissions', 'enrolledStudents', 'edit');

    const [admissionsList, setAdmissionsList] = useState([]);
    const [filters, setFilters] = useState({
        centre: [],
        course: [],
        department: [],
        startDate: "",
        endDate: "",
        minRemaining: "",
        maxRemaining: "",
        searchTerm: ""
    });
    const [metadata, setMetadata] = useState({
        centres: [],
        courses: [],
        departments: []
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const itemsPerPageOptions = [
        { value: 10, label: "10 per page" },
        { value: 25, label: "25 per page" },
        { value: 50, label: "50 per page" },
        { value: 100, label: "100 per page" },
        { value: 500, label: "500 per page" },
    ];

    const [allowedCentres, setAllowedCentres] = useState(null);

    useEffect(() => {
        const init = async () => {
            const perms = await fetchUserPermissions();
            setAllowedCentres(perms);
            fetchMetadata(perms);
            fetchAdmissions(perms);
        };
        init();
    }, []);

    const fetchUserPermissions = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.user.role === 'superAdmin' || data.user.role === 'SuperAdmin') return null;
                return data.user.centres?.map(c => c.centreName) || [];
            }
        } catch (error) {
            console.error(error);
        }
        return [];
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

            const perms = allowedOverride !== undefined ? allowedOverride : allowedCentres;
            let filteredCentres = Array.isArray(centres) ? centres : [];

            if (perms !== null && Array.isArray(perms)) {
                const normalizedPerms = perms.map(c => (c || "").trim().toLowerCase());
                filteredCentres = filteredCentres.filter(c => {
                    const centreName = (c.centreName || "").trim().toLowerCase();
                    return normalizedPerms.includes(centreName);
                });
            }

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
        setCurrentPage(1);
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
            minRemaining: "",
            maxRemaining: "",
            searchTerm: ""
        });
        fetchAdmissions();
        toast.info("Filters reset to default view");
    };

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

    const exportToExcel = () => {
        if (admissionsList.length === 0) {
            toast.info("No data available for export");
            return;
        }

        const dataToExport = [];
        admissionsList.forEach(adm => {
            if (!adm.paymentBreakdown || adm.paymentBreakdown.length === 0) {
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
                    "Remaining (₹)": adm.remainingAmount,
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
                        "Admission Code": idx === 0 ? adm.admissionNumber : "",
                        "Student Name": idx === 0 ? adm.studentName : "",
                        "Email": idx === 0 ? adm.email : "",
                        "Mobile": idx === 0 ? adm.mobile : "",
                        "Course": idx === 0 ? adm.course : "",
                        "Department": idx === 0 ? adm.department : "",
                        "Centre": idx === 0 ? adm.centre : "",
                        "Admission Date": idx === 0 ? new Date(adm.admissionDate).toLocaleDateString() : "",
                        "Total Fees (₹)": idx === 0 ? adm.totalFees : "",
                        "Total Paid (₹)": idx === 0 ? adm.totalPaid : "",
                        "Remaining (₹)": idx === 0 ? adm.remainingAmount : "",
                        "Overall Status": idx === 0 ? adm.paymentStatus : "",
                        "Installment #": `Installment ${inst.installmentNumber}`,
                        "Due Date": new Date(inst.dueDate).toLocaleDateString('en-GB'),
                        "Amount Due": inst.amount,
                        "Amount Paid": inst.paidAmount || 0,
                        "Inst. Status": inst.status,
                        "Due Status": dueStatus
                    });
                });
            }
            dataToExport.push({});
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Financial Audit Report");

        const columnWidths = Object.keys(dataToExport[0] || {}).map(key => ({
            wch: Math.max(key.length, ...dataToExport.map(row => (row[key] || "").toString().length)) + 4
        }));
        worksheet["!cols"] = columnWidths;

        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
        saveAs(data, `Financial_Audit_Archive_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Detailed financial audit exported successfully");
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "PAID":
            case "COMPLETED":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-emerald-500 bg-emerald-500/10 border-emerald-500/20 inline-flex items-center gap-2 shadow-sm shadow-emerald-500/10 tracking-[0.15em] transition-all"><FaCheckCircle size={10} /> {status}</span>;
            case "PENDING":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-amber-500 bg-amber-500/10 border-amber-500/20 inline-flex items-center gap-2 shadow-sm shadow-amber-500/10 tracking-[0.15em] transition-all"><FaClock size={10} /> {status}</span>;
            case "OVERDUE":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-red-500 bg-red-500/10 border-red-500/20 inline-flex items-center gap-2 shadow-sm shadow-red-500/10 tracking-[0.15em] animate-pulse transition-all"><FaExclamationTriangle size={10} /> {status}</span>;
            case "PARTIAL":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-cyan-500 bg-cyan-500/10 border-cyan-500/20 inline-flex items-center gap-2 shadow-sm shadow-cyan-500/10 tracking-[0.15em] transition-all"><FaClock size={10} /> {status}</span>;
            case "PENDING_CLEARANCE":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-amber-500 bg-amber-500/10 border-amber-500/20 inline-flex items-center gap-2 shadow-sm shadow-amber-500/10 tracking-[0.15em] transition-all italic"><FaClock size={10} /> IN PROCESS</span>;
            case "REJECTED":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-red-500 bg-red-500/10 border-red-500/20 inline-flex items-center gap-2 shadow-sm shadow-red-500/10 tracking-[0.15em] transition-all"><FaExclamationTriangle size={10} /> REJECTED</span>;
            default:
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-gray-500 bg-gray-500/10 border-gray-500/20 transition-all">{status}</span>;
        }
    };

    const getDueStatusBadge = (adm) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const overdueInstallments = adm.paymentBreakdown?.filter(inst =>
            inst.status !== "PAID" && inst.status !== "PENDING_CLEARANCE" && new Date(inst.dueDate) < today
        );

        if (overdueInstallments?.length > 0) {
            return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-red-500 bg-red-500/10 border-red-500/20 inline-flex items-center gap-2 shadow-sm shadow-red-500/10 tracking-[0.1em] italic"><FaExclamationTriangle size={10} /> {overdueInstallments.length} OVERDUE</span>;
        }

        const nextDue = adm.paymentBreakdown?.filter(inst =>
            inst.status !== "PAID" && inst.status !== "PENDING_CLEARANCE" && new Date(inst.dueDate) >= today
        ).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

        if (nextDue) {
            return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-cyan-500 bg-cyan-500/10 border-cyan-500/20 inline-flex items-center gap-2 shadow-sm shadow-cyan-500/10 tracking-[0.1em] italic"><FaClock size={10} /> DUE {new Date(nextDue.dueDate).toLocaleDateString('en-GB')}</span>;
        }

        const isCompleted = adm.paymentStatus === "COMPLETED" || (adm.remainingAmount <= 0);
        if (isCompleted) {
            return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-emerald-500 bg-emerald-500/10 border-emerald-500/20 inline-flex items-center gap-2 shadow-sm shadow-emerald-500/10 tracking-[0.1em] italic"><FaCheckCircle size={10} /> NO DUES</span>;
        }

        return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-gray-500 bg-gray-500/10 border-gray-500/20 italic tracking-[0.1em]">NO UPCOMING</span>;
    };

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
        const mandatoryRefMethods = ['UPI', 'CARD', 'BANK_TRANSFER'];
        if (mandatoryRefMethods.includes(dataToSubmit.paymentMethod) && !dataToSubmit.transactionId?.trim()) {
            toast.error(`Auth ID / Ref is mandatory for ${dataToSubmit.paymentMethod} protocol`);
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
                toast.success(dataToSubmit.paymentMethod === "CHEQUE" ? "Cheque logged for verification" : "Payment settlement successful");
                setShowPayModal(false);

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

                handleSelectStudent(selectedStudent.studentId);
                fetchAdmissions();
            } else {
                const err = await response.json();
                toast.error(err.message || "Failed to finalize settlement");
            }
        } catch (error) {
            console.error("Payment Error:", error);
            toast.error("Network sync failure");
        }
    };

    const selectStyles = {
        control: (base) => ({
            ...base,
            backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : '#fff',
            borderColor: isDarkMode ? '#1f2937' : '#e5e7eb',
            borderRadius: '1rem',
            padding: '0.4rem',
            minHeight: '52px',
            transition: 'all 0.3s ease',
            boxShadow: 'none',
            '&:hover': { borderColor: isDarkMode ? 'rgba(6, 182, 212, 0.5)' : '#06b6d4' }
        }),
        menu: (base) => ({
            ...base,
            backgroundColor: isDarkMode ? '#0f1215' : '#fff',
            border: isDarkMode ? '1px solid #1f2937' : '1px solid #e5e7eb',
            borderRadius: '1.25rem',
            overflow: 'hidden',
            padding: '8px',
            zIndex: 1000,
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
        }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isFocused ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
            color: state.isFocused ? '#06b6d4' : (isDarkMode ? '#9ca3af' : '#4b5563'),
            fontWeight: '900',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            padding: '12px 16px',
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:active': { backgroundColor: 'rgba(6, 182, 212, 0.2)' }
        }),
        multiValue: (base) => ({
            ...base,
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            padding: '2px'
        }),
        multiValueLabel: (base) => ({
            ...base,
            color: '#06b6d4',
            fontWeight: '900',
            fontSize: '9px',
            textTransform: 'uppercase',
            padding: '2px 8px'
        }),
        multiValueRemove: (base) => ({
            ...base,
            color: '#06b6d4',
            '&:hover': { backgroundColor: '#06b6d4', color: '#000', borderRadius: '4px' }
        }),
        placeholder: (base) => ({
            ...base,
            color: isDarkMode ? '#4b5563' : '#9ca3af',
            fontWeight: '900',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
        }),
        singleValue: (base) => ({
            ...base,
            color: isDarkMode ? '#fff' : '#111827',
            fontWeight: '900',
            fontSize: '10px',
            textTransform: 'uppercase'
        }),
        input: (base) => ({
            ...base,
            color: isDarkMode ? '#fff' : '#111827',
            fontWeight: '900',
            fontSize: '10px'
        })
    };

    return (
        <Layout activePage="Finance & Fees">
            <div className={`p-4 md:p-10 max-w-[1800px] mx-auto min-h-screen pb-20 transition-all duration-500 ${isDarkMode ? 'bg-[#0f1215]' : 'bg-gray-50'}`}>
                <ToastContainer position="top-right" theme={isDarkMode ? "dark" : "light"} />

                {/* Header */}
                <div className="mb-12 flex flex-col xl:flex-row xl:items-start justify-between gap-8">
                    <div>
                        <h1 className={`text-4xl font-black italic uppercase tracking-tighter mb-3 flex items-center gap-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <span className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-500 border border-cyan-500/20 shadow-inner">
                                <FaWallet size={28} />
                            </span>
                            Installment <span className="text-cyan-500">Logistics</span>
                        </h1>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.25em] italic">
                            {selectedStudent ? `Financial audit for ${selectedStudent.name}` : "Centralized audit & settlement protocol for academic capital"}
                        </p>
                    </div>

                    {!selectedStudent && (
                        <div className={`border rounded-[2.5rem] p-6 transition-all duration-500 shadow-2xl relative overflow-hidden ${isDarkMode ? 'bg-white/5 border-gray-800 shadow-cyan-900/[0.03]' : 'bg-white border-gray-100 shadow-sm'}`} style={{ width: '520px', height: '160px' }}>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[60px] pointer-events-none"></div>
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4 italic flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div> Sector Recovery Analytics
                            </div>
                            <ResponsiveContainer width="100%" height={90}>
                                <BarChart
                                    data={[
                                        {
                                            name: 'COMPLETED',
                                            value: admissionsList.filter(a => a.paymentStatus === "COMPLETED").length,
                                            amount: admissionsList.filter(a => a.paymentStatus === "COMPLETED").reduce((sum, a) => sum + (a.totalPaid || 0), 0),
                                            color: '#10b981'
                                        },
                                        {
                                            name: 'PARTIAL',
                                            value: admissionsList.filter(a => a.paymentStatus === "PARTIAL").length,
                                            amount: admissionsList.filter(a => a.paymentStatus === "PARTIAL").reduce((sum, a) => sum + (a.totalPaid || 0), 0),
                                            color: '#06b6d4'
                                        },
                                        {
                                            name: 'PENDING',
                                            value: admissionsList.filter(a => a.paymentStatus === "PENDING" || !a.paymentStatus).length,
                                            amount: admissionsList.filter(a => a.paymentStatus === "PENDING" || !a.paymentStatus).reduce((sum, a) => sum + (a.totalPaid || 0), 0),
                                            color: '#f43f5e'
                                        }
                                    ]}
                                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#1f2937" : "#e5e7eb"} vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#6b7280"
                                        style={{ fontSize: '9px', fontWeight: '900', letterSpacing: '0.1em' }}
                                        tick={{ fill: isDarkMode ? '#4b5563' : '#9ca3af' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        stroke="#6b7280"
                                        style={{ fontSize: '8px' }}
                                        tick={{ fill: isDarkMode ? '#4b5563' : '#9ca3af' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: isDarkMode ? '#131619' : '#fff',
                                            border: isDarkMode ? '1px solid #1f2937' : '1px solid #e5e7eb',
                                            borderRadius: '16px',
                                            fontSize: '10px',
                                            fontWeight: '900',
                                            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                                            textTransform: 'uppercase'
                                        }}
                                        cursor={{ fill: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)' }}
                                        formatter={(value, name) => {
                                            if (name === 'value') return [value + ' NODES', 'COUNT'];
                                            if (name === 'amount') return ['₹' + value.toLocaleString(), 'CAPITAL'];
                                            return [value, name];
                                        }}
                                    />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                        {
                                            [
                                                { color: '#10b981' },
                                                { color: '#06b6d4' },
                                                { color: '#f43f5e' }
                                            ].map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                                            ))
                                        }
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {selectedStudent && (
                        <button
                            onClick={() => {
                                setFinancialData(null);
                                setSelectedStudent(null);
                            }}
                            className={`px-8 py-4 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all duration-300 active:scale-95 border flex items-center gap-3 ${isDarkMode ? 'bg-white/5 text-gray-400 border-gray-800 hover:text-white hover:bg-white/10' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 shadow-sm'}`}
                        >
                            <FaChevronRight className="rotate-180" size={10} /> DISMISS_DETAILS
                        </button>
                    )}
                </div>

                {!selectedStudent ? (
                    <>
                        {/* Filters Interface */}
                        <div className={`border rounded-[3rem] p-10 mb-12 shadow-[0_30px_60px_rgba(0,0,0,0.3)] transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 items-end">
                                <div className="lg:col-span-1">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 block italic">Horizon Start</label>
                                    <input
                                        type="date"
                                        name="startDate"
                                        value={filters.startDate}
                                        onChange={handleFilterChange}
                                        className={`w-full border rounded-2xl py-4 px-6 font-black text-[11px] uppercase outline-none transition-all duration-300 [color-scheme:dark] ${isDarkMode ? 'bg-black/20 border-gray-800 text-white focus:border-cyan-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500 shadow-inner'}`}
                                    />
                                </div>
                                <div className="lg:col-span-1">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 block italic">Horizon End</label>
                                    <input
                                        type="date"
                                        name="endDate"
                                        value={filters.endDate}
                                        onChange={handleFilterChange}
                                        className={`w-full border rounded-2xl py-4 px-6 font-black text-[11px] uppercase outline-none transition-all duration-300 [color-scheme:dark] ${isDarkMode ? 'bg-black/20 border-gray-800 text-white focus:border-cyan-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500 shadow-inner'}`}
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 block italic">Sector (Dept)</label>
                                    <Select
                                        isMulti
                                        options={metadata.departments.map(d => ({ value: d._id, label: d.departmentName }))}
                                        value={filters.department.map(id => {
                                            const dept = metadata.departments.find(d => d._id === id);
                                            return dept ? { value: dept._id, label: dept.departmentName } : null;
                                        }).filter(Boolean)}
                                        onChange={(selected) => setFilters(prev => ({ ...prev, department: selected ? selected.map(s => s.value) : [] }))}
                                        styles={selectStyles}
                                        placeholder="ALL_SECTORS"
                                        isClearable
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 block italic">Stream (Course)</label>
                                    <Select
                                        isMulti
                                        options={metadata.courses.map(c => ({ value: c._id, label: c.courseName }))}
                                        value={filters.course.map(id => {
                                            const course = metadata.courses.find(c => c._id === id);
                                            return course ? { value: course._id, label: course.courseName } : null;
                                        }).filter(Boolean)}
                                        onChange={(selected) => setFilters(prev => ({ ...prev, course: selected ? selected.map(s => s.value) : [] }))}
                                        styles={selectStyles}
                                        placeholder="ALL_STREAMS"
                                        isClearable
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 block italic">Origin Node (Centre)</label>
                                    <Select
                                        isMulti
                                        options={metadata.centres.map(c => ({ value: c.centreName, label: c.centreName }))}
                                        value={filters.centre.map(name => ({ value: name, label: name }))}
                                        onChange={(selected) => setFilters(prev => ({ ...prev, centre: selected ? selected.map(s => s.value) : [] }))}
                                        styles={selectStyles}
                                        placeholder="ALL_NODES"
                                        isClearable
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => fetchAdmissions()}
                                        className="flex-1 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black uppercase text-[10px] tracking-[0.25em] rounded-2xl transition-all shadow-xl shadow-cyan-600/20 active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <FaFilter size={10} /> SCAN
                                    </button>
                                    <button
                                        onClick={exportToExcel}
                                        className={`p-4 rounded-2xl transition-all duration-300 active:scale-95 border flex items-center justify-center ${isDarkMode ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-black shadow-lg shadow-emerald-500/10' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-500 hover:text-white shadow-sm'}`}
                                        title="Archive Financial Audit"
                                    >
                                        <FaDownload size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className={`mt-10 grid grid-cols-1 xl:grid-cols-4 gap-8 items-end border-t pt-10 transition-colors ${isDarkMode ? 'border-gray-800/50' : 'border-gray-100'}`}>
                                <div className={`xl:col-span-2 flex items-center gap-6 p-6 rounded-3xl border transition-all duration-500 ${isDarkMode ? 'bg-black/20 border-gray-800' : 'bg-gray-50 border-gray-100 shadow-inner'}`}>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em] mb-3 block italic ml-2">Asset Floor (Min Due)</label>
                                        <div className="relative">
                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-cyan-500 font-black italic">₹</span>
                                            <input
                                                type="number"
                                                name="minRemaining"
                                                placeholder="MIN_VAL"
                                                value={filters.minRemaining}
                                                onChange={handleFilterChange}
                                                className={`w-full border rounded-2xl py-4 pl-12 pr-6 font-black text-[11px] outline-none transition-all duration-300 tabular-nums ${isDarkMode ? 'bg-white/5 border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500 shadow-sm'}`}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-gray-700 mt-8 font-black opacity-30">TO</div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em] mb-3 block italic ml-2">Asset Ceiling (Max Due)</label>
                                        <div className="relative">
                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-cyan-500 font-black italic">₹</span>
                                            <input
                                                type="number"
                                                name="maxRemaining"
                                                placeholder="MAX_VAL"
                                                value={filters.maxRemaining}
                                                onChange={handleFilterChange}
                                                className={`w-full border rounded-2xl py-4 pl-12 pr-6 font-black text-[11px] outline-none transition-all duration-300 tabular-nums ${isDarkMode ? 'bg-white/5 border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500 shadow-sm'}`}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="xl:col-span-1">
                                    <button
                                        onClick={resetFilters}
                                        className={`w-full py-5 font-black uppercase text-[10px] tracking-[0.3em] rounded-2xl transition-all duration-300 border flex items-center justify-center gap-3 active:scale-95 ${isDarkMode ? 'bg-white/5 text-gray-400 border-gray-800 hover:bg-white/10 hover:text-white' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200 hover:text-gray-900 shadow-sm'}`}
                                    >
                                        <FaEraser size={12} /> CLEAR_VECTORS
                                    </button>
                                </div>
                            </div>

                            {/* Text Scan Interface */}
                            <div className="mt-10 flex flex-col xl:flex-row gap-6">
                                <div className="relative group flex-1">
                                    <FaSearch className={`absolute left-8 top-1/2 -translate-y-1/2 transition-colors duration-300 ${isDarkMode ? 'text-gray-700 group-focus-within:text-cyan-500' : 'text-gray-400 group-focus-within:text-cyan-600'}`} />
                                    <input
                                        type="text"
                                        name="searchTerm"
                                        placeholder="TRACE BY IDENTITY, ENROLLMENT_ID OR ARCHIVE_REF..."
                                        value={filters.searchTerm}
                                        onChange={handleFilterChange}
                                        onKeyPress={(e) => e.key === "Enter" && fetchAdmissions()}
                                        className={`w-full border rounded-[2rem] py-5 pl-20 pr-8 font-black text-xs uppercase tracking-[0.25em] outline-none transition-all duration-500 ${isDarkMode ? 'bg-black/20 border-gray-800 text-white placeholder:text-gray-800 focus:border-cyan-500/50' : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-cyan-500 shadow-inner'}`}
                                    />
                                </div>
                                <div className="w-full xl:w-72">
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

                        {/* Audit Ledger Matrix */}
                        <div className={`rounded-[3.5rem] border shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                            <div className="overflow-x-auto relative z-10">
                                <table className="w-full text-left border-collapse min-w-[1700px]">
                                    <thead>
                                        <tr className={`border-b text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                            <th className="p-10">Admission Seq</th>
                                            <th className="p-10">Authorized Personnel</th>
                                            <th className="p-10">Sector / Origin Stream</th>
                                            <th className="p-10">Registry Node</th>
                                            <th className="p-10">Capital Map</th>
                                            <th className="p-10">Audit state</th>
                                            <th className="p-10">Maturity Status</th>
                                            <th className="p-10 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y transition-all duration-500 ${isDarkMode ? 'divide-gray-800/30' : 'divide-gray-100'}`}>
                                        {loading ? (
                                            <tr>
                                                <td colSpan="8" className="p-48 text-center">
                                                    <div className="flex flex-col items-center gap-10">
                                                        <div className="w-24 h-24 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin shadow-2xl shadow-cyan-500/20"></div>
                                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.6em] italic animate-pulse">Syncing Outstanding Capital Vectors...</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : admissionsList.length === 0 ? (
                                            <tr>
                                                <td colSpan="8" className="p-40 text-center text-gray-600 font-black uppercase tracking-[0.5em] text-xs italic">
                                                    No matched audit entries in active sector
                                                </td>
                                            </tr>
                                        ) : (
                                            admissionsList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((adm, idx) => (
                                                <tr
                                                    key={idx}
                                                    className={`transition-all duration-300 cursor-pointer group ${isDarkMode ? 'hover:bg-cyan-500/[0.04] bg-transparent' : 'hover:bg-cyan-500/[0.03] bg-white'}`}
                                                    onClick={() => handleSelectStudent(adm.studentId)}
                                                >
                                                    <td className="p-10">
                                                        <span className="text-cyan-500 font-black tracking-[0.25em] italic tabular-nums text-base">#{adm.admissionNumber}</span>
                                                        <div className="text-[9px] text-gray-500 mt-2.5 uppercase font-black tracking-widest italic">{new Date(adm.admissionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</div>
                                                    </td>
                                                    <td className="p-10">
                                                        <div className="flex items-center gap-6">
                                                            <div className="h-14 w-14 rounded-[1.5rem] bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white text-xl font-black italic shadow-2xl shadow-cyan-500/20 group-hover:scale-110 transition-all duration-500">
                                                                {adm.studentName.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className={`font-black uppercase text-lg italic tracking-tighter transition-all duration-300 group-hover:translate-x-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{adm.studentName}</div>
                                                                <div className="text-[10px] text-gray-500 mt-2 font-black uppercase tracking-widest tabular-nums italic">{adm.mobile} <span className="mx-2 opacity-30">/</span> {adm.email?.toLowerCase()}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-10">
                                                        <div className={`font-black text-[11px] uppercase tracking-tighter transition-colors duration-300 ${isDarkMode ? 'text-gray-300 group-hover:text-cyan-400' : 'text-gray-700'}`}>{adm.course}</div>
                                                        <div className="text-[9px] text-gray-500 mt-2 uppercase font-black tracking-widest opacity-60 italic border-l-2 border-gray-800/20 pl-3">{adm.department}</div>
                                                    </td>
                                                    <td className="p-10">
                                                        <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm transition-all duration-300 group-hover:border-cyan-500/30 ${isDarkMode ? 'bg-white/5 border-gray-800 text-gray-400 group-hover:bg-cyan-500/5' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
                                                            <FaMapMarkerAlt className="text-cyan-500" size={10} />
                                                            {adm.centre}
                                                        </div>
                                                    </td>
                                                    <td className="p-10">
                                                        <div className="space-y-2.5 w-56">
                                                            <div className="text-[10px] flex justify-between gap-4">
                                                                <span className="text-gray-500 font-black uppercase tracking-widest italic">Asset:</span>
                                                                <span className={`font-black italic tabular-nums tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{adm.totalFees.toLocaleString()}</span>
                                                            </div>
                                                            <div className="text-[10px] flex justify-between gap-4">
                                                                <span className="text-emerald-500/70 font-black uppercase tracking-widest italic">Realized:</span>
                                                                <span className="text-emerald-500 font-black italic tabular-nums tracking-tighter">₹{adm.totalPaid.toLocaleString()}</span>
                                                            </div>
                                                            <div className={`text-[10px] flex justify-between gap-4 border-t pt-2.5 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                                                <span className="text-red-500/70 font-black uppercase tracking-widest italic">Outstanding:</span>
                                                                <span className="text-red-500 font-black italic tabular-nums tracking-tighter">₹{adm.remainingAmount.toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-10">
                                                        {getStatusBadge(adm.paymentStatus)}
                                                    </td>
                                                    <td className="p-10">
                                                        {getDueStatusBadge(adm)}
                                                    </td>
                                                    <td className="p-10 text-right">
                                                        <button className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-500 border shadow-2xl active:scale-90 ${isDarkMode ? 'bg-white/5 group-hover:bg-cyan-600 group-hover:text-white text-cyan-500 border-gray-800 group-hover:border-cyan-400 group-hover:shadow-cyan-600/30' : 'bg-white group-hover:bg-cyan-500 group-hover:text-white text-cyan-600 border-gray-100 group-hover:shadow-cyan-500/20'}`}>
                                                            <FaChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {!loading && admissionsList.length > 0 && (
                                <div className={`p-8 border-t transition-colors ${isDarkMode ? 'bg-white/[0.01] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                    <Pagination
                                        currentPage={currentPage}
                                        totalItems={admissionsList.length}
                                        itemsPerPage={itemsPerPage}
                                        onPageChange={setCurrentPage}
                                        isDarkMode={isDarkMode}
                                    />
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        {loading && (
                            <div className="flex flex-col items-center justify-center p-40 gap-10">
                                <div className="w-24 h-24 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin shadow-2xl shadow-cyan-500/20"></div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.5em] italic animate-pulse">Retrieving Micro-Financial Vectors...</p>
                            </div>
                        )}

                        {!loading && financialData && (
                            <div className="animate-in fade-in duration-700 slide-in-from-bottom-10">
                                {/* Extended Profile Matrix */}
                                <div className={`border rounded-[3.5rem] p-12 mb-12 relative overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.5)] transition-all duration-700 ${isDarkMode ? 'bg-gradient-to-br from-white/5 to-transparent border-gray-800' : 'bg-white border-gray-100'}`}>
                                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 blur-[150px] -mr-64 -mt-64 pointer-events-none"></div>
                                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] -ml-64 -mb-64 pointer-events-none"></div>

                                    <div className="flex flex-col xl:flex-row items-center xl:items-start gap-12 relative z-10">
                                        <div className="h-32 w-32 rounded-[2.5rem] bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-6xl font-black text-white shadow-[0_20px_50px_rgba(6,182,212,0.4)] italic border-2 border-white/10 group-hover:rotate-6 transition-transform duration-700">
                                            {selectedStudent.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 text-center xl:text-left">
                                            <h2 className={`text-6xl font-black italic uppercase tracking-tighter mb-6 leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedStudent.name}</h2>
                                            <div className="flex flex-wrap justify-center xl:justify-start gap-6">
                                                <div className={`border px-6 py-3 rounded-2xl flex items-center gap-4 transition-all duration-300 hover:border-cyan-500/30 ${isDarkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                                    <FaEnvelope className="text-cyan-500" />
                                                    <span className={`font-black text-[11px] uppercase tracking-widest italic ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{selectedStudent.email?.toLowerCase()}</span>
                                                </div>
                                                <div className={`border px-6 py-3 rounded-2xl flex items-center gap-4 transition-all duration-300 hover:border-cyan-500/30 ${isDarkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                                    <FaPhone className="text-cyan-500" />
                                                    <span className={`font-black text-[11px] uppercase tracking-widest tabular-nums italic ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{selectedStudent.mobile}</span>
                                                </div>
                                                <div className={`border px-6 py-3 rounded-2xl flex items-center gap-4 transition-all duration-300 hover:border-cyan-500/30 ${isDarkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                                    <FaMapMarkerAlt className="text-cyan-500" />
                                                    <span className={`font-black text-[11px] uppercase tracking-widest italic ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{selectedStudent.centre}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Aggregate Analytics Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 mt-16 relative z-10">
                                        <div className={`backdrop-blur-2xl border rounded-[2rem] p-10 hover:border-cyan-500/50 transition-all duration-500 group relative overflow-hidden ${isDarkMode ? 'bg-white/5 border-gray-800 shadow-2xl shadow-black/20' : 'bg-gray-50 border-gray-100 shadow-inner'}`}>
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 blur-3xl pointer-events-none"></div>
                                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4 italic group-hover:text-cyan-500 transition-colors">Cumulative Nodes</div>
                                            <div className={`text-4xl font-black italic tracking-tighter tabular-nums ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{financialData.summary.totalAdmissions} <span className="text-lg opacity-30">ACTIVE</span></div>
                                        </div>
                                        <div className={`backdrop-blur-2xl border rounded-[2rem] p-10 hover:border-cyan-500/50 transition-all duration-500 group relative overflow-hidden ${isDarkMode ? 'bg-white/5 border-gray-800 shadow-2xl shadow-black/20' : 'bg-gray-50 border-gray-100 shadow-inner'}`}>
                                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4 italic group-hover:text-cyan-500 transition-colors">Gross Academic Value</div>
                                            <div className={`text-4xl font-black italic tracking-tighter tabular-nums ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{financialData.summary.totalFeesAcrossAll.toLocaleString()}</div>
                                        </div>
                                        <div className={`backdrop-blur-2xl border rounded-[2rem] p-10 hover:border-emerald-500/50 transition-all duration-500 group relative overflow-hidden ${isDarkMode ? 'bg-emerald-500/5 border-emerald-500/20 shadow-2xl shadow-emerald-900/10' : 'bg-emerald-50 border-emerald-100 shadow-inner'}`}>
                                            <div className="text-[10px] font-black text-emerald-500/70 uppercase tracking-[0.3em] mb-4 italic">Settled Revenue</div>
                                            <div className="text-4xl font-black italic tracking-tighter tabular-nums text-emerald-500">₹{financialData.summary.totalPaidAcrossAll.toLocaleString()}</div>
                                        </div>
                                        <div className={`backdrop-blur-2xl border rounded-[2rem] p-10 hover:border-red-500/50 transition-all duration-500 group relative overflow-hidden ${isDarkMode ? 'bg-red-500/5 border-red-500/20 shadow-2xl shadow-red-900/10' : 'bg-red-50 border-red-100 shadow-inner'}`}>
                                            <div className="text-[10px] font-black text-red-500/70 uppercase tracking-[0.3em] mb-4 italic">Net Recovery Required</div>
                                            <div className="text-4xl font-black italic tracking-tighter tabular-nums text-red-500">₹{financialData.summary.totalRemainingAcrossAll.toLocaleString()}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Active Enrollment Deep-Dives */}
                                {financialData.admissions.map((admission, admIndex) => (
                                    <div key={admIndex} className={`border rounded-[3.5rem] p-12 mb-12 relative overflow-hidden group transition-all duration-700 shadow-2xl ${isDarkMode ? 'bg-white/5 border-gray-800 hover:border-cyan-500/30' : 'bg-white border-gray-100 hover:border-cyan-500/20'}`}>
                                        <div className={`flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8 mb-12 pb-10 border-b transition-all duration-500 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                            <div className="flex items-center gap-8">
                                                <div className="h-20 w-20 rounded-[2rem] bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-3xl text-cyan-500 group-hover:bg-cyan-500 group-hover:text-black transition-all duration-500 shadow-xl shadow-cyan-500/10">
                                                    <FaFileInvoice />
                                                </div>
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-6 mb-3">
                                                        <h3 className={`text-3xl font-black italic uppercase tracking-tighter leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{admission.course}</h3>
                                                        {getStatusBadge(admission.paymentStatus)}
                                                    </div>
                                                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] italic">
                                                        REGISTRY_ID # <span className="text-cyan-500">#{admission.admissionNumber}</span> <span className="mx-3 opacity-20">|</span> SESSION: {admission.academicSession}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="xl:text-right flex flex-col xl:items-end">
                                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-2 italic">Validation Timestamp</div>
                                                <div className={`text-lg font-black italic tracking-tighter tabular-nums ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{new Date(admission.admissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}</div>
                                            </div>
                                        </div>

                                        {/* Financial Micro-Ledger */}
                                        <div className="grid grid-cols-2 xl:grid-cols-5 gap-6 mb-12">
                                            <div className={`border rounded-2xl p-6 transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800/50' : 'bg-gray-50 border-gray-100 shadow-inner'}`}>
                                                <div className="text-[9px] font-black text-gray-500 uppercase tracking-[0.4em] mb-3 italic">Base Value</div>
                                                <div className={`text-xl font-black italic tabular-nums tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{admission.baseFees.toLocaleString()}</div>
                                            </div>
                                            <div className={`border rounded-2xl p-6 transition-all duration-300 ${isDarkMode ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-100 shadow-inner'}`}>
                                                <div className="text-[9px] font-black text-red-500/70 uppercase tracking-[0.4em] mb-3 italic">Waiver Applied</div>
                                                <div className="text-xl font-black italic tabular-nums tracking-tighter text-red-500">-₹{admission.discountAmount.toLocaleString()}</div>
                                            </div>
                                            <div className={`border rounded-2xl p-6 transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800/50' : 'bg-gray-50 border-gray-100 shadow-inner'}`}>
                                                <div className="text-[9px] font-black text-gray-500 uppercase tracking-[0.4em] mb-3 italic">Tax Aggregate</div>
                                                <div className={`text-xl font-black italic tabular-nums tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{(admission.cgstAmount + admission.sgstAmount).toLocaleString()}</div>
                                            </div>
                                            <div className={`border rounded-2xl p-6 transition-all duration-500 ${isDarkMode ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-cyan-50 border-cyan-100 shadow-inner'}`}>
                                                <div className="text-[9px] font-black text-cyan-500 uppercase tracking-[0.4em] mb-3 italic">Net Payable</div>
                                                <div className="text-xl font-black italic tabular-nums tracking-tighter text-cyan-500">₹{admission.totalFees.toLocaleString()}</div>
                                            </div>
                                            <div className={`border rounded-2xl p-6 flex justify-between items-center group/dp transition-all duration-500 ${isDarkMode ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-emerald-50 border-emerald-100 shadow-inner'}`}>
                                                <div>
                                                    <div className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-3 italic">Down Protocol</div>
                                                    <div className="text-xl font-black italic tabular-nums tracking-tighter text-emerald-500">₹{admission.downPayment.toLocaleString()}</div>
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
                                                                paymentMethod: "Admission Protocol",
                                                                status: admission.downPaymentStatus || "PAID"
                                                            }
                                                        })}
                                                        className={`p-3 rounded-xl border transition-all duration-300 active:scale-90 ${isDarkMode ? 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-black border-emerald-500/30' : 'bg-white hover:bg-emerald-500 text-emerald-600 hover:text-white border-emerald-200 shadow-sm'}`}
                                                        title="Extract Protocol Receipt"
                                                    >
                                                        <FaFileInvoice className="text-lg" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Board Recurring History */}
                                        {admission.admissionType === "BOARD" && admission.monthlySubjectHistory && admission.monthlySubjectHistory.length > 0 && (
                                            <div className="mb-12">
                                                <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.5em] mb-8 flex items-center gap-4 italic">
                                                    <span className="p-2.5 bg-purple-500/10 rounded-xl text-purple-500 shadow-inner">
                                                        <FaCalendarAlt size={14} />
                                                    </span>
                                                    Monthly Settlement Cycles
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
                                                    {admission.monthlySubjectHistory.map((history, hIdx) => {
                                                        const monthDate = new Date(history.month + "-01");
                                                        const monthName = monthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }).toUpperCase();

                                                        return (
                                                            <div key={hIdx} className={`border rounded-[2.5rem] p-8 transition-all duration-500 group/month relative overflow-hidden ${isDarkMode ? 'bg-white/5 border-gray-800 hover:border-purple-500/40 shadow-2xl shadow-black/20' : 'bg-gray-50 border-gray-100 hover:border-purple-500/30 hover:bg-white shadow-inner'}`}>
                                                                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-3xl pointer-events-none"></div>
                                                                <div className="flex justify-between items-start mb-8">
                                                                    <div>
                                                                        <div className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] mb-2 italic">Cycle {hIdx + 1} / {admission.courseDurationMonths || 0}</div>
                                                                        <h5 className={`text-xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{monthName}</h5>
                                                                    </div>
                                                                    {history.isPaid ? (
                                                                        <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase border text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-sm shadow-emerald-500/10 tracking-[0.2em] italic">SETTLED</span>
                                                                    ) : (
                                                                        <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase border text-amber-500 bg-amber-500/10 border-amber-500/20 shadow-sm shadow-amber-500/10 tracking-[0.2em] italic animate-pulse">PENDING</span>
                                                                    )}
                                                                </div>

                                                                <div className="space-y-3.5 mb-8 border-l-2 border-gray-800/20 pl-6 ml-2">
                                                                    {history.subjects.map((sub, sIdx) => (
                                                                        <div key={sIdx} className="flex justify-between items-center text-[10px]">
                                                                            <span className="text-gray-500 font-black uppercase tracking-[0.2em] italic">{sub.name}</span>
                                                                            <span className={`font-black italic tabular-nums ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>₹{sub.price.toLocaleString()}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                <div className="pt-6 border-t border-gray-800/20 flex justify-between items-center">
                                                                    <div>
                                                                        <div className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] mb-1 italic">Aggregate Cycle Value</div>
                                                                        <div className="text-2xl font-black italic tabular-nums tracking-tighter text-cyan-500">₹{history.totalAmount.toLocaleString()}</div>
                                                                    </div>
                                                                    {history.isPaid && (
                                                                        <button
                                                                            onClick={() => {
                                                                                const monthDate = new Date(history.month + "-01");
                                                                                const monthName = monthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
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
                                                                                        paymentMethod: actualPayment ? actualPayment.paymentMethod : "Cycle Fee",
                                                                                        status: actualPayment ? actualPayment.status : "PAID"
                                                                                    }
                                                                                });
                                                                            }}
                                                                            className="h-12 w-12 bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all duration-300 shadow-xl shadow-cyan-600/20 border border-white/10"
                                                                        >
                                                                            <FaFileInvoice size={18} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Static Installment Ledger */}
                                        {admission.admissionType !== "BOARD" && (
                                            <div className="mb-12">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                                    <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.5em] flex items-center gap-4 italic">
                                                        <span className="p-2.5 bg-cyan-500/10 rounded-xl text-cyan-500 shadow-inner">
                                                            <FaUniversity size={14} />
                                                        </span>
                                                        Installment Sequence Matrix
                                                    </h4>
                                                    {canCreatePayment && admission.remainingAmount > 0 && (
                                                        <button
                                                            onClick={() => {
                                                                setEditingAdmission(admission);
                                                                setShowEditScheduleModal(true);
                                                            }}
                                                            className={`px-8 py-3.5 font-black uppercase text-[10px] tracking-[0.3em] rounded-2xl transition-all duration-300 active:scale-95 border flex items-center gap-3 italic ${isDarkMode ? 'bg-white/5 text-gray-300 border-gray-800 hover:bg-cyan-500/10 hover:text-cyan-500 hover:border-cyan-500/30' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 shadow-sm'}`}
                                                        >
                                                            <FaEdit className="text-cyan-500" size={12} /> RE-STRUCTURE_SCHEDULE
                                                        </button>
                                                    )}
                                                </div>
                                                <div className={`rounded-[3rem] overflow-hidden border transition-all duration-700 shadow-2xl ${isDarkMode ? 'bg-black/30 border-gray-800 shadow-black/40' : 'bg-white border-gray-100 shadow-sm'}`}>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left border-collapse min-w-[1200px]">
                                                            <thead>
                                                                <tr className={`border-b transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                                                    <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] italic">Sequence</th>
                                                                    <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] italic">Maturity Horizon</th>
                                                                    <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] italic">Instrument Value</th>
                                                                    <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] italic">Settled</th>
                                                                    <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] italic">Protocol</th>
                                                                    <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] italic">Audit state</th>
                                                                    <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] italic text-right">Settlement</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className={`divide-y transition-all duration-500 ${isDarkMode ? 'divide-gray-800/40' : 'divide-gray-100'}`}>
                                                                {admission.paymentBreakdown && admission.paymentBreakdown.map((installment, idx) => {
                                                                    const today = new Date();
                                                                    today.setHours(0, 0, 0, 0);
                                                                    const dueDate = new Date(installment.dueDate);
                                                                    dueDate.setHours(0, 0, 0, 0);
                                                                    const isOverdue = (installment.status !== "PAID" && installment.status !== "PENDING_CLEARANCE" && dueDate < today);

                                                                    return (
                                                                        <tr key={idx} className={`transition-all duration-300 ${isDarkMode ? 'hover:bg-cyan-500/[0.04]' : 'hover:bg-cyan-500/[0.03]'}`}>
                                                                            <td className="p-6 font-black text-cyan-500 text-sm italic tracking-widest tabular-nums">#{installment.installmentNumber}</td>
                                                                            <td className={`p-6 text-[11px] font-black uppercase tracking-[0.15em] italic transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{new Date(installment.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</td>
                                                                            <td className={`p-6 font-black italic tabular-nums tracking-tighter text-base transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{installment.amount.toLocaleString()}</td>
                                                                            <td className="p-6 text-emerald-500 font-black italic tabular-nums tracking-tighter text-base">₹{installment.paidAmount?.toLocaleString() || 0}</td>
                                                                            <td className="p-6 text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] italic">{installment.paymentMethod || "NONE"}</td>
                                                                            <td className="p-6">{getStatusBadge(installment.status)}</td>
                                                                            <td className="p-6">
                                                                                {installment.status === "PAID" ? (
                                                                                    <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase border text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-sm shadow-emerald-500/10 tracking-[0.2em] italic">SETTLED</span>
                                                                                ) : isOverdue ? (
                                                                                    <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase border text-red-500 bg-red-500/10 border-red-500/20 shadow-sm shadow-red-500/10 tracking-[0.2em] italic animate-pulse">OVERDUE</span>
                                                                                ) : (
                                                                                    <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase border text-cyan-500 bg-cyan-500/10 border-cyan-500/20 shadow-sm shadow-cyan-500/10 tracking-[0.2em] italic">UPCOMING</span>
                                                                                )}
                                                                            </td>
                                                                            <td className="p-6 text-right">
                                                                                <div className="flex items-center justify-end gap-3">
                                                                                    {(installment.status === "PENDING" || installment.status === "OVERDUE") && canCreatePayment && (
                                                                                        <button
                                                                                            onClick={() => handleOpenPayModal(admission.admissionId, installment)}
                                                                                            className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black text-[10px] uppercase tracking-[0.25em] rounded-2xl hover:from-cyan-500 hover:to-blue-500 active:scale-95 transition-all duration-300 shadow-xl shadow-cyan-600/30 italic"
                                                                                        >
                                                                                            AUTHORIZE_SETTLEMENT
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
                                                                                            className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300 active:scale-90 border ${isDarkMode ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-black shadow-lg shadow-emerald-500/10' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-500 hover:text-white shadow-sm'}`}
                                                                                            title="Extract Document"
                                                                                        >
                                                                                            <FaFileInvoice size={18} />
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Audit Log Trail */}
                                        {admission.admissionType !== "BOARD" && admission.paymentHistory && admission.paymentHistory.length > 0 && (
                                            <div>
                                                <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.5em] mb-8 flex items-center gap-4 italic">
                                                    <span className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500 shadow-inner">
                                                        <FaMoneyBillWave size={14} />
                                                    </span>
                                                    Settlement Audit Ledger ({admission.paymentHistory.length})
                                                </h4>
                                                <div className={`rounded-[3rem] overflow-hidden border transition-all duration-700 shadow-2xl ${isDarkMode ? 'bg-black/30 border-gray-800 shadow-black/40' : 'bg-white border-gray-100 shadow-sm'}`}>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left border-collapse min-w-[1200px]">
                                                            <thead>
                                                                <tr className={`border-b text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] italic transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                                                    <th className="p-6">Audit temporal</th>
                                                                    <th className="p-6">Instrument Seq</th>
                                                                    <th className="p-6">Registry Details</th>
                                                                    <th className="p-6">Settled Amount</th>
                                                                    <th className="p-6">Settlement Protocol</th>
                                                                    <th className="p-6">Audit State</th>
                                                                    <th className="p-6 text-right">Document</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className={`divide-y transition-all duration-500 ${isDarkMode ? 'divide-gray-800/40' : 'divide-gray-100'}`}>
                                                                {admission.paymentHistory.map((payment, idx) => (
                                                                    <tr key={idx} className={`transition-all duration-300 ${isDarkMode ? 'hover:bg-emerald-500/[0.04]' : 'hover:bg-emerald-500/[0.03]'}`}>
                                                                        <td className={`p-6 text-[10px] font-black uppercase tracking-widest italic ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{new Date(payment.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</td>
                                                                        <td className="p-6 text-cyan-500 font-black italic text-sm tracking-[0.2em] tabular-nums">#INST_{payment.installmentNumber}</td>
                                                                        <td className={`p-6 text-[10px] font-black uppercase tracking-[0.15em] italic ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                            {payment.installmentNumber === 0 ? (
                                                                                <span className="text-emerald-500 font-black tracking-[0.2em]">DOWN_PROTOCOL_INIT</span>
                                                                            ) : payment.billingMonth ? (
                                                                                <span>RECURRING_CYCLE: <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{payment.billingMonth?.toUpperCase()}</span></span>
                                                                            ) : (
                                                                                `INSTRUMENT_SEQ_${payment.installmentNumber}`
                                                                            )}
                                                                        </td>
                                                                        <td className={`p-6 font-black italic tabular-nums tracking-tighter text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{payment.paidAmount.toLocaleString()}</td>
                                                                        <td className={`p-6 text-[10px] font-black uppercase tracking-[0.25em] italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{payment.paymentMethod}</td>
                                                                        <td className="p-6">{getStatusBadge(payment.status)}</td>
                                                                        <td className="p-6 text-right">
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
                                                                                className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300 active:scale-90 border ${isDarkMode ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-black shadow-lg shadow-emerald-500/10' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-500 hover:text-white shadow-sm'}`}
                                                                                title="Extract Ledger Document"
                                                                            >
                                                                                <FaFileInvoice size={18} />
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* Settlement Protocol Modal */}
                {showPayModal && (
                    <div className={`fixed inset-0 z-[1000] flex items-center justify-center p-4 backdrop-blur-md transition-all duration-500 animate-in fade-in ${isDarkMode ? 'bg-black/90' : 'bg-gray-900/60'}`}>
                        <div className={`border w-full max-w-xl rounded-[3.5rem] overflow-hidden animate-in zoom-in-95 duration-500 shadow-[0_60px_120px_rgba(0,0,0,0.8)] flex flex-col max-h-[92vh] transition-all ${isDarkMode ? 'bg-[#0f1215] border-gray-800' : 'bg-white border-gray-100'}`}>
                            <div className={`p-10 border-b flex justify-between items-start transition-all duration-500 relative overflow-hidden ${isDarkMode ? 'border-gray-800 bg-white/[0.02]' : 'border-gray-100 bg-gray-50'}`}>
                                <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 blur-[80px] pointer-events-none"></div>
                                <div className="relative z-10">
                                    <h2 className={`text-4xl font-black italic uppercase tracking-tighter leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Record <span className="text-cyan-500">Settlement</span></h2>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mt-4 italic">Instrument Seq # {activeInstallment?.installmentNumber}</p>
                                </div>
                                <div className="text-right relative z-10">
                                    <div className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] mb-2 italic">Outstanding Instrument</div>
                                    <div className="text-3xl font-black text-cyan-500 italic tabular-nums tracking-tighter">₹{activeInstallment?.amount.toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="p-10 grid grid-cols-1 gap-8 overflow-y-auto custom-scrollbar flex-1">
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-4 block italic ml-2">Settlement Value (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-8 top-1/2 -translate-y-1/2 text-2xl font-black italic text-cyan-500">₹</span>
                                        <input
                                            type="number"
                                            value={payFormData.paidAmount}
                                            onChange={(e) => setPayFormData({ ...payFormData, paidAmount: e.target.value })}
                                            className={`w-full border rounded-[2rem] py-5 pl-16 pr-8 text-2xl font-black italic tabular-nums outline-none transition-all duration-300 shadow-inner ${isDarkMode ? 'bg-white/5 border-gray-800 text-white focus:border-cyan-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-4 block italic ml-2">Temporal Timestamp</label>
                                        <input
                                            type="date"
                                            value={payFormData.receivedDate}
                                            onChange={(e) => setPayFormData({ ...payFormData, receivedDate: e.target.value })}
                                            className={`w-full border rounded-2xl py-4 px-6 font-black text-[11px] uppercase outline-none transition-all duration-300 [color-scheme:dark] ${isDarkMode ? 'bg-white/5 border-gray-800 text-white focus:border-cyan-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500 shadow-inner'}`}
                                        />
                                        <p className="text-[9px] text-gray-500 mt-3 uppercase font-black tracking-widest italic ml-2">Actual receipt of funds</p>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-4 block italic ml-2">Settlement Protocol</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {["CASH", "UPI", "CARD", "CHEQUE"].map(method => (
                                                <button
                                                    key={method}
                                                    type="button"
                                                    onClick={() => setPayFormData({ ...payFormData, paymentMethod: method })}
                                                    className={`py-3.5 px-2 rounded-xl text-[10px] font-black border transition-all duration-300 tracking-[0.2em] italic active:scale-95 ${payFormData.paymentMethod === method
                                                        ? "bg-cyan-500 border-cyan-400 text-black shadow-xl shadow-cyan-500/20"
                                                        : (isDarkMode ? "bg-white/5 border-gray-800 text-gray-500 hover:border-cyan-500/30" : "bg-gray-50 border-gray-200 text-gray-400 hover:border-cyan-500/30")
                                                        }`}
                                                >
                                                    {method}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {payFormData.paymentMethod === "CHEQUE" ? (
                                    <div className="animate-in fade-in slide-in-from-top-6 duration-700 space-y-6 p-8 rounded-[2.5rem] border transition-all duration-500 bg-white/[0.01] border-gray-800">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-3 block italic ml-2">Instrument Ref #</label>
                                                <div className="relative">
                                                    <FaUniversity className="absolute left-6 top-1/2 -translate-y-1/2 text-cyan-500" size={12} />
                                                    <input
                                                        type="text"
                                                        value={payFormData.transactionId}
                                                        onChange={(e) => setPayFormData({ ...payFormData, transactionId: e.target.value })}
                                                        className={`w-full border rounded-2xl py-3.5 pl-12 pr-6 font-black text-[11px] uppercase outline-none transition-all duration-300 font-mono ${isDarkMode ? 'bg-black/20 border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500 shadow-sm'}`}
                                                        placeholder="CHQ_REF_IDENTITY"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-3 block italic ml-2">Issuance Temporal</label>
                                                <input
                                                    type="date"
                                                    value={payFormData.chequeDate}
                                                    onChange={(e) => setPayFormData({ ...payFormData, chequeDate: e.target.value })}
                                                    className={`w-full border rounded-2xl py-3.5 px-6 font-black text-[11px] uppercase outline-none transition-all duration-300 [color-scheme:dark] ${isDarkMode ? 'bg-black/20 border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500 shadow-sm'}`}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-3 block italic ml-2">Issuing Institution</label>
                                            <input
                                                type="text"
                                                value={payFormData.accountHolderName}
                                                onChange={(e) => setPayFormData({ ...payFormData, accountHolderName: e.target.value })}
                                                className={`w-full border rounded-2xl py-3.5 px-6 font-black text-[11px] uppercase outline-none transition-all duration-300 ${isDarkMode ? 'bg-black/20 border-gray-800 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500 shadow-sm'}`}
                                                placeholder="NODE_BANK_IDENTITY (e.g. HDFC, ICICI)"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in slide-in-from-top-6 duration-700">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-4 block italic ml-2">
                                            Auth Protocol / Transaction Ref {(['UPI', 'CARD'].includes(payFormData.paymentMethod)) && <span className="text-red-500">*</span>}
                                        </label>
                                        <div className="relative">
                                            <FaCreditCard className="absolute left-6 top-1/2 -translate-y-1/2 text-cyan-500" size={14} />
                                            <input
                                                type="text"
                                                value={payFormData.transactionId}
                                                onChange={(e) => setPayFormData({ ...payFormData, transactionId: e.target.value })}
                                                className={`w-full border rounded-[2rem] py-5 pl-14 pr-8 font-black text-xs uppercase tracking-[0.2em] outline-none transition-all duration-300 font-mono shadow-inner ${isDarkMode ? 'bg-white/5 border-gray-800 text-white focus:border-cyan-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                                placeholder={(['UPI', 'CARD'].includes(payFormData.paymentMethod)) ? `IDENTIFY_${payFormData.paymentMethod}_VECTOR (MANDATORY)` : "OPTIONAL_AUTH_REF"}
                                            />
                                        </div>
                                    </div>
                                )}

                                {parseFloat(payFormData.paidAmount) < (activeInstallment?.amount || 0) && (
                                    <div className={`border p-8 rounded-[2.5rem] flex items-center justify-between transition-all duration-500 ${isDarkMode ? 'bg-orange-500/5 border-orange-500/20' : 'bg-orange-50 border-orange-100 shadow-inner'}`}>
                                        <div className="flex flex-col gap-1">
                                            <div className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] italic flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></div> Carry forward variance?
                                            </div>
                                            <p className="text-[8px] text-gray-500 font-black uppercase tracking-[0.2em]">Map remaining value to future cycles</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={payFormData.carryForward}
                                            onChange={(e) => setPayFormData({ ...payFormData, carryForward: e.target.checked })}
                                            className="h-7 w-7 rounded-lg border-gray-700 bg-black/40 text-cyan-500 focus:ring-cyan-500 transition-all cursor-pointer"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-4 block italic ml-2">Audit Remarks</label>
                                    <textarea
                                        value={payFormData.remarks}
                                        onChange={(e) => setPayFormData({ ...payFormData, remarks: e.target.value })}
                                        className={`w-full border rounded-[2rem] py-5 px-8 font-black text-xs outline-none transition-all duration-300 resize-none h-32 shadow-inner ${isDarkMode ? 'bg-white/5 border-gray-800 text-white placeholder:text-gray-800 focus:border-cyan-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                        placeholder="APPEND_SETTLEMENT_LOGS..."
                                    />
                                </div>
                            </div>

                            <div className={`p-10 border-t flex gap-4 backdrop-blur-xl transition-all duration-500 ${isDarkMode ? 'border-gray-800 bg-white/[0.02]' : 'border-gray-100 bg-gray-50'}`}>
                                <button
                                    onClick={() => setShowPayModal(false)}
                                    className={`flex-1 py-4 font-black uppercase text-[10px] tracking-[0.3em] rounded-2xl transition-all duration-300 active:scale-95 border ${isDarkMode ? 'bg-[#0f1215] border-gray-800 text-gray-500 hover:bg-white/5 hover:text-white' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-900 shadow-sm'}`}
                                >
                                    DISCARD_PROTOCOL
                                </button>
                                <button
                                    onClick={handleRecordPayment}
                                    className="flex-1 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black uppercase text-[10px] tracking-[0.3em] rounded-2xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-500 shadow-2xl shadow-cyan-600/30 active:scale-95 flex items-center justify-center gap-3 italic"
                                >
                                    AUTHORIZE_FUNDS <FaCoins size={12} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bill Generator Protocol */}
                {billModal.show && (
                    <BillGenerator
                        admission={billModal.admission}
                        installment={billModal.installment}
                        isDarkMode={isDarkMode}
                        onClose={() => setBillModal({ show: false, admission: null, installment: null })}
                    />
                )}

                {/* Schedule Revision Matrix */}
                {showEditScheduleModal && (
                    <EditScheduleModal
                        admission={editingAdmission}
                        isDarkMode={isDarkMode}
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
                                    toast.success("Maturity schedule revised successfully");
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
                                toast.error("Network sync failure during revision");
                            }
                        }}
                    />
                )}
            </div>
        </Layout >
    );
};

export default InstallmentPayment;