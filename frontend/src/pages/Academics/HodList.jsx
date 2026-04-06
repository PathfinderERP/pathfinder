import Layout from "../../components/Layout";
import Select from "react-select";
import { FaSearch, FaFilter, FaSync } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTheme } from "../../context/ThemeContext";

const HodList = () => {
    const [hods, setHods] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterSubjects, setFilterSubjects] = useState([]);
    const [filterDesignations, setFilterDesignations] = useState([]);
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
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

    const getOptions = (key) => {
        const unique = [...new Set(hods.map(h => h[key]))].filter(Boolean);
        return unique.map(val => ({ value: val, label: val }));
    };

    const subjectOptions = getOptions('subject');
    const designationOptions = getOptions('designation');

    // Filter Logic
    const filteredHods = hods.filter(hod => {
        const matchesSearch = 
            hod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            hod.email.toLowerCase().includes(searchTerm.toLowerCase());
        
        const subValues = filterSubjects.map(v => v.value);
        const matchesSubject = subValues.length === 0 || subValues.includes(hod.subject);
        
        const desigValues = filterDesignations.map(v => v.value);
        const matchesDesignation = desigValues.length === 0 || desigValues.includes(hod.designation);
        
        return matchesSearch && matchesSubject && matchesDesignation;
    });

    // Pagination Logic
    const totalRecords = filteredHods.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const paginatedHods = filteredHods.slice((page - 1) * limit, page * limit);

    return (
        <Layout activePage="Academics">
            <div className={`p-6 min-h-screen font-sans transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900 bg-[#f8fafc]'}`}>
                <ToastContainer theme={theme} position="top-right" />

                <h1 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Hod List</h1>

                <div className={`${isDarkMode ? 'bg-[#1e2530] border-gray-700 shadow-2xl' : 'bg-white border-gray-200 shadow-md'} p-6 rounded-xl border mb-6`}>
                    <div className="flex items-center justify-between mb-6 border-b pb-4 border-gray-800/20">
                        <div className="flex items-center gap-2 text-cyan-400">
                            <FaFilter /> <span className="font-bold text-xs uppercase tracking-widest italic">Filter HODs</span>
                        </div>
                        <button 
                            onClick={() => {
                                setSearchTerm("");
                                setFilterSubjects([]);
                                setFilterDesignations([]);
                            }}
                            className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-red-500 transition-colors flex items-center gap-1"
                        >
                            <FaSync /> Reset Filters
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex flex-col">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 ml-1">Search HOD</label>
                            <div className="relative group">
                                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search by name, email..."
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                                    className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-600'}`}
                                />
                            </div>
                        </div>
                        
                        <div className="flex flex-col">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 ml-1">Subject</label>
                            <Select
                                isMulti
                                isSearchable
                                placeholder="All Subjects"
                                options={subjectOptions}
                                value={filterSubjects}
                                onChange={(selected) => { setFilterSubjects(selected); setPage(1); }}
                                styles={customSelectStyles}
                            />
                        </div>

                        <div className="flex flex-col">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 ml-1">Designation</label>
                            <Select
                                isMulti
                                isSearchable
                                placeholder="All Designations"
                                options={designationOptions}
                                value={filterDesignations}
                                onChange={(selected) => { setFilterDesignations(selected); setPage(1); }}
                                styles={customSelectStyles}
                            />
                        </div>
                    </div>
                </div>

                <div className={`${isDarkMode ? 'bg-[#1e2530] border-gray-700 shadow-2xl' : 'bg-white border-gray-200 shadow-md'} rounded-xl border`}>
                    <div className="p-6 border-b border-gray-800/20 flex justify-between items-center">
                        <h2 className={`text-xl font-bold italic uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>HOD Directory</h2>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full border border-cyan-500/20">
                                TOTAL: {totalRecords}
                            </span>
                            <select
                                value={limit}
                                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                                className={`px-3 py-1 rounded-lg border text-xs focus:border-blue-500 outline-none transition-all ${isDarkMode ? 'bg-[#131619] text-white border-gray-700' : 'bg-gray-50 text-gray-900 border-gray-300'}`}
                            >
                                <option value="10">10 entries</option>
                                <option value="20">20 entries</option>
                                <option value="50">50 entries</option>
                            </select>
                        </div>
                    </div>

                    <div className={`overflow-x-auto rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`${isDarkMode ? 'bg-[#6b7b9c] text-white' : 'bg-[#e2e8f0] text-gray-700'} text-xs uppercase font-bold`}>
                                    <th className="p-3">SL NO.</th>
                                    <th className="p-3">NAME ↑</th>
                                    <th className="p-3">EMAIL</th>
                                    <th className="p-3">MOBILE</th>
                                    <th className="p-3">SUBJECT</th>
                                    <th className="p-3">DESIGNATION</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y text-sm ${isDarkMode ? 'divide-gray-700 bg-[#1e2530]' : 'divide-gray-200 bg-white'}`}>
                                {loading ? (
                                    <tr><td colSpan="6" className="p-8 text-center text-gray-400">Loading...</td></tr>
                                ) : paginatedHods.length === 0 ? (
                                    <tr><td colSpan="6" className="p-8 text-center text-gray-400">No HODs found</td></tr>
                                ) : (
                                    paginatedHods.map((hod, index) => (
                                        <tr key={hod._id} className={`transition-colors ${isDarkMode ? 'hover:bg-[#252b32]' : 'hover:bg-gray-50'}`}>
                                            <td className={`p-3 border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>{(page - 1) * limit + index + 1}</td>
                                            <td className={`p-3 border-r font-semibold uppercase ${isDarkMode ? 'text-white border-gray-700' : 'text-gray-900 border-gray-200'}`}>{hod.name}</td>
                                            <td className={`p-3 border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>{hod.email}</td>
                                            <td className={`p-3 border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>{hod.mobNum}</td>
                                            <td className={`p-3 border-r uppercase ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>{hod.subject || "-"}</td>
                                            <td className="p-3 uppercase">{hod.designation || "-"}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className={`flex justify-between items-center mt-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
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