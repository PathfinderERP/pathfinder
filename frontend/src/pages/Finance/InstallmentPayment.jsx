import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaSearch, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendarAlt, FaMoneyBillWave, FaCheckCircle, FaClock, FaExclamationTriangle, FaFileInvoice, FaFilter, FaDownload, FaChevronRight } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import BillGenerator from "../../components/Finance/BillGenerator";

const InstallmentPayment = () => {
    const [loading, setLoading] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [financialData, setFinancialData] = useState(null);
    const [billModal, setBillModal] = useState({ show: false, admission: null, installment: null });

    // Admissions List & Filters
    const [admissionsList, setAdmissionsList] = useState([]);
    const [filters, setFilters] = useState({
        centre: "",
        course: "",
        department: "",
        startDate: "",
        endDate: "",
        searchTerm: ""
    });
    const [metadata, setMetadata] = useState({
        centres: [],
        courses: [],
        departments: []
    });

    useEffect(() => {
        fetchMetadata();
        fetchAdmissions();
    }, []);

    const fetchMetadata = async () => {
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

            setMetadata({
                centres: Array.isArray(centres) ? centres : [],
                courses: Array.isArray(courses) ? courses : [],
                departments: Array.isArray(depts) ? depts : []
            });
        } catch (error) {
            console.error("Error fetching metadata:", error);
        }
    };

    const fetchAdmissions = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const queryParams = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) queryParams.append(key, value);
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
            centre: "",
            course: "",
            department: "",
            startDate: "",
            endDate: "",
            searchTerm: ""
        });
        fetchAdmissions();
    };

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

    const exportToExcel = () => {
        if (admissionsList.length === 0) {
            toast.info("No data to export");
            return;
        }

        const dataToExport = admissionsList.map(adm => ({
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
            "Status": adm.paymentStatus
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Financial Summary");

        // Auto-size columns
        const columnWidths = Object.keys(dataToExport[0]).map(key => ({
            wch: Math.max(key.length, ...dataToExport.map(row => (row[key] || "").toString().length)) + 2
        }));
        worksheet["!cols"] = columnWidths;

        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
        saveAs(data, `Student_Financial_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Report exported successfully!");
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

    // Payment Modal State
    const [showPayModal, setShowPayModal] = useState(false);
    const [activeInstallment, setActiveInstallment] = useState(null);
    const [activeAdmissionId, setActiveAdmissionId] = useState(null);
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

    const handleRecordPayment = async () => {
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
                    body: JSON.stringify(payFormData)
                }
            );

            if (response.ok) {
                const data = await response.json();
                toast.success(payFormData.paymentMethod === "CHEQUE" ? "Cheque recorded! Pending clearance." : "Payment successful!");
                setShowPayModal(false);

                // Show bill generator (Acknowledgement for cheques, Bill for others)
                setBillModal({
                    show: true,
                    admission: data.admission,
                    installment: {
                        installmentNumber: activeInstallment.installmentNumber,
                        amount: activeInstallment.amount,
                        paidAmount: payFormData.paidAmount,
                        paidDate: new Date(),
                        receivedDate: payFormData.receivedDate,
                        paymentMethod: payFormData.paymentMethod,
                        status: payFormData.paymentMethod === "CHEQUE" ? "PENDING_CLEARANCE" : "PAID"
                    }
                });

                // Refresh financial details
                handleSelectStudent(selectedStudent.studentId);
                // Refresh list
                fetchAdmissions();
            } else {
                const err = await response.json();
                toast.error(err.message || "Failed to record payment");
            }
        } catch (error) {
            console.error("Payment Error:", error);
            toast.error("Error connecting to server");
        }
    };

    return (
        <Layout activePage="Finance & Fees">
            <div className="p-4 md:p-10 max-w-[1800px] mx-auto min-h-screen pb-20">
                {/* Header */}
                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-2">
                            Installment <span className="text-cyan-500">Payment</span>
                        </h1>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                            {selectedStudent ? "Financial Details for " + selectedStudent.name : "Manage Student Payments & Financial Records"}
                        </p>
                    </div>
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

                {!selectedStudent ? (
                    <>
                        {/* Filters Section */}
                        <div className="bg-[#131619] border border-gray-800 rounded-3xl p-6 mb-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 items-end">
                                {/* Date Range */}
                                <div className="lg:col-span-1">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Admission From</label>
                                    <input
                                        type="date"
                                        name="startDate"
                                        value={filters.startDate}
                                        onChange={handleFilterChange}
                                        className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-white font-bold text-xs outline-none focus:border-cyan-500/50 transition-all"
                                    />
                                </div>
                                <div className="lg:col-span-1">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Admission To</label>
                                    <input
                                        type="date"
                                        name="endDate"
                                        value={filters.endDate}
                                        onChange={handleFilterChange}
                                        className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-white font-bold text-xs outline-none focus:border-cyan-500/50 transition-all"
                                    />
                                </div>

                                {/* Dept Filter */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Department</label>
                                    <select
                                        name="department"
                                        value={filters.department}
                                        onChange={handleFilterChange}
                                        className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-white font-bold text-xs outline-none focus:border-cyan-500/50 transition-all appearance-none"
                                    >
                                        <option value="">ALL DEPARTMENTS</option>
                                        {metadata.departments.map(d => (
                                            <option key={d._id} value={d._id}>{d.departmentName}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Course Filter */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Course</label>
                                    <select
                                        name="course"
                                        value={filters.course}
                                        onChange={handleFilterChange}
                                        className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-white font-bold text-xs outline-none focus:border-cyan-500/50 transition-all appearance-none"
                                    >
                                        <option value="">ALL COURSES</option>
                                        {metadata.courses.map(c => (
                                            <option key={c._id} value={c._id}>{c.courseName}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Centre Filter */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Centre</label>
                                    <select
                                        name="centre"
                                        value={filters.centre}
                                        onChange={handleFilterChange}
                                        className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-white font-bold text-xs outline-none focus:border-cyan-500/50 transition-all appearance-none"
                                    >
                                        <option value="">ALL CENTRES</option>
                                        {metadata.centres.map(c => (
                                            <option key={c._id} value={c.centreName}>{c.centreName}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={fetchAdmissions}
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

                            {/* Text Search */}
                            <div className="mt-8 relative group">
                                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-cyan-500 transition-colors" />
                                <input
                                    type="text"
                                    name="searchTerm"
                                    placeholder="SEARCH BY NAME, EMAIL, OR ADMISSION NUMBER..."
                                    value={filters.searchTerm}
                                    onChange={handleFilterChange}
                                    onKeyPress={(e) => e.key === "Enter" && fetchAdmissions()}
                                    className="w-full bg-black/20 border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-gray-200 font-bold text-sm uppercase tracking-wider outline-none focus:border-cyan-500/50 transition-all focus:bg-black/40"
                                />
                            </div>
                        </div>

                        {/* Students List Table */}
                        <div className="bg-[#131619] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-900/50 border-b border-gray-800">
                                            <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Enrollment No.</th>
                                            <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                                            <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Course / Dept</th>
                                            <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Centre</th>
                                            <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Financials</th>
                                            <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                            <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800/50">
                                        {loading ? (
                                            <tr>
                                                <td colSpan="7" className="p-20 text-center">
                                                    <div className="flex justify-center flex-col items-center gap-4">
                                                        <div className="animate-spin h-10 w-10 border-4 border-cyan-500 border-t-transparent rounded-full shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
                                                        <span className="text-gray-500 font-black uppercase tracking-widest text-xs animate-pulse">Loading Students...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : admissionsList.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="p-20 text-center italic text-gray-600 font-bold uppercase tracking-widest">No students found matching your criteria</td>
                                            </tr>
                                        ) : (
                                            admissionsList.map((adm, idx) => (
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
                                                                <div className="text-white font-black uppercase text-sm">{adm.studentName}</div>
                                                                <div className="text-[10px] text-gray-500 mt-0.5">{adm.mobile} • {adm.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="text-gray-200 font-bold text-xs uppercase">{adm.course}</div>
                                                        <div className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-tighter">{adm.department}</div>
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-800/50 border border-gray-700/50 rounded-lg text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                            <FaMapMarkerAlt className="text-cyan-500" />
                                                            {adm.centre}
                                                        </div>
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="space-y-1">
                                                            <div className="text-[10px] flex justify-between gap-4">
                                                                <span className="text-gray-500 font-bold">TOTAL:</span>
                                                                <span className="text-white font-black">₹{adm.totalFees.toLocaleString()}</span>
                                                            </div>
                                                            <div className="text-[10px] flex justify-between gap-4">
                                                                <span className="text-emerald-500 font-bold">PAID:</span>
                                                                <span className="text-emerald-500 font-black">₹{adm.totalPaid.toLocaleString()}</span>
                                                            </div>
                                                            <div className="text-[10px] flex justify-between gap-4 border-t border-gray-800 pt-1">
                                                                <span className="text-orange-500 font-bold">DUE:</span>
                                                                <span className="text-orange-500 font-black">₹{adm.remainingAmount.toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-6">
                                                        {getStatusBadge(adm.paymentStatus)}
                                                    </td>
                                                    <td className="p-6 text-right">
                                                        <button className="h-10 w-10 rounded-xl bg-gray-800/50 group-hover:bg-cyan-500 group-hover:text-black text-cyan-500 flex items-center justify-center transition-all border border-gray-700 group-hover:border-cyan-400 shadow-lg shadow-black/20">
                                                            <FaChevronRight className="text-xs" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
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
                                <div className="bg-gradient-to-br from-[#131619] to-[#0a0c0e] border border-cyan-500/20 rounded-[2.5rem] p-8 mb-8 relative overflow-hidden shadow-2xl">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] -ml-32 -mb-32"></div>

                                    <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
                                        <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-4xl font-black text-black shadow-xl shadow-cyan-500/20">
                                            {selectedStudent.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 text-center md:text-left">
                                            <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-4">{selectedStudent.name}</h2>
                                            <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                                <div className="bg-black/40 border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-3">
                                                    <FaEnvelope className="text-cyan-500" />
                                                    <span className="text-gray-300 font-bold text-xs uppercase">{selectedStudent.email}</span>
                                                </div>
                                                <div className="bg-black/40 border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-3">
                                                    <FaPhone className="text-cyan-500" />
                                                    <span className="text-gray-300 font-bold text-xs uppercase">{selectedStudent.mobile}</span>
                                                </div>
                                                <div className="bg-black/40 border border-gray-800 px-4 py-2 rounded-xl flex items-center gap-3">
                                                    <FaMapMarkerAlt className="text-cyan-500" />
                                                    <span className="text-gray-300 font-bold text-xs uppercase">{selectedStudent.centre}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Summary Stats */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-10">
                                        <div className="bg-black/40 backdrop-blur-xl border border-gray-800 rounded-2xl p-5 hover:border-cyan-500/30 transition-all group">
                                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 group-hover:text-cyan-500 transition-colors">Total Admissions</div>
                                            <div className="text-2xl font-black text-white">{financialData.summary.totalAdmissions}</div>
                                        </div>
                                        <div className="bg-black/40 backdrop-blur-xl border border-gray-800 rounded-2xl p-5 hover:border-cyan-500/30 transition-all group">
                                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 group-hover:text-cyan-500 transition-colors">Total Fees</div>
                                            <div className="text-2xl font-black text-white">₹{financialData.summary.totalFeesAcrossAll.toLocaleString()}</div>
                                        </div>
                                        <div className="bg-black/40 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-5 hover:border-emerald-500/40 transition-all group">
                                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 text-emerald-500/70">Total Paid</div>
                                            <div className="text-2xl font-black text-emerald-500">₹{financialData.summary.totalPaidAcrossAll.toLocaleString()}</div>
                                        </div>
                                        <div className="bg-black/40 backdrop-blur-xl border border-orange-500/20 rounded-2xl p-5 hover:border-orange-500/40 transition-all group">
                                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 text-orange-500/70">Total Remaining</div>
                                            <div className="text-2xl font-black text-orange-500">₹{financialData.summary.totalRemainingAcrossAll.toLocaleString()}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Admissions List */}
                                {financialData.admissions.map((admission, admIndex) => (
                                    <div key={admIndex} className="bg-[#131619] border border-gray-800 rounded-[2.5rem] p-8 mb-8 relative overflow-hidden group hover:border-gray-700 transition-all shadow-xl">
                                        {/* Admission Header */}
                                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 pb-8 border-b border-gray-800">
                                            <div className="flex items-center gap-6">
                                                <div className="h-16 w-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-2xl text-cyan-500 group-hover:bg-cyan-500 group-hover:text-black transition-all">
                                                    <FaFileInvoice />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-4 mb-2">
                                                        <h3 className="text-2xl font-black text-white italic tracking-tight">{admission.course}</h3>
                                                        {getStatusBadge(admission.paymentStatus)}
                                                    </div>
                                                    <div className="text-xs font-black text-gray-500 uppercase tracking-widest">
                                                        Admission # <span className="text-cyan-500">{admission.admissionNumber}</span> • {admission.academicSession}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-1 gap-4 text-right">
                                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Admission Date</div>
                                                <div className="text-white font-black">{new Date(admission.admissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                                            </div>
                                        </div>

                                        {/* Fee Breakdown */}
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                                            <div className="bg-black/30 border border-gray-800/50 rounded-2xl p-4">
                                                <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Base Fees</div>
                                                <div className="text-lg font-black text-white">₹{admission.baseFees.toLocaleString()}</div>
                                            </div>
                                            <div className="bg-black/30 border border-gray-800/50 rounded-2xl p-4">
                                                <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 text-red-500/70">Waiver</div>
                                                <div className="text-lg font-black text-red-500">-₹{admission.discountAmount.toLocaleString()}</div>
                                            </div>
                                            <div className="bg-black/30 border border-gray-800/50 rounded-2xl p-4">
                                                <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">GST</div>
                                                <div className="text-lg font-black text-white">₹{(admission.cgstAmount + admission.sgstAmount).toLocaleString()}</div>
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

                                        {/* Installment Details */}
                                        <div className="mb-10">
                                            <h4 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                                <div className="h-1 w-8 bg-cyan-500 rounded-full"></div>
                                                Installment Schedule
                                            </h4>
                                            <div className="bg-black/20 border border-gray-800 rounded-[2rem] overflow-hidden">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-gray-900/50 border-b border-gray-800">
                                                            <th className="p-5 text-[9px] font-black text-gray-500 uppercase tracking-widest">Installment</th>
                                                            <th className="p-5 text-[9px] font-black text-gray-500 uppercase tracking-widest">Due Date</th>
                                                            <th className="p-5 text-[9px] font-black text-gray-500 uppercase tracking-widest">Amount</th>
                                                            <th className="p-5 text-[9px] font-black text-gray-500 uppercase tracking-widest">Paid</th>
                                                            <th className="p-5 text-[9px] font-black text-gray-500 uppercase tracking-widest">Method</th>
                                                            <th className="p-5 text-[9px] font-black text-gray-500 uppercase tracking-widest">Status</th>
                                                            <th className="p-5 text-[9px] font-black text-gray-500 uppercase tracking-widest text-right">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-800/50">
                                                        {admission.paymentBreakdown && admission.paymentBreakdown.map((installment, idx) => (
                                                            <tr key={idx} className="hover:bg-cyan-500/[0.03] transition-colors">
                                                                <td className="p-5 font-black text-cyan-500 text-sm italic">#{installment.installmentNumber}</td>
                                                                <td className="p-5 text-gray-300 text-xs font-bold uppercase tracking-tighter">{new Date(installment.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                                <td className="p-5 text-white font-black">₹{installment.amount.toLocaleString()}</td>
                                                                <td className="p-5 text-emerald-400 font-black">₹{installment.paidAmount?.toLocaleString() || 0}</td>
                                                                <td className="p-5 text-gray-500 text-[10px] font-bold uppercase tracking-widest">{installment.paymentMethod || "-"}</td>
                                                                <td className="p-5">{getStatusBadge(installment.status)}</td>
                                                                <td className="p-5 text-right flex items-center justify-end gap-2">
                                                                    {(installment.status === "PENDING" || installment.status === "OVERDUE") && (
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
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Payment History */}
                                        {admission.paymentHistory && admission.paymentHistory.length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                                    <div className="h-1 w-8 bg-emerald-500 rounded-full"></div>
                                                    Payment History ({admission.paymentHistory.length})
                                                </h4>
                                                <div className="bg-black/20 border border-gray-800 rounded-[2rem] overflow-hidden">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className="bg-gray-900/50 border-b border-gray-800 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                                                                <th className="p-5">Date</th>
                                                                <th className="p-5">Inst #</th>
                                                                <th className="p-5">Amount</th>
                                                                <th className="p-5">Method</th>
                                                                <th className="p-5">Status</th>
                                                                <th className="p-5 text-right">Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-800/50">
                                                            {admission.paymentHistory.map((payment, idx) => (
                                                                <tr key={idx} className="hover:bg-emerald-500/[0.03] transition-colors">
                                                                    <td className="p-5 text-gray-300 text-[10px] font-bold">{new Date(payment.createdAt).toLocaleDateString('en-GB')}</td>
                                                                    <td className="p-5 text-cyan-500 font-black italic text-xs">#{payment.installmentNumber}</td>
                                                                    <td className="p-5 text-white font-black">₹{payment.paidAmount.toLocaleString()}</td>
                                                                    <td className="p-5 text-gray-500 text-[10px] font-bold uppercase tracking-widest">{payment.paymentMethod}</td>
                                                                    <td className="p-5">{getStatusBadge(payment.status)}</td>
                                                                    <td className="p-5 text-right">
                                                                        <button
                                                                            onClick={() => setBillModal({
                                                                                show: true,
                                                                                admission: { ...admission, _id: admission.admissionId },
                                                                                installment: {
                                                                                    installmentNumber: payment.installmentNumber,
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
                        <div className="bg-[#0d0f11] border border-gray-800 w-full max-w-lg rounded-[3rem] overflow-hidden animate-in zoom-in-95 duration-300 shadow-[0_0_100px_rgba(6,182,212,0.1)]">
                            <div className="p-10 border-b border-gray-800 bg-gradient-to-r from-cyan-500/10 via-transparent to-transparent flex justify-between items-start">
                                <div>
                                    <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Record <span className="text-cyan-500">Payment</span></h2>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-2">Installment # {activeInstallment?.installmentNumber}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Due Amount</div>
                                    <div className="text-2xl font-black text-cyan-500">₹{activeInstallment?.amount.toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="p-10 grid grid-cols-1 gap-6">
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block">Amount to Record (₹)</label>
                                    <input
                                        type="number"
                                        value={payFormData.paidAmount}
                                        onChange={(e) => setPayFormData({ ...payFormData, paidAmount: e.target.value })}
                                        className="w-full bg-black/40 border border-gray-800 rounded-2xl py-4 px-6 text-white text-lg font-black outline-none focus:border-cyan-500/50 transition-all shadow-inner"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block">Received Date</label>
                                    <input
                                        type="date"
                                        value={payFormData.receivedDate}
                                        onChange={(e) => setPayFormData({ ...payFormData, receivedDate: e.target.value })}
                                        className="w-full bg-black/40 border border-gray-800 rounded-2xl py-4 px-6 text-white text-sm font-black outline-none focus:border-cyan-500/50 transition-all"
                                    />
                                    <p className="text-[9px] text-gray-500 mt-2 uppercase font-black">Actual date when money was received</p>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block">Payment Method</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE"].map(method => (
                                            <button
                                                key={method}
                                                type="button"
                                                onClick={() => setPayFormData({ ...payFormData, paymentMethod: method })}
                                                className={`py-3 px-1 rounded-xl text-[9px] font-black border transition-all ${payFormData.paymentMethod === method
                                                    ? "bg-cyan-500 border-cyan-400 text-black shadow-lg shadow-cyan-500/20"
                                                    : "bg-black/40 border-gray-800 text-gray-500 hover:border-gray-700"
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
                                                    className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-white font-bold text-xs outline-none focus:border-cyan-500/50 transition-all font-mono"
                                                    placeholder="CHQXXXXXX"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Cheque Date</label>
                                                <input
                                                    type="date"
                                                    value={payFormData.chequeDate}
                                                    onChange={(e) => setPayFormData({ ...payFormData, chequeDate: e.target.value })}
                                                    className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-white font-bold text-xs outline-none focus:border-cyan-500/50 transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Bank Name</label>
                                            <input
                                                type="text"
                                                value={payFormData.accountHolderName}
                                                onChange={(e) => setPayFormData({ ...payFormData, accountHolderName: e.target.value })}
                                                className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-white font-bold text-xs outline-none focus:border-cyan-500/50 transition-all"
                                                placeholder="e.g. HDFC, ICICI, SBI..."
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Ref / Transaction ID</label>
                                        <input
                                            type="text"
                                            value={payFormData.transactionId}
                                            onChange={(e) => setPayFormData({ ...payFormData, transactionId: e.target.value })}
                                            className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-white font-bold text-xs outline-none focus:border-cyan-500/50 transition-all font-mono"
                                            placeholder="Optional transaction reference"
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
                                        className="w-full bg-black/40 border border-gray-800 rounded-2xl py-4 px-6 text-white font-bold text-xs outline-none focus:border-cyan-500/50 transition-all resize-none h-24 shadow-inner"
                                        placeholder="Add payment notes..."
                                    />
                                </div>
                            </div>

                            <div className="p-10 border-t border-gray-800 flex gap-4 bg-black/40 backdrop-blur-xl">
                                <button
                                    onClick={() => setShowPayModal(false)}
                                    className="flex-1 py-4 bg-gray-900 text-gray-500 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-gray-800 hover:text-white transition-all border border-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRecordPayment}
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
            </div>
        </Layout>
    );
};

export default InstallmentPayment;
