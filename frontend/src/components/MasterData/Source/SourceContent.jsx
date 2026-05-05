import React, { useState, useEffect } from "react";
import { FaPlus, FaEdit, FaTrash, FaSearch } from "react-icons/fa";
import { toast } from "react-toastify";
import AddSourceModal from "./AddSourceModal";
import EditSourceModal from "./EditSourceModal";
import ExcelImportExport from "../../common/ExcelImportExport";
import { useTheme } from "../../../context/ThemeContext";

const SourceContent = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [sources, setSources] = useState([]);
    const [filteredSources, setFilteredSources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedSource, setSelectedSource] = useState(null);

    useEffect(() => {
        fetchSources();
    }, []);

    useEffect(() => {
        filterSources();
    }, [searchTerm, sources]);

    const fetchSources = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/source`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (response.ok) {
                setSources(data.sources);
                setFilteredSources(data.sources);
            } else {
                toast.error(data.message || "Failed to fetch sources");
            }
        } catch (error) {
            console.error("Error fetching sources:", error);
            toast.error("Error fetching sources");
        } finally {
            setLoading(false);
        }
    };

    const filterSources = () => {
        if (!searchTerm) {
            setFilteredSources(sources);
            return;
        }

        const filtered = sources.filter(
            (source) =>
                source.sourceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                source.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
                source.subSource.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredSources(filtered);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this source?")) {
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/source/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("Source deleted successfully");
                fetchSources();
            } else {
                toast.error(data.message || "Failed to delete source");
            }
        } catch (error) {
            console.error("Error deleting source:", error);
            toast.error("Error deleting source");
        }
    };

    const handleBulkImport = async (importData) => {
        const token = localStorage.getItem("token");
        const response = await fetch(`${import.meta.env.VITE_API_URL}/source/import`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(importData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Bulk import failed");
        }

        fetchSources();
    };

    const sourceColumns = [
        { header: "Source Name", key: "sourceName" },
        { header: "Source", key: "source" },
        { header: "Sub Source", key: "subSource" },
        { header: "Source Type", key: "sourceType" }
    ];
    const sourceMapping = {
        "Source Name": "sourceName",
        "Source": "source",
        "Sub Source": "subSource",
        "Source Type": "sourceType"
    };

    const handleEdit = (source) => {
        setSelectedSource(source);
        setShowEditModal(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className={`${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'} text-xl font-bold`}>Loading sources...</div>
            </div>
        );
    }

    return (
        <div className={`p-6 space-y-6 transition-colors duration-300 ${isDarkMode ? 'bg-transparent' : ''}`}>
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className={`text-2xl font-black uppercase tracking-tighter italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Source <span className="text-cyan-500">Management</span></h2>
                    <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm font-bold`}>Manage lead sources</p>
                </div>
                <div className="flex items-center gap-3">
                    <ExcelImportExport
                        data={sources}
                        columns={sourceColumns}
                        mapping={sourceMapping}
                        onImport={handleBulkImport}
                        fileName="sources"
                    />
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 bg-cyan-500 text-black px-4 py-2 rounded-lg font-semibold hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20"
                    >
                        <FaPlus /> Add Source
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className={`border rounded-lg p-4 transition-all duration-300 ${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="relative">
                    <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by source name, source, or sub-source..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full border rounded-lg pl-12 pr-4 py-3 outline-none focus:border-cyan-500 transition-all font-bold ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                    />
                </div>
            </div>

            {/* Sources Table */}
            <div className={`border rounded-lg overflow-hidden transition-all duration-300 ${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className={`border-b transition-colors ${isDarkMode ? 'bg-[#131619] border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">S/N</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Source Name</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Source</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Sub Source</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Source Type</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y transition-colors ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                            {filteredSources.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                                        No sources found
                                    </td>
                                </tr>
                            ) : (
                                filteredSources.map((source, index) => (
                                    <tr key={source._id} className={`hover-wave-row transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                                        <td className={`px-6 py-4 font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{index + 1}</td>
                                        <td className={`px-6 py-4 font-black uppercase text-xs tracking-wide ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{source.sourceName}</td>
                                        <td className={`px-6 py-4 font-bold text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{source.source}</td>
                                        <td className={`px-6 py-4 font-bold text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{source.subSource}</td>
                                        <td className={`px-6 py-4 font-bold text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{source.sourceType || "N/A"}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(source)}
                                                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                                                >
                                                    <FaEdit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(source._id)}
                                                    className="text-red-400 hover:text-red-300 transition-colors"
                                                >
                                                    <FaTrash size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {showAddModal && (
                <AddSourceModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        fetchSources();
                    }}
                    isDarkMode={isDarkMode}
                />
            )}

            {showEditModal && selectedSource && (
                <EditSourceModal
                    source={selectedSource}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedSource(null);
                    }}
                    onSuccess={() => {
                        setShowEditModal(false);
                        setSelectedSource(null);
                        fetchSources();
                    }}
                    isDarkMode={isDarkMode}
                />
            )}
        </div>
    );
};

export default SourceContent;
