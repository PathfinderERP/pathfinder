import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaEdit, FaTrash, FaPlus, FaTimes, FaSearch } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { hasPermission } from "../../config/permissions";
import { useTheme } from "../../context/ThemeContext";

const ClassCoordinator = () => {
    const [coordinators, setCoordinators] = useState([]);
    const [centres, setCentres] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    // Permissions State
    const [canCreate, setCanCreate] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    const [canDelete, setCanDelete] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCoordinator, setCurrentCoordinator] = useState(null);
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
        setCanCreate(hasPermission(user, 'academics', 'classCoordinator', 'create'));
        setCanEdit(hasPermission(user, 'academics', 'classCoordinator', 'edit'));
        setCanDelete(hasPermission(user, 'academics', 'classCoordinator', 'delete'));

        fetchCoordinators();
        fetchCentres();
    }, []);

    const fetchCoordinators = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/coordinator/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setCoordinators(data);
            } else {
                toast.error("Failed to fetch Class Coordinator list");
            }
        } catch (error) {
            toast.error("Error fetching Class Coordinator list");
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

    const openModal = (coordinator = null) => {
        if (coordinator) {
            setCurrentCoordinator(coordinator);
            setFormData({
                name: coordinator.name,
                email: coordinator.email,
                mobNum: coordinator.mobNum,
                employeeId: coordinator.employeeId,
                centreId: coordinator.centres && coordinator.centres.length > 0 ? coordinator.centres[0]._id : "",
                password: "" // Don't fill password on edit
            });
        } else {
            setCurrentCoordinator(null);
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
        setCurrentCoordinator(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        const url = currentCoordinator
            ? `${API_URL}/academics/coordinator/update/${currentCoordinator._id}`
            : `${API_URL}/academics/coordinator/create`;
        const method = currentCoordinator ? "PUT" : "POST";

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
                toast.success(currentCoordinator ? "Coordinator Updated" : "Coordinator Created");
                fetchCoordinators();
                closeModal();
            } else {
                toast.error(data.message || "Operation failed");
            }
        } catch (error) {
            toast.error("Server error");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this coordinator?")) return;

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/coordinator/delete/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                toast.success("Coordinator Deleted");
                fetchCoordinators();
            } else {
                toast.error("Failed to delete coordinator");
            }
        } catch (error) {
            toast.error("Server error");
        }
    };

    // Filter Logic
    const filteredCoordinators = coordinators.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout activePage="Academics">
            <div className={`p-6 min-h-screen font-sans transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900 bg-[#f8fafc]'}`}>
                <ToastContainer theme={theme} position="top-right" />

                <h1 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Class Coordinator List</h1>

                <div className={`${isDarkMode ? 'bg-[#1e2530] border-gray-700 shadow-2xl' : 'bg-white border-gray-200 shadow-md'} p-6 rounded-xl border transition-colors`}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className={`text-xl font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Class Coordinator List</h2>
                        {canCreate && (
                            <button
                                onClick={() => openModal()}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition"
                            >
                                <FaPlus /> Add Coordinator
                            </button>
                        )}
                    </div>

                    <div className="mb-4">
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><FaSearch /></span>
                            <input
                                type="text"
                                placeholder="Search by name, email, or employee ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`pl-10 pr-4 py-2 rounded-lg border focus:border-blue-500 outline-none w-full md:w-1/3 transition-all ${isDarkMode ? 'bg-[#131619] text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`${isDarkMode ? 'bg-[#8bbefa] text-black' : 'bg-blue-600 text-white'} text-xs uppercase font-bold`}>
                                    <th className="p-3">SL NO.</th>
                                    <th className="p-3">NAME</th>
                                    <th className="p-3">EMP ID</th>
                                    <th className="p-3">EMAIL</th>
                                    <th className="p-3">CENTRES</th>
                                    <th className="p-3 text-right">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y text-sm ${isDarkMode ? 'divide-gray-700 bg-[#1e2530]/50' : 'divide-gray-100 bg-white'}`}>
                                {loading ? (
                                    <tr><td colSpan="6" className="p-8 text-center text-gray-400">Loading...</td></tr>
                                ) : filteredCoordinators.length === 0 ? (
                                    <tr><td colSpan="6" className="p-8 text-center text-gray-400">No Class Coordinators found</td></tr>
                                ) : (
                                    filteredCoordinators.map((c, index) => (
                                        <tr key={c._id} className={`transition-colors ${isDarkMode ? 'hover:bg-[#252b32] text-gray-300' : 'hover:bg-gray-50 text-gray-600'}`}>
                                            <td className="p-3">{index + 1}</td>
                                            <td className={`p-3 font-semibold uppercase ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{c.name}</td>
                                            <td className={`p-3 font-mono ${isDarkMode ? 'text-cyan-400' : 'text-blue-600 font-bold'}`}>{c.employeeId}</td>
                                            <td className="p-3">{c.email}</td>
                                            <td className="p-3">
                                                {c.centres && c.centres.length > 0 ? c.centres.map(centre => centre.centreName).join(", ") : "-"}
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex justify-end gap-3">
                                                    {canEdit && (
                                                        <button onClick={() => openModal(c)} className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                                            <FaEdit /> Edit
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button onClick={() => handleDelete(c._id)} className="text-red-400 hover:text-red-300 flex items-center gap-1">
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
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200'} p-8 rounded-2xl w-full max-w-lg border shadow-2xl`}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className={`text-2xl font-black uppercase italic tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {currentCoordinator ? "Edit Coordinator" : "Add Coordinator"}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-white text-2xl">
                                <FaTimes />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                {/* Name */}
                                <div className="flex flex-col">
                                    <label className={`font-medium text-xs uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Name*</label>
                                    <input
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="Enter Name"
                                        className={`rounded-xl p-3 outline-none transition-all border ${isDarkMode ? 'bg-[#2a3038] border-gray-600 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-600 shadow-sm'}`}
                                        required
                                    />
                                </div>

                                {/* Email */}
                                <div className="flex flex-col">
                                    <label className={`font-medium text-xs uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Email*</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="abc@gmail.com"
                                        className={`rounded-xl p-3 outline-none transition-all border ${isDarkMode ? 'bg-[#2a3038] border-gray-600 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-600 shadow-sm'}`}
                                        required
                                    />
                                </div>

                                {/* Employee ID */}
                                <div className="flex flex-col">
                                    <label className={`font-medium text-xs uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Employee Id*</label>
                                    <input
                                        name="employeeId"
                                        value={formData.employeeId}
                                        onChange={handleInputChange}
                                        placeholder="Enter ID"
                                        className={`rounded-xl p-3 outline-none transition-all border ${isDarkMode ? 'bg-[#2a3038] border-gray-600 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-600 shadow-sm'}`}
                                        required
                                    />
                                </div>

                                {/* Phone */}
                                <div className="flex flex-col">
                                    <label className={`font-medium text-xs uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Phone</label>
                                    <input
                                        name="mobNum"
                                        value={formData.mobNum}
                                        onChange={handleInputChange}
                                        placeholder="Enter Phone"
                                        className={`rounded-xl p-3 outline-none transition-all border ${isDarkMode ? 'bg-[#2a3038] border-gray-600 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-600 shadow-sm'}`}
                                    />
                                </div>

                                {/* Centre */}
                                <div className="flex flex-col col-span-2">
                                    <label className={`font-medium text-xs uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Centre*</label>
                                    <div className="relative">
                                        <select
                                            name="centreId"
                                            value={formData.centreId}
                                            onChange={handleInputChange}
                                            className={`w-full rounded-xl p-3 outline-none appearance-none transition-all border ${isDarkMode ? 'bg-[#2a3038] border-gray-600 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-600 shadow-sm'}`}
                                            required
                                        >
                                            <option value="" disabled hidden>Select a Center</option>
                                            {centres.map(c => (
                                                <option key={c._id} value={c._id}>{c.centreName || c.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
                                            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                                        </div>
                                    </div>
                                </div>

                                {!currentCoordinator && (
                                    <div className="flex flex-col col-span-2">
                                        <label className={`font-medium text-xs uppercase tracking-widest mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Password*</label>
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            placeholder="Enter Password"
                                            className={`rounded-xl p-3 outline-none transition-all border ${isDarkMode ? 'bg-[#2a3038] border-gray-600 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-600 shadow-sm'}`}
                                            required={!currentCoordinator}
                                        />
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg transform active:scale-95 transition-all mt-4"
                            >
                                {currentCoordinator ? "Update Coordinator" : "Add Coordinator"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default ClassCoordinator;