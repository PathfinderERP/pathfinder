import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaPaperPlane, FaFileUpload, FaCalendarAlt, FaMoneyBillWave, FaSuitcase, FaFileInvoiceDollar } from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const AddReimbursement = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [myReimbursements, setMyReimbursements] = useState([]);

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
    const [file, setFile] = useState(null);

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
            if (file) data.append("proof", file);

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
                setFile(null);
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
            <div className="p-6 md:p-10 max-w-4xl mx-auto animate-fade-in pb-20">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                            Add <span className="text-cyan-500">Reimbursement</span>
                        </h1>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Submit your travel expenses for approval</p>
                    </div>
                </div>

                {/* Submission Form */}
                <div className="bg-[#131619] p-8 rounded-3xl border border-gray-800 shadow-2xl mb-12">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        <div className="col-span-1 md:col-span-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Purpose of Travel *</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-[#1a1f24] border border-gray-800 rounded-xl px-4 py-4 text-white font-bold text-sm focus:border-cyan-500 outline-none transition-all placeholder:text-gray-700"
                                placeholder="e.g. Client Meeting in Bangalore"
                                value={formData.purpose}
                                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Travel Type</label>
                            <div className="relative">
                                <FaSuitcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                                <select
                                    className="w-full bg-[#1a1f24] border border-gray-800 rounded-xl pl-12 pr-4 py-4 text-white text-sm focus:border-cyan-500 outline-none appearance-none"
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
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Travel Mode</label>
                            <div className="relative">
                                <select
                                    className="w-full bg-[#1a1f24] border border-gray-800 rounded-xl px-4 py-4 text-white text-sm focus:border-cyan-500 outline-none appearance-none"
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
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">From Date *</label>
                            <div className="relative">
                                <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                                <input
                                    type="date"
                                    required
                                    className="w-full bg-[#1a1f24] border border-gray-800 rounded-xl pl-12 pr-4 py-4 text-white text-sm focus:border-cyan-500 outline-none [color-scheme:dark]"
                                    value={formData.fromDate}
                                    onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">To Date *</label>
                            <div className="relative">
                                <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                                <input
                                    type="date"
                                    required
                                    className="w-full bg-[#1a1f24] border border-gray-800 rounded-xl pl-12 pr-4 py-4 text-white text-sm focus:border-cyan-500 outline-none [color-scheme:dark]"
                                    value={formData.toDate}
                                    onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Allowance Type</label>
                            <select
                                className="w-full bg-[#1a1f24] border border-gray-800 rounded-xl px-4 py-4 text-white text-sm focus:border-cyan-500 outline-none appearance-none"
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
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Expense Amount (₹) *</label>
                            <div className="relative">
                                <FaMoneyBillWave className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    className="w-full bg-[#1a1f24] border border-gray-800 rounded-xl pl-12 pr-4 py-4 text-emerald-400 font-bold text-lg focus:border-cyan-500 outline-none placeholder:text-gray-700"
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Upload Proof</label>
                            <div className="relative group">
                                <input
                                    type="file"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    onChange={(e) => setFile(e.target.files[0])}
                                />
                                <div className="w-full bg-[#1a1f24] border border-dashed border-gray-700 group-hover:border-cyan-500 rounded-xl p-6 flex flex-col items-center justify-center transition-colors">
                                    <FaFileUpload className="text-gray-600 group-hover:text-cyan-500 mb-2 text-2xl transition-colors" />
                                    <span className="text-gray-400 text-xs font-bold uppercase tracking-wide group-hover:text-white transition-colors">
                                        {file ? file.name : "Choose File or Drag & Drop"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Description / Notes</label>
                            <textarea
                                className="w-full bg-[#1a1f24] border border-gray-800 rounded-xl px-4 py-4 text-white text-sm focus:border-cyan-500 outline-none resize-none h-32 placeholder:text-gray-700"
                                placeholder="Enter detailed description of the expense..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2 mt-4 pt-6 border-t border-gray-800 flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-10 py-4 bg-cyan-600 text-white rounded-xl font-black uppercase text-xs tracking-[0.2em] hover:bg-cyan-500 shadow-xl shadow-cyan-500/20 transition-all transform hover:-translate-y-1 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Submitting..." : <><FaPaperPlane /> Submit Request</>}
                            </button>
                        </div>

                    </form>
                </div>

                {/* My Reimbursements List (Read Only) */}
                <div className="mt-12">
                    <h2 className="text-xl font-black text-white italic uppercase tracking-tighter mb-6 flex items-center gap-3">
                        My <span className="text-cyan-500">History</span>
                    </h2>
                    <div className="bg-[#131619] rounded-2xl border border-gray-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#1a1f24] border-b border-gray-800 text-[10px] font-black text-gray-500 uppercase tracking-widest">
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
                                        <tr><td colSpan="6" className="p-8 text-center text-gray-500 text-xs uppercase tracking-wider">No history found</td></tr>
                                    ) : (
                                        myReimbursements.map((item) => (
                                            <tr key={item._id} className="hover:bg-cyan-500/[0.02] transition-colors">
                                                <td className="p-4 text-gray-400 text-xs font-bold">
                                                    {new Date(item.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="p-4 text-white text-xs font-bold">{item.purpose}</td>
                                                <td className="p-4 text-gray-400 text-xs">{item.travelType}</td>
                                                <td className="p-4 text-emerald-400 text-xs font-black">₹{item.amount}</td>
                                                <td className="p-4">
                                                    {item.proofUrl ? (
                                                        <a href={item.proofUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-white transition-colors">
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
