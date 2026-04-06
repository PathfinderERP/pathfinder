import Layout from "../../components/Layout";
import Select from "react-select";
import { FaEdit, FaTrash, FaPlus, FaTimes, FaSearch, FaFilter, FaSync } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { hasPermission } from "../../config/permissions";
import { useTheme } from "../../context/ThemeContext";

const RMList = () => {
    const [rms, setRms] = useState([]);
    const [centres, setCentres] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCentres, setSelectedCentres] = useState([]);
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    const customSelectStyles = {
        control: (base, state) => ({
            ...base,
            backgroundColor: isDarkMode ? "#131619" : "#f8fafc",
            borderColor: state.isFocused ? "#3b82f6" : isDarkMode ? "#374151" : "#d1d5db",
            padding: "2px",
            boxShadow: "none",
            "&:hover": { borderColor: "#3b82f6" }
        }),
        menu: (base, state) => ({
            ...base,
            backgroundColor: isDarkMode ? "#1e2530" : "white",
            zIndex: 50
        }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isFocused ? (isDarkMode ? "#2d3748" : "#edf2f7") : "transparent",
            color: isDarkMode ? "white" : "black",
            "&:active": { backgroundColor: "#3b82f6" }
        }),
        multiValue: (base) => ({
            ...base,
            backgroundColor: isDarkMode ? "#2d3748" : "#e2e8f0",
        }),
        multiValueLabel: (base) => ({
            ...base,
            color: isDarkMode ? "white" : "black",
        }),
        multiValueRemove: (base) => ({
            ...base,
            color: isDarkMode ? "#a0aec0" : "#718096",
            "&:hover": { backgroundColor: "#f56565", color: "white" }
        }),
        singleValue: (base) => ({
            ...base,
            color: isDarkMode ? "white" : "black",
        }),
        input: (base) => ({
            ...base,
            color: isDarkMode ? "white" : "black",
        })
    };

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

    const fetchRMs = useCallback(async () => {
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
            console.error("Fetch RMs error:", error);
            toast.error("Error fetching RM list");
        } finally {
            setLoading(false);
        }
    }, [API_URL]);

    const fetchCentres = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/centre`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                const user = JSON.parse(localStorage.getItem("user") || "{}");
                if (user.role !== 'superAdmin' && user.centres) {
                    const userCentreIds = user.centres.map(c => (c._id || c).toString());
                    const filtered = data.filter(c => userCentreIds.includes(c._id.toString()));
                    setCentres(filtered);
                } else {
                    setCentres(data);
                }
            }
        } catch (error) {
            console.error("Error fetching centers", error);
        }
    }, [API_URL]);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        setCanCreate(hasPermission(user, 'academics', 'rmList', 'create'));
        setCanEdit(hasPermission(user, 'academics', 'rmList', 'edit'));
        setCanDelete(hasPermission(user, 'academics', 'rmList', 'delete'));

        fetchRMs();
        fetchCentres();
    }, [fetchRMs, fetchCentres]);

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
            console.error("Submit error:", error);
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
                const data = await response.json();
                toast.error(data.message || "Failed to delete RM");
            }
        } catch (error) {
            toast.error("Server error");
        }
    };

    // Filter Logic
    const filteredRMs = rms.filter(rm => {
        const matchesSearch = 
            rm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rm.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (rm.employeeId && rm.employeeId.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const centreValues = selectedCentres.map(v => v.value);
        const matchesCentre = centreValues.length === 0 || (
            rm.centres && rm.centres.some(c => centreValues.includes(c._id.toString()))
        );
        
        return matchesSearch && matchesCentre;
    });

    const centreOptions = centres.map(c => ({ value: c._id.toString(), label: c.centreName }));

    return (
        <Layout activePage="Academics">
            <div className={`p-6 min-h-screen font-sans transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900 bg-[#f8fafc]'}`}>
                <ToastContainer theme={theme} position="top-right" />

                <div className="flex justify-between items-center mb-6">
                    <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>RM List</h1>
                    {canCreate && (
                        <button
                            onClick={() => openModal()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-bold shadow-lg shadow-blue-900/40 transition-all uppercase text-sm"
                        >
                            <FaPlus /> Add RM
                        </button>
                    )}
                </div>

                {/* Filters Panel */}
                <div className={`${isDarkMode ? 'bg-[#1e2530] border-gray-700 shadow-2xl' : 'bg-white border-gray-200 shadow-md'} p-6 rounded-xl border mb-6`}>
                    <div className="flex items-center justify-between mb-6 border-b pb-4 border-gray-800/20">
                        <div className="flex items-center gap-2 text-cyan-400">
                            <FaFilter /> <span className="font-bold text-xs uppercase tracking-widest italic">Filter Records</span>
                        </div>
                        <button 
                            onClick={() => { setSearchTerm(""); setSelectedCentres([]); }}
                            className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-red-500 transition-colors flex items-center gap-1"
                        >
                            <FaSync /> Reset Filters
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 ml-1">Search RM</label>
                            <div className="relative group">
                                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search by name, email, ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-600'}`}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 ml-1">Centre</label>
                            <Select
                                isMulti
                                isSearchable
                                placeholder="Filter by Centres"
                                options={centreOptions}
                                value={selectedCentres}
                                onChange={setSelectedCentres}
                                styles={customSelectStyles}
                            />
                        </div>
                    </div>
                </div>

                <div className={`${isDarkMode ? 'bg-[#1e2530] border-gray-700 shadow-2xl' : 'bg-white border-gray-200 shadow-md'} rounded-xl border overflow-hidden`}>
                    <div className="p-6 border-b border-gray-800/20 flex justify-between items-center">
                        <h2 className={`text-xl font-bold italic uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Relationship Manager Directory</h2>
                        <span className="text-[10px] font-black bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full border border-cyan-500/20">
                            TOTAL: {filteredRMs.length}
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`${isDarkMode ? 'bg-[#8bbefa] text-black' : 'bg-blue-100 text-blue-900'} text-xs uppercase font-bold`}>
                                    <th className="p-3">SL NO.</th>
                                    <th className="p-3">NAME</th>
                                    <th className="p-3">EMAIL</th>
                                    <th className="p-3">CENTER</th>
                                    <th className="p-3 text-right">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y text-sm ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                                {loading ? (
                                    <tr><td colSpan="5" className="p-8 text-center text-gray-400">Loading...</td></tr>
                                ) : filteredRMs.length === 0 ? (
                                    <tr><td colSpan="5" className="p-8 text-center text-gray-400">No Relationship Managers found</td></tr>
                                ) : (
                                    filteredRMs.map((rm, index) => (
                                        <tr key={rm._id} className={`transition-colors ${isDarkMode ? 'hover:bg-[#252b32]' : 'hover:bg-gray-50'}`}>
                                            <td className="p-3">{index + 1}</td>
                                            <td className={`p-3 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{rm.name}</td>
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
                    <div className={`flex justify-between items-center mt-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <div>Showing {filteredRMs.length} entries</div>
                        <div className="flex gap-1">
                            <button className="px-3 py-1 bg-blue-600 text-white rounded">1</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-700 shadow-xl' : 'bg-white border-gray-200 shadow-2xl'} p-6 rounded-lg w-full max-w-lg border`}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
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
                                    <label className={`font-medium text-sm mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Name*</label>
                                    <input
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="Enter RM Name"
                                        className={`border rounded-lg p-3 text-white placeholder-gray-500 focus:border-blue-500 outline-none transition ${isDarkMode ? 'bg-[#2a3038] border-gray-600' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                                        required
                                    />
                                </div>

                                {/* Email */}
                                <div className="flex flex-col">
                                    <label className={`font-medium text-sm mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email*</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="abc@gmail.com"
                                        className={`border rounded-lg p-3 text-white placeholder-gray-500 focus:border-blue-500 outline-none transition ${isDarkMode ? 'bg-[#2a3038] border-gray-600' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                                        required
                                    />
                                </div>

                                {/* Employee ID */}
                                <div className="flex flex-col">
                                    <label className={`font-medium text-sm mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Employee Id*</label>
                                    <input
                                        name="employeeId"
                                        value={formData.employeeId}
                                        onChange={handleInputChange}
                                        placeholder="Enter ID"
                                        className={`border rounded-lg p-3 text-white placeholder-gray-500 focus:border-blue-500 outline-none transition ${isDarkMode ? 'bg-[#2a3038] border-gray-600' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                                        required
                                    />
                                </div>

                                {/* Centre */}
                                <div className="flex flex-col">
                                    <label className={`font-medium text-sm mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Centre*</label>
                                    <div className="relative">
                                        <select
                                            name="centreId"
                                            value={formData.centreId}
                                            onChange={handleInputChange}
                                            className={`w-full border rounded-lg p-3 placeholder-gray-500 focus:border-blue-500 outline-none appearance-none transition ${isDarkMode ? 'bg-[#2a3038] border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
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