import React, { useState, useEffect } from "react";
import Layout from "../../../components/Layout";
import { FaEdit, FaTrash, FaPlus, FaSearch, FaLayerGroup } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { hasPermission } from "../../../config/permissions";
import { useTheme } from "../../../context/ThemeContext";
import ExcelImportExport from "../../../components/common/ExcelImportExport";
import * as XLSX from "xlsx";

const ClassList = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
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
            <div className={`p-6 min-h-screen font-sans transition-colors duration-300 ${isDarkMode ? 'text-gray-100 bg-[#131619]' : 'text-gray-900 bg-[#f8fafc]'}`}>
                <ToastContainer theme={theme} position="top-right" />

                <div className="flex justify-between items-center mb-6">
                    <h1 className={`text-3xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                        <FaLayerGroup className="text-cyan-500" /> Class Management
                    </h1>
                </div>

                {/* Controls */}
                <div className={`p-4 rounded-xl border shadow-lg mb-6 flex flex-wrap gap-4 justify-between items-center transition-colors ${isDarkMode ? 'bg-[#1e2530] border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="relative w-64">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-all focus:outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-[#131619] text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-200 shadow-sm'}`}
                        />
                    </div>

                    <div className="flex gap-2">
                        <ExcelImportExport
                            columns={classColumns}
                            data={classes}
                            onImport={handleBulkImport}
                            onExport={prepareExportData}
                            filename="Class_List"
                            isDarkMode={isDarkMode}
                        />
                        {canCreate && (
                            <button
                                onClick={openAddModal}
                                className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2 rounded-lg flex items-center gap-2 font-bold transition shadow-md shadow-cyan-600/20"
                            >
                                <FaPlus /> Add Class
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className={`rounded-xl border shadow-2xl overflow-hidden transition-colors ${isDarkMode ? 'bg-[#1e2530] border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`text-xs uppercase border-b transition-colors ${isDarkMode ? 'bg-[#131619] text-gray-400 border-gray-700' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                                <th className="p-4 font-bold tracking-wider w-24">SL NO.</th>
                                <th className="p-4 font-bold tracking-wider">Name</th>
                                <th className="p-4 font-bold tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="3" className="p-8 text-center text-gray-500">Loading...</td></tr>
                            ) : filteredClasses.length === 0 ? (
                                <tr><td colSpan="3" className="p-8 text-center text-gray-500">No classes found.</td></tr>
                            ) : (
                                filteredClasses.map((cls, index) => (
                                    <tr key={cls._id} className={`border-b transition-all duration-200 ${isDarkMode ? 'border-gray-800 hover:bg-[#2a323c]' : 'border-gray-50 hover:bg-gray-50/80'}`}>
                                        <td className={`p-4 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{index + 1}</td>
                                        <td className={`p-4 font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{cls.className}</td>
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
                    <div className={`p-4 border-t text-sm flex justify-between transition-colors ${isDarkMode ? 'border-gray-700 text-gray-400' : 'border-gray-100 text-gray-500 font-medium'}`}>
                        <span>Showing {filteredClasses.length} entries</span>
                    </div>
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 backdrop-blur-sm p-4">
                        <div className={`w-full max-w-md rounded-xl border shadow-2xl animate-fade-in transition-colors ${isDarkMode ? 'bg-[#1e2530] border-gray-700' : 'bg-white border-gray-200'}`}>
                            <div className={`p-6 border-b flex justify-between items-center ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{editId ? "Edit Class" : "Add Class"}</h2>
                                <button onClick={() => setShowModal(false)} className={`text-2xl transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>&times;</button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Class Name</label>
                                    <input
                                        type="text"
                                        required
                                        className={`w-full rounded-lg p-3 outline-none transition-all border ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-600 shadow-sm'}`}
                                        value={formData.className}
                                        onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                                        placeholder="Enter class name (e.g. Class 11)"
                                    />
                                </div>
                                <div className="flex justify-end gap-3 mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className={`px-4 py-2 rounded-lg transition font-bold ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold rounded-lg transition shadow-lg shadow-cyan-600/20"
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
