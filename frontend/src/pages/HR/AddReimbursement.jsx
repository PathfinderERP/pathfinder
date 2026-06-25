import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { FaPaperPlane, FaCamera, FaImages, FaCalendarAlt, FaMoneyBillWave, FaSuitcase, FaFileInvoiceDollar } from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";

// Client-side image auto-compression utility (ensures files are under 1MB)
const compressImage = (file) => {
    return new Promise((resolve) => {
        if (!file.type.startsWith("image/")) {
            resolve(file);
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                const MAX_WIDTH = 1920;
                const MAX_HEIGHT = 1080;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                let quality = 0.8;
                const convert = (q) => {
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            resolve(file);
                            return;
                        }
                        if (blob.size > 1024 * 1024 && q > 0.1) {
                            convert(q - 0.15);
                        } else {
                            const compressedFile = new File([blob], file.name, {
                                type: "image/jpeg",
                                lastModified: Date.now()
                            });
                            resolve(compressedFile);
                        }
                    }, "image/jpeg", q);
                };
                convert(quality);
            };
            img.onerror = () => {
                resolve(file);
            };
        };
        reader.onerror = () => {
            resolve(file);
        };
    });
};

const AddReimbursement = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [myReimbursements, setMyReimbursements] = useState([]);

    // Refs for file inputs
    const cameraInputRef = useRef(null);
    const galleryInputRef = useRef(null);

    // Form State
    const [formData, setFormData] = useState({
        purpose: "",
        travelType: "Official",
        travelMode: "Train",
        fromDate: "",
        toDate: "",
        allowanceType: "Travel Allowance",
        amount: "",
        description: ""
    });
    const [files, setFiles] = useState([]);

    const handleFileChange = async (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length === 0) return;

        setLoading(true);
        toast.info("Compressing files, please wait...");
        
        const compressedList = [];
        for (const file of selectedFiles) {
            const compressed = await compressImage(file);
            compressedList.push(compressed);
        }
        
        setFiles(prev => [...prev, ...compressedList]);
        setLoading(false);
        toast.success(`${selectedFiles.length} file(s) compressed and added!`);
        e.target.value = "";
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    useEffect(() => {
        fetchMyReimbursements();
    }, []);

    const fetchMyReimbursements = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/reimbursement/my`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setMyReimbursements(data);
            }
        } catch (error) {
            console.error("Error fetching my reimbursements:", error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const data = new FormData();
            Object.keys(formData).forEach(key => data.append(key, formData[key]));
            if (files.length > 0) {
                files.forEach(f => data.append("proof", f));
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/reimbursement/submit`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: data
            });

            if (response.ok) {
                toast.success("Reimbursement request submitted!");
                // Clear form
                setFormData({
                    purpose: "",
                    travelType: "Official",
                    travelMode: "Train",
                    fromDate: "",
                    toDate: "",
                    allowanceType: "Travel Allowance",
                    amount: "",
                    description: ""
                });
                setFiles([]);
                // Refresh list
                fetchMyReimbursements();
            } else {
                const error = await response.json();
                toast.error(error.message || "Submission failed");
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error("Error submitting request");
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "Approved": return "bg-green-500/10 text-green-500 border-green-500/20";
            case "Rejected": return "bg-red-500/10 text-red-500 border-red-500/20";
            default: return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
        }
    };

    return (
        <Layout activePage="Employee Center">
            <div className={`p-6 md:p-10 max-w-4xl mx-auto animate-fade-in pb-20 transition-colors duration-300 ${isDarkMode ? '' : 'text-gray-800'}`}>
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className={`text-3xl font-black italic uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Add <span className="text-cyan-600">Reimbursement</span>
                        </h1>
                        <p className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} text-xs font-bold uppercase tracking-widest mt-1`}>Submit your travel expenses for approval</p>
                    </div>
                </div>

                {/* Submission Form */}
                <div className={`p-8 rounded-3xl border shadow-2xl mb-12 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        <div className="col-span-1 md:col-span-2">
                            <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Purpose of Travel *</label>
                            <input
                                type="text"
                                required
                                className={`w-full border rounded-xl px-4 py-4 font-bold text-sm focus:border-cyan-500 outline-none transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 text-white placeholder:text-gray-700' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400'}`}
                                placeholder="e.g. Client Meeting in Bangalore"
                                value={formData.purpose}
                                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Travel Type</label>
                            <div className="relative">
                                <FaSuitcase className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                                <select
                                    className={`w-full border rounded-xl pl-12 pr-4 py-4 text-sm focus:border-cyan-500 outline-none appearance-none ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                                    value={formData.travelType}
                                    onChange={(e) => setFormData({ ...formData, travelType: e.target.value })}
                                >
                                    <option>Official</option>
                                    <option>Training</option>
                                    <option>Client Visit</option>
                                    <option>Other</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Travel Mode</label>
                            <div className="relative">
                                <select
                                    className={`w-full border rounded-xl px-4 py-4 text-sm focus:border-cyan-500 outline-none appearance-none ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                                    value={formData.travelMode}
                                    onChange={(e) => setFormData({ ...formData, travelMode: e.target.value })}
                                >
                                    <option>Train</option>
                                    <option>Bus</option>
                                    <option>Flight</option>
                                    <option>Car</option>
                                    <option>Bike</option>
                                    <option>Taxi</option>
                                    <option>Other</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>From Date *</label>
                            <div className="relative">
                                <FaCalendarAlt className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                                <input
                                    type="date"
                                    required
                                    className={`w-full border rounded-xl pl-12 pr-4 py-4 text-sm focus:border-cyan-500 outline-none ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 text-white [color-scheme:dark]' : 'bg-gray-50 border-gray-200 text-gray-800 [color-scheme:light]'}`}
                                    value={formData.fromDate}
                                    onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>To Date *</label>
                            <div className="relative">
                                <FaCalendarAlt className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                                <input
                                    type="date"
                                    required
                                    className={`w-full border rounded-xl pl-12 pr-4 py-4 text-sm focus:border-cyan-500 outline-none ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 text-white [color-scheme:dark]' : 'bg-gray-50 border-gray-200 text-gray-800 [color-scheme:light]'}`}
                                    value={formData.toDate}
                                    onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Allowance Type</label>
                            <select
                                className={`w-full border rounded-xl px-4 py-4 text-sm focus:border-cyan-500 outline-none appearance-none ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                                value={formData.allowanceType}
                                onChange={(e) => setFormData({ ...formData, allowanceType: e.target.value })}
                            >
                                <option>Travel Allowance</option>
                                <option>Daily Allowance</option>
                                <option>Lodging</option>
                                <option>Food</option>
                                <option>Other</option>
                            </select>
                        </div>

                        <div>
                            <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Expense Amount (₹) *</label>
                            <div className="relative">
                                <FaMoneyBillWave className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    className={`w-full border rounded-xl pl-12 pr-4 py-4 font-bold text-lg focus:border-cyan-500 outline-none ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 text-emerald-400 placeholder:text-gray-700' : 'bg-gray-50 border-gray-200 text-emerald-600 placeholder:text-gray-400'}`}
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className={`text-[10px] font-black uppercase tracking-widest block mb-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Upload Proof (Multiple Allowed)</label>

                            {/* Hidden Inputs */}
                            {/* Camera input: back camera, multiple captures */}
                            <input
                                ref={cameraInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                multiple
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            {/* Gallery/File picker input */}
                            <input
                                ref={galleryInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleFileChange}
                            />

                            {/* Two action buttons */}
                            <div className="flex gap-3 mb-4">
                                <button
                                    type="button"
                                    onClick={() => cameraInputRef.current && cameraInputRef.current.click()}
                                    className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border-2 font-black text-xs uppercase tracking-widest transition-all hover:-translate-y-0.5 ${
                                        isDarkMode
                                            ? 'border-cyan-700 bg-cyan-900/20 text-cyan-400 hover:bg-cyan-800/30 hover:border-cyan-500'
                                            : 'border-cyan-600 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 hover:border-cyan-700'
                                    }`}
                                >
                                    <FaCamera className="text-lg" />
                                    Camera
                                </button>
                                <button
                                    type="button"
                                    onClick={() => galleryInputRef.current && galleryInputRef.current.click()}
                                    className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border-2 font-black text-xs uppercase tracking-widest transition-all hover:-translate-y-0.5 ${
                                        isDarkMode
                                            ? 'border-gray-700 bg-[#1a1f24] text-gray-300 hover:border-gray-500 hover:text-white'
                                            : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                    <FaImages className="text-lg" />
                                    Upload Photo
                                </button>
                            </div>

                            {files.length > 0 && (
                                <p className={`text-[10px] font-bold uppercase tracking-wider mb-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {files.length} file(s) selected — all compressed to under 1 MB
                                </p>
                            )}

                            {/* Preview Grid */}
                            {files.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {files.map((file, idx) => {
                                        const previewUrl = URL.createObjectURL(file);
                                        return (
                                            <div key={idx} className={`relative border rounded-xl p-2 flex flex-col items-center ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                                <img
                                                    src={previewUrl}
                                                    alt="preview"
                                                    className="w-full h-24 object-cover rounded-lg mb-2"
                                                />
                                                <span className={`text-[9px] font-bold truncate max-w-full block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} title={file.name}>
                                                    {file.name}
                                                </span>
                                                <span className={`text-[9px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(idx)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors w-6 h-6 flex items-center justify-center text-xs shadow-lg"
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Description / Notes</label>
                            <textarea
                                className={`w-full border rounded-xl px-4 py-4 text-sm focus:border-cyan-500 outline-none resize-none h-32 transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 text-white placeholder:text-gray-700' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400'}`}
                                placeholder="Enter detailed description of the expense..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className={`col-span-1 md:col-span-2 mt-4 pt-6 border-t flex justify-end ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`px-10 py-4 text-white rounded-xl font-black uppercase text-xs tracking-[0.2em] shadow-xl transition-all transform hover:-translate-y-1 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/20' : 'bg-cyan-700 hover:bg-cyan-600 shadow-cyan-900/10'}`}
                            >
                                {loading ? "Submitting..." : <><FaPaperPlane /> Submit Request</>}
                            </button>
                        </div>

                    </form>
                </div>

                {/* My Reimbursements List (Read Only) */}
                <div className="mt-12">
                    <h2 className={`text-xl font-black italic uppercase tracking-tighter mb-6 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        My <span className="text-cyan-600">History</span>
                    </h2>
                    <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className={`border-b text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Purpose</th>
                                        <th className="p-4">Type</th>
                                        <th className="p-4">Amount</th>
                                        <th className="p-4">Document</th>
                                        <th className="p-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {myReimbursements.length === 0 ? (
                                        <tr><td colSpan="6" className={`p-8 text-center text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No history found</td></tr>
                                    ) : (
                                        myReimbursements.map((item) => (
                                            <tr key={item._id} className={`transition-colors ${isDarkMode ? 'hover:bg-cyan-500/[0.02] border-gray-800' : 'hover:bg-cyan-50 border-gray-100'}`}>
                                                <td className={`p-4 text-xs font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    {new Date(item.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className={`p-4 text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.purpose}</td>
                                                <td className={`p-4 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.travelType}</td>
                                                <td className={`p-4 text-xs font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>₹{item.amount}</td>
                                                <td className="p-4">
                                                    {item.proofUrls && item.proofUrls.length > 0 ? (
                                                        <div className="flex gap-2">
                                                            {item.proofUrls.map((url, idx) => (
                                                                <a key={idx} href={url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-cyan-400 transition-colors" title={`Receipt ${idx + 1}`}>
                                                                    <FaFileInvoiceDollar />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    ) : item.proofUrl ? (
                                                        <a href={item.proofUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-cyan-400 transition-colors">
                                                            <FaFileInvoiceDollar />
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-600">-</span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${getStatusColor(item.status)}`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>
        </Layout>
    );
};

export default AddReimbursement;
