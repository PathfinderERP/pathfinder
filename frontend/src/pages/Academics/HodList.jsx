import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaSearch } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTheme } from "../../context/ThemeContext";

const HodList = () => {
    const [hods, setHods] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    const API_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        fetchHods();
    }, []);

    const fetchHods = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/hod/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setHods(data);
            } else {
                toast.error("Failed to fetch HOD list");
            }
        } catch (error) {
            toast.error("Error fetching HOD list");
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filteredHods = hods.filter(hod =>
        hod.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination Logic
    const totalRecords = filteredHods.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const paginatedHods = filteredHods.slice((page - 1) * limit, page * limit);

    return (
        <Layout activePage="Academics">
            <div className={`p-6 min-h-screen font-sans transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900 bg-[#f8fafc]'}`}>
                <ToastContainer theme={theme} position="top-right" />

                <h1 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Hod List</h1>

                <div className={`${isDarkMode ? 'bg-[#1e2530] border-gray-700 shadow-2xl' : 'bg-white border-gray-200 shadow-md'} p-6 rounded-xl border`}>
                    <h2 className={`text-xl font-bold mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Hod List</h2>

                    <div className="flex justify-between items-center mb-4">
                        <div className="relative w-1/3">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><FaSearch /></span>
                            <input
                                type="text"
                                placeholder="Search by name..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                                className={`pl-10 pr-4 py-2 rounded-lg border focus:border-blue-500 outline-none w-full transition-all ${isDarkMode ? 'bg-[#2a3038] text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                value={limit}
                                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                                className={`px-3 py-2 rounded-lg border focus:border-blue-500 outline-none transition-all ${isDarkMode ? 'bg-[#2a3038] text-white border-gray-600' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
                            >
                                <option value="10">10 entries</option>
                                <option value="20">20 entries</option>
                                <option value="50">50 entries</option>
                            </select>
                        </div>
                    </div>

                    <div className={`overflow-x-auto rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`${isDarkMode ? 'bg-[#6b7b9c] text-white' : 'bg-[#e2e8f0] text-gray-700'} text-xs uppercase font-bold`}>
                                    <th className="p-3">SL NO.</th>
                                    <th className="p-3">NAME ↑</th>
                                    <th className="p-3">EMAIL</th>
                                    <th className="p-3">MOBILE</th>
                                    <th className="p-3">SUBJECT</th>
                                    <th className="p-3">DESIGNATION</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y text-sm ${isDarkMode ? 'divide-gray-700 bg-[#1e2530]' : 'divide-gray-200 bg-white'}`}>
                                {loading ? (
                                    <tr><td colSpan="6" className="p-8 text-center text-gray-400">Loading...</td></tr>
                                ) : paginatedHods.length === 0 ? (
                                    <tr><td colSpan="6" className="p-8 text-center text-gray-400">No HODs found</td></tr>
                                ) : (
                                    paginatedHods.map((hod, index) => (
                                        <tr key={hod._id} className={`transition-colors ${isDarkMode ? 'hover:bg-[#252b32]' : 'hover:bg-gray-50'}`}>
                                            <td className={`p-3 border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>{(page - 1) * limit + index + 1}</td>
                                            <td className={`p-3 border-r font-semibold uppercase ${isDarkMode ? 'text-white border-gray-700' : 'text-gray-900 border-gray-200'}`}>{hod.name}</td>
                                            <td className={`p-3 border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>{hod.email}</td>
                                            <td className={`p-3 border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>{hod.mobNum}</td>
                                            <td className={`p-3 border-r uppercase ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>{hod.subject || "-"}</td>
                                            <td className="p-3 uppercase">{hod.designation || "-"}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className={`flex justify-between items-center mt-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <div>Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalRecords)} of {totalRecords} entries</div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                disabled={page === 1}
                                className="px-3 py-1 text-gray-400 hover:text-white disabled:opacity-50"
                            >
                                &lt; Previous
                            </button>
                            <button className="px-3 py-1 bg-blue-600 text-white rounded">{page}</button>
                            <button
                                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={page === totalPages || totalPages === 0}
                                className="px-3 py-1 text-gray-400 hover:text-white disabled:opacity-50"
                            >
                                Next &gt;
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default HodList;