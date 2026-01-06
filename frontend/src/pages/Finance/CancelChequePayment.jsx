import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { hasPermission } from "../../config/permissions";
import { FaSearch, FaBan, FaUndo, FaExclamationTriangle, FaFilter, FaDownload, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const CancelChequePayment = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCheque, setSelectedCheque] = useState(null);
    const [cancelReason, setCancelReason] = useState("");
    const [showModal, setShowModal] = useState(false);

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canCancelCheque = hasPermission(user, 'financeFees', 'cancelCheque', 'delete');

    // Mock data - replace with API call
    const [filters, setFilters] = useState({
        centre: "",
        course: "",
        department: ""
    });
    const [metadata, setMetadata] = useState({
        centres: [],
        courses: [],
        departments: []
    });

    useEffect(() => {
        fetchMetadata();
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

    // Mock data - replace with API call (Enhanced with filterable fields)
    const [cheques, setCheques] = useState([
        {
            id: 1,
            studentName: "Rahul Kumar",
            admissionNo: "ADM2024001",
            chequeNumber: "CHQ123456",
            bankName: "HDFC Bank",
            amount: 25000,
            chequeDate: "2024-12-25",
            status: "Pending",
            centre: "Kolkata Main Campus",
            course: "JEE Advanced",
            department: "Engineering"
        },
        {
            id: 2,
            studentName: "Priya Sharma",
            admissionNo: "ADM2024002",
            chequeNumber: "CHQ789012",
            bankName: "ICICI Bank",
            amount: 30000,
            chequeDate: "2024-12-20",
            status: "Cleared",
            centre: "Salt Lake Centre",
            course: "NEET Medical",
            department: "Medical"
        }
    ]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setFilters({ centre: "", course: "", department: "" });
        setSearchTerm("");
    };

    const exportToExcel = () => {
        if (filteredCheques.length === 0) {
            toast.info("No data to export");
            return;
        }

        const dataToExport = filteredCheques.map(c => ({
            "Cheque No": c.chequeNumber,
            "Student Name": c.studentName,
            "Admission No": c.admissionNo,
            "Bank": c.bankName,
            "Amount": c.amount,
            "Date": c.chequeDate,
            "Status": c.status,
            "Centre": c.centre,
            "Course": c.course,
            "Department": c.department
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Cancelled Cheques");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
        saveAs(data, `Cheque_Cancellation_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Exported successfully!");
    };

    const filteredCheques = cheques.filter(c => {
        const matchesSearch = c.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.admissionNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.chequeNumber?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCentre = !filters.centre || c.centre === filters.centre;
        const matchesCourse = !filters.course || c.course === filters.course; // Typically match ID if real data, using Name for mock
        const matchesDept = !filters.department || c.department === filters.department; // Typically match ID if real data, using Name for mock

        // Note: For real metadata usage, filters.course would be an ID. 
        // Since mock data uses names ("JEE Advanced"), we should adjust logic or mock data.
        // Assuming metadata returns objects with IDs, we should update mock data to use IDs or filter by comparing Names if we map them.
        // For simplicity with this hybrid "Real Metadata + Mock Data" approach, we'll try to match vaguely or assumes mock data is updated to match what's selected (Real Metadata uses IDs usually).
        // Let's assume the user selects from metadata (which has IDs).
        // To make this work with Mock Data containing strings, we'll perform a loose check or just assume strings for now in this snippet. 
        // ACTUALLY: The metadata dropdowns will use IDs as values. The mock data needs IDs or the filter needs to look up the name.
        // Let's stick to using IDs in mock data for correctness if we could, OR just use the text value in dropdowns.
        // Using text value in dropdowns is safer for hybrid state.

        return matchesSearch && matchesCentre && matchesCourse && matchesDept;
    });

    const handleCancelClick = (cheque) => {
        setSelectedCheque(cheque);
        setShowModal(true);
    };

    const handleCancelConfirm = () => {
        if (!cancelReason.trim()) {
            toast.error("Please provide a cancellation reason");
            return;
        }
        // API call to cancel cheque
        toast.success(`Cheque ${selectedCheque.chequeNumber} cancelled successfully`);
        setShowModal(false);
        setCancelReason("");
        setSelectedCheque(null);
    };

    return (
        <Layout activePage="Finance & Fees">
            <div className="p-4 md:p-10 max-w-[1600px] mx-auto min-h-screen pb-20">
                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-2">
                        Cancel Cheque <span className="text-red-500">Payment</span>
                    </h1>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                        Process Cheque Cancellations & Refunds
                    </p>
                </div>

                {/* Warning Banner */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 mb-8 flex items-start gap-4">
                    <FaExclamationTriangle className="text-red-500 text-2xl flex-shrink-0 mt-1" />
                    <div>
                        <h3 className="text-red-500 font-black uppercase text-sm mb-2">Important Notice</h3>
                        <p className="text-gray-400 text-sm">
                            Cancelling a cheque payment is irreversible. Please ensure you have verified all details before proceeding with the cancellation.
                        </p>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="bg-[#131619] border border-gray-800 rounded-3xl p-6 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                        <div className="lg:col-span-1">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Centre</label>
                            <select
                                name="centre"
                                value={filters.centre}
                                onChange={handleFilterChange}
                                className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-white font-bold text-xs outline-none focus:border-red-500/50 transition-all appearance-none"
                            >
                                <option value="">ALL CENTRES</option>
                                {metadata.centres.map(c => (
                                    <option key={c._id} value={c.centreName}>{c.centreName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="lg:col-span-1">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Course</label>
                            <select
                                name="course"
                                value={filters.course}
                                onChange={handleFilterChange}
                                className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-white font-bold text-xs outline-none focus:border-red-500/50 transition-all appearance-none"
                            >
                                <option value="">ALL COURSES</option>
                                {metadata.courses.map(c => (
                                    <option key={c._id} value={c.courseName}>{c.courseName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="lg:col-span-1">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Department</label>
                            <select
                                name="department"
                                value={filters.department}
                                onChange={handleFilterChange}
                                className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-white font-bold text-xs outline-none focus:border-red-500/50 transition-all appearance-none"
                            >
                                <option value="">ALL DEPARTMENTS</option>
                                {metadata.departments.map(d => (
                                    <option key={d._id} value={d.departmentName}>{d.departmentName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="lg:col-span-1">
                            <button
                                onClick={clearFilters}
                                className="w-full py-3 bg-gray-800 text-gray-400 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-gray-700 hover:text-white transition-all border border-gray-700 flex items-center justify-center gap-2"
                            >
                                <FaTimes /> Clear Filters
                            </button>
                        </div>
                        <div className="lg:col-span-1">
                            <button
                                onClick={exportToExcel}
                                className="w-full py-3 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-emerald-500 hover:text-black transition-all flex items-center justify-center gap-2"
                            >
                                <FaDownload /> Export Excel
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="relative group mb-8">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-red-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="SEARCH BY NAME, ADMISSION NO, OR CHEQUE NUMBER..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#131619] border border-gray-800 rounded-xl py-4 pl-12 pr-4 text-gray-200 font-bold text-xs uppercase tracking-wider outline-none focus:border-red-500/50 transition-all"
                    />
                </div>

                {/* Table */}
                <div className="bg-[#131619] border border-gray-800 rounded-[2rem] overflow-hidden shadow-2xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-900/50 border-b border-gray-800 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                <th className="p-6">Cheque No.</th>
                                <th className="p-6">Student</th>
                                <th className="p-6">Bank</th>
                                <th className="p-6">Amount</th>
                                <th className="p-6">Cheque Date</th>
                                <th className="p-6">Status</th>
                                <th className="p-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {filteredCheques.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">
                                        No cheques found
                                    </td>
                                </tr>
                            ) : (
                                filteredCheques.map((cheque) => (
                                    <tr key={cheque.id} className="hover:bg-red-500/[0.02] transition-colors group">
                                        <td className="p-6">
                                            <span className="text-cyan-500 font-black">{cheque.chequeNumber}</span>
                                        </td>
                                        <td className="p-6">
                                            <div className="font-bold text-white">{cheque.studentName}</div>
                                            <div className="text-[10px] text-gray-500 uppercase">{cheque.admissionNo}</div>
                                        </td>
                                        <td className="p-6 text-gray-300">{cheque.bankName}</td>
                                        <td className="p-6 text-white font-bold">₹{cheque.amount.toLocaleString()}</td>
                                        <td className="p-6 text-gray-300">{new Date(cheque.chequeDate).toLocaleDateString('en-IN')}</td>
                                        <td className="p-6">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${cheque.status === "Pending"
                                                ? "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
                                                : "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                                                }`}>
                                                {cheque.status}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            {canCancelCheque && (
                                                <button
                                                    onClick={() => handleCancelClick(cheque)}
                                                    className="px-4 py-2 bg-red-500/10 text-red-500 font-bold text-xs uppercase rounded-lg hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 ml-auto"
                                                >
                                                    <FaBan /> Cancel
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Cancel Modal */}
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-[#131619] w-full max-w-2xl rounded-[2rem] shadow-2xl border border-gray-800 overflow-hidden">
                            <div className="p-8">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                                        <FaBan size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Cancel Cheque Payment</h2>
                                        <p className="text-gray-500 text-xs uppercase tracking-widest">Cheque #{selectedCheque?.chequeNumber}</p>
                                    </div>
                                </div>

                                <div className="bg-black/40 border border-gray-800 rounded-2xl p-6 mb-6">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-500 text-xs uppercase block mb-1">Student</span>
                                            <span className="text-white font-bold">{selectedCheque?.studentName}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 text-xs uppercase block mb-1">Amount</span>
                                            <span className="text-white font-bold">₹{selectedCheque?.amount.toLocaleString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 text-xs uppercase block mb-1">Bank</span>
                                            <span className="text-white font-bold">{selectedCheque?.bankName}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 text-xs uppercase block mb-1">Status</span>
                                            <span className="text-white font-bold">{selectedCheque?.status}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block">
                                        Cancellation Reason *
                                    </label>
                                    <textarea
                                        value={cancelReason}
                                        onChange={(e) => setCancelReason(e.target.value)}
                                        className="w-full bg-black/40 border border-gray-800 rounded-xl p-4 text-white text-sm min-h-[120px] outline-none focus:border-red-500/50 transition-all resize-none"
                                        placeholder="Enter the reason for cancelling this cheque payment..."
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => {
                                            setShowModal(false);
                                            setCancelReason("");
                                            setSelectedCheque(null);
                                        }}
                                        className="flex-1 py-4 bg-gray-800 text-gray-300 font-bold uppercase text-sm tracking-widest rounded-xl hover:bg-gray-700 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCancelConfirm}
                                        className="flex-1 py-4 bg-red-500 text-white font-bold uppercase text-sm tracking-widest rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                                    >
                                        Confirm Cancellation
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default CancelChequePayment;
