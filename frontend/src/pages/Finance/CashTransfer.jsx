import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaExchangeAlt, FaPaperPlane, FaBuilding, FaWallet, FaLock, FaKey, FaArrowRight, FaCheckCircle, FaHashtag, FaFileInvoice, FaCloudUploadAlt, FaTimes } from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";

import { useNavigate } from "react-router-dom";

const CashTransfer = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [centres, setCentres] = useState([]);
    const [userCentres, setUserCentres] = useState([]);
    const [cashSummary, setCashSummary] = useState({ totalCashLeft: 0 });
    const [formData, setFormData] = useState({
        fromCentreId: "",
        toCentreId: "",
        amount: "",
        accountNumber: "",
        remarks: "",
        referenceNumber: ""
    });
    const [receiptFile, setReceiptFile] = useState(null);
    const [receiptPreview, setReceiptPreview] = useState(null);
    const [generatedPassword, setGeneratedPassword] = useState("");
    const [serialNumber, setSerialNumber] = useState("");
    const [transferStatus, setTransferStatus] = useState("idle"); // idle, success

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const token = localStorage.getItem("token");
            const userData = JSON.parse(localStorage.getItem("user") || "{}");

            const [centresRes, reportRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/centre`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${import.meta.env.VITE_API_URL}/finance/cash/report`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            setCentres(centresRes.data);
            setCashSummary(reportRes.data.summary);

            // Set next serial number from recent transfers
            if (reportRes.data.recentTransfers && reportRes.data.recentTransfers.length > 0) {
                setSerialNumber(reportRes.data.recentTransfers[0].serialNumber);
            } else {
                setSerialNumber(0);
            }

            // Filter centres based on user's assigned centres
            let allocatedCentres = [];
            if (userData.role === "superAdmin") {
                allocatedCentres = centresRes.data;
            } else if (userData.centres && userData.centres.length > 0) {
                allocatedCentres = centresRes.data.filter(c =>
                    userData.centres.includes(c._id) ||
                    userData.centres.some(uc => uc._id === c._id || uc === c._id)
                );
            }

            setUserCentres(allocatedCentres);

            // Auto-select if only one centre
            if (allocatedCentres.length === 1) {
                setFormData(prev => ({ ...prev, fromCentreId: allocatedCentres[0]._id }));
            }
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
                <div className="flex items-center justify-center h-[calc(100vh-100px)] animate-in zoom-in duration-500 p-4">
                    <div className="bg-gray-900/60 backdrop-blur-xl border border-emerald-500/30 p-6 md:p-10 rounded-3xl shadow-2xl shadow-emerald-500/10 max-w-lg w-full text-center space-y-6">
                        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
                            <FaCheckCircle className="text-5xl text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-white">Transfer Success!</h2>
                            <p className="text-cyan-400 font-mono text-sm mt-1">Transaction ID: #{serialNumber}</p>
                        </div>

                        <p className="text-gray-400 text-sm md:text-lg">Transfer request created. Securely share this password with the recipient.</p>

                        <div className="bg-gray-800/80 border-2 border-dashed border-cyan-500/40 p-6 rounded-2xl relative group overflow-hidden">
                            <div className="absolute inset-0 bg-cyan-500/5 group-hover:bg-cyan-500/10 transition-colors"></div>
                            <p className="text-xs text-cyan-400 font-semibold uppercase tracking-widest relative">Unique Transfer Password</p>
                            <h1 className="text-4xl md:text-5xl font-black text-white mt-2 tracking-widest relative">{generatedPassword}</h1>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 mt-8">
                            <button
                                onClick={() => {
                                    setTransferStatus("idle");
                                    setFormData({ fromCentreId: "", toCentreId: "", amount: "", accountNumber: "", remarks: "", referenceNumber: "" });
                                    setReceiptFile(null);
                                    setReceiptPreview(null);
                                }}
                                className="flex-1 bg-gray-800 text-white font-bold py-4 rounded-xl hover:bg-gray-700 transition-all border border-gray-700"
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
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">Cash Transfer</h1>
                        <p className="text-gray-400 text-sm mt-1">Securely move funds with unique password authentication</p>
                    </div>
                    {serialNumber && (
                        <div className="bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-700">
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Next Serial #</p>
                            <p className="text-xl font-black text-cyan-400">#{parseInt(serialNumber) + 1 || '...'}</p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form Section */}
                    <div className="lg:col-span-2 bg-gray-900/40 backdrop-blur-md border border-gray-800 p-6 md:p-8 rounded-3xl shadow-2xl space-y-8">
                        <h3 className="text-xl font-bold text-white flex items-center gap-3">
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
                                            className="w-full bg-gray-800/80 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-all appearance-none disabled:opacity-50"
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
                                            className="w-full bg-gray-800/80 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-all appearance-none"
                                            value={formData.toCentreId}
                                            onChange={(e) => setFormData({ ...formData, toCentreId: e.target.value })}
                                        >
                                            <option value="">Select Destination</option>
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
                                            className="w-full bg-gray-800/80 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-all"
                                            placeholder="Enter amount"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400 ml-1">Account Number</label>
                                    <div className="relative">
                                        <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="text"
                                            className="w-full bg-gray-800/80 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-all"
                                            placeholder="Recipient account #"
                                            value={formData.accountNumber}
                                            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400 ml-1">Reference Number</label>
                                    <div className="relative">
                                        <FaHashtag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="text"
                                            className="w-full bg-gray-800/80 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-all"
                                            placeholder="Bank Ref / ChUTR"
                                            value={formData.referenceNumber}
                                            onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                                        />
                                    </div>
                                </div>
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
                                            className="w-full bg-gray-800/80 border border-gray-700 rounded-xl py-3 px-4 text-gray-400 cursor-pointer flex items-center justify-between hover:border-cyan-500 transition-all"
                                        >
                                            <span className="truncate">{receiptFile ? receiptFile.name : "Select Receipt File"}</span>
                                            <FaCloudUploadAlt className="text-cyan-400" />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {receiptPreview && (
                                <div className="relative w-full h-32 bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden flex items-center justify-center group">
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
                                    className="w-full bg-gray-800/80 border border-gray-700 rounded-xl py-4 px-4 text-white focus:outline-none focus:border-cyan-500 transition-all resize-none"
                                    rows="3"
                                    placeholder="Add notes for recipient centre..."
                                    value={formData.remarks}
                                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-cyan-600 to-cyan-700 text-white font-bold py-4 rounded-2xl hover:brightness-110 active:scale-[0.98] transition-all shadow-xl shadow-cyan-900/20 flex items-center justify-center gap-3"
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <FaPaperPlane />
                                        Initiate Transfer & Get Password
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Side Info */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-cyan-900/40 via-cyan-800/20 to-transparent border border-cyan-500/20 p-8 rounded-3xl backdrop-blur-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <FaExchangeAlt className="text-9xl -rotate-12" />
                            </div>
                            <div className="space-y-1 relative">
                                <p className="text-cyan-400 font-bold text-xs uppercase tracking-widest">Available Cash Balance</p>
                                <h4 className="text-3xl md:text-4xl font-black text-white">₹{cashSummary.totalCashLeft.toLocaleString()}</h4>
                                <div className="h-1 w-20 bg-cyan-500/30 rounded-full mt-2"></div>
                                <p className="text-gray-500 text-xs mt-4 italic leading-relaxed">Cash currently held across your authorized centres.</p>
                            </div>
                        </div>

                        <div className="bg-gray-900/60 border border-gray-800 p-8 rounded-3xl space-y-6">
                            <h4 className="text-white font-bold text-lg flex items-center gap-3">
                                <div className="p-2 bg-amber-500/10 rounded-lg">
                                    <FaKey className="text-amber-400" />
                                </div>
                                Security Flow
                            </h4>
                            <div className="space-y-6 mt-4">
                                <div className="flex gap-4 group">
                                    <div className="w-8 h-8 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-cyan-400 font-bold shrink-0 group-hover:border-cyan-500 transition-colors">1</div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-300">Initiate</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Enter details and upload bank receipt for verification.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 group">
                                    <div className="w-8 h-8 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-cyan-400 font-bold shrink-0 group-hover:border-cyan-500 transition-colors">2</div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-300">Passcode</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Share the generated 6-digit code with the receiving centre.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 group">
                                    <div className="w-8 h-8 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-cyan-400 font-bold shrink-0 group-hover:border-cyan-500 transition-colors">3</div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-300">Complete</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Recieving centre verifies code to update transaction history.</p>
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
