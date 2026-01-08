import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaEdit, FaTrash, FaPlus, FaTimes, FaSearch } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { hasPermission } from "../../config/permissions";

const RMList = () => {
    const [rms, setRms] = useState([]);
    const [centres, setCentres] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Permissions State
    const [canCreate, setCanCreate] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    const [canDelete, setCanDelete] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentRM, setCurrentRM] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        mobNum: "",
        employeeId: "",
        centreId: "",
        password: "" // Only for create
    });

    const API_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        setCanCreate(hasPermission(user, 'academics', 'rmList', 'create'));
        setCanEdit(hasPermission(user, 'academics', 'rmList', 'edit'));
        setCanDelete(hasPermission(user, 'academics', 'rmList', 'delete'));

        fetchRMs();
        fetchCentres();
    }, []);

    const fetchRMs = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/rm/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setRms(data);
            } else {
                toast.error("Failed to fetch RM list");
            }
        } catch (error) {
            toast.error("Error fetching RM list");
        } finally {
            setLoading(false);
        }
    };

    const fetchCentres = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/centre`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                const user = JSON.parse(localStorage.getItem("user") || "{}");
                if (user.role !== 'superAdmin' && user.centres) {
                    const filtered = data.filter(c => user.centres.includes(c._id));
                    setCentres(filtered);
                } else {
                    setCentres(data);
                }
            }
        } catch (error) {
            console.error("Error fetching centers", error);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const openModal = (rm = null) => {
        if (rm) {
            setCurrentRM(rm);
            setFormData({
                name: rm.name,
                email: rm.email,
                mobNum: rm.mobNum,
                employeeId: rm.employeeId,
                centreId: rm.centres && rm.centres.length > 0 ? rm.centres[0]._id : "",
                password: "" // Don't fill password on edit
            });
        } else {
            setCurrentRM(null);
            setFormData({
                name: "",
                email: "",
                mobNum: "",
                employeeId: "",
                centreId: "",
                password: ""
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentRM(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        const url = currentRM
            ? `${API_URL}/academics/rm/update/${currentRM._id}`
            : `${API_URL}/academics/rm/create`;
        const method = currentRM ? "PUT" : "POST";

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            const data = await response.json();

            if (response.ok) {
                toast.success(currentRM ? "RM Updated" : "RM Created");
                fetchRMs();
                closeModal();
            } else {
                toast.error(data.message || "Operation failed");
            }
        } catch (error) {
            toast.error("Server error");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this RM?")) return;

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/rm/delete/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                toast.success("RM Deleted");
                fetchRMs();
            } else {
                toast.error("Failed to delete RM");
            }
        } catch (error) {
            toast.error("Server error");
        }
    };

    // Filter Logic
    const filteredRMs = rms.filter(rm =>
        rm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rm.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout activePage="Academics">
            <div className="p-6 text-gray-100 min-h-screen font-sans">
                <ToastContainer theme="dark" position="top-right" />

                <h1 className="text-2xl font-bold text-white mb-6">RM List</h1>

                <div className="bg-[#1e2530] p-6 rounded-xl border border-gray-700 shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-300">Relationship Manager List</h2>
                        {canCreate && (
                            <button
                                onClick={() => openModal()}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition"
                            >
                                <FaPlus /> Add RM
                            </button>
                        )}
                    </div>

                    <div className="mb-4">
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><FaSearch /></span>
                            <input
                                type="text"
                                placeholder="Search by name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-[#131619] text-white pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 outline-none w-full md:w-1/3"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#8bbefa] text-black text-xs uppercase font-bold">
                                    <th className="p-3">SL NO.</th>
                                    <th className="p-3">NAME</th>
                                    <th className="p-3">EMAIL</th>
                                    <th className="p-3">CENTER</th>
                                    <th className="p-3 text-right">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700 text-sm">
                                {loading ? (
                                    <tr><td colSpan="5" className="p-8 text-center text-gray-400">Loading...</td></tr>
                                ) : filteredRMs.length === 0 ? (
                                    <tr><td colSpan="5" className="p-8 text-center text-gray-400">No Relationship Managers found</td></tr>
                                ) : (
                                    filteredRMs.map((rm, index) => (
                                        <tr key={rm._id} className="hover:bg-[#252b32] transition-colors">
                                            <td className="p-3">{index + 1}</td>
                                            <td className="p-3 font-semibold text-white">{rm.name}</td>
                                            <td className="p-3">{rm.email}</td>
                                            <td className="p-3">
                                                {rm.centres && rm.centres.length > 0 ? rm.centres.map(c => c.centreName).join(", ") : "-"}
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex justify-end gap-3">
                                                    {canEdit && (
                                                        <button onClick={() => openModal(rm)} className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                                            <FaEdit /> Edit
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button onClick={() => handleDelete(rm._id)} className="text-red-400 hover:text-red-300 flex items-center gap-1">
                                                            <FaTrash /> Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination (Visual only for now since we are filtering client side) */}
                    <div className="flex justify-between items-center mt-4 text-sm text-gray-400">
                        <div>Showing {filteredRMs.length} entries</div>
                        <div className="flex gap-1">
                            <button className="px-3 py-1 bg-blue-600 text-white rounded">1</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a1f24] p-6 rounded-lg w-full max-w-lg border border-gray-700 shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">
                                {currentRM ? "Edit RM" : "Add RM"}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-white">
                                <FaTimes />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                {/* Name */}
                                <div className="flex flex-col">
                                    <label className="text-gray-300 font-medium text-sm mb-2">Name*</label>
                                    <input
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="Enter RM Name"
                                        className="bg-[#2a3038] border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:border-blue-500 outline-none transition"
                                        required
                                    />
                                </div>

                                {/* Email */}
                                <div className="flex flex-col">
                                    <label className="text-gray-300 font-medium text-sm mb-2">Email*</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="abc@gmail.com"
                                        className="bg-[#2a3038] border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:border-blue-500 outline-none transition"
                                        required
                                    />
                                </div>

                                {/* Employee ID */}
                                <div className="flex flex-col">
                                    <label className="text-gray-300 font-medium text-sm mb-2">Employee Id*</label>
                                    <input
                                        name="employeeId"
                                        value={formData.employeeId}
                                        onChange={handleInputChange}
                                        placeholder="Enter ID"
                                        className="bg-[#2a3038] border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:border-blue-500 outline-none transition"
                                        required
                                    />
                                </div>

                                {/* Centre */}
                                <div className="flex flex-col">
                                    <label className="text-gray-300 font-medium text-sm mb-2">Centre*</label>
                                    <div className="relative">
                                        <select
                                            name="centreId"
                                            value={formData.centreId}
                                            onChange={handleInputChange}
                                            className="w-full bg-[#2a3038] border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:border-blue-500 outline-none appearance-none transition"
                                            required
                                        >
                                            <option value="" disabled hidden>Select a Center</option>
                                            {centres.map(c => (
                                                <option key={c._id} value={c._id}>{c.centreName || c.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-400">
                                            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg transform active:scale-95 transition-all mt-4"
                            >
                                {currentRM ? "Update RM" : "Add RM"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default RMList;