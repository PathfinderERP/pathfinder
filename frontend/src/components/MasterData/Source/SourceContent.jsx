import React, { useState, useEffect } from "react";
import { FaPlus, FaEdit, FaTrash, FaSearch } from "react-icons/fa";
import { toast } from "react-toastify";
import AddSourceModal from "./AddSourceModal";
import EditSourceModal from "./EditSourceModal";

const SourceContent = () => {
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

    const handleEdit = (source) => {
        setSelectedSource(source);
        setShowEditModal(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-cyan-400 text-xl">Loading sources...</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">Source Management</h2>
                    <p className="text-gray-400 text-sm">Manage lead sources</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-cyan-500 text-black px-4 py-2 rounded-lg font-semibold hover:bg-cyan-400 transition-colors"
                >
                    <FaPlus /> Add Source
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-[#1a1f24] border border-gray-700 rounded-lg p-4">
                <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by source name, source, or sub-source..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#131619] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                    />
                </div>
            </div>

            {/* Sources Table */}
            <div className="bg-[#1a1f24] border border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[#131619] border-b border-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">S/N</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Source Name</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Source</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Sub Source</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Source Type</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {filteredSources.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                                        No sources found
                                    </td>
                                </tr>
                            ) : (
                                filteredSources.map((source, index) => (
                                    <tr key={source._id} className="hover-wave-row hover:bg-[#131619] transition-colors">
                                        <td className="px-4 py-3 text-white">{index + 1}</td>
                                        <td className="px-4 py-3 text-white font-medium">{source.sourceName}</td>
                                        <td className="px-4 py-3 text-gray-400">{source.source}</td>
                                        <td className="px-4 py-3 text-gray-400">{source.subSource}</td>
                                        <td className="px-4 py-3 text-gray-400">{source.sourceType || "N/A"}</td>
                                        <td className="px-4 py-3">
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
                />
            )}
        </div>
    );
};

export default SourceContent;
