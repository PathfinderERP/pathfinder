import React, { useState, useEffect } from "react";
import Layout from "../../../components/Layout";
import { FaPlus, FaEdit, FaTrash, FaSpinner } from "react-icons/fa";
import { toast } from "react-toastify";

const LeaveType = () => {
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingType, setEditingType] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        days: "",
        designations: []
    });

    useEffect(() => {
        fetchLeaveTypes();
        fetchDesignations();
    }, []);

    const fetchLeaveTypes = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/attendance/leave-types`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setLeaveTypes(data);
            }
        } catch (error) {
            toast.error("Failed to load leave types");
        } finally {
            setLoading(false);
        }
    };

    const fetchDesignations = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/designation`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            console.log("Designation response status:", response.status);
            if (response.ok) {
                const data = await response.json();
                console.log("Fetched designations:", data);
                setDesignations(data);
            } else {
                console.error("Failed to fetch designations:", response.statusText);
            }
        } catch (error) {
            console.error("Designations error:", error);
            toast.error("Failed to load designations");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const url = editingType
                ? `${import.meta.env.VITE_API_URL}/hr/attendance/leave-types/${editingType._id}`
                : `${import.meta.env.VITE_API_URL}/hr/attendance/leave-types`;
            const method = editingType ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                toast.success(editingType ? "Leave type updated" : "Leave type added");
                setShowModal(false);
                setEditingType(null);
                setFormData({ name: "", days: "", designations: [] });
                fetchLeaveTypes();
            }
        } catch (error) {
            toast.error("Error saving leave type");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this leave type?")) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/attendance/leave-types/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success("Deleted successfully");
                fetchLeaveTypes();
            }
        } catch (error) {
            toast.error("Error deleting");
        }
    };

    return (
        <Layout activePage="HR & Manpower">
            <div className="p-6 space-y-6 animate-fade-in">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Leave List</h1>
                    </div>
                    <button
                        onClick={() => {
                            setEditingType(null);
                            setFormData({ name: "", days: "", designations: [] });
                            setShowModal(true);
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 font-bold text-sm"
                    >
                        <FaPlus size={14} /> Add
                    </button>
                </div>

                <div className="bg-white dark:bg-[#1a1f24] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Sl no.</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Days</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Designation</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-10 text-center text-blue-600"><FaSpinner className="animate-spin mx-auto" size={30} /></td>
                                    </tr>
                                ) : leaveTypes.length > 0 ? (
                                    leaveTypes.map((type, index) => (
                                        <tr key={type._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-400">{index + 1}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-800 dark:text-white">{type.name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{type.days}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                {type.designations && type.designations.length > 0
                                                    ? type.designations.map(d => d.name).join(', ')
                                                    : "All Designations"}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => {
                                                        setEditingType(type);
                                                        setFormData({
                                                            name: type.name,
                                                            days: type.days,
                                                            designations: type.designations?.map(d => d._id) || []
                                                        });
                                                        setShowModal(true);
                                                    }} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg"><FaEdit size={14} /></button>
                                                    <button onClick={() => handleDelete(type._id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"><FaTrash size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-500 italic text-sm">No leave types defined</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-[#2a3038] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Add Type Of Leave</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white transition-colors">
                                <FaPlus size={20} className="rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Enter Name*</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Name"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none dark:text-white text-sm placeholder:text-gray-400"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Enter Days*</label>
                                <input
                                    type="number"
                                    required
                                    value={formData.days}
                                    onChange={(e) => setFormData({ ...formData, days: e.target.value })}
                                    placeholder="Days"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none dark:text-white text-sm placeholder:text-gray-400"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Designation Select one or more *</label>
                                <div className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg max-h-40 overflow-y-auto space-y-2">
                                    {designations.length === 0 ? (
                                        <p className="text-sm text-gray-400 italic">No designations found. Please add designations first.</p>
                                    ) : (
                                        designations.map(d => (
                                            <label key={d._id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg cursor-pointer transition-colors">
                                                <input
                                                    type="checkbox"
                                                    value={d._id}
                                                    checked={formData.designations.includes(d._id)}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        const newDesignations = e.target.checked
                                                            ? [...formData.designations, value]
                                                            : formData.designations.filter(id => id !== value);
                                                        setFormData({ ...formData, designations: newDesignations });
                                                    }}
                                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-200">{d.name}</span>
                                            </label>
                                        ))
                                    )}
                                </div>
                                {formData.designations.length > 0 && (
                                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                        {formData.designations.length} designation(s) selected
                                    </p>
                                )}
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium text-sm transition-all"
                                >
                                    Add
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default LeaveType;
