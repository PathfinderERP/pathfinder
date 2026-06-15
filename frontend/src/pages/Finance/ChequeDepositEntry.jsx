import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { hasPermission } from "../../config/permissions";
import {
    FaMoneyCheckAlt, FaBuilding, FaWallet, FaLock, FaCalendarAlt,
    FaCloudUploadAlt, FaTimes, FaFileInvoice, FaCheckCircle,
    FaSearch, FaRegFileAlt, FaInfoCircle, FaSpinner, FaHistory
} from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import CustomSearchSelect from "../../components/common/CustomSearchSelect";
import { useTheme } from "../../context/ThemeContext";

const ChequeDepositEntry = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [validating, setValidating] = useState(false);
    const [centres, setCentres] = useState([]);
    const [masterAccounts, setMasterAccounts] = useState([]);
    const [depositHistory, setDepositHistory] = useState([]);

    // Form States
    const [chequeNo, setChequeNo] = useState("");
    const [validatedCheque, setValidatedCheque] = useState(null);
    const [selectedCentreId, setSelectedCentreId] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
    const [remarks, setRemarks] = useState("");
    const [receiptFile, setReceiptFile] = useState(null);
    const [receiptPreview, setReceiptPreview] = useState(null);
    const [submissionStatus, setSubmissionStatus] = useState("idle"); // idle, success
    const [newDepositId, setNewDepositId] = useState("");

    // History Filters
    const [filterCentre, setFilterCentre] = useState("");
    const [filterStartDate, setFilterStartDate] = useState("");
    const [filterEndDate, setFilterEndDate] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isSuperAdmin = Array.isArray(user.role)
        ? user.role.some(r => typeof r === "string" && (r.toLowerCase().replace(/\s+/g, "") === "superadmin"))
        : typeof user.role === "string" && (user.role.toLowerCase().replace(/\s+/g, "") === "superadmin");
    const canCreate = hasPermission(user, 'financeFees', 'chequeDepositEntry', 'create');

    const hasDashboardAccess = React.useMemo(() => {
        const userRoles = Array.isArray(user.role) ? user.role : [user.role];
        return userRoles.some(r => {
            const norm = typeof r === "string" ? r.toLowerCase().replace(/\s+/g, "") : "";
            return norm === "superadmin" || norm === "accounts";
        });
    }, [user]);

    const userCentres = React.useMemo(() => {
        if (!centres || centres.length === 0) return [];
        
        // If user has defined centres array, filter to those centres
        if (user.centres && user.centres.length > 0) {
            return centres.filter(c => 
                user.centres.some(uc => {
                    if (typeof uc === 'object' && uc !== null) {
                        return uc._id === c._id || (uc.centreName && c.centreName && uc.centreName.trim().toLowerCase() === c.centreName.trim().toLowerCase());
                    }
                    return uc === c._id;
                })
            );
        }

        // Fallback for superadmin/accounts with no explicit assigned centres
        if (hasDashboardAccess) {
            return centres;
        }

        return [];
    }, [centres, user, hasDashboardAccess]);

    // Auto-select centre if only one is available
    useEffect(() => {
        if (userCentres.length === 1 && !selectedCentreId) {
            setSelectedCentreId(userCentres[0]._id);
        }
    }, [userCentres, selectedCentreId]);

    useEffect(() => {
        fetchInitialData();
        fetchHistory();
    }, []);

    // Re-fetch history when filters change
    useEffect(() => {
        fetchHistory();
    }, [filterCentre, filterStartDate, filterEndDate]);

    const fetchInitialData = async () => {
        try {
            const token = localStorage.getItem("token");
            const [centresRes, accountsRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/centre?fetchAll=true`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_URL}/master-data/account`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setCentres(centresRes.data || []);
            setMasterAccounts(accountsRes.data || []);
        } catch (error) {
            console.error("Failed to fetch initial data", error);
            if (error.response?.status === 401) {
                toast.error("Session expired. Please login again.");
                navigate("/");
            } else {
                toast.error("Failed to load initial centres/accounts");
            }
        }
    };

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/finance/cheque-deposit/history`, {
                params: {
                    centreId: filterCentre || undefined,
                    startDate: filterStartDate || undefined,
                    endDate: filterEndDate || undefined
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            setDepositHistory(response.data || []);
        } catch (error) {
            console.error("Failed to fetch deposit history", error);
            toast.error("Failed to load deposit history");
        }
    };

    const handleChequeValidation = async (numToValidate) => {
        const queryNum = numToValidate || chequeNo;
        if (!queryNum.trim()) return;

        try {
            setValidating(true);
            setValidatedCheque(null);
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/finance/cheque-deposit/validate/${queryNum.trim()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const chequeData = res.data;
            setValidatedCheque(chequeData);

            // Auto-populate Centre ID if found
            if (chequeData.centre) {
                const matchedCentre = userCentres.find(c => c.centreName.toLowerCase().trim() === chequeData.centre.toLowerCase().trim());
                if (matchedCentre) {
                    setSelectedCentreId(matchedCentre._id);
                }
            }
            toast.success("Cheque number validated successfully!");
        } catch (error) {
            console.error("Validation error", error);
            setValidatedCheque(null);
            toast.error(error.response?.data?.message || "Invalid or already deposited cheque");
        } finally {
            setValidating(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                return toast.error("File size should be less than 5MB");
            }
            setReceiptFile(file);
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => setReceiptPreview(reader.result);
                reader.readAsDataURL(file);
            } else {
                setReceiptPreview('pdf');
            }
        }
    };

    const handleDepositSubmit = async (e) => {
        e.preventDefault();
        if (!validatedCheque) {
            return toast.warn("Please enter and validate a pending cheque number first");
        }
        if (!accountNumber) {
            return toast.warn("Please select the Deposit Bank Account");
        }
        if (!depositDate) {
            return toast.warn("Please specify the Deposit Date");
        }
        if (!receiptFile) {
            return toast.warn("Please upload the bank deposit receipt");
        }

        try {
            setLoading(true);
            const token = localStorage.getItem("token");

            const submitData = new FormData();
            submitData.append("paymentId", validatedCheque.paymentId);
            submitData.append("depositAccount", accountNumber);
            submitData.append("depositDate", depositDate);
            submitData.append("remarks", remarks);
            submitData.append("receipt", receiptFile);

            const res = await axios.post(`${import.meta.env.VITE_API_URL}/finance/cheque-deposit/deposit`, submitData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            setNewDepositId(validatedCheque.chequeNumber);
            setSubmissionStatus("success");
            toast.success("Cheque deposit details recorded!");
            fetchHistory();
        } catch (error) {
            console.error("Deposit submission failure", error);
            toast.error(error.response?.data?.message || "Deposit entry failed");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setChequeNo("");
        setValidatedCheque(null);
        setSelectedCentreId("");
        setAccountNumber("");
        setDepositDate(new Date().toISOString().split('T')[0]);
        setRemarks("");
        setReceiptFile(null);
        setReceiptPreview(null);
        setSubmissionStatus("idle");
    };

    const filteredHistoryList = depositHistory.filter(item => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            item.chequeNumber?.toLowerCase().includes(query) ||
            item.studentName?.toLowerCase().includes(query) ||
            item.admissionNumber?.toLowerCase().includes(query) ||
            item.depositAccount?.toLowerCase().includes(query)
        );
    });

    if (submissionStatus === "success") {
        return (
            <Layout activePage="Cheque Deposit Entry">
                <div className="flex items-center justify-center h-[calc(100vh-100px)] animate-in zoom-in duration-500 p-4">
                    <div className="bg-gray-900/60 backdrop-blur-xl border border-emerald-500/30 p-6 md:p-10 rounded-3xl shadow-2xl shadow-emerald-500/10 max-w-lg w-full text-center space-y-6">
                        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
                            <FaCheckCircle className="text-5xl text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-white">Deposit Successful!</h2>
                            <p className="text-cyan-400 font-mono text-sm mt-1">Cheque No: {newDepositId}</p>
                        </div>

                        <p className="text-gray-400 text-sm md:text-lg">
                            Cheque deposit has been recorded. It will now reflect in Cheque Management for HO clearance.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 mt-8">
                            <button
                                onClick={resetForm}
                                className="flex-1 bg-gray-800 text-white font-bold py-4 rounded-xl hover:bg-gray-700 transition-all border border-gray-700"
                            >
                                New Deposit
                            </button>
                            {hasDashboardAccess && (
                                <button
                                    onClick={() => navigate("/finance/cheque-management")}
                                    className="flex-1 bg-cyan-600 text-white font-bold py-4 rounded-xl hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-500/20"
                                >
                                    Cheque Management
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout activePage="Cheque Deposit Entry">
            <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-8 animate-in slide-in-from-bottom-10 duration-700">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className={`text-2xl md:text-3xl font-bold flex items-center gap-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                            <FaMoneyCheckAlt className="text-cyan-400" />
                            Cheque Deposit Entry
                        </h1>
                        <p className={`text-sm mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Record bank deposits for cheques collected from student fees</p>
                    </div>
                    {hasDashboardAccess && (
                        <button
                            onClick={() => navigate("/finance/cheque-management")}
                            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl border transition-all font-bold text-xs uppercase tracking-widest shadow-lg active:scale-95 self-start sm:self-auto ${isDarkMode ? "bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-cyan-400 border-gray-700" : "bg-gray-200 hover:bg-gray-300 text-gray-800 hover:text-cyan-600 border-gray-300"}`}
                        >
                            <FaHistory />
                            Cheque Dashboard
                        </button>
                    )}
                </div>

                {/* Main Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Column - Deposit Form */}
                    <div className={`lg:col-span-7 border p-6 md:p-8 rounded-3xl shadow-2xl space-y-8 ${isDarkMode ? "bg-gray-900/40 border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
                        <h3 className={`text-xl font-bold flex items-center gap-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                            <span className="w-1.5 h-6 bg-cyan-400 rounded-full"></span>
                            Deposit Details Form
                        </h3>

                        <form onSubmit={handleDepositSubmit} className="space-y-6">

                            {/* Cheque Number Validation */}
                            <div className="space-y-2">
                                <label className={`text-sm font-medium ml-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                    Cheque Number <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-3">
                                    <div className="relative flex-1">
                                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="text"
                                            className={`w-full border rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-cyan-500 transition-all ${isDarkMode ? "bg-gray-800/80 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                                            placeholder="Enter cheque number to search & validate"
                                            value={chequeNo}
                                            onChange={(e) => setChequeNo(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    handleChequeValidation();
                                                }
                                            }}
                                            onBlur={() => handleChequeValidation()}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        disabled={validating || !chequeNo.trim()}
                                        onClick={() => handleChequeValidation()}
                                        className={`px-6 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold rounded-xl transition-all flex items-center gap-2 ${!isDarkMode && "disabled:bg-gray-100 disabled:text-gray-400"}`}
                                    >
                                        {validating ? <FaSpinner className="animate-spin" /> : "Verify"}
                                    </button>
                                </div>
                            </div>

                            {/* Cheque Preview Box */}
                            {validatedCheque ? (
                                <div className="bg-gradient-to-br from-cyan-950/40 via-cyan-900/10 to-transparent border border-cyan-500/20 p-5 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300 space-y-3">
                                    <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                                        <FaInfoCircle />
                                        Cheque Details Found
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-500 text-xs">Student Name</p>
                                            <p className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{validatedCheque.studentName}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-xs">Admission No.</p>
                                            <p className={`font-semibold font-mono ${isDarkMode ? "text-white" : "text-gray-900"}`}>{validatedCheque.admissionNumber}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-xs">Collected Centre</p>
                                            <p className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{validatedCheque.centre}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-xs">Bank Name</p>
                                            <p className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{validatedCheque.bankName}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-xs">Cheque Date</p>
                                            <p className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                                {validatedCheque.chequeDate ? new Date(validatedCheque.chequeDate).toLocaleDateString() : "N/A"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-xs">Cheque Amount</p>
                                            <p className="text-emerald-400 font-extrabold text-base">₹{validatedCheque.amount?.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : chequeNo.trim() && !validating ? (
                                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
                                    <FaInfoCircle className="text-red-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm text-red-300 font-medium">Validation Required</p>
                                        <p className="text-xs text-red-400/80 mt-0.5">Please provide a valid, pending cheque number and verify it.</p>
                                    </div>
                                </div>
                            ) : null}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* From Centre */}
                                <div className="space-y-2">
                                    <label className={`text-sm font-medium ml-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>From Centre</label>
                                    <div className="relative">
                                        <FaBuilding className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <select
                                            className={`w-full border rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-cyan-500 transition-all appearance-none disabled:opacity-50 ${isDarkMode ? "bg-gray-800/80 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                                            value={selectedCentreId}
                                            onChange={(e) => setSelectedCentreId(e.target.value)}
                                            disabled={userCentres.length <= 1}
                                        >
                                            <option value="">Select Centre</option>
                                            {userCentres.map(c => <option key={c._id} value={c._id}>{c.centreName}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Amount */}
                                <div className="space-y-2">
                                    <label className={`text-sm font-medium ml-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Amount (₹)</label>
                                    <div className="relative">
                                        <FaWallet className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="text"
                                            className={`w-full border rounded-xl py-3 pl-12 pr-4 cursor-not-allowed font-bold ${isDarkMode ? "bg-gray-800/50 border-gray-700 text-gray-400" : "bg-gray-100 border-gray-300 text-gray-500"}`}
                                            value={validatedCheque ? `₹ ${validatedCheque.amount?.toLocaleString()}` : ""}
                                            placeholder="Auto-populated from Cheque"
                                            disabled
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Account Number */}
                                <div className="space-y-2">
                                    <label className={`text-sm font-medium ml-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                        Deposit Bank Account <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 z-10" />
                                        <CustomSearchSelect
                                            options={masterAccounts.map(acc => ({
                                                value: acc.accno,
                                                label: `${acc.accname} (${acc.accno}) - ${acc.bankname}`
                                            }))}
                                            value={accountNumber}
                                            onChange={(val) => setAccountNumber(val)}
                                            placeholder="Select Account"
                                            isDarkMode={isDarkMode}
                                            className="pl-8"
                                        />
                                    </div>
                                </div>

                                {/* Deposit Date */}
                                <div className="space-y-2">
                                    <label className={`text-sm font-medium ml-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                        Cheque Deposit Date <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="date"
                                            className={`w-full border rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-cyan-500 transition-all ${isDarkMode ? "bg-gray-800/80 border-gray-700 text-white [color-scheme:dark]" : "bg-white border-gray-300 text-gray-900"}`}
                                            value={depositDate}
                                            onChange={(e) => setDepositDate(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Bank Receipt Upload */}
                            <div className="space-y-2">
                                <label className={`text-sm font-medium ml-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                    Cheque Deposit Slip (Img/PDF) (Within 1MB) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        id="receiptInput"
                                        className="hidden"
                                        onChange={handleFileChange}
                                        accept="image/*,application/pdf"
                                    />
                                    <label
                                        htmlFor="receiptInput"
                                        className={`w-full border rounded-xl py-3.5 px-4 cursor-pointer flex items-center justify-between hover:border-cyan-500 transition-all border-dashed ${isDarkMode ? "bg-gray-800/80 border-gray-700 text-gray-400" : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"}`}
                                    >
                                        <span className="truncate">
                                            {receiptFile ? receiptFile.name : "Choose receipt image or PDF file"}
                                        </span>
                                        <FaCloudUploadAlt className="text-cyan-400 text-xl" />
                                    </label>
                                </div>
                            </div>

                            {/* File Upload Preview */}
                            {receiptPreview && (
                                <div className={`relative w-full h-40 rounded-2xl border overflow-hidden flex items-center justify-center group ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-300"}`}>
                                    {receiptPreview === 'pdf' ? (
                                        <div className="flex flex-col items-center">
                                            <FaFileInvoice className="text-5xl text-cyan-400" />
                                            <span className="text-xs text-gray-500 mt-2 uppercase font-bold">PDF Ready to Submit</span>
                                        </div>
                                    ) : (
                                        <img src={receiptPreview} alt="Deposit Slip Preview" className="w-full h-full object-cover opacity-70" />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                                        className="absolute top-3 right-3 p-2 bg-red-500 rounded-lg text-white hover:bg-red-600 transition-all"
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                            )}

                            {/* Remarks */}
                            <div className="space-y-2">
                                <label className={`text-sm font-medium ml-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Remarks (Optional)</label>
                                <textarea
                                    className={`w-full border rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-500 transition-all resize-none ${isDarkMode ? "bg-gray-800/80 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                                    rows="3"
                                    placeholder="Enter deposit remarks or references..."
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                ></textarea>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading || !canCreate || !validatedCheque}
                                className={`w-full font-bold py-4 rounded-2xl hover:brightness-110 active:scale-[0.98] transition-all shadow-xl shadow-cyan-900/20 flex items-center justify-center gap-3 ${canCreate && validatedCheque
                                    ? "bg-gradient-to-r from-cyan-600 to-cyan-700 text-white"
                                    : "bg-gray-800 text-gray-500 cursor-not-allowed"
                                    }`}
                                title={!canCreate ? "Permission denied" : !validatedCheque ? "Validate cheque first" : ""}
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <FaMoneyCheckAlt />
                                        Record Cheque Deposit
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Right Column - Recent History */}
                    <div className={`lg:col-span-5 border p-6 rounded-3xl shadow-2xl space-y-6 flex flex-col max-h-[780px] ${isDarkMode ? "bg-gray-900/40 border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
                        <h3 className={`text-xl font-bold flex items-center gap-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                            <span className="w-1.5 h-6 bg-cyan-400 rounded-full"></span>
                            Recent Deposits
                        </h3>

                        {/* Search and Filters */}
                        <div className="space-y-4">
                            {/* Search Query */}
                            <div className="relative">
                                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
                                <input
                                    type="text"
                                    placeholder="Search by Cheque #, Student..."
                                    className={`w-full border rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-cyan-500 transition-all ${isDarkMode ? "bg-gray-800/80 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"}`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {/* Centre Filter */}
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-500 font-bold uppercase">Centre</label>
                                    <select
                                        className={`w-full border rounded-lg py-2 px-2 text-xs focus:outline-none focus:border-cyan-500 appearance-none ${isDarkMode ? "bg-gray-800 border-gray-700 text-white [color-scheme:dark]" : "bg-white border-gray-300 text-gray-900"}`}
                                        value={filterCentre}
                                        onChange={(e) => setFilterCentre(e.target.value)}
                                    >
                                        <option value="">All Centres</option>
                                        {userCentres.map(c => <option key={c._id} value={c.centreName}>{c.centreName}</option>)}
                                    </select>
                                </div>

                                {/* Start Date Filter */}
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-500 font-bold uppercase">Start Date</label>
                                    <input
                                        type="date"
                                        className={`w-full border rounded-lg py-2 px-2 text-xs focus:outline-none focus:border-cyan-500 ${isDarkMode ? "bg-gray-800 border-gray-700 text-white [color-scheme:dark]" : "bg-white border-gray-300 text-gray-900"}`}
                                        value={filterStartDate}
                                        onChange={(e) => setFilterStartDate(e.target.value)}
                                    />
                                </div>

                                {/* End Date Filter */}
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-500 font-bold uppercase">End Date</label>
                                    <input
                                        type="date"
                                        className={`w-full border rounded-lg py-2 px-2 text-xs focus:outline-none focus:border-cyan-500 ${isDarkMode ? "bg-gray-800 border-gray-700 text-white [color-scheme:dark]" : "bg-white border-gray-300 text-gray-900"}`}
                                        value={filterEndDate}
                                        onChange={(e) => setFilterEndDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            {(filterCentre || filterStartDate || filterEndDate) && (
                                <button
                                    onClick={() => {
                                        setFilterCentre("");
                                        setFilterStartDate("");
                                        setFilterEndDate("");
                                    }}
                                    className={`w-full py-2 text-[10px] font-bold uppercase rounded-lg border transition-all flex items-center justify-center gap-2 ${isDarkMode ? "bg-gray-800 hover:bg-gray-700 text-gray-400 border-gray-700" : "bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-300"}`}
                                >
                                    <FaTimes /> Clear Filters
                                </button>
                            )}
                        </div>

                        {/* History Items list container */}
                        <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                            {filteredHistoryList.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 text-sm">
                                    No deposit records found.
                                </div>
                            ) : (
                                filteredHistoryList.map((item) => (
                                    <div
                                        key={item.paymentId}
                                        className={`p-4 rounded-2xl border transition-all flex justify-between items-start gap-4 relative group ${isDarkMode ? "bg-gray-800/40 border-gray-800/80 hover:border-gray-700" : "bg-gray-50 border-gray-200 hover:border-gray-300"}`}
                                    >
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-mono font-bold text-cyan-400">#{item.chequeNumber}</span>
                                                <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                                                    ₹{item.amount?.toLocaleString()}
                                                </span>
                                            </div>

                                            <div className={`space-y-0.5 text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                                <p className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{item.studentName}</p>
                                                <p className="text-[10px]">Centre: <span className={isDarkMode ? "text-gray-300" : "text-gray-700"}>{item.centre}</span></p>
                                                <p className="text-[10px]">Account: <span className={`font-mono ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>{item.depositAccount}</span></p>
                                                <p className="text-[10px]">Dep. Date: <span className={isDarkMode ? "text-gray-300" : "text-gray-700"}>{new Date(item.depositedDate).toLocaleDateString()}</span></p>
                                            </div>

                                            {/* Status Pill */}
                                            <div className="flex items-center gap-2 pt-1">
                                                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${item.status === "CLEARED"
                                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                    : item.status === "PENDING_CLEARANCE"
                                                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                                                    }`}>
                                                    {item.status === "PENDING_CLEARANCE" ? "Pending Clearance" : item.status}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions: View attachment */}
                                        {item.receiptFile && (
                                            <a
                                                href={item.receiptFile}
                                                target="_blank"
                                                rel="noreferrer"
                                                className={`p-2.5 rounded-xl border transition-all flex items-center justify-center shrink-0 shadow-md self-center ${isDarkMode ? "bg-gray-800 hover:bg-gray-700 text-cyan-400 border-gray-700" : "bg-white hover:bg-gray-100 text-cyan-600 border-gray-300"}`}
                                                title="View Receipt"
                                            >
                                                <FaRegFileAlt className="text-base" />
                                            </a>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default ChequeDepositEntry;
