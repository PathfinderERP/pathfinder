import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { hasPermission } from "../../config/permissions";
import { FaExchangeAlt, FaPaperPlane, FaBuilding, FaWallet, FaLock, FaKey, FaArrowRight, FaCheckCircle, FaHashtag, FaFileInvoice, FaCloudUploadAlt, FaTimes, FaCalendarAlt, FaHistory, FaSearch } from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";

import { useNavigate } from "react-router-dom";
import CustomSearchSelect from "../../components/common/CustomSearchSelect";
import { useTheme } from "../../context/ThemeContext";

const CashTransfer = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [loading, setLoading] = useState(false);
    const [centres, setCentres] = useState([]);
    const [userCentres, setUserCentres] = useState([]);
    const [masterAccounts, setMasterAccounts] = useState([]);
    const [auditReports, setCentreReports] = useState([]); // Store detailed centre reports
    const [cashSummary, setCashSummary] = useState({ totalCashLeft: 0 });
    const [formData, setFormData] = useState({
        fromCentreId: "",
        toCentreId: "",
        amount: "",
        accountNumber: "",
        remarks: "",
        referenceNumber: "",
        debitedDate: new Date().toISOString().split('T')[0],
        fromDate: "",
        toDate: ""
    });
    const [receiptFile, setReceiptFile] = useState(null);
    const [receiptPreview, setReceiptPreview] = useState(null);
    const [generatedPassword, setGeneratedPassword] = useState("");
    const [serialNumber, setSerialNumber] = useState("");
    const [transferStatus, setTransferStatus] = useState("idle"); // idle, success
    const [reportFilters, setReportFilters] = useState({ fromDate: "", toDate: "" });

    // Independent Refetch for Available Cash Section
    useEffect(() => {
        if (reportFilters.fromDate || reportFilters.toDate) {
            fetchFilteredReport();
        }
    }, [reportFilters.fromDate, reportFilters.toDate]);

    const fetchFilteredReport = async () => {
        try {
            const token = localStorage.getItem("token");
            const reportRes = await axios.get(`${import.meta.env.VITE_API_URL}/finance/cash/report`, {
                params: {
                    startDate: reportFilters.fromDate,
                    endDate: reportFilters.toDate
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            setCashSummary(reportRes.data.summary);
            setCentreReports(reportRes.data.report || []);
        } catch (error) {
            console.error("Failed to fetch filtered report", error);
        }
    };
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canTransfer = hasPermission(user, 'financeFees', 'cashTransfer', 'create');

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const token = localStorage.getItem("token");
            const userData = JSON.parse(localStorage.getItem("user") || "{}");

            const [centresRes, reportRes, accountsRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/centre?fetchAll=true`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_URL}/finance/cash/report`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_URL}/master-data/account`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            const allCentres = centresRes.data;
            setCashSummary(reportRes.data.summary);
            setCentreReports(reportRes.data.report || []); // Store full report
            setMasterAccounts(accountsRes.data);

            // Filter for Hazra HO centre for destination
            const hazraCentres = allCentres.filter(c =>
                c.centreName.toLowerCase().includes("hazra") &&
                (c.centreName.toLowerCase().includes("ho") || c.centreName.toLowerCase().includes("head office"))
            );

            // Fallback to any centre containing Hazra if no HO specific one found
            const destinationCentres = hazraCentres.length > 0 ? hazraCentres : allCentres.filter(c => c.centreName.toLowerCase().includes("hazra"));

            setCentres(destinationCentres);

            // Set next serial number from recent transfers
            if (reportRes.data.recentTransfers && reportRes.data.recentTransfers.length > 0) {
                setSerialNumber(reportRes.data.recentTransfers[0].serialNumber);
            } else {
                setSerialNumber(0);
            }

            // Filter centres based on user's assigned centres for "From" field
            let allocatedCentres = [];
            if (userData.role === "superAdmin") {
                allocatedCentres = allCentres;
            } else if (userData.centres && userData.centres.length > 0) {
                allocatedCentres = allCentres.filter(c =>
                    userData.centres.includes(c._id) ||
                    userData.centres.some(uc => uc._id === c._id || uc === c._id)
                );
            }

            setUserCentres(allocatedCentres);

            // Consolidate initial form data settings
            setFormData(prev => {
                const defaultToCentre = destinationCentres.length > 0 ? destinationCentres[0] : null;
                const centreAccNo = defaultToCentre?.accountNumber || "";

                // Try to find a matching account in master accounts
                const matchingMasterAcc = accountsRes.data.find(a => a.accno === centreAccNo);

                return {
                    ...prev,
                    toCentreId: defaultToCentre?._id || prev.toCentreId,
                    accountNumber: matchingMasterAcc ? matchingMasterAcc.accno : centreAccNo,
                    fromCentreId: allocatedCentres.length === 1 ? allocatedCentres[0]._id : prev.fromCentreId
                };
            });
        } catch (error) {
            if (error.response?.status === 401) {
                toast.error("Session expired. Please login again.");
                navigate("/");
            } else {
                toast.error("Failed to load initial data");
            }
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

    const handleTransfer = async (e) => {
        e.preventDefault();
        if (!formData.fromCentreId || !formData.toCentreId || !formData.amount || !formData.accountNumber || !formData.fromDate || !formData.toDate) {
            return toast.warn("Please fill all required fields (including Collection Period)");
        }

        try {
            setLoading(true);
            const token = localStorage.getItem("token");

            const submitData = new FormData();
            Object.keys(formData).forEach(key => submitData.append(key, formData[key]));
            if (receiptFile) {
                submitData.append('receipt', receiptFile);
            }

            const response = await axios.post(`${import.meta.env.VITE_API_URL}/finance/cash/transfer`, submitData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            setSerialNumber(response.data.transfer.serialNumber);
            setTransferStatus("success");
            toast.success("Cash transfer initiated!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Transfer failed");
        } finally {
            setLoading(false);
        }
    };

    if (transferStatus === "success") {
        return (
            <Layout activePage="Cash Transfer">
                <div className="flex items-center justify-center h-[calc(100vh-100px)] animate-in zoom-in duration-500 p-4">
                    <div className={`backdrop-blur-xl border p-6 md:p-10 rounded-3xl shadow-2xl shadow-emerald-500/10 max-w-lg w-full text-center space-y-6 ${isDarkMode ? "bg-gray-900/60 border-emerald-500/30" : "bg-white border-emerald-200"}`}>
                        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
                            <FaCheckCircle className="text-5xl text-emerald-400" />
                        </div>
                        <div>
                            <h2 className={`text-2xl md:text-3xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Transfer Success!</h2>
                            <p className="text-cyan-400 font-mono text-sm mt-1">Transaction ID: #{serialNumber}</p>
                        </div>

                        <p className={`text-sm md:text-lg ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Transfer request created successfully. The receiving centre can now verify and receive the cash.</p>

                        <div className="flex flex-col sm:flex-row gap-4 mt-8">
                            <button
                                onClick={() => {
                                    setTransferStatus("idle");
                                     setFormData({
                                         fromCentreId: "",
                                         toCentreId: "",
                                         amount: "",
                                         accountNumber: "",
                                         remarks: "",
                                         referenceNumber: "",
                                         debitedDate: new Date().toISOString().split('T')[0],
                                         fromDate: "",
                                         toDate: ""
                                     });
                                    // Refetch to reset correctly with defaults
                                    fetchInitialData();
                                    setReceiptFile(null);
                                    setReceiptPreview(null);
                                }}
                                className={`flex-1 font-bold py-4 rounded-xl transition-all border ${isDarkMode ? "bg-gray-800 text-white border-gray-700 hover:bg-gray-700" : "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200"}`}
                            >
                                New Transfer
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="flex-1 bg-cyan-600 text-white font-bold py-4 rounded-xl hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-500/20"
                            >
                                Print Info
                            </button>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout activePage="Cash Transfer">
            <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-10 duration-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => navigate("/finance/cash/transfer-history")}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border transition-all font-bold text-xs uppercase tracking-widest shadow-lg active:scale-95 ${isDarkMode ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-cyan-400" : "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200 hover:text-cyan-600"}`}
                        >
                            <FaHistory />
                            View History
                        </button>
                        <div>
                            <h1 className={`text-2xl md:text-3xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Cash Transfer</h1>
                            <p className="text-gray-400 text-sm mt-1">Securely move funds between centres</p>
                        </div>
                    </div>
                    {serialNumber && (
                        <div className={`px-4 py-2 rounded-lg border ${isDarkMode ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Next Serial #</p>
                            <p className="text-xl font-black text-cyan-400">#{parseInt(serialNumber) + 1 || '...'}</p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form Section */}
                    <div className={`lg:col-span-2 backdrop-blur-md border p-6 md:p-8 rounded-3xl shadow-2xl space-y-8 ${isDarkMode ? "bg-gray-900/40 border-gray-800" : "bg-white border-gray-200"}`}>
                        <h3 className={`text-xl font-bold flex items-center gap-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                            <div className="p-2 bg-cyan-500/10 rounded-lg">
                                <FaPaperPlane className="text-cyan-400" />
                            </div>
                            Transfer Details
                        </h3>

                        <form onSubmit={handleTransfer} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400 ml-1">From Centre (Auto-detected)</label>
                                    <div className="relative">
                                        <FaBuilding className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <select
                                            className={`w-full border rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-cyan-500 transition-all appearance-none disabled:opacity-50 ${isDarkMode ? "bg-gray-800/80 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                                            value={formData.fromCentreId}
                                            onChange={(e) => setFormData({ ...formData, fromCentreId: e.target.value })}
                                            disabled={userCentres.length <= 1}
                                        >
                                            <option value="">Select From Centre</option>
                                            {userCentres.map(c => <option key={c._id} value={c._id}>{c.centreName}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400 ml-1">To Centre / Head Office</label>
                                    <div className="relative">
                                        <FaArrowRight className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <select
                                            className={`w-full border rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-cyan-500 transition-all appearance-none disabled:opacity-75 ${isDarkMode ? "bg-gray-800/80 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                                            value={formData.toCentreId}
                                            onChange={(e) => {
                                                const selectedCentre = centres.find(c => c._id === e.target.value);
                                                const centreAccNo = selectedCentre?.accountNumber || "";
                                                // Try to auto-match with master accounts
                                                const matchingMasterAcc = masterAccounts.find(a => a.accno === centreAccNo);

                                                setFormData({
                                                    ...formData,
                                                    toCentreId: e.target.value,
                                                    accountNumber: matchingMasterAcc ? matchingMasterAcc.accno : centreAccNo
                                                });
                                            }}
                                            disabled={centres.length <= 1}
                                        >
                                            {centres.length === 0 && <option value="">No Hazra HO found</option>}
                                            {centres.map(c => <option key={c._id} value={c._id}>{c.centreName}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400 ml-1">Amount (₹)</label>
                                    <div className="relative">
                                        <FaWallet className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="number"
                                            className={`w-full border rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-cyan-500 transition-all ${isDarkMode ? "bg-gray-800/80 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                                            placeholder="Enter amount"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400 ml-1">Account Number</label>
                                    <div className="relative">
                                        <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 z-10" />
                                        <CustomSearchSelect
                                            options={[
                                                ...masterAccounts.map(acc => ({
                                                    value: acc.accno,
                                                    label: `${acc.accname} (${acc.accno})`
                                                })),
                                                // Fallback if the centre's account isn't in master accounts but we have a value
                                                ...(formData.accountNumber && !masterAccounts.some(a => a.accno === formData.accountNumber) 
                                                    ? [{ value: formData.accountNumber, label: `Centre Default: ${formData.accountNumber}` }] 
                                                    : [])
                                            ]}
                                            value={formData.accountNumber}
                                            onChange={(val) => setFormData({ ...formData, accountNumber: val })}
                                            placeholder="Select Account"
                                            isDarkMode={isDarkMode}
                                            className="pl-8"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400 ml-1">Reference Number (Optional)</label>
                                    <div className="relative">
                                        <FaHashtag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="text"
                                            className={`w-full border rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-cyan-500 transition-all ${isDarkMode ? "bg-gray-800/80 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                                            placeholder="Bank Ref / ChUTR"
                                            value={formData.referenceNumber}
                                            onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400 ml-1">Deposit Date</label>
                                    <div className="relative">
                                        <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="date"
                                            className={`w-full border rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-cyan-500 transition-all ${isDarkMode ? "bg-gray-800/80 border-gray-700 text-white [color-scheme:dark]" : "bg-white border-gray-300 text-gray-800"}`}
                                            value={formData.debitedDate}
                                            onChange={(e) => setFormData({ ...formData, debitedDate: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* From Date / To Date Filter Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400 ml-1">From Date <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="date"
                                            className={`w-full border rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-cyan-500 transition-all ${isDarkMode ? "bg-gray-800/80 border-gray-700 text-white [color-scheme:dark]" : "bg-white border-gray-300 text-gray-800"}`}
                                            value={formData.fromDate}
                                            onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                                            max={formData.toDate || yesterdayStr}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400 ml-1">To Date <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="date"
                                            className={`w-full border rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-cyan-500 transition-all ${isDarkMode ? "bg-gray-800/80 border-gray-700 text-white [color-scheme:dark]" : "bg-white border-gray-300 text-gray-800"}`}
                                            value={formData.toDate}
                                            onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                                            min={formData.fromDate}
                                            max={yesterdayStr}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400 ml-1">Bank Receipt (Img/PDF)</label>
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
                                            className={`w-full border rounded-xl py-3 px-4 cursor-pointer flex items-center justify-between hover:border-cyan-500 transition-all ${isDarkMode ? "bg-gray-800/80 border-gray-700 text-gray-400" : "bg-white border-gray-300 text-gray-600"}`}
                                        >
                                            <span className="truncate">{receiptFile ? receiptFile.name : "Select Receipt File"}</span>
                                            <FaCloudUploadAlt className="text-cyan-400" />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {receiptPreview && (
                                <div className={`relative w-full h-32 rounded-2xl border overflow-hidden flex items-center justify-center group ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                                    {receiptPreview === 'pdf' ? (
                                        <div className="flex flex-col items-center">
                                            <FaFileInvoice className="text-4xl text-cyan-400" />
                                            <span className="text-xs text-gray-500 mt-1 uppercase font-bold">PDF Ready for upload</span>
                                        </div>
                                    ) : (
                                        <img src={receiptPreview} alt="Receipt Preview" className="w-full h-full object-cover opacity-60" />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400 ml-1">Remarks (Optional)</label>
                                <textarea
                                    className={`w-full border rounded-xl py-4 px-4 focus:outline-none focus:border-cyan-500 transition-all resize-none ${isDarkMode ? "bg-gray-800/80 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                                    rows="3"
                                    placeholder="Add notes for recipient centre..."
                                    value={formData.remarks}
                                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !canTransfer}
                                className={`w-full font-bold py-4 rounded-2xl hover:brightness-110 active:scale-[0.98] transition-all shadow-xl shadow-cyan-900/20 flex items-center justify-center gap-3 ${canTransfer ? "bg-gradient-to-r from-cyan-600 to-cyan-700 text-white" : "bg-gray-850 text-gray-500 cursor-not-allowed"
                                    }`}
                                title={canTransfer ? "" : "Permission denied"}
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <FaPaperPlane />
                                        {canTransfer ? "Initiate Transfer" : "Permission Denied"}
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Side Info */}
                    <div className="space-y-6">
                        <div className={`border p-8 rounded-3xl backdrop-blur-xl relative overflow-hidden group ${isDarkMode ? "bg-gradient-to-br from-cyan-900/40 via-cyan-800/20 to-transparent border-cyan-500/20" : "bg-cyan-50 border-cyan-200"}`}>
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <FaExchangeAlt className="text-9xl -rotate-12" />
                            </div>
                            <div className="space-y-1 relative">
                                <p className="text-cyan-400 font-bold text-xs uppercase tracking-widest">
                                    {reportFilters.fromDate || reportFilters.toDate ? (
                                        formData.fromCentreId ? "Centre Cash Collection" : "Total Cash Collection"
                                    ) : (
                                        formData.fromCentreId ? "Centre Cash Balance" : "Total Available Cash"
                                    )}
                                </p>
                                <h4 className={`text-3xl md:text-4xl font-black ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                    ₹{(() => {
                                        const isFiltered = reportFilters.fromDate || reportFilters.toDate;
                                        if (formData.fromCentreId) {
                                            const centreReport = auditReports.find(r => r.centreId === formData.fromCentreId);
                                            return (isFiltered ? (centreReport?.totalCollected || 0) : (centreReport?.cashLeft || 0)).toLocaleString();
                                        }
                                        if (isFiltered) {
                                            const totalColl = auditReports.reduce((sum, r) => sum + (r.totalCollected || 0), 0);
                                            return totalColl.toLocaleString();
                                        }
                                        return (cashSummary.totalCashLeft || 0).toLocaleString();
                                    })()}
                                </h4>
                                <div className="h-1 w-20 bg-cyan-500/30 rounded-full mt-2"></div>
                                <p className="text-gray-500 text-xs mt-4 italic leading-relaxed">
                                    {reportFilters.fromDate || reportFilters.toDate ? (
                                        "Total cash collection (Bill ID starting with PATH) for the selected period."
                                    ) : (
                                        formData.fromCentreId
                                            ? "Cash currently held at the selected centre."
                                            : "Total cash held across all your authorized centres."
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* New Filter Section for Available Cash */}
                        <div className={`border p-6 rounded-3xl space-y-4 ${isDarkMode ? "bg-gray-900/60 border-gray-800" : "bg-white border-gray-200 shadow-md"}`}>
                            <h5 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                <FaCalendarAlt className="text-cyan-400" />
                                Collection Filter
                            </h5>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-500 font-bold uppercase">From</label>
                                    <input
                                        type="date"
                                        className={`w-full border rounded-lg py-2 px-2 text-xs focus:outline-none focus:border-cyan-500 ${isDarkMode ? "bg-gray-800 border-gray-700 text-white [color-scheme:dark]" : "bg-white border-gray-300 text-gray-800"}`}
                                        value={reportFilters.fromDate}
                                        onChange={(e) => setReportFilters({ ...reportFilters, fromDate: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-500 font-bold uppercase">To</label>
                                    <input
                                        type="date"
                                        className={`w-full border rounded-lg py-2 px-2 text-xs focus:outline-none focus:border-cyan-500 ${isDarkMode ? "bg-gray-800 border-gray-700 text-white [color-scheme:dark]" : "bg-white border-gray-300 text-gray-800"}`}
                                        value={reportFilters.toDate}
                                        onChange={(e) => setReportFilters({ ...reportFilters, toDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            {(reportFilters.fromDate || reportFilters.toDate) && (
                                <button
                                    onClick={() => {
                                        setReportFilters({ fromDate: "", toDate: "" });
                                        fetchInitialData();
                                    }}
                                    className={`w-full py-2 text-[10px] font-bold uppercase rounded-lg border transition-all flex items-center justify-center gap-2 ${isDarkMode ? "bg-gray-800 hover:bg-gray-700 text-gray-400 border-gray-700" : "bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-300"}`}
                                >
                                    <FaTimes /> Clear Filter
                                </button>
                            )}
                        </div>

                        <div className={`border p-8 rounded-3xl space-y-6 ${isDarkMode ? "bg-gray-900/60 border-gray-800" : "bg-white border-gray-200 shadow-md"}`}>
                            <h4 className={`font-bold text-lg flex items-center gap-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                <div className="p-2 bg-amber-500/10 rounded-lg">
                                    <FaKey className="text-amber-400" />
                                </div>
                                Security Flow
                            </h4>
                            <div className="space-y-6 mt-4">
                                <div className="flex gap-4 group">
                                    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center text-cyan-400 font-bold shrink-0 group-hover:border-cyan-500 transition-colors ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>1</div>
                                    <div>
                                        <p className={`text-sm font-bold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>Initiate</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Enter details and upload bank receipt for verification.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 group">
                                    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center text-cyan-400 font-bold shrink-0 group-hover:border-cyan-500 transition-colors ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>2</div>
                                    <div>
                                        <p className={`text-sm font-bold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>Complete</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Receiving centre reviews and accepts or rejects the transfer to update transaction history.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default CashTransfer;
