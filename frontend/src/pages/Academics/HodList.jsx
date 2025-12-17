import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaSearch } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const HodList = () => {
    const [hods, setHods] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);

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
            <div className="p-6 text-gray-100 min-h-screen font-sans">
                <ToastContainer theme="dark" position="top-right" />

                <h1 className="text-2xl font-bold text-white mb-6">Hod List</h1>

                <div className="bg-[#1e2530] p-6 rounded-xl border border-gray-700 shadow-2xl">
                    <h2 className="text-xl font-bold text-gray-300 mb-6">Hod List</h2>

                    <div className="flex justify-between items-center mb-4">
                        <div className="relative w-1/3">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><FaSearch /></span>
                            <input
                                type="text"
                                placeholder="Search by name..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                                className="bg-[#2a3038] text-white pl-10 pr-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 outline-none w-full"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                value={limit}
                                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                                className="bg-[#2a3038] text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 outline-none"
                            >
                                <option value="10">10 entries</option>
                                <option value="20">20 entries</option>
                                <option value="50">50 entries</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-gray-700">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#6b7b9c] text-white text-xs uppercase font-bold">
                                    <th className="p-3">SL NO.</th>
                                    <th className="p-3">NAME ↑</th>
                                    <th className="p-3">EMAIL</th>
                                    <th className="p-3">MOBILE</th>
                                    <th className="p-3">SUBJECT</th>
                                    <th className="p-3">DESIGNATION</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700 text-sm bg-[#1e2530]">
                                {loading ? (
                                    <tr><td colSpan="6" className="p-8 text-center text-gray-400">Loading...</td></tr>
                                ) : paginatedHods.length === 0 ? (
                                    <tr><td colSpan="6" className="p-8 text-center text-gray-400">No HODs found</td></tr>
                                ) : (
                                    paginatedHods.map((hod, index) => (
                                        <tr key={hod._id} className="hover:bg-[#252b32] transition-colors">
                                            <td className="p-3 border-r border-gray-700">{(page - 1) * limit + index + 1}</td>
                                            <td className="p-3 border-r border-gray-700 font-semibold text-white uppercase">{hod.name}</td>
                                            <td className="p-3 border-r border-gray-700">{hod.email}</td>
                                            <td className="p-3 border-r border-gray-700">{hod.mobNum}</td>
                                            <td className="p-3 border-r border-gray-700 uppercase">{hod.subject || "-"}</td>
                                            <td className="p-3 uppercase">{hod.designation || "-"}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="flex justify-between items-center mt-4 text-sm text-gray-400">
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