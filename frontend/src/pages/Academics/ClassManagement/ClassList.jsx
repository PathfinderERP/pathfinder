import React, { useState, useEffect } from "react";
import Layout from "../../../components/Layout";
import { FaEdit, FaTrash, FaPlus, FaSearch, FaLayerGroup } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { hasPermission } from "../../../config/permissions";
import ExcelImportExport from "../../../components/common/ExcelImportExport";
import * as XLSX from "xlsx";

const ClassList = () => {
    // ... [existing state]

    const classColumns = ["Name"];

    const classMapping = {
        "Name": "className",
        "name": "className",
        "Class Name": "className",
        "CLASS NAME": "className"
    };

    const handleBulkImport = async (data) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/class/bulk-import`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(data.map(row => ({
                    className: row['Name'] || row['name'] || row['Class Name'] || Object.values(row)[0] // Loose mapping
                })))
            });

            const result = await response.json();
            if (response.ok) {
                toast.success(`Imported: ${result.results.successCount}, Failed: ${result.results.failedCount}`);
                if (result.results.errors.length > 0) {
                    console.error("Import Errors:", result.results.errors);
                    toast.warn("Check console for import details/errors");
                }
                fetchClasses();
            } else {
                toast.error(result.message || "Import failed");
            }
        } catch (error) {
            toast.error("Error during import");
        }
    };

    const prepareExportData = () => {
        return classes.map(c => ({
            "Name": c.className
        }));
    };
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ className: "" });
    const [editId, setEditId] = useState(null);

    const API_URL = import.meta.env.VITE_API_URL;
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    // Permissions
    const canCreate = hasPermission(user, "academics", "classManagement", "create");
    const canEdit = hasPermission(user, "academics", "classManagement", "edit");
    const canDelete = hasPermission(user, "academics", "classManagement", "delete");

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/class/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setClasses(data);
            } else {
                toast.error("Failed to fetch classes");
            }
        } catch (error) {
            toast.error("Error fetching classes");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (cls) => {
        if (!canEdit) return toast.error("Permission denied");
        setFormData({ className: cls.className });
        setEditId(cls._id);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!canDelete) return toast.error("Permission denied");
        if (!window.confirm("Are you sure you want to delete this class?")) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/class/delete/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success("Class deleted successfully");
                fetchClasses();
            } else {
                toast.error("Failed to delete class");
            }
        } catch (error) {
            toast.error("Server error");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const url = editId
                ? `${API_URL}/academics/class/update/${editId}`
                : `${API_URL}/academics/class/create`;
            const method = editId ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (response.ok) {
                toast.success(editId ? "Class updated" : "Class created");
                setShowModal(false);
                setFormData({ className: "" });
                setEditId(null);
                fetchClasses();
            } else {
                toast.error(data.message || "Operation failed");
            }
        } catch (error) {
            toast.error("Server error");
        }
    };

    const openAddModal = () => {
        if (!canCreate) return toast.error("Permission denied");
        setFormData({ className: "" });
        setEditId(null);
        setShowModal(true);
    };

    const filteredClasses = classes.filter(c =>
        c.className.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout activePage="Academics">
            <div className="p-6 text-gray-100 min-h-screen font-sans">
                <ToastContainer theme="dark" position="top-right" />

                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                        <FaLayerGroup /> Class Management
                    </h1>
                </div>

                {/* Controls */}
                <div className="bg-[#1e2530] p-4 rounded-xl border border-gray-700 shadow-lg mb-6 flex justify-between items-center">
                    <div className="relative w-64">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#131619] text-white pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500 transition-colors"
                        />
                    </div>

                    <div className="flex gap-2">
                        <ExcelImportExport
                            columns={classColumns}
                            data={classes}
                            onImport={handleBulkImport}
                            onExport={prepareExportData}
                            filename="Class_List"
                        />
                        {canCreate && (
                            <button
                                onClick={openAddModal}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold transition shadow-md"
                            >
                                <FaPlus /> Add Class
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-[#1e2530] rounded-xl border border-gray-700 shadow-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#131619] text-gray-400 text-xs uppercase border-b border-gray-700">
                                <th className="p-4 font-semibold w-24">SL NO.</th>
                                <th className="p-4 font-semibold">NAME</th>
                                <th className="p-4 font-semibold text-right">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="3" className="p-8 text-center text-gray-500">Loading...</td></tr>
                            ) : filteredClasses.length === 0 ? (
                                <tr><td colSpan="3" className="p-8 text-center text-gray-500">No classes found.</td></tr>
                            ) : (
                                filteredClasses.map((cls, index) => (
                                    <tr key={cls._id} className="border-b border-gray-800 hover:bg-[#2a323c] transition-all duration-200">
                                        <td className="p-4 text-gray-300">{index + 1}</td>
                                        <td className="p-4 font-bold text-white">{cls.className}</td>
                                        <td className="p-4 flex gap-4 justify-end">
                                            {canEdit && (
                                                <button
                                                    onClick={() => handleEdit(cls)}
                                                    className="text-yellow-400 hover:text-yellow-300 flex items-center gap-1 transition-colors"
                                                >
                                                    <FaEdit /> Edit
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button
                                                    onClick={() => handleDelete(cls._id)}
                                                    className="text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                                                >
                                                    <FaTrash /> Delete
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    <div className="p-4 border-t border-gray-700 text-gray-400 text-sm flex justify-between">
                        <span>Showing {filteredClasses.length} entries</span>
                    </div>
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 backdrop-blur-sm p-4">
                        <div className="bg-[#1e2530] w-full max-w-md rounded-xl border border-gray-700 shadow-2xl animate-fade-in">
                            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-white">{editId ? "Edit Class" : "Add Class"}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-gray-400 text-sm font-semibold mb-2">Class Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-[#131619] border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none"
                                        value={formData.className}
                                        onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                                        placeholder="Enter class name (e.g. Class 11)"
                                    />
                                </div>
                                <div className="flex justify-end gap-3 mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition shadow-lg"
                                    >
                                        {editId ? "Update" : "Add"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default ClassList;
