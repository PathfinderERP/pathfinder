import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaEdit, FaSearch, FaTimes, FaCheck, FaBuilding } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const CenterTagging = () => {
    const [loading, setLoading] = useState(true);
    const [centres, setCentres] = useState([]);
    const [headCentres, setHeadCentres] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [selectedCentre, setSelectedCentre] = useState(null);
    const [headCentreId, setHeadCentreId] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const [taggingRes, headsRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/finance/center-tagging`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                fetch(`${import.meta.env.VITE_API_URL}/finance/center-tagging/heads`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            const taggingData = await taggingRes.json();
            const headsData = await headsRes.json();

            if (taggingRes.ok) setCentres(taggingData);
            if (headsRes.ok) setHeadCentres(headsData);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Error connecting to server");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (centre) => {
        setSelectedCentre(centre);
        setHeadCentreId(centre.headCentreId || "");
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!headCentreId) {
            toast.warning("Please select a head center");
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/finance/center-tagging`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    centreId: selectedCentre._id,
                    headCentreId: headCentreId
                })
            });

            const data = await response.json();
            if (response.ok) {
                toast.success("Center tagged successfully");
                setShowModal(false);
                fetchData();
            } else {
                toast.error(data.message || "Failed to tag center");
            }
        } catch (error) {
            console.error("Error saving:", error);
            toast.error("Error connecting to server");
        } finally {
            setSaving(false);
        }
    };

    const filteredCentres = centres.filter(c =>
        c.centreName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.taggedHeadCentre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout activePage="Finance & Fees">
            <div className="p-4 space-y-6">
                <ToastContainer position="top-right" theme="dark" />

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                            <span className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                                <FaBuilding size={24} />
                            </span>
                            Center Tagging
                        </h1>
                        <p className="text-gray-400 text-sm mt-1">Manage relationships between branch and head centers</p>
                    </div>
                </div>

                {/* Search and Controls */}
                <div className="bg-[#1a1f24] p-4 rounded-2xl border border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
                    <div className="relative w-full md:w-96 group">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by center name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-900/50 border border-gray-700 text-white pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-widest">
                        <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full">{filteredCentres.length} Centres Total</span>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-[#1a1f24] rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-900/50 border-b border-gray-800">
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Center Name</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Tagged Head Center</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-gray-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest animate-pulse">Syncing Center Data...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredCentres.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-20 text-center text-gray-500">No centers found matching your search</td>
                                    </tr>
                                ) : (
                                    filteredCentres.map((centre) => (
                                        <tr key={centre._id} className="hover:bg-indigo-500/5 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                                        <FaBuilding size={14} />
                                                    </div>
                                                    <span className="text-white font-bold text-sm tracking-tight">{centre.centreName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${centre.taggedHeadCentre === "Not Tagged"
                                                        ? "bg-red-500/10 text-red-400"
                                                        : "bg-green-500/10 text-green-400"
                                                    }`}>
                                                    {centre.taggedHeadCentre}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleEdit(centre)}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-lg transition-all text-xs font-bold"
                                                >
                                                    <FaEdit />
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Edit Modal */}
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-[#1a1f24] w-full max-w-lg rounded-3xl border border-gray-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                                <h3 className="text-xl font-black text-white tracking-tight">
                                    Center Tagging for -- <span className="text-indigo-400">{selectedCentre?.centreName}</span>
                                </h3>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-white transition-colors"
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-[2px] text-gray-500">Tag Head Center</label>
                                    <div className="relative group">
                                        <select
                                            value={headCentreId}
                                            onChange={(e) => setHeadCentreId(e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-800 text-white px-4 py-4 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none font-bold"
                                        >
                                            <option value="">Select Head Center</option>
                                            {headCentres.map(hc => (
                                                <option key={hc._id} value={hc._id}>{hc.centreName}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                            <FaBuilding size={14} />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20 active:scale-[0.98]"
                                >
                                    {saving ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <FaCheck />
                                            Update Tagging
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default CenterTagging;
