import React, { useState, useEffect, useMemo, useCallback } from "react";
import Layout from "../components/Layout";
import { useTheme } from "../context/ThemeContext";
import { 
    FaBook, 
    FaBookOpen, 
    FaPlus, 
    FaSearch, 
    FaFileInvoice, 
    FaLock, 
    FaTimes, 
    FaCheckCircle, 
    FaSync, 
    FaFilter, 
    FaMoneyBillWave, 
    FaUser, 
    FaPhoneAlt, 
    FaEnvelope, 
    FaGraduationCap, 
    FaBuilding, 
    FaDownload,
    FaReceipt
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import BillGenerator from "../components/Finance/BillGenerator";

const fmt = (num) => {
    if (num === undefined || num === null || isNaN(num)) return "0.00";
    return Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const BooksEx = () => {
    const { isDarkMode } = useTheme();
    const apiUrl = import.meta.env.VITE_API_URL;
    const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);

    // Master Data States
    const [courses, setCourses] = useState([]);
    const [classes, setClasses] = useState([]);
    const [allowedCentres, setAllowedCentres] = useState([]);
    const [loadingMaster, setLoadingMaster] = useState(false);

    // Records States
    const [allocations, setAllocations] = useState([]);
    const [loadingAllocations, setLoadingAllocations] = useState(false);

    // Filter & Search States
    const [searchTerm, setSearchTerm] = useState("");
    const [centreFilter, setCentreFilter] = useState("ALL");
    const [paymentFilter, setPaymentFilter] = useState("ALL");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Modal & Purchase Form States
    const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        studentName: "",
        mobileNum: "",
        className: "",
        email: "",
        centreName: "",
        courseId: "",
        courseName: "",
        itemName: "",
        amount: "",
        discount: "",
        paymentMethod: "CASH",
        paymentDate: new Date().toISOString().split("T")[0],
        transactionId: "",
        accountHolderName: "",
        remarks: ""
    });

    // Bill Generator Modal State
    const [billModal, setBillModal] = useState({
        show: false,
        preloadedBillData: null,
        installment: null,
        admission: null
    });

    // 1. Fetch Master Data
    const fetchMasterData = useCallback(async () => {
        setLoadingMaster(true);
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [coursesRes, classesRes, centresRes, profileRes] = await Promise.all([
                fetch(`${apiUrl}/course`, { headers }),
                fetch(`${apiUrl}/class`, { headers }),
                fetch(`${apiUrl}/centre`, { headers }),
                fetch(`${apiUrl}/profile/me`, { headers })
            ]);

            if (coursesRes.ok) {
                const cData = await coursesRes.json();
                setCourses(Array.isArray(cData) ? cData : []);
            }

            if (classesRes.ok) {
                const clsData = await classesRes.json();
                setClasses(Array.isArray(clsData) ? clsData : []);
            }

            let userCentres = [];
            if (profileRes.ok) {
                const pData = await profileRes.json();
                const u = pData.user || {};
                userCentres = (u.centres || []).map(c => c.centreName || c.name || c).filter(Boolean);
            }

            if (centresRes.ok) {
                const allCentres = await centresRes.json();
                const activeCentres = (Array.isArray(allCentres) ? allCentres : [])
                    .filter(c => c.status !== "deactive" && c.status !== "inactive" && c.status !== "Inactive")
                    .map(c => c.centreName)
                    .filter(Boolean)
                    .sort((a, b) => a.localeCompare(b));

                const isSuper = user.role === 'superAdmin' || user.role === 'Super Admin' || user.role === 'superadmin';
                if (isSuper || userCentres.length === 0) {
                    setAllowedCentres(activeCentres);
                    if (!form.centreName && activeCentres.length > 0) {
                        setForm(prev => ({ ...prev, centreName: activeCentres[0] }));
                    }
                } else {
                    const filtered = activeCentres.filter(c => userCentres.includes(c));
                    setAllowedCentres(filtered.length > 0 ? filtered : activeCentres);
                    if (!form.centreName && filtered.length > 0) {
                        setForm(prev => ({ ...prev, centreName: filtered[0] }));
                    }
                }
            }
        } catch (err) {
            console.error("Error fetching master data for BOOKS EX:", err);
        } finally {
            setLoadingMaster(false);
        }
    }, [apiUrl, user.role, form.centreName]);

    // 2. Fetch External Book Allocations
    const fetchAllocations = useCallback(async () => {
        setLoadingAllocations(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${apiUrl}/inventory/allocation/external`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAllocations(data.allocations || []);
            } else {
                toast.error("Failed to load external book records");
            }
        } catch (err) {
            console.error("Error fetching external allocations:", err);
            toast.error("Network error while loading external book records");
        } finally {
            setLoadingAllocations(false);
        }
    }, [apiUrl]);

    useEffect(() => {
        fetchMasterData();
        fetchAllocations();
    }, [fetchMasterData, fetchAllocations]);

    // Helper: Resolve Course Amount
    const resolveCourseAmount = (course) => {
        if (!course) return 0;
        if (course.totalFees && Number(course.totalFees) > 0) return Number(course.totalFees);
        if (Array.isArray(course.feesStructure) && course.feesStructure.length > 0) {
            const matFee = course.feesStructure.find(f => /material|book|study|kit/i.test(f.feesType));
            if (matFee?.value) return Number(matFee.value);
            const base = course.feesStructure.reduce((sum, f) => sum + (Number(f.value) || 0), 0);
            if (base > 0) return Math.round(base * 1.18);
        }
        if (course.courseFee && Number(course.courseFee) > 0) return Number(course.courseFee);
        return 0;
    };

    // Handle Course Selection in Purchase Form
    const handleCourseSelect = (e) => {
        const cId = e.target.value;
        if (!cId) {
            setForm(prev => ({
                ...prev,
                courseId: "",
                courseName: "",
                itemName: "",
                amount: "",
                discount: "",
                remarks: ""
            }));
            return;
        }

        const selected = courses.find(c => c._id === cId);
        const cName = selected?.courseName || "";
        const autoAmt = resolveCourseAmount(selected);

        setForm(prev => ({
            ...prev,
            courseId: cId,
            courseName: cName,
            itemName: cName ? `${cName} - Books Set` : "Academic Books / Study Material",
            amount: autoAmt > 0 ? autoAmt : "",
            remarks: `External Book Purchase - ${cName}`
        }));
    };

    // Calculate Net Amount Live
    const grossAmount = parseFloat(form.amount) || 0;
    const discountAmount = Math.max(0, Math.min(grossAmount, parseFloat(form.discount) || 0));
    const netPayable = Math.max(0, grossAmount - discountAmount);

    // Submit Purchase Form
    const handleBuyBookSubmit = async (e) => {
        e.preventDefault();

        if (!form.studentName.trim()) {
            toast.error("Student Name is required.");
            return;
        }

        const cleanMobile = form.mobileNum.trim().replace(/\D/g, "");
        if (!cleanMobile || cleanMobile.length < 10) {
            toast.error("Please enter a valid 10-digit Mobile Number.");
            return;
        }

        if (!form.courseId && !form.courseName) {
            toast.error("Please select a Course.");
            return;
        }

        if (grossAmount <= 0) {
            toast.error("Course amount cannot be zero.");
            return;
        }

        const isOnline = ["UPI", "CARD", "BANK_TRANSFER", "CHEQUE"].includes(form.paymentMethod);
        if (isOnline && !form.transactionId.trim()) {
            toast.error(`Transaction / Cheque reference ID is required for ${form.paymentMethod} payment.`);
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            const payload = {
                isExternal: true,
                studentName: form.studentName.trim(),
                mobileNum: cleanMobile,
                email: form.email.trim(),
                class: form.className,
                centreName: form.centreName || (allowedCentres[0] || "MAIN"),
                studentDetails: {
                    studentName: form.studentName.trim(),
                    mobileNum: cleanMobile,
                    email: form.email.trim(),
                    class: form.className,
                    centre: form.centreName || (allowedCentres[0] || "MAIN")
                },
                courseId: form.courseId,
                courseName: form.courseName,
                items: [
                    {
                        itemName: form.itemName || `${form.courseName} - Books Set`,
                        quantity: 1,
                        itemType: "Paid",
                        price: grossAmount
                    }
                ],
                discount: discountAmount,
                paymentMethod: form.paymentMethod,
                receivedDate: form.paymentDate || new Date().toISOString().split("T")[0],
                transactionId: form.transactionId.trim(),
                accountHolderName: form.accountHolderName.trim(),
                remarks: form.remarks || `External Book Purchase - ${form.courseName}`
            };

            const response = await fetch(`${apiUrl}/inventory/allocation/buy-book`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(`Book purchased successfully! Generated Bill No: ${data.billNumber}`);
                setIsBuyModalOpen(false);

                // Reset form
                setForm({
                    studentName: "",
                    mobileNum: "",
                    className: "",
                    email: "",
                    centreName: allowedCentres[0] || "",
                    courseId: "",
                    courseName: "",
                    itemName: "",
                    amount: "",
                    discount: "",
                    paymentMethod: "CASH",
                    paymentDate: new Date().toISOString().split("T")[0],
                    transactionId: "",
                    accountHolderName: "",
                    remarks: ""
                });

                // Immediately trigger the Bill Generator modal
                if (data.billData) {
                    setBillModal({
                        show: true,
                        preloadedBillData: data.billData,
                        installment: {
                            billId: data.billNumber,
                            status: "PAID"
                        },
                        admission: {
                            centre: form.centreName,
                            studentName: form.studentName
                        }
                    });
                }

                // Refresh table
                fetchAllocations();
            } else {
                toast.error(data.message || "Failed to complete external book purchase");
            }
        } catch (err) {
            console.error("Error submitting external book purchase:", err);
            toast.error("Network or server error during book purchase");
        } finally {
            setSubmitting(false);
        }
    };

    // Open Bill Receipt Modal for Existing Record
    const handleViewBillReceipt = async (billNumber) => {
        if (!billNumber) {
            toast.warning("No bill number associated with this purchase.");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${apiUrl}/inventory/allocation/bill?billId=${encodeURIComponent(billNumber)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.data) {
                setBillModal({
                    show: true,
                    preloadedBillData: data.data,
                    installment: {
                        installmentNumber: 0,
                        status: "PAID",
                        billId: billNumber
                    },
                    admission: {
                        centre: data.data.centre?.name,
                        studentName: data.data.student?.name
                    }
                });
            } else {
                toast.error(data.message || "Could not retrieve bill for this book receipt.");
            }
        } catch (err) {
            console.error("Error viewing bill receipt:", err);
            toast.error("Failed to load bill receipt");
        }
    };

    // Filter Allocations Table
    const filteredAllocations = useMemo(() => {
        return allocations.filter(item => {
            // Student details
            const sDetails = item.student?.studentsDetails?.[0] || {};
            const sName = (sDetails.studentName || item.studentName || "").toLowerCase();
            const sMobile = (sDetails.mobileNum || sDetails.whatsappNumber || item.mobileNum || "").toLowerCase();
            const billNo = (item.billNumber || "").toLowerCase();
            const courseName = (item.payment?.boardCourseName || item.items?.[0]?.itemName || "").toLowerCase();
            const centreName = (item.centre || sDetails.centre || "").toUpperCase();

            // Search Filter
            if (searchTerm.trim()) {
                const q = searchTerm.trim().toLowerCase();
                const matches = sName.includes(q) || sMobile.includes(q) || billNo.includes(q) || courseName.includes(q);
                if (!matches) return false;
            }

            // Centre Filter
            if (centreFilter !== "ALL" && centreName !== centreFilter.toUpperCase()) {
                return false;
            }

            // Payment Mode Filter
            if (paymentFilter !== "ALL") {
                const method = item.paymentMethod || item.payment?.paymentMethod;
                if (method !== paymentFilter) return false;
            }

            // Date Range Filter
            if (startDate || endDate) {
                const itemDate = new Date(item.allocationDate || item.createdAt);
                if (startDate && itemDate < new Date(startDate)) return false;
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    if (itemDate > end) return false;
                }
            }

            return true;
        });
    }, [allocations, searchTerm, centreFilter, paymentFilter, startDate, endDate]);

    // Financial Metric Totals
    const metrics = useMemo(() => {
        let totalRevenue = 0;
        let totalGross = 0;
        let totalDiscount = 0;
        let todayRevenue = 0;

        const todayStr = new Date().toDateString();

        allocations.forEach(a => {
            const net = Number(a.totalAmount || a.payment?.amount || 0);
            const gross = Number(a.grossAmount || (a.items?.reduce((s, i) => s + (Number(i.price) * (Number(i.quantity) || 1)), 0)) || net);
            const disc = Number(a.discount || 0);

            totalRevenue += net;
            totalGross += gross;
            totalDiscount += disc;

            const aDate = new Date(a.allocationDate || a.createdAt);
            if (aDate.toDateString() === todayStr) {
                todayRevenue += net;
            }
        });

        return {
            totalCount: allocations.length,
            totalRevenue,
            totalGross,
            totalDiscount,
            todayRevenue
        };
    }, [allocations]);

    return (
        <Layout activePage="Admissions">
            <div className={`p-4 sm:p-6 space-y-6 min-h-screen ${isDarkMode ? 'bg-[#131619] text-gray-100' : 'bg-gray-50 text-gray-800'}`}>
                <ToastContainer position="top-right" theme={isDarkMode ? "dark" : "light"} />

                {/* ── Top Header Banner ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-700/40">
                    <div className="flex items-center gap-3.5">
                        <div className="p-3 bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center">
                            <FaBookOpen size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
                                    BOOKS EX
                                </h1>
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                    External Student Purchases
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 font-medium mt-0.5">
                                Buy academic books &amp; study material for external students with automatic sequential billing
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={fetchAllocations}
                            disabled={loadingAllocations}
                            className={`p-2.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 ${
                                isDarkMode 
                                    ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' 
                                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100 shadow-sm'
                            }`}
                            title="Refresh Records"
                        >
                            <FaSync className={loadingAllocations ? 'animate-spin text-purple-400' : ''} size={13} />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>

                        <button
                            onClick={() => setIsBuyModalOpen(true)}
                            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-purple-600/30 flex items-center gap-2 active:scale-95 transition-all"
                        >
                            <FaPlus size={12} />
                            <span>Buy Book for External</span>
                        </button>
                    </div>
                </div>

                {/* ── Metric Summary Cards ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className={`p-4 rounded-xl border transition-all ${isDarkMode ? 'bg-[#181b1e] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Purchases</span>
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                <FaReceipt size={14} />
                            </div>
                        </div>
                        <p className="text-xl sm:text-2xl font-black mt-2 text-blue-400">
                            {metrics.totalCount}
                        </p>
                        <span className="text-[10px] text-gray-500 font-bold">External Book Allotments</span>
                    </div>

                    <div className={`p-4 rounded-xl border transition-all ${isDarkMode ? 'bg-[#181b1e] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Net Collections</span>
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                                <FaMoneyBillWave size={14} />
                            </div>
                        </div>
                        <p className="text-xl sm:text-2xl font-black mt-2 text-emerald-400">
                            ₹{fmt(metrics.totalRevenue)}
                        </p>
                        <span className="text-[10px] text-gray-500 font-bold">Total Collected Revenue</span>
                    </div>

                    <div className={`p-4 rounded-xl border transition-all ${isDarkMode ? 'bg-[#181b1e] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Discounts</span>
                            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                                <FaFilter size={14} />
                            </div>
                        </div>
                        <p className="text-xl sm:text-2xl font-black mt-2 text-amber-400">
                            ₹{fmt(metrics.totalDiscount)}
                        </p>
                        <span className="text-[10px] text-gray-500 font-bold">Concessions / Waivers Given</span>
                    </div>

                    <div className={`p-4 rounded-xl border transition-all ${isDarkMode ? 'bg-[#181b1e] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Today's Collections</span>
                            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                                <FaCalendarCheckIcon size={14} />
                            </div>
                        </div>
                        <p className="text-xl sm:text-2xl font-black mt-2 text-purple-400">
                            ₹{fmt(metrics.todayRevenue)}
                        </p>
                        <span className="text-[10px] text-gray-500 font-bold">Collected Today</span>
                    </div>
                </div>

                {/* ── Filter Bar ── */}
                <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-[#181b1e] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                        {/* Search Input */}
                        <div className="md:col-span-2 relative">
                            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by Student Name, Mobile, Bill No..."
                                className={`w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-lg border outline-none transition-all ${
                                    isDarkMode 
                                        ? 'bg-[#131619] border-gray-700 text-white focus:border-purple-500' 
                                        : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-purple-500'
                                }`}
                            />
                        </div>

                        {/* Centre Filter */}
                        <div>
                            <select
                                value={centreFilter}
                                onChange={(e) => setCentreFilter(e.target.value)}
                                className={`w-full p-2 text-xs font-bold rounded-lg border outline-none transition-all ${
                                    isDarkMode 
                                        ? 'bg-[#131619] border-gray-700 text-white focus:border-purple-500' 
                                        : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-purple-500'
                                }`}
                            >
                                <option value="ALL">All Centres / Branches</option>
                                {allowedCentres.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        {/* Payment Method Filter */}
                        <div>
                            <select
                                value={paymentFilter}
                                onChange={(e) => setPaymentFilter(e.target.value)}
                                className={`w-full p-2 text-xs font-bold rounded-lg border outline-none transition-all ${
                                    isDarkMode 
                                        ? 'bg-[#131619] border-gray-700 text-white focus:border-purple-500' 
                                        : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-purple-500'
                                }`}
                            >
                                <option value="ALL">All Payment Methods</option>
                                <option value="CASH">CASH</option>
                                <option value="UPI">UPI</option>
                                <option value="CARD">CARD</option>
                                <option value="BANK_TRANSFER">BANK TRANSFER</option>
                                <option value="CHEQUE">CHEQUE</option>
                            </select>
                        </div>

                        {/* Reset Filter Button */}
                        <div className="flex items-center">
                            <button
                                onClick={() => {
                                    setSearchTerm("");
                                    setCentreFilter("ALL");
                                    setPaymentFilter("ALL");
                                    setStartDate("");
                                    setEndDate("");
                                }}
                                className={`w-full py-2 px-3 text-xs font-black uppercase tracking-wider rounded-lg border transition-all ${
                                    isDarkMode 
                                        ? 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white' 
                                        : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── External Book Purchases Table ── */}
                <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'bg-[#181b1e] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="p-4 border-b border-gray-700/40 flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                                <FaBook className="text-purple-400" />
                                <span>Recent External Book Allotments</span>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                    {filteredAllocations.length} records
                                </span>
                            </h2>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className={`text-[10px] font-black uppercase tracking-wider border-b ${
                                    isDarkMode ? 'bg-[#131619] text-gray-400 border-gray-800' : 'bg-gray-50 text-gray-600 border-gray-200'
                                }`}>
                                    <th className="py-3 px-4">Bill Number</th>
                                    <th className="py-3 px-4">Date &amp; Time</th>
                                    <th className="py-3 px-4">Student Details</th>
                                    <th className="py-3 px-4">Contact</th>
                                    <th className="py-3 px-4">Class</th>
                                    <th className="py-3 px-4">Course / Book Set</th>
                                    <th className="py-3 px-4">Centre</th>
                                    <th className="py-3 px-4">Payment</th>
                                    <th className="py-3 px-4 text-right">Net Amount</th>
                                    <th className="py-3 px-4 text-center">Receipt</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/20">
                                {loadingAllocations ? (
                                    <tr>
                                        <td colSpan="10" className="py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <FaSync className="animate-spin text-purple-400 text-lg" />
                                                <span className="font-bold text-xs uppercase tracking-wider">Loading External Book Records...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredAllocations.length === 0 ? (
                                    <tr>
                                        <td colSpan="10" className="py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <FaBookOpen className="text-gray-600 text-2xl" />
                                                <p className="font-bold text-xs uppercase tracking-wider">No external book purchase records found</p>
                                                <p className="text-[11px] text-gray-500">Click &ldquo;Buy Book for External&rdquo; above to record a new purchase.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAllocations.map((alloc) => {
                                        const sDoc = alloc.student?.studentsDetails?.[0] || {};
                                        const studentName = sDoc.studentName || alloc.studentName || "External Student";
                                        const mobile = sDoc.mobileNum || sDoc.whatsappNumber || alloc.mobileNum || "N/A";
                                        const email = sDoc.studentEmail || sDoc.email || alloc.email || "N/A";
                                        const studentClass = sDoc.lastClass || alloc.className || alloc.class || "N/A";
                                        const courseDesc = alloc.payment?.boardCourseName || alloc.items?.map(i => i.itemName).join(", ") || "Academic Books";
                                        const billNo = alloc.billNumber || alloc.payment?.billId || "PENDING";
                                        const paymentMode = alloc.paymentMethod || alloc.payment?.paymentMethod || "CASH";
                                        const txnId = alloc.payment?.transactionId || "";
                                        const netAmt = alloc.totalAmount || alloc.payment?.amount || 0;
                                        const grossAmt = alloc.grossAmount || netAmt;
                                        const discAmt = alloc.discount || 0;
                                        const dateStr = alloc.allocationDate || alloc.createdAt;

                                        return (
                                            <tr 
                                                key={alloc._id}
                                                className={`transition-colors hover:${isDarkMode ? 'bg-gray-800/40' : 'bg-gray-50'}`}
                                            >
                                                <td className="py-3 px-4 font-mono font-bold">
                                                    <span className="px-2 py-1 rounded text-[11px] font-black bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                                        #{billNo}
                                                    </span>
                                                </td>

                                                <td className="py-3 px-4 text-[11px] text-gray-400 whitespace-nowrap">
                                                    {dateStr ? new Date(dateStr).toLocaleDateString('en-GB') : "N/A"}
                                                    <span className="block text-[10px] text-gray-500">
                                                        {dateStr ? new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ""}
                                                    </span>
                                                </td>

                                                <td className="py-3 px-4 font-bold">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-black text-xs shrink-0">
                                                            {studentName.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-black uppercase truncate text-xs">{studentName}</p>
                                                            {email !== "N/A" && (
                                                                <p className="text-[10px] text-gray-500 truncate">{email}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="py-3 px-4 text-gray-300 font-mono text-[11px]">
                                                    {mobile}
                                                </td>

                                                <td className="py-3 px-4">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-gray-700/40 text-gray-300 border border-gray-700">
                                                        {studentClass}
                                                    </span>
                                                </td>

                                                <td className="py-3 px-4 max-w-xs">
                                                    <p className="font-bold uppercase truncate text-xs text-purple-300" title={courseDesc}>
                                                        {courseDesc}
                                                    </p>
                                                    {alloc.items?.[0] && (
                                                        <p className="text-[10px] text-gray-500 truncate">
                                                            Qty: {alloc.items[0].quantity || 1} &bull; Item: {alloc.items[0].itemName}
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="py-3 px-4 font-bold uppercase text-[11px]">
                                                    {alloc.centre || sDoc.centre || "MAIN"}
                                                </td>

                                                <td className="py-3 px-4">
                                                    <span className="font-bold text-[10px] uppercase block">
                                                        {paymentMode}
                                                    </span>
                                                    {txnId && (
                                                        <span className="text-[9px] font-mono text-gray-500 truncate max-w-[100px] block" title={txnId}>
                                                            {txnId}
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-3 px-4 text-right">
                                                    <span className="font-black text-xs text-emerald-400 block">
                                                        ₹{fmt(netAmt)}
                                                    </span>
                                                    {discAmt > 0 && (
                                                        <span className="text-[9px] text-amber-400 block" title={`Gross: ₹${fmt(grossAmt)} - Disc: ₹${fmt(discAmt)}`}>
                                                            Disc: ₹{fmt(discAmt)}
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-3 px-4 text-center">
                                                    {billNo && billNo !== "PENDING" ? (
                                                        <button
                                                            onClick={() => handleViewBillReceipt(billNo)}
                                                            className="px-2.5 py-1.5 rounded bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white border border-purple-500/30 text-[10px] font-black uppercase tracking-wider transition-all inline-flex items-center gap-1.5 shadow-sm active:scale-95"
                                                            title={`View Bill Receipt #${billNo}`}
                                                        >
                                                            <FaFileInvoice size={11} />
                                                            <span>Receipt</span>
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-500 text-[10px] italic">No Bill</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Buy Book for External Modal ── */}
                {isBuyModalOpen && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 sm:p-4 backdrop-blur-sm animate-fadeIn">
                        <div className={`relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-xl border shadow-2xl ${
                            isDarkMode ? 'bg-[#181b1e] border-purple-900/40 text-white' : 'bg-white border-purple-200 text-gray-900'
                        }`}>
                            {/* Modal Header */}
                            <div className={`sticky top-0 z-10 flex items-center justify-between p-4 sm:p-5 border-b backdrop-blur-md ${
                                isDarkMode ? 'bg-[#181b1e]/95 border-gray-800' : 'bg-white/95 border-gray-100'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                        <FaBookOpen size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-base sm:text-lg font-black uppercase tracking-tight flex items-center gap-2">
                                            Buy Books for External Student
                                        </h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                            Auto-Sequential Bill Generation &bull; Module BOOKS EX
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsBuyModalOpen(false)}
                                    className={`p-2 rounded-lg transition-all ${
                                        isDarkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                                    }`}
                                >
                                    <FaTimes size={16} />
                                </button>
                            </div>

                            {/* Modal Form */}
                            <form onSubmit={handleBuyBookSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                                
                                {/* Section 1: External Student Details (Only 4 fields as requested) */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                        <span className="text-[11px] font-black uppercase tracking-widest text-purple-400">
                                            Student Details (External)
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        {/* Student Name */}
                                        <div>
                                            <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${
                                                isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                            }`}>
                                                Student Name <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={11} />
                                                <input
                                                    type="text"
                                                    required
                                                    value={form.studentName}
                                                    onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                                                    placeholder="Enter Full Name"
                                                    className={`w-full pl-8 pr-3 py-2.5 rounded-lg border text-xs font-bold outline-none transition-all ${
                                                        isDarkMode 
                                                            ? 'bg-[#131619] border-gray-700 text-white focus:border-purple-500' 
                                                            : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                                                    }`}
                                                />
                                            </div>
                                        </div>

                                        {/* Mobile Number */}
                                        <div>
                                            <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${
                                                isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                            }`}>
                                                Mobile Number <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <FaPhoneAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={11} />
                                                <input
                                                    type="tel"
                                                    required
                                                    maxLength={10}
                                                    value={form.mobileNum}
                                                    onChange={(e) => setForm({ ...form, mobileNum: e.target.value.replace(/\D/g, "") })}
                                                    placeholder="10-digit Mobile Number"
                                                    className={`w-full pl-8 pr-3 py-2.5 rounded-lg border text-xs font-bold outline-none transition-all ${
                                                        isDarkMode 
                                                            ? 'bg-[#131619] border-gray-700 text-white focus:border-purple-500' 
                                                            : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                                                    }`}
                                                />
                                            </div>
                                        </div>

                                        {/* Class */}
                                        <div>
                                            <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${
                                                isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                            }`}>
                                                Class
                                            </label>
                                            <div className="relative">
                                                <FaGraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={12} />
                                                <select
                                                    value={form.className}
                                                    onChange={(e) => setForm({ ...form, className: e.target.value })}
                                                    className={`w-full pl-8 pr-3 py-2.5 rounded-lg border text-xs font-bold outline-none transition-all ${
                                                        isDarkMode 
                                                            ? 'bg-[#131619] border-gray-700 text-white focus:border-purple-500' 
                                                            : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                                                    }`}
                                                >
                                                    <option value="">-- Select Class --</option>
                                                    {classes.map(cls => (
                                                        <option key={cls._id || cls.name} value={cls.name || cls.className}>
                                                            {cls.name || cls.className}
                                                        </option>
                                                    ))}
                                                    {!classes.some(c => c.name === "10") && (
                                                        <>
                                                            <option value="Class 7">Class 7</option>
                                                            <option value="Class 8">Class 8</option>
                                                            <option value="Class 9">Class 9</option>
                                                            <option value="Class 10">Class 10</option>
                                                            <option value="Class 11">Class 11</option>
                                                            <option value="Class 12">Class 12</option>
                                                            <option value="Repeater / Dropper">Repeater / Dropper</option>
                                                        </>
                                                    )}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Email */}
                                        <div>
                                            <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${
                                                isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                            }`}>
                                                Email Address
                                            </label>
                                            <div className="relative">
                                                <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={11} />
                                                <input
                                                    type="email"
                                                    value={form.email}
                                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                                    placeholder="student@example.com (Optional)"
                                                    className={`w-full pl-8 pr-3 py-2.5 rounded-lg border text-xs font-bold outline-none transition-all ${
                                                        isDarkMode 
                                                            ? 'bg-[#131619] border-gray-700 text-white focus:border-purple-500' 
                                                            : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                                                    }`}
                                                />
                                            </div>
                                        </div>

                                        {/* Centre Selection */}
                                        <div className="sm:col-span-2">
                                            <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${
                                                isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                            }`}>
                                                Branch / Centre <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <FaBuilding className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={11} />
                                                <select
                                                    required
                                                    value={form.centreName}
                                                    onChange={(e) => setForm({ ...form, centreName: e.target.value })}
                                                    className={`w-full pl-8 pr-3 py-2.5 rounded-lg border text-xs font-bold outline-none transition-all ${
                                                        isDarkMode 
                                                            ? 'bg-[#131619] border-gray-700 text-white focus:border-purple-500' 
                                                            : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                                                    }`}
                                                >
                                                    {allowedCentres.map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Course Selection & Financials */}
                                <div className="pt-2 border-t border-gray-700/40">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                        <span className="text-[11px] font-black uppercase tracking-widest text-indigo-400">
                                            Course &amp; Book Material
                                        </span>
                                    </div>

                                    {/* Select Course Dropdown */}
                                    <div className="mb-4">
                                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${
                                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                        }`}>
                                            Select Course <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            required
                                            value={form.courseId}
                                            onChange={handleCourseSelect}
                                            className={`w-full p-2.5 sm:p-3 rounded-lg border text-xs font-bold outline-none transition-all ${
                                                isDarkMode 
                                                    ? 'bg-[#131619] border-gray-700 text-white focus:border-purple-500' 
                                                    : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                                            }`}
                                        >
                                            <option value="">-- Choose Course for External Book Purchase --</option>
                                            {courses.map(c => (
                                                <option key={c._id} value={c._id}>
                                                    {c.courseName} {c.stream ? `(${c.stream})` : ''} - ₹{fmt(resolveCourseAmount(c))}
                                                </option>
                                            ))}
                                        </select>
                                        {form.courseName && (
                                            <p className="text-[10px] font-bold text-purple-400 mt-1 flex items-center gap-1.5">
                                                <FaCheckCircle size={10} /> Selected Course: <span className="uppercase">{form.courseName}</span>
                                            </p>
                                        )}
                                    </div>

                                    {/* Book Item Name Description */}
                                    <div className="mb-4">
                                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${
                                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                        }`}>
                                            Book / Material Description
                                        </label>
                                        <input
                                            type="text"
                                            value={form.itemName}
                                            onChange={(e) => setForm({ ...form, itemName: e.target.value })}
                                            placeholder="e.g. Study Kit Part 1 & Part 2"
                                            className={`w-full p-2.5 rounded-lg border text-xs font-bold outline-none transition-all ${
                                                isDarkMode 
                                                    ? 'bg-[#131619] border-gray-700 text-white focus:border-purple-500' 
                                                    : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                                            }`}
                                        />
                                    </div>

                                    {/* Amount, Discount & Net Payable Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-end">
                                        {/* Course Amount (LOCKED) */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className={`text-[10px] font-black uppercase tracking-widest ${
                                                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                                }`}>
                                                    Course Amount (₹) <span className="text-red-500">*</span>
                                                </label>
                                                <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-1 bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                    <FaLock size={8} /> Auto-Fetched
                                                </span>
                                            </div>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                                                <input
                                                    type="text"
                                                    readOnly
                                                    disabled
                                                    value={form.amount ? fmt(form.amount) : "0.00"}
                                                    placeholder="0.00"
                                                    className={`w-full pl-7 pr-8 py-2.5 rounded-lg border text-xs font-black cursor-not-allowed select-none ${
                                                        isDarkMode 
                                                            ? 'bg-black/40 border-gray-700/80 text-gray-200 shadow-inner' 
                                                            : 'bg-gray-100 border-gray-300 text-gray-800 shadow-inner'
                                                    }`}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" title="Locked to Course Amount">
                                                    <FaLock size={10} />
                                                </span>
                                            </div>
                                        </div>

                                        {/* Discount (EDITABLE) */}
                                        <div>
                                            <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${
                                                isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                            }`}>
                                                Discount (₹)
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">₹</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    value={form.discount}
                                                    onChange={(e) => setForm({ ...form, discount: e.target.value })}
                                                    placeholder="0.00"
                                                    className={`w-full pl-7 pr-3 py-2.5 rounded-lg border text-xs font-bold outline-none transition-all ${
                                                        isDarkMode 
                                                            ? 'bg-[#131619] border-gray-700 text-white focus:border-purple-500' 
                                                            : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                                                    }`}
                                                />
                                            </div>
                                        </div>

                                        {/* Net Payable Amount */}
                                        <div className={`p-2.5 sm:p-3 rounded-lg border flex flex-col justify-center ${
                                            isDarkMode ? 'bg-purple-950/30 border-purple-800/40' : 'bg-purple-50 border-purple-200'
                                        }`}>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-purple-400">Net Payable Amount</span>
                                            <span className="text-base sm:text-lg font-black text-purple-500">
                                                ₹{fmt(netPayable)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Payment Details */}
                                <div className="pt-2 border-t border-gray-700/40">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
                                            Payment &amp; Transaction Details
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        {/* Payment Method */}
                                        <div>
                                            <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${
                                                isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                            }`}>
                                                Payment Method <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={form.paymentMethod}
                                                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                                                className={`w-full p-2.5 rounded-lg border text-xs font-bold outline-none transition-all ${
                                                    isDarkMode 
                                                        ? 'bg-[#131619] border-gray-700 text-white focus:border-purple-500' 
                                                        : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                                                }`}
                                            >
                                                <option value="CASH">CASH</option>
                                                <option value="UPI">UPI</option>
                                                <option value="CARD">CARD</option>
                                                <option value="BANK_TRANSFER">BANK TRANSFER / NET BANKING</option>
                                                <option value="CHEQUE">CHEQUE</option>
                                            </select>
                                        </div>

                                        {/* Payment Date */}
                                        <div>
                                            <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${
                                                isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                            }`}>
                                                Payment Date
                                            </label>
                                            <input
                                                type="date"
                                                value={form.paymentDate}
                                                onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                                                className={`w-full p-2.5 rounded-lg border text-xs font-bold outline-none transition-all ${
                                                    isDarkMode 
                                                        ? 'bg-[#131619] border-gray-700 text-white focus:border-purple-500' 
                                                        : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                                                }`}
                                            />
                                        </div>
                                    </div>

                                    {/* Non-Cash Transaction fields */}
                                    {form.paymentMethod !== "CASH" && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3">
                                            <div>
                                                <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${
                                                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                                }`}>
                                                    Transaction ID / Cheque No. <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={form.transactionId}
                                                    onChange={(e) => setForm({ ...form, transactionId: e.target.value })}
                                                    placeholder="Reference / UTR / Cheque No."
                                                    className={`w-full p-2.5 rounded-lg border text-xs font-bold outline-none transition-all ${
                                                        isDarkMode 
                                                            ? 'bg-[#131619] border-gray-700 text-white focus:border-purple-500' 
                                                            : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                                                    }`}
                                                />
                                            </div>

                                            <div>
                                                <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${
                                                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                                }`}>
                                                    Payer / Account Holder Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={form.accountHolderName}
                                                    onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
                                                    placeholder="Optional"
                                                    className={`w-full p-2.5 rounded-lg border text-xs font-bold outline-none transition-all ${
                                                        isDarkMode 
                                                            ? 'bg-[#131619] border-gray-700 text-white focus:border-purple-500' 
                                                            : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                                                    }`}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Remarks */}
                                    <div className="mt-3">
                                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${
                                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                        }`}>
                                            Remarks / Notes
                                        </label>
                                        <input
                                            type="text"
                                            value={form.remarks}
                                            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                                            placeholder="Optional note for this purchase"
                                            className={`w-full p-2.5 rounded-lg border text-xs font-bold outline-none transition-all ${
                                                isDarkMode 
                                                    ? 'bg-[#131619] border-gray-700 text-white focus:border-purple-500' 
                                                    : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                                            }`}
                                        />
                                    </div>
                                </div>

                                {/* Modal Footer Buttons */}
                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700/40">
                                    <button
                                        type="button"
                                        onClick={() => setIsBuyModalOpen(false)}
                                        disabled={submitting}
                                        className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                                            isDarkMode 
                                                ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white' 
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
                                    >
                                        {submitting ? (
                                            <><FaSync className="animate-spin" size={13} /> Generating Bill...</>
                                        ) : (
                                            <><FaFileInvoice size={13} /> Bought (Generate Bill)</>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ── Bill Generator Modal ── */}
                {billModal.show && billModal.preloadedBillData && (
                    <BillGenerator
                        admission={billModal.admission}
                        installment={billModal.installment}
                        preloadedBillData={billModal.preloadedBillData}
                        isReceivingSlip={false}
                        onClose={() => setBillModal({ show: false, preloadedBillData: null, installment: null, admission: null })}
                    />
                )}
            </div>
        </Layout>
    );
};

// Simple Fallback Icon if needed
const FaCalendarCheckIcon = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5z"/>
    </svg>
);

export default BooksEx;
