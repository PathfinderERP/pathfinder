import React, { useState, useEffect, useCallback } from "react";
import { FaPlus, FaSearch, FaEdit, FaTrash, FaMapMarkerAlt, FaPhone, FaEnvelope } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AddCentreModal from "./AddCentreModal";
import EditCentreModal from "./EditCentreModal";
import "../MasterDataWave.css";
import { hasPermission } from "../../../config/permissions";

const CentreContent = () => {
    const [centres, setCentres] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedCentre, setSelectedCentre] = useState(null);

    const apiUrl = import.meta.env.VITE_API_URL;

    // Permission checks - pass full user object for SuperAdmin support
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isSuperAdmin = user.role === "superAdmin";
    const canCreate = hasPermission(user, 'masterData', 'centre', 'create');
    const canEdit = hasPermission(user, 'masterData', 'centre', 'edit');
    const canDelete = hasPermission(user, 'masterData', 'centre', 'delete');

    const fetchCentres = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/centre`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                setCentres(data);
            } else {
                toast.error("Failed to fetch centres");
            }
        } catch (error) {
            console.error("Error fetching centres:", error);
            toast.error("Error fetching centres");
        } finally {
            setLoading(false);
        }
    }, [apiUrl]);

    useEffect(() => {
        fetchCentres();
    }, [fetchCentres]);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this centre?")) return;

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/centre/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                toast.success("Centre deleted successfully");
                fetchCentres();
            } else {
                toast.error("Failed to delete centre");
            }
        } catch (error) {
            console.error("Error deleting centre:", error);
            toast.error("Error deleting centre");
        }
    };

    const handleEdit = (centre) => {
        setSelectedCentre(centre);
        setShowEditModal(true);
    };

    const filteredCentres = centres.filter(centre =>
        centre.centreName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        centre.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        centre.enterCode.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex-1 p-6 overflow-y-auto bg-[#131619]">
            <ToastContainer position="top-right" theme="dark" />

            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Centre Management</h2>
                {canCreate && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition-colors"
                    >
                        <FaPlus /> Add Centre
                    </button>
                )}
            </div>

            <div className="bg-[#1a1f24] p-4 rounded-xl border border-gray-800 mb-6">
                <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by name, code, or location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-[#131619] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <p className="text-gray-400">Loading centres...</p>
                ) : filteredCentres.length === 0 ? (
                    <p className="text-gray-400">No centres found.</p>
                ) : (
                    filteredCentres.map((centre) => (
                        <div key={centre._id} className="master-data-card-wave bg-[#1a1f24] p-6 rounded-xl border border-gray-800 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-white">{centre.centreName}</h3>
                                    <span className="text-cyan-400 text-sm font-mono">{centre.enterCode}</span>
                                </div>
                                <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    {canEdit && (
                                        <button
                                            onClick={() => handleEdit(centre)}
                                            className="p-2 bg-gray-800 text-yellow-400 rounded hover:bg-gray-700"
                                            title="Edit"
                                        >
                                            <FaEdit />
                                        </button>
                                    )}
                                    {canDelete && (
                                        <button
                                            onClick={() => handleDelete(centre._id)}
                                            className="p-2 bg-gray-800 text-red-400 rounded hover:bg-gray-700"
                                            title="Delete"
                                        >
                                            <FaTrash />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3 text-gray-400 text-sm">
                                <div className="flex items-center gap-2">
                                    <FaMapMarkerAlt className="text-gray-500" />
                                    <span>{centre.location}, {centre.state}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FaPhone className="text-gray-500" />
                                    <span>{centre.phoneNumber}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FaEnvelope className="text-gray-500" />
                                    <span>{centre.email}</span>
                                </div>
                            </div>

                            {centre.address && (
                                <div className="mt-4 pt-4 border-t border-gray-800">
                                    <p className="text-xs text-gray-500">{centre.address}</p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {showAddModal && (
                <AddCentreModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        fetchCentres();
                    }}
                />
            )}

            {showEditModal && selectedCentre && (
                <EditCentreModal
                    centre={selectedCentre}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedCentre(null);
                    }}
                    onSuccess={() => {
                        setShowEditModal(false);
                        setSelectedCentre(null);
                        fetchCentres();
                    }}
                />
            )}
        </div>
    );
};

export default CentreContent;
