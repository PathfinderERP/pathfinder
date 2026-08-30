import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import {
    FaSearch,
    FaFileInvoice,
    FaSave,
    FaUndo,
    FaPrint,
    FaCheckCircle,
    FaExclamationTriangle,
    FaUserGraduate,
    FaCalendarAlt,
    FaMoneyBillWave,
    FaUniversity,
    FaCreditCard,
    FaTag,
    FaBuilding,
    FaSpinner,
    FaHistory
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";
import BillGenerator from "../../components/Finance/BillGenerator";

const EditBill = () => {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    const apiUrl = import.meta.env.VITE_API_URL;
    const token = localStorage.getItem("token");

    // Styling helpers
    const cardBg = isDark ? "bg-[#1a1e27]" : "bg-white";
    const cardBorder = isDark ? "border border-gray-700" : "border border-gray-200";
    const subCardBg = isDark ? "bg-[#111318]" : "bg-gray-50";
    const subCardBorder = isDark ? "border border-gray-800" : "border border-gray-100";
    const inputBg = isDark ? "bg-[#15181f] border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-300 text-slate-900";
    const headingText = isDark ? "text-white" : "text-gray-900";
    const subText = isDark ? "text-gray-400" : "text-gray-500";
    const labelText = isDark ? "text-gray-300" : "text-gray-700";

    // Search state
    const [searchQuery, setSearchQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState(null); // array or single
    const [selectedBill, setSelectedBill] = useState(null);

    // Form edit state
    const [formData, setFormData] = useState({
        billId: "",
        paidAmount: "",
        amount: "",
        paymentMethod: "CASH",
        transactionId: "",
        paidDate: "",
        receivedDate: "",
        dueDate: "",
        chequeDate: "",
        bankAccount: "",
        accountHolderName: "",
        bankName: "",
        remarks: "",
        status: "PAID",
        centre: ""
    });

    // Accounts list for bank account dropdown
    const [accounts, setAccounts] = useState([]);
    const [saving, setSaving] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);

    // Load Bank Accounts for dropdown
    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                const res = await fetch(`${apiUrl}/master-data/account`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (Array.isArray(data)) {
                    setAccounts(data);
                } else if (data && Array.isArray(data.data)) {
                    setAccounts(data.data);
                }
            } catch (err) {
                console.error("Error fetching accounts:", err);
            }
        };
        fetchAccounts();
    }, [apiUrl, token]);

    // Handle Search
    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        const trimmed = searchQuery.trim();
        if (!trimmed) {
            toast.warn("Please enter a Bill Number to search");
            return;
        }

        setSearching(true);
        setSelectedBill(null);
        setSearchResults(null);

        try {
            const res = await fetch(`${apiUrl}/payment/edit-bill/search?query=${encodeURIComponent(trimmed)}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                toast.error(data.message || "Bill not found");
                return;
            }

            if (Array.isArray(data.data)) {
                setSearchResults(data.data);
                if (data.data.length === 1) {
                    loadBillIntoForm(data.data[0]);
                }
            } else if (data.data) {
                loadBillIntoForm(data.data);
            }
        } catch (error) {
            console.error("Error searching bill:", error);
            toast.error("Failed to search bill. Please try again.");
        } finally {
            setSearching(false);
        }
    };

    // Helper to format ISO date to YYYY-MM-DD for date inputs
    const formatDateForInput = (d) => {
        if (!d) return "";
        try {
            const dateObj = new Date(d);
            if (isNaN(dateObj.getTime())) return "";
            return dateObj.toISOString().split("T")[0];
        } catch {
            return "";
        }
    };

    // Load selected bill into form
    const loadBillIntoForm = (billItem) => {
        setSelectedBill(billItem);
        const p = billItem.payment;
        const paid = p.paidAmount !== undefined ? p.paidAmount : (p.totalAmount || 0);
        const isExempt = billItem.isGstExempt || false;

        let cf = p.courseFee;
        let c = p.cgst;
        let s = p.sgst;

        if (cf === undefined || c === undefined || s === undefined) {
            cf = isExempt ? paid : parseFloat((paid / 1.18).toFixed(2));
            const gstPool = isExempt ? 0 : parseFloat((paid - cf).toFixed(2));
            c = isExempt ? 0 : parseFloat((gstPool / 2).toFixed(2));
            s = isExempt ? 0 : parseFloat((gstPool - c).toFixed(2));
        }

        setFormData({
            billId: p.billId || "",
            paidAmount: paid,
            courseFee: cf,
            cgst: c,
            sgst: s,
            paymentMethod: p.paymentMethod || "CASH",
            transactionId: p.transactionId || "",
            paidDate: formatDateForInput(p.paidDate),
            receivedDate: formatDateForInput(p.receivedDate || p.paidDate),
            dueDate: formatDateForInput(p.dueDate),
            chequeDate: formatDateForInput(p.chequeDate),
            bankAccount: p.bankAccount?._id || p.bankAccount || "",
            accountHolderName: p.accountHolderName || "",
            bankName: p.bankName || "",
            remarks: p.remarks || "",
            status: p.status || "PAID",
            centre: p.centre || billItem.centre?.centreName || ""
        });
    };

    // Reset Form to originally selected bill
    const handleReset = () => {
        if (selectedBill) {
            loadBillIntoForm(selectedBill);
            toast.info("Form reset to original bill values");
        }
    };

    // Handlers for bidirectional calculation when editing GST or Paid amounts
    const handlePaidAmountChange = (val) => {
        const num = parseFloat(val);
        const isExempt = selectedBill?.isGstExempt || false;
        if (val === "" || isNaN(num) || num < 0) {
            setFormData(prev => ({ ...prev, paidAmount: val, courseFee: "", cgst: "", sgst: "" }));
            return;
        }
        if (isExempt) {
            setFormData(prev => ({ ...prev, paidAmount: val, courseFee: num, cgst: 0, sgst: 0 }));
        } else {
            const cf = parseFloat((num / 1.18).toFixed(2));
            const gstPool = parseFloat((num - cf).toFixed(2));
            const c = parseFloat((gstPool / 2).toFixed(2));
            const s = parseFloat((gstPool - c).toFixed(2));
            setFormData(prev => ({ ...prev, paidAmount: val, courseFee: cf, cgst: c, sgst: s }));
        }
    };

    const handleCourseFeeChange = (val) => {
        const num = parseFloat(val);
        const isExempt = selectedBill?.isGstExempt || false;
        if (val === "" || isNaN(num) || num < 0) {
            setFormData(prev => ({ ...prev, courseFee: val }));
            return;
        }
        if (isExempt) {
            setFormData(prev => ({ ...prev, courseFee: val, cgst: 0, sgst: 0, paidAmount: num }));
        } else {
            const c = parseFloat((num * 0.09).toFixed(2));
            const s = parseFloat((num * 0.09).toFixed(2));
            const total = parseFloat((num + c + s).toFixed(2));
            setFormData(prev => ({ ...prev, courseFee: val, cgst: c, sgst: s, paidAmount: total }));
        }
    };

    const handleCgstChange = (val) => {
        const cNum = parseFloat(val) || 0;
        const cfNum = parseFloat(formData.courseFee) || 0;
        const sNum = parseFloat(formData.sgst) || 0;
        const total = parseFloat((cfNum + cNum + sNum).toFixed(2));
        setFormData(prev => ({ ...prev, cgst: val, paidAmount: total }));
    };

    const handleSgstChange = (val) => {
        const sNum = parseFloat(val) || 0;
        const cfNum = parseFloat(formData.courseFee) || 0;
        const cNum = parseFloat(formData.cgst) || 0;
        const total = parseFloat((cfNum + cNum + sNum).toFixed(2));
        setFormData(prev => ({ ...prev, sgst: val, paidAmount: total }));
    };

    // Handle Save Form Submission
    const handleSave = async () => {
        if (!selectedBill || !selectedBill.payment?._id) {
            toast.error("No active bill selected to update");
            return;
        }

        if (!formData.billId || !formData.billId.trim()) {
            toast.error("Bill Number cannot be empty");
            return;
        }

        if (formData.paidAmount === "" || isNaN(formData.paidAmount) || parseFloat(formData.paidAmount) < 0) {
            toast.error("Please provide a valid paid amount (0 or greater)");
            return;
        }

        if (formData.paymentMethod === "CHEQUE" && !formData.bankAccount) {
            toast.warn("Please select a Bank Account for Cheque payment");
        }

        setShowConfirmModal(false);
        setSaving(true);

        try {
            const res = await fetch(`${apiUrl}/payment/edit-bill/update/${selectedBill.payment._id}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    billId: formData.billId.trim(),
                    paidAmount: parseFloat(formData.paidAmount),
                    courseFee: formData.courseFee !== "" ? parseFloat(formData.courseFee) : undefined,
                    cgst: formData.cgst !== "" ? parseFloat(formData.cgst) : undefined,
                    sgst: formData.sgst !== "" ? parseFloat(formData.sgst) : undefined,
                    paymentMethod: formData.paymentMethod,
                    transactionId: formData.transactionId,
                    paidDate: formData.paidDate ? new Date(formData.paidDate) : null,
                    receivedDate: formData.receivedDate ? new Date(formData.receivedDate) : null,
                    dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
                    chequeDate: formData.chequeDate ? new Date(formData.chequeDate) : null,
                    bankAccount: formData.bankAccount || null,
                    accountHolderName: formData.accountHolderName,
                    bankName: formData.bankName,
                    remarks: formData.remarks,
                    status: formData.status,
                    centre: formData.centre
                })
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                toast.error(data.message || "Failed to update bill");
                return;
            }

            toast.success("Bill updated and synchronized across all modules successfully!");

            // Refresh bill details
            const updatedSearchRes = await fetch(`${apiUrl}/payment/edit-bill/search?query=${encodeURIComponent(formData.billId.trim())}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const refreshed = await updatedSearchRes.json();
            if (refreshed && refreshed.success && refreshed.data) {
                const refreshedItem = Array.isArray(refreshed.data) ? refreshed.data[0] : refreshed.data;
                loadBillIntoForm(refreshedItem);
            }
        } catch (error) {
            console.error("Error updating bill:", error);
            toast.error("An error occurred while updating the bill.");
        } finally {
            setSaving(false);
        }
    };

    // Prepare bill data for BillGenerator print modal
    const preparePrintData = () => {
        if (!selectedBill) return null;
        const p = selectedBill.payment;
        const s = selectedBill.student;
        const c = selectedBill.course;
        const centre = selectedBill.centre;

        return {
            billId: formData.billId,
            billDate: formData.paidDate || new Date(),
            gstNumber: centre?.enterGstNo || "19AAACP1234F1Z5",
            centre: {
                name: centre?.centreName || formData.centre || "General",
                address: centre?.address || "Kolkata",
                phoneNumber: centre?.phoneNumber || "N/A",
                gstNumber: centre?.enterGstNo || "N/A",
                corporateAddress: centre?.enterCorporateOfficeAddress || "47, Kalidas Patitundi Lane, Kalighat, Kolkata-700026",
                corporatePhone: centre?.enterCorporateOfficePhoneNumber || "033 2455-1840 / 2454-4817 / 4668"
            },
            student: {
                id: s?.id || "N/A",
                name: s?.name || "N/A",
                admissionNumber: s?.admissionNumber || s?.rollNo || "N/A",
                phoneNumber: s?.mobileNum || "N/A",
                email: s?.email || "N/A"
            },
            course: {
                name: c?.name || "N/A",
                department: c?.department || "N/A",
                examTag: c?.examTag || "N/A",
                class: c?.class || "N/A",
                session: c?.session || "N/A"
            },
            payment: {
                installmentNumber: p?.installmentNumber !== undefined ? p.installmentNumber : 0,
                paymentMethod: formData.paymentMethod,
                transactionId: formData.transactionId || "N/A",
                paidDate: formData.paidDate ? new Date(formData.paidDate) : new Date(),
                receivedDate: formData.receivedDate ? new Date(formData.receivedDate) : new Date(),
                accountHolderName: formData.accountHolderName,
                chequeDate: formData.chequeDate ? new Date(formData.chequeDate) : null,
                status: formData.status,
                remarks: formData.remarks
            },
            amounts: {
                courseFee: parseFloat(formData.courseFee) || 0,
                cgst: parseFloat(formData.cgst) || 0,
                sgst: parseFloat(formData.sgst) || 0,
                totalAmount: parseFloat(formData.paidAmount) || 0
            }
        };
    };

    const isExempt = selectedBill?.isGstExempt || false;

    return (
        <Layout activePage="/finance/edit-bill">
            <div className="space-y-6 pb-12">
                {/* Page Title Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${headingText} flex items-center gap-3`}>
                            <span className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/20">
                                <FaFileInvoice className="w-6 h-6" />
                            </span>
                            Edit Bill
                        </h1>
                        <p className={`mt-1 text-sm ${subText}`}>
                            Search any bill number, review transactions, edit details, and synchronize across all reports & collections.
                        </p>
                    </div>
                </div>

                {/* Search Card */}
                <div className={`p-6 rounded-2xl ${cardBg} ${cardBorder} shadow-sm transition-all`}>
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="relative flex-1 w-full">
                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by Bill No (e.g. PATH/CT/2026-27/0000001), Admission No, or Txn ID..."
                                className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${inputBg}`}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setSelectedBill(null);
                                        setSearchResults(null);
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={searching}
                            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold rounded-xl shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            {searching ? (
                                <>
                                    <FaSpinner className="animate-spin text-sm" />
                                    Searching...
                                </>
                            ) : (
                                <>
                                    <FaSearch className="text-sm" />
                                    Search Bill
                                </>
                            )}
                        </button>
                    </form>

                    {/* Multiple Search Results Selector */}
                    {searchResults && searchResults.length > 1 && (
                        <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-800">
                            <p className={`text-xs font-semibold uppercase tracking-wider mb-2.5 ${subText}`}>
                                Found {searchResults.length} matching bills. Click to edit:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {searchResults.map((item, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => loadBillIntoForm(item)}
                                        className={`p-3.5 rounded-xl cursor-pointer border transition-all ${
                                            selectedBill?.payment?._id === item.payment?._id
                                                ? "border-orange-500 bg-orange-50/10 dark:bg-orange-500/10 ring-1 ring-orange-500"
                                                : `${subCardBg} ${subCardBorder} hover:border-gray-400`
                                        }`}
                                    >
                                        <div className="flex items-center justify-between text-xs font-bold text-orange-500 mb-1">
                                            <span>{item.payment?.billId || "No Bill ID"}</span>
                                            <span className="text-gray-400">Inst #{item.payment?.installmentNumber}</span>
                                        </div>
                                        <div className={`text-sm font-semibold truncate ${headingText}`}>
                                            {item.student?.name || "Student Name"}
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                                            <span>₹{item.payment?.paidAmount?.toLocaleString() || 0}</span>
                                            <span>{item.payment?.paymentMethod || "N/A"}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Content Area: Visible only when a bill is selected */}
                {selectedBill && (
                    <div className="space-y-6">
                        {/* Student & Course Summary Card */}
                        <div className={`p-6 rounded-2xl ${cardBg} ${cardBorder} shadow-sm`}>
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 mb-4 border-b border-gray-200 dark:border-gray-800">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 text-xl font-bold">
                                        <FaUserGraduate />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <h2 className={`text-xl font-bold ${headingText}`}>
                                                {selectedBill.student?.name || "Student Name"}
                                            </h2>
                                            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                                {selectedBill.student?.admissionNumber || selectedBill.student?.rollNo || "N/A"}
                                            </span>
                                            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                {selectedBill.payment?.installmentNumber === 0 ? "Down Payment" : `Installment #${selectedBill.payment?.installmentNumber}`}
                                            </span>
                                            {isExempt && (
                                                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                                                    GST Exempt (0%)
                                                </span>
                                            )}
                                        </div>
                                        <p className={`text-xs mt-1 ${subText}`}>
                                            Phone: {selectedBill.student?.mobileNum || "N/A"} | Centre: {selectedBill.centre?.centreName || selectedBill.payment?.centre || "N/A"} | Session: {selectedBill.course?.session || "N/A"}
                                        </p>
                                    </div>
                                </div>

                                {/* Quick Print & Action Header Buttons */}
                                <div className="flex items-center gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setShowPrintModal(true)}
                                        className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 shadow-sm transition-all"
                                    >
                                        <FaPrint className="text-orange-500" />
                                        Print / Preview Bill
                                    </button>
                                </div>
                            </div>

                            {/* Key Stats Bar */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div className={`p-3 rounded-xl ${subCardBg} ${subCardBorder}`}>
                                    <span className={subText}>Course</span>
                                    <p className={`font-semibold mt-0.5 truncate ${headingText}`}>
                                        {selectedBill.course?.name || "N/A"}
                                    </p>
                                </div>
                                <div className={`p-3 rounded-xl ${subCardBg} ${subCardBorder}`}>
                                    <span className={subText}>Total Course Fee</span>
                                    <p className={`font-semibold mt-0.5 ${headingText}`}>
                                        ₹{selectedBill.admissionSummary?.totalFees?.toLocaleString() || 0}
                                    </p>
                                </div>
                                <div className={`p-3 rounded-xl ${subCardBg} ${subCardBorder}`}>
                                    <span className={subText}>Total Paid to Date</span>
                                    <p className="font-semibold mt-0.5 text-green-500">
                                        ₹{selectedBill.admissionSummary?.totalPaidAmount?.toLocaleString() || 0}
                                    </p>
                                </div>
                                <div className={`p-3 rounded-xl ${subCardBg} ${subCardBorder}`}>
                                    <span className={subText}>Current Balance</span>
                                    <p className="font-semibold mt-0.5 text-orange-500">
                                        ₹{selectedBill.admissionSummary?.remainingAmount?.toLocaleString() || 0}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Edit Form */}
                        <div className={`p-6 sm:p-8 rounded-2xl ${cardBg} ${cardBorder} shadow-sm space-y-6`}>
                            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
                                <div>
                                    <h3 className={`text-lg font-bold ${headingText} flex items-center gap-2`}>
                                        <FaMoneyBillWave className="text-orange-500" />
                                        Modify Bill Information
                                    </h3>
                                    <p className={`text-xs ${subText}`}>
                                        Any changes made here will update the Payment record, Admission ledger, and all transaction reports.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {/* Bill Number */}
                                <div>
                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelText}`}>
                                        Bill Number (Bill ID) *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.billId}
                                        onChange={(e) => setFormData({ ...formData, billId: e.target.value })}
                                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none ${inputBg}`}
                                        placeholder="e.g. PATH/CT/2026-27/0000001"
                                    />
                                    <span className="text-[11px] text-gray-500 mt-1 block">
                                        Ensure Bill No is unique across all bills.
                                    </span>
                                </div>

                                {/* Paid Amount */}
                                <div>
                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelText}`}>
                                        Paid Amount (₹) *
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={formData.paidAmount}
                                        onChange={(e) => handlePaidAmountChange(e.target.value)}
                                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold text-green-500 focus:ring-2 focus:ring-orange-500 focus:outline-none ${inputBg}`}
                                        placeholder="0.00"
                                    />
                                    <span className="text-[11px] text-gray-500 mt-1 block">
                                        Total amount paid by the student.
                                    </span>
                                </div>

                                {/* Payment Method */}
                                <div>
                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelText}`}>
                                        Payment Method *
                                    </label>
                                    <select
                                        value={formData.paymentMethod}
                                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none ${inputBg}`}
                                    >
                                        <option value="CASH">CASH</option>
                                        <option value="UPI">UPI</option>
                                        <option value="CARD">CARD</option>
                                        <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                                        <option value="CHEQUE">CHEQUE</option>
                                    </select>
                                </div>

                                {/* Transaction ID / Reference */}
                                <div>
                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelText}`}>
                                        Transaction / Reference / Cheque No.
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.transactionId}
                                        onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none ${inputBg}`}
                                        placeholder="UTR, Ref ID, Cheque No, etc."
                                    />
                                </div>

                                {/* Payment Status */}
                                <div>
                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelText}`}>
                                        Payment Status *
                                    </label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none ${inputBg}`}
                                    >
                                        <option value="PAID">PAID</option>
                                        <option value="PENDING_CLEARANCE">PENDING CLEARANCE (Cheque)</option>
                                        <option value="PARTIAL">PARTIAL</option>
                                        <option value="PENDING">PENDING</option>
                                        <option value="REJECTED">REJECTED</option>
                                        <option value="CANCELLED">CANCELLED</option>
                                    </select>
                                </div>

                                {/* Received Date */}
                                <div>
                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelText}`}>
                                        Received Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.receivedDate}
                                        onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none ${inputBg}`}
                                    />
                                </div>

                                {/* Paid Date */}
                                <div>
                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelText}`}>
                                        Paid Date (Bill Date)
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.paidDate}
                                        onChange={(e) => setFormData({ ...formData, paidDate: e.target.value })}
                                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none ${inputBg}`}
                                    />
                                </div>

                                {/* Due Date */}
                                <div>
                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelText}`}>
                                        Due Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.dueDate}
                                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none ${inputBg}`}
                                    />
                                </div>

                                {/* Cheque Date (if applicable) */}
                                {(formData.paymentMethod === "CHEQUE" || formData.chequeDate) && (
                                    <div>
                                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelText}`}>
                                            Cheque Date
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.chequeDate}
                                            onChange={(e) => setFormData({ ...formData, chequeDate: e.target.value })}
                                            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none ${inputBg}`}
                                        />
                                    </div>
                                )}

                                {/* Bank Account */}
                                <div>
                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelText}`}>
                                        Deposit Bank Account
                                    </label>
                                    <select
                                        value={formData.bankAccount}
                                        onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none ${inputBg}`}
                                    >
                                        <option value="">-- Select Bank Account --</option>
                                        {accounts.map((acc) => {
                                            const name = acc.accname || acc.accountName || acc.bankName || "Bank Account";
                                            const number = acc.accno || acc.accountNumber || "";
                                            return (
                                                <option key={acc._id} value={acc._id}>
                                                    {name.toUpperCase()}{number ? ` (A/C: ${number})` : ""}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                {/* Account Holder Name */}
                                <div>
                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelText}`}>
                                        Account Holder / Payer Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.accountHolderName}
                                        onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none ${inputBg}`}
                                        placeholder="Payer or Account Holder Name"
                                    />
                                </div>

                                {/* Bank Name */}
                                <div>
                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelText}`}>
                                        Issuing Bank Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.bankName}
                                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none ${inputBg}`}
                                        placeholder="e.g. HDFC Bank, SBI, ICICI"
                                    />
                                </div>

                                {/* Centre */}
                                <div>
                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelText}`}>
                                        Centre
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.centre}
                                        onChange={(e) => setFormData({ ...formData, centre: e.target.value })}
                                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none ${inputBg}`}
                                        placeholder="Centre Name"
                                    />
                                </div>

                                {/* Remarks */}
                                <div className="lg:col-span-2">
                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${labelText}`}>
                                        Remarks / Reason for Modification
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={formData.remarks}
                                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                        className={`w-full px-3.5 py-2 rounded-xl border text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none ${inputBg}`}
                                        placeholder="Enter any notes or justification for editing this bill..."
                                    />
                                </div>
                            </div>

                            {/* Live Tax & Breakdown Card */}
                            <div className={`p-4 rounded-xl ${subCardBg} ${subCardBorder} mt-4`}>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold uppercase tracking-wider text-orange-500 flex items-center gap-1.5">
                                        <FaTag className="text-xs" />
                                        Tax & Fee Breakdown (Directly Editable)
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {selectedBill.isGstExempt ? "GST Exempt Rate: 0%" : "Standard Rate: 18% GST (9% CGST + 9% SGST)"}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {/* Base Course Fee */}
                                    <div className="p-3 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                            Base Course Fee (₹)
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={formData.courseFee !== undefined ? formData.courseFee : ""}
                                            onChange={(e) => handleCourseFeeChange(e.target.value)}
                                            className={`w-full px-3 py-2 rounded-lg border text-sm font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none ${inputBg} ${headingText}`}
                                            placeholder="0.00"
                                        />
                                        <span className="text-[10px] text-gray-400 mt-1 block">Excluding Tax</span>
                                    </div>

                                    {/* CGST (9%) */}
                                    <div className="p-3 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                            CGST (9%) (₹)
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={formData.cgst !== undefined ? formData.cgst : ""}
                                            onChange={(e) => handleCgstChange(e.target.value)}
                                            className={`w-full px-3 py-2 rounded-lg border text-sm font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none ${inputBg} ${headingText}`}
                                            placeholder="0.00"
                                        />
                                        <span className="text-[10px] text-gray-400 mt-1 block">Central GST</span>
                                    </div>

                                    {/* SGST (9%) */}
                                    <div className="p-3 rounded-xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                            SGST (9%) (₹)
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={formData.sgst !== undefined ? formData.sgst : ""}
                                            onChange={(e) => handleSgstChange(e.target.value)}
                                            className={`w-full px-3 py-2 rounded-lg border text-sm font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none ${inputBg} ${headingText}`}
                                            placeholder="0.00"
                                        />
                                        <span className="text-[10px] text-gray-400 mt-1 block">State GST</span>
                                    </div>

                                    {/* Final Bill Total */}
                                    <div className="p-3 rounded-xl bg-white dark:bg-gray-800/80 border border-green-500/40">
                                        <label className="text-[11px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider block mb-1">
                                            Final Bill Total (₹) *
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={formData.paidAmount !== undefined ? formData.paidAmount : ""}
                                            onChange={(e) => handlePaidAmountChange(e.target.value)}
                                            className={`w-full px-3 py-2 rounded-lg border border-green-500/30 text-sm font-extrabold text-green-600 dark:text-green-400 focus:ring-2 focus:ring-green-500 focus:outline-none ${inputBg}`}
                                            placeholder="0.00"
                                        />
                                        <span className="text-[10px] text-gray-400 mt-1 block">Total Amount Paid</span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    disabled={saving}
                                    className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 transition-all disabled:opacity-50"
                                >
                                    <FaUndo className="text-xs" />
                                    Reset Form
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmModal(true)}
                                    disabled={saving}
                                    className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-500/25 flex items-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {saving ? (
                                        <>
                                            <FaSpinner className="animate-spin text-sm" />
                                            Saving & Syncing...
                                        </>
                                    ) : (
                                        <>
                                            <FaSave className="text-sm" />
                                            Save & Synchronize Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Confirmation Modal */}
                {showConfirmModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className={`w-full max-w-md p-6 rounded-2xl ${cardBg} ${cardBorder} shadow-2xl space-y-4`}>
                            <div className="flex items-center gap-3 text-amber-500">
                                <FaExclamationTriangle className="text-2xl" />
                                <h3 className={`text-lg font-bold ${headingText}`}>Confirm Bill Update</h3>
                            </div>
                            <p className={`text-sm ${subText}`}>
                                Are you sure you want to update Bill <span className="font-bold text-orange-500">{formData.billId}</span>?
                                <br />
                                This will update the Payment collection, student admission balance, and all transaction reports immediately.
                            </p>
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmModal(false)}
                                    className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    className="px-5 py-2 text-sm font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/25 flex items-center gap-2"
                                >
                                    <FaCheckCircle />
                                    Confirm & Update
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bill Print / Generator Modal */}
                {showPrintModal && selectedBill && (
                    <BillGenerator
                        admission={{ _id: selectedBill.admissionSummary?._id || selectedBill.payment?.admission }}
                        installment={{
                            installmentNumber: selectedBill.payment?.installmentNumber,
                            billingMonth: selectedBill.payment?.billingMonth,
                            billId: formData.billId
                        }}
                        preloadedBillData={preparePrintData()}
                        onClose={() => setShowPrintModal(false)}
                    />
                )}
            </div>
        </Layout>
    );
};

export default EditBill;
