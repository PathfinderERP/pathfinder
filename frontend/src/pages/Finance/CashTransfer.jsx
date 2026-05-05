import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { hasPermission } from "../../config/permissions";
import { FaExchangeAlt, FaPaperPlane, FaBuilding, FaWallet, FaLock, FaKey, FaArrowRight, FaCheckCircle, FaHashtag, FaFileInvoice, FaCloudUploadAlt, FaTimes, FaCalendarAlt } from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";
import { useNavigate } from "react-router-dom";

const CashTransfer = () => {
    const navigate = useNavigate();
    const { isDarkMode } = useTheme();
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
                axios.get(`${import.meta.env.VITE_API_URL}/centre`, { headers: { Authorization: `Bearer ${token}` } }),
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
        if (!formData.fromCentreId || !formData.toCentreId || !formData.amount || !formData.accountNumber) {
            return toast.warn("Please fill all required fields");
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

            setGeneratedPassword(response.data.password);
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
                <div className={`flex items-center justify-center min-h-[calc(100vh-100px)] animate-in zoom-in duration-500 p-4 ${isDarkMode ? 'bg-[#0f1215]' : 'bg-gray-50'}`}>
                    <div className={`border p-10 rounded-[3rem] shadow-2xl max-w-lg w-full text-center space-y-8 transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-emerald-500/30 shadow-emerald-500/10' : 'bg-white border-emerald-200 shadow-emerald-900/10'}`}>
                        <div className="w-24 h-24 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto border border-emerald-500/20 shadow-inner">
                            <FaCheckCircle className="text-6xl text-emerald-500" />
                        </div>
                        <div>
                            <h2 className={`text-4xl font-black italic uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Success!</h2>
                            <p className="text-cyan-500 font-black text-sm uppercase tracking-[0.2em] mt-3">Transaction: #{serialNumber}</p>
                        </div>

                        <p className="text-gray-500 text-[11px] font-black uppercase tracking-widest leading-relaxed">Transfer initiated. Share this security passcode with the target centre to complete the movement.</p>

                        <div className={`border-2 border-dashed p-10 rounded-[2.5rem] relative group overflow-hidden transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-cyan-500/20' : 'bg-cyan-50/50 border-cyan-200'}`}>
                            <p className="text-[10px] text-cyan-500 font-black uppercase tracking-[0.3em] relative z-10">Security Passcode</p>
                            <h1 className={`text-6xl font-black mt-4 tracking-[0.3em] relative z-10 ${isDarkMode ? 'text-white' : 'text-cyan-900'}`}>{generatedPassword}</h1>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 mt-10">
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
                                    fetchInitialData();
                                    setReceiptFile(null);
                                    setReceiptPreview(null);
                                }}
                                className={`flex-1 font-black uppercase text-[10px] tracking-widest py-5 rounded-2xl transition-all border ${isDarkMode ? 'bg-white/5 text-white border-gray-700 hover:bg-white/10' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 shadow-sm'}`}
                            >
                                New Entry
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="flex-1 bg-cyan-600 text-white font-black uppercase text-[10px] tracking-widest py-5 rounded-2xl hover:bg-cyan-500 transition-all shadow-xl shadow-cyan-600/20 active:scale-95"
                            >
                                Print Report
                            </button>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout activePage="Finance & Fees">
            <div className={`p-4 md:p-10 max-w-[1800px] mx-auto min-h-screen pb-20 transition-colors duration-500 ${isDarkMode ? 'bg-[#0f1215]' : 'bg-gray-50'}`}>
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
                    <div>
                        <h1 className={`text-4xl font-black italic uppercase tracking-tighter mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Cash <span className="text-cyan-500">Transfer</span>
                        </h1>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                            Securely move funds with unique password authentication
                        </p>
                    </div>
                    {serialNumber && (
                        <div className={`px-6 py-3 rounded-2xl border shadow-xl transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-200'}`}>
                            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Next Entry</p>
                            <p className="text-2xl font-black text-cyan-500">#{parseInt(serialNumber) + 1 || '...'}</p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form Section */}
                    <div className={`lg:col-span-2 border p-8 md:p-10 rounded-[2.5rem] shadow-2xl space-y-10 transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-200'}`}>
                        <h3 className={`text-xl font-black uppercase italic tracking-tight flex items-center gap-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-400">
                                <FaPaperPlane size={16} />
                            </div>
                            Transfer Protocol
                        </h3>

                        <form onSubmit={handleTransfer} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Origin Node</label>
                                    <div className="relative">
                                        <FaBuilding className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <select
                                            className={`w-full border rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-cyan-500 transition-all appearance-none disabled:opacity-50 text-sm font-bold ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                            value={formData.fromCentreId}
                                            onChange={(e) => setFormData({ ...formData, fromCentreId: e.target.value })}
                                            disabled={userCentres.length <= 1}
                                        >
                                            <option value="" className={isDarkMode ? 'bg-[#1a1f24]' : ''}>Select Origin</option>
                                            {userCentres.map(c => <option key={c._id} value={c._id} className={isDarkMode ? 'bg-[#1a1f24]' : ''}>{c.centreName}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Target Node (HO)</label>
                                    <div className="relative">
                                        <FaArrowRight className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <select
                                            className={`w-full border rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-cyan-500 transition-all appearance-none disabled:opacity-75 text-sm font-bold ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                            value={formData.toCentreId}
                                            onChange={(e) => {
                                                const selectedCentre = centres.find(c => c._id === e.target.value);
                                                const centreAccNo = selectedCentre?.accountNumber || "";
                                                const matchingMasterAcc = masterAccounts.find(a => a.accno === centreAccNo);
                                                setFormData({
                                                    ...formData,
                                                    toCentreId: e.target.value,
                                                    accountNumber: matchingMasterAcc ? matchingMasterAcc.accno : centreAccNo
                                                });
                                            }}
                                            disabled={centres.length <= 1}
                                        >
                                            {centres.length === 0 && <option value="" className={isDarkMode ? 'bg-[#1a1f24]' : ''}>No Hazra HO found</option>}
                                            {centres.map(c => <option key={c._id} value={c._id} className={isDarkMode ? 'bg-[#1a1f24]' : ''}>{c.centreName}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Amount (₹)</label>
                                    <div className="relative">
                                        <FaWallet className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="number"
                                            className={`w-full border rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-cyan-500 transition-all text-sm font-black tracking-tight ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                            placeholder="0.00"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Settlement Account</label>
                                    <div className="relative">
                                        <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <select
                                            className={`w-full border rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-cyan-500 transition-all appearance-none text-sm font-bold ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                            value={formData.accountNumber}
                                            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                        >
                                            <option value="" className={isDarkMode ? 'bg-[#1a1f24]' : ''}>Select Account</option>
                                            {masterAccounts.map(acc => (
                                                <option key={acc._id} value={acc.accno} className={isDarkMode ? 'bg-[#1a1f24]' : ''}>
                                                    ({acc.accno})
                                                </option>
                                            ))}
                                            {formData.accountNumber && !masterAccounts.some(a => a.accno === formData.accountNumber) && (
                                                <option value={formData.accountNumber} className={isDarkMode ? 'bg-[#1a1f24]' : ''}>
                                                    Centre Default: {formData.accountNumber}
                                                </option>
                                            )}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Reference ID</label>
                                    <div className="relative">
                                        <FaHashtag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="text"
                                            className={`w-full border rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-cyan-500 transition-all text-sm font-bold ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                            placeholder="UTR / REF NO"
                                            value={formData.referenceNumber}
                                            onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Settlement Date</label>
                                    <div className="relative">
                                        <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="date"
                                            className={`w-full border rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-cyan-500 transition-all text-sm font-bold [color-scheme:dark] ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                            value={formData.debitedDate}
                                            onChange={(e) => setFormData({ ...formData, debitedDate: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Collection From</label>
                                    <div className="relative">
                                        <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="date"
                                            className={`w-full border rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-cyan-500 transition-all text-sm font-bold [color-scheme:dark] ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                            value={formData.fromDate}
                                            onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                                            max={formData.toDate || yesterdayStr}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Collection To</label>
                                    <div className="relative">
                                        <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="date"
                                            className={`w-full border rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-cyan-500 transition-all text-sm font-bold [color-scheme:dark] ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                            value={formData.toDate}
                                            onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                                            min={formData.fromDate}
                                            max={yesterdayStr}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Verification Evidence (Img/PDF)</label>
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
                                        className={`w-full border rounded-xl py-4 px-6 cursor-pointer flex items-center justify-between hover:border-cyan-500 transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500 shadow-inner'}`}
                                    >
                                        <span className="truncate font-bold text-xs">{receiptFile ? receiptFile.name : "Select Receipt File"}</span>
                                        <FaCloudUploadAlt className="text-cyan-500 text-xl" />
                                    </label>
                                </div>
                                {receiptPreview && (
                                    <div className={`relative w-full h-40 rounded-[2rem] border overflow-hidden flex items-center justify-center group mt-4 transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
                                        {receiptPreview === 'pdf' ? (
                                            <div className="flex flex-col items-center">
                                                <FaFileInvoice className="text-5xl text-cyan-500" />
                                                <span className="text-[10px] text-gray-500 mt-2 uppercase font-black tracking-widest">PDF Ready for Dispatch</span>
                                            </div>
                                        ) : (
                                            <img src={receiptPreview} alt="Receipt Preview" className="w-full h-full object-cover opacity-50 grayscale hover:grayscale-0 transition-all duration-500" />
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                                            className="absolute top-4 right-4 p-2 bg-red-600 rounded-xl text-white opacity-0 group-hover:opacity-100 transition-all shadow-xl active:scale-90"
                                        >
                                            <FaTimes size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Audit Remarks (Optional)</label>
                                <textarea
                                    className={`w-full border rounded-[2rem] py-5 px-6 focus:outline-none focus:border-cyan-500 transition-all resize-none text-sm font-medium ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                    rows="3"
                                    placeholder="Add notes for recipient centre..."
                                    value={formData.remarks}
                                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !canTransfer}
                                className={`w-full font-black py-5 rounded-[2rem] hover:brightness-110 active:scale-[0.98] transition-all shadow-2xl flex items-center justify-center gap-4 text-[11px] uppercase tracking-widest ${canTransfer ? "bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-cyan-600/20" : "bg-white/5 text-gray-600 cursor-not-allowed border border-gray-800"
                                    }`}
                                title={canTransfer ? "" : "Permission denied"}
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <FaPaperPlane size={14} />
                                        {canTransfer ? "Authorize & Generate Passcode" : "Authorization Denied"}
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Side Info */}
                    <div className="space-y-8">
                        <div className={`border p-10 rounded-[2.5rem] relative overflow-hidden group transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-cyan-500/10' : 'bg-white border-cyan-100 shadow-2xl'}`}>
                            <div className="absolute -top-10 -right-10 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
                                <FaExchangeAlt className={`text-[15rem] -rotate-12 ${isDarkMode ? 'text-cyan-500' : 'text-cyan-900'}`} />
                            </div>
                            <div className="space-y-2 relative z-10">
                                <p className="text-cyan-500 font-black text-[10px] uppercase tracking-[0.3em]">
                                    {formData.fromCentreId ? "Node Liquidity" : "Gross Liquidity"}
                                </p>
                                <h4 className={`text-5xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    ₹{(() => {
                                        if (formData.fromCentreId) {
                                            const centreReport = auditReports.find(r => r.centreId === formData.fromCentreId);
                                            return (centreReport?.cashLeft || 0).toLocaleString();
                                        }
                                        return (cashSummary.totalCashLeft || 0).toLocaleString();
                                    })()}
                                </h4>
                                <div className="h-1.5 w-24 bg-cyan-500/20 rounded-full mt-4"></div>
                                <p className="text-gray-500 text-[10px] mt-6 italic font-bold uppercase tracking-widest leading-relaxed">
                                    {formData.fromCentreId
                                        ? "Cash currently held at the selected centre."
                                        : "Total cash held across all authorized nodes."}
                                </p>
                            </div>
                        </div>

                        <div className={`border p-10 rounded-[2.5rem] space-y-10 transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-200 shadow-2xl'}`}>
                            <h4 className={`font-black text-xl italic uppercase tracking-tighter flex items-center gap-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                                    <FaKey size={16} />
                                </div>
                                Security Flow
                            </h4>
                            <div className="space-y-8">
                                <div className="flex gap-6 group">
                                    <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center font-black text-sm shrink-0 transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800 text-cyan-500 group-hover:border-cyan-500 shadow-inner' : 'bg-gray-100 border-gray-200 text-cyan-600 group-hover:border-cyan-400 shadow-sm'}`}>1</div>
                                    <div>
                                        <p className={`text-base font-black italic uppercase tracking-tighter ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Initialization</p>
                                        <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-widest leading-relaxed">Enter details and upload bank verification evidence.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6 group">
                                    <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center font-black text-sm shrink-0 transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800 text-cyan-500 group-hover:border-cyan-500 shadow-inner' : 'bg-gray-100 border-gray-200 text-cyan-600 group-hover:border-cyan-400 shadow-sm'}`}>2</div>
                                    <div>
                                        <p className={`text-base font-black italic uppercase tracking-tighter ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Handshake</p>
                                        <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-widest leading-relaxed">Share the generated 6-digit passcode with the recipient.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6 group">
                                    <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center font-black text-sm shrink-0 transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800 text-cyan-500 group-hover:border-cyan-500 shadow-inner' : 'bg-gray-100 border-gray-200 text-cyan-600 group-hover:border-cyan-400 shadow-sm'}`}>3</div>
                                    <div>
                                        <p className={`text-base font-black italic uppercase tracking-tighter ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Settlement</p>
                                        <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-widest leading-relaxed">Receiving centre verifies code to finalize movement.</p>
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
