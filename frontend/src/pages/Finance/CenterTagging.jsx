import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaEdit, FaSearch, FaTimes, FaCheck, FaBuilding } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTheme } from "../../context/ThemeContext";

const CenterTagging = () => {
    const { isDarkMode } = useTheme();
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
            <div className={`p-4 md:p-10 max-w-[1800px] mx-auto min-h-screen pb-20 transition-all duration-500 ${isDarkMode ? 'bg-[#0f1215]' : 'bg-gray-50'}`}>
                <ToastContainer position="top-right" theme={isDarkMode ? "dark" : "light"} />

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                        <h1 className={`text-4xl font-black italic uppercase tracking-tighter flex items-center gap-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <span className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500 border border-indigo-500/20 shadow-inner">
                                <FaBuilding size={28} />
                            </span>
                            Center <span className="text-indigo-500">Tagging</span>
                        </h1>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2 italic">Orchestrate structural relationships between operational nodes</p>
                    </div>
                </div>

                {/* Search and Controls */}
                <div className={`p-6 rounded-[2rem] border flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl transition-all duration-300 mb-10 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="relative w-full md:w-96 group">
                        <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-500 transition-colors duration-300" />
                        <input
                            type="text"
                            placeholder="TRACE NODE IDENTITIES..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full border pl-14 pr-6 py-4 rounded-2xl focus:outline-none focus:border-indigo-500/50 transition-all text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Map:</span>
                        <span className="bg-indigo-500/10 text-indigo-500 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-500/20 shadow-inner">
                            {filteredCentres.length} NODES IDENTIFIED
                        </span>
                    </div>
                </div>

                {/* Table Section */}
                <div className={`rounded-[2.5rem] border shadow-2xl overflow-hidden transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className={`border-b transition-all duration-300 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                    <th className="px-8 py-6 text-left">Operational Node</th>
                                    <th className="px-8 py-6 text-left">Master Authority (Head)</th>
                                    <th className="px-8 py-6 text-right">Structural Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="3" className="px-8 py-32 text-center">
                                            <div className="flex flex-col items-center gap-6">
                                                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] italic animate-pulse">Syncing Structural Data...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredCentres.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="px-8 py-24 text-center text-gray-600 font-black uppercase tracking-[0.4em] italic text-xs">No matching nodes detected</td>
                                    </tr>
                                ) : (
                                    filteredCentres.map((centre) => (
                                        <tr key={centre._id} className={`transition-all group ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-indigo-500/[0.02]'}`}>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-5">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner transition-all duration-500 group-hover:border-indigo-500/50 ${isDarkMode ? 'bg-white/5 text-indigo-400 border-gray-800' : 'bg-gray-100 text-indigo-500 border-gray-200'}`}>
                                                        <FaBuilding size={16} />
                                                    </div>
                                                    <span className={`font-black text-base uppercase italic tracking-tighter leading-none transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{centre.centreName}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border transition-all duration-300 ${centre.taggedHeadCentre === "Not Tagged"
                                                    ? "bg-red-500/10 text-red-500 border-red-500/20"
                                                    : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-inner"
                                                    }`}>
                                                    {centre.taggedHeadCentre}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <button
                                                    onClick={() => handleEdit(centre)}
                                                    className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest active:scale-95 shadow-xl ${isDarkMode ? 'bg-white/5 border border-gray-800 text-indigo-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-600' : 'bg-gray-50 border border-gray-200 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600'}`}
                                                >
                                                    <FaEdit size={14} />
                                                    Re-Configure
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
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
                        <div className={`w-full max-w-xl rounded-[3rem] border shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-[#0f1215] border-gray-800' : 'bg-white border-gray-100'}`}>
                            <div className={`p-8 border-b flex justify-between items-center ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                <h3 className={`text-2xl font-black italic uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    Structural <span className="text-indigo-500">Tagging</span>
                                </h3>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className={`p-3 rounded-2xl transition-all duration-300 ${isDarkMode ? 'bg-white/5 text-gray-500 hover:text-white hover:bg-red-500/10 hover:text-red-500' : 'bg-gray-100 text-gray-400 hover:bg-red-50'}`}
                                >
                                    <FaTimes size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="p-10 space-y-10">
                                <div className="space-y-4">
                                    <div className={`p-6 rounded-[2rem] border flex items-center gap-5 transition-all ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-200 shadow-inner'}`}>
                                        <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500">
                                            <FaBuilding size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Source Entity</p>
                                            <p className={`text-lg font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedCentre?.centreName}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 ml-2">Hierarchy Master (Head)</label>
                                        <div className="relative group">
                                            <select
                                                value={headCentreId}
                                                onChange={(e) => setHeadCentreId(e.target.value)}
                                                className={`w-full border px-6 py-4 rounded-2xl focus:outline-none focus:border-indigo-500 transition-all appearance-none text-xs font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                            >
                                                <option value="" className={isDarkMode ? 'bg-[#0f1215]' : ''}>Identify Head Authority...</option>
                                                {headCentres.map(hc => (
                                                    <option key={hc._id} value={hc._id} className={isDarkMode ? 'bg-[#0f1215]' : ''}>{hc.centreName}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500">
                                                <FaChevronDown size={14} className="group-focus-within:rotate-180 transition-transform duration-300" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-4 shadow-[0_20px_50px_rgba(79,70,229,0.3)] active:scale-95 text-xs uppercase tracking-widest"
                                >
                                    {saving ? (
                                        <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <FaCheck size={16} />
                                            Establish Authority Tag
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
