import Layout from "../../components/Layout";
import Select from "react-select";
import { FaPlus, FaSearch, FaEdit, FaTrash, FaSync, FaChevronLeft, FaChevronRight, FaClock, FaLocationArrow, FaBookOpen, FaUserTie, FaCalendarAlt, FaTimes } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import usePermission from "../../hooks/usePermission";
import ExcelImportExport from "../../components/common/ExcelImportExport";
import { useTheme } from "../../context/ThemeContext";

const API_URL = import.meta.env.VITE_API_URL;
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const routineColumns = [
    { header: "Teacher Name", key: "teacherName" },
    { header: "Employee ID", key: "employeeId" },
    { header: "Email", key: "email" },
    { header: "Mobile", key: "mobNum" },
    { header: "Monday", key: "Monday" },
    { header: "Tuesday", key: "Tuesday" },
    { header: "Wednesday", key: "Wednesday" },
    { header: "Thursday", key: "Thursday" },
    { header: "Friday", key: "Friday" },
    { header: "Saturday", key: "Saturday" },
    { header: "Sunday", key: "Sunday" }
];

const routineMapping = {
    "Teacher Name": "teacherName",
    "Employee ID": "employeeId",
    "Email": "email",
    "Mobile": "mobNum",
    "Monday": "Monday",
    "Tuesday": "Tuesday",
    "Wednesday": "Wednesday",
    "Thursday": "Thursday",
    "Friday": "Friday",
    "Saturday": "Saturday",
    "Sunday": "Sunday"
};


const TeacherRoutineSchedule = () => {

    const [groupedData, setGroupedData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(8);

    // Permissions
    const canCreate = usePermission('academics', 'teacherRoutine', 'create');
    const canEdit = usePermission('academics', 'teacherRoutine', 'edit');
    const canDelete = usePermission('academics', 'teacherRoutine', 'delete');

    // Filter States
    const [filterCentres, setFilterCentres] = useState([]);
    const [filterTeachers, setFilterTeachers] = useState([]);
    const [filterSubjects, setFilterSubjects] = useState([]);
    const [filterDays, setFilterDays] = useState([]);
    const [filterEmploymentType, setFilterEmploymentType] = useState([]);
    const [filterTime, setFilterTime] = useState({ start: "", end: "" });

    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState(null);
    const [centres, setCentres] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [classes, setClasses] = useState([]);
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    const [formData, setFormData] = useState({
        teacherId: "",
        centreId: [], // Now array
        day: "",
        startTime: "",
        endTime: "",
        classId: [], 
        subjectId: [], 
        amount: 0,
        classHours: 0,
        className: "" // New field
    });

    const fetchGroupedRoutines = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/teacher-routine/grouped`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setGroupedData(data);
            } else {
                toast.error(data.message || "Failed to fetch routines");
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            toast.error("Error fetching routines");
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchInitialData = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const [centresRes, teachersRes, subjectsRes, classesRes] = await Promise.all([
                fetch(`${API_URL}/centre`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_URL}/academics/teacher/list`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_URL}/subject`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_URL}/class`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (centresRes.ok) setCentres(await centresRes.json());
            if (teachersRes.ok) setTeachers(await teachersRes.json());
            if (subjectsRes.ok) setSubjects(await subjectsRes.json());
            if (classesRes.ok) setClasses(await classesRes.json());
        } catch (err) {
            console.error("Fetch Initial Data Error:", err);
        }
    }, []);

    useEffect(() => {
        fetchGroupedRoutines();
        fetchInitialData();
    }, [fetchGroupedRoutines, fetchInitialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const customSelectStyles = {
        control: (base, state) => ({
            ...base,
            backgroundColor: isDarkMode ? "#131619" : "#f8fafc",
            borderColor: state.isFocused ? "#3b82f6" : isDarkMode ? "#374151" : "#d1d5db",
            padding: "2px",
            boxShadow: "none",
            "&:hover": { borderColor: "#3b82f6" }
        }),
        menu: (base) => ({
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("token");
            const url = editId ? `${API_URL}/academics/teacher-routine/${editId}` : `${API_URL}/academics/teacher-routine`;
            const method = editId ? "PUT" : "POST";
            
            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                toast.success(editId ? "Routine updated!" : "Routine created!");
                setShowModal(false);
                setEditId(null);
                fetchGroupedRoutines();
                setFormData({
                    teacherId: "", centreId: [], day: "", startTime: "", endTime: "", classId: [], subjectId: [], amount: 0, classHours: 0, className: ""
                });
            } else {
                const data = await response.json();
                toast.error(data.message || "Operation failed");
            }
        } catch (error) {
            toast.error("Server error");
        }
    };

    const handleEdit = (session, teacherId, day) => {
        setFormData({
            teacherId: teacherId,
            centreId: session.centreIds || [], // Array
            day: day,
            startTime: session.startTime,
            endTime: session.endTime,
            classId: session.classIds || [],
            subjectId: session.subjectIds || [],
            amount: session.amount || 0,
            classHours: session.classHours || 0,
            className: session.className || ""
        });
        setEditId(session._id);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this session?")) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/teacher-routine/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success("Deleted successfully");
                fetchGroupedRoutines();
            }
        } catch (error) {
            toast.error("Delete failed");
        }
    };

    const filteredData = groupedData.filter(item => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || 
            item.teacher.name.toLowerCase().includes(searchLower) ||
            item.teacher.employeeId.toLowerCase().includes(searchLower) ||
            (item.teacher.email && item.teacher.email.toLowerCase().includes(searchLower));
        
        const teacherValues = filterTeachers.map(v => v.value);
        const matchesTeacher = teacherValues.length === 0 || teacherValues.includes(item.teacher.name);
        
        const employmentValues = filterEmploymentType.map(v => v.value);
        const matchesEmploymentType = employmentValues.length === 0 || employmentValues.includes(item.teacher.typeOfEmployment);

        const dayValues = filterDays.map(v => v.value);
        const daysToSearch = dayValues.length === 0 ? DAYS : dayValues;
        
        const centreValues = filterCentres.map(v => v.value);
        const subjectValues = filterSubjects.map(v => v.value);

        const hasMatchingSession = daysToSearch.some(day => 
            (item.days[day] || []).some(session => {
                const c = centreValues.length === 0 || centreValues.includes(session.centre);
                const s = subjectValues.length === 0 || subjectValues.includes(session.subject);
                let t = true;
                if (filterTime.start && (!session.startTime || session.startTime < filterTime.start)) t = false;
                if (filterTime.end && (!session.startTime || session.startTime > filterTime.end)) t = false;
                return c && s && t;
            })
        );

        // If no sessions exist on the selected days, but we filtered by days, we should probably hide them
        const hasSessionsOnSelectedDays = dayValues.length === 0 || dayValues.some(day => (item.days[day] || []).length > 0);

        return matchesSearch && matchesTeacher && matchesEmploymentType && hasMatchingSession && hasSessionsOnSelectedDays;
    });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentTeachers = filteredData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    const handleBulkImport = async (data) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/teacher-routine/bulk-import`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(data)
            });
            if (response.ok) {
                toast.success("Import successful");
                fetchGroupedRoutines();
            } else {
                toast.error("Import failed");
            }
        } catch (err) {
            toast.error("Import error");
        }
    };

    // --- Searchable Select Component ---
    const SearchableSelect = ({ 
        label, 
        name,
        value, 
        options, 
        onChange, 
        placeholder, 
        required = false,
        displayPath = "name",
        valuePath = "_id",
        filterFunc = null,
        multiple = false
    }) => {
        const [isOpen, setIsOpen] = useState(false);
        const [search, setSearch] = useState("");
        const dropdownRef = useRef(null);

        useEffect(() => {
            const handler = (e) => {
                if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                    setIsOpen(false);
                }
            };
            document.addEventListener("mousedown", handler);
            return () => document.removeEventListener("mousedown", handler);
        }, []);

        const filteredOptions = options.filter(opt => {
            const displayVal = typeof opt === 'string' ? opt : opt[displayPath];
            const matchesSearch = displayVal?.toLowerCase().includes(search.toLowerCase());
            if (filterFunc) return matchesSearch && filterFunc(opt);
            return matchesSearch;
        });

        let displayLabel = placeholder;
        if (multiple) {
            if (Array.isArray(value) && value.length > 0) {
                const selectedLabels = options
                    .filter(opt => value.includes(typeof opt === 'string' ? opt : opt[valuePath]))
                    .map(opt => typeof opt === 'string' ? opt : opt[displayPath]);
                displayLabel = selectedLabels.join(", ");
                if (displayLabel.length > 25) displayLabel = `${value.length} items selected`;
            }
        } else {
            const selectedOption = options.find(opt => (typeof opt === 'string' ? opt : opt[valuePath]) === value);
            if (selectedOption) {
                displayLabel = typeof selectedOption === 'string' ? selectedOption : selectedOption[displayPath];
            }
        }

        return (
            <div className="group/field" ref={dropdownRef}>
                {label && (
                    <label className={`block text-[12px] font-black uppercase tracking-[0.2em] mb-3 transition-colors ${isDarkMode ? 'text-gray-500 group-focus-within/field:text-cyan-400' : 'text-gray-400 group-focus-within/field:text-cyan-500'}`}>
                        {label}{required ? '*' : ''}
                    </label>
                )}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => { setIsOpen(!isOpen); setSearch(""); }}
                        className={`w-full p-4 pl-5 rounded border-2 font-bold text-sm transition-all outline-none appearance-none text-left flex justify-between items-center ${isDarkMode ? 'bg-gray-900 border-gray-800 text-white focus:border-cyan-500/50' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-cyan-500/30'}`}
                    >
                        <span className={`truncate mr-2 ${((multiple && value?.length > 0) || (!multiple && value)) ? '' : 'text-gray-400'}`}>
                            {displayLabel}
                        </span>
                        <div className="opacity-30">▼</div>
                    </button>

                    {isOpen && (
                        <div className={`absolute z-[150] w-full mt-2 rounded border shadow-2xl overflow-hidden animate-scale-in ${isDarkMode ? 'bg-[#1a1f26] border-white/10' : 'bg-white border-gray-200'}`}>
                            <div className={`p-4 border-b ${isDarkMode ? 'border-white/5 bg-gray-900/50' : 'border-gray-100 bg-gray-50/50'}`}>
                                <input
                                    type="text"
                                    autoFocus
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder={`Filter options...`}
                                    className={`w-full px-4 py-2 text-xs font-bold rounded border outline-none transition-all ${isDarkMode ? 'bg-gray-950 border-white/10 text-white focus:border-cyan-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500/30'}`}
                                />
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                {filteredOptions.length > 0 ? (
                                    filteredOptions.map((opt, i) => {
                                        const val = typeof opt === 'string' ? opt : opt[valuePath];
                                        const labelText = typeof opt === 'string' ? opt : opt[displayPath];
                                        const isSelected = multiple ? (Array.isArray(value) && value.includes(val)) : value === val;
                                        return (
                                            <div key={i} className="flex items-center">
                                                <button
                                                    type="button"
                                                    onClick={() => { 
                                                        if (multiple) {
                                                            const currentVal = Array.isArray(value) ? value : [];
                                                            const newValue = currentVal.includes(val) 
                                                                ? currentVal.filter(v => v !== val) 
                                                                : [...currentVal, val];
                                                            onChange({ target: { name, value: newValue } });
                                                        } else {
                                                            onChange({ target: { name, value: val } }); 
                                                            setIsOpen(false); 
                                                            setSearch(""); 
                                                        }
                                                    }}
                                                    className={`w-full text-left px-5 py-3.5 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-between ${isSelected ? (isDarkMode ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-50 text-cyan-600') : (isDarkMode ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-cyan-600')}`}
                                                >
                                                    <span>{labelText}</span>
                                                    {multiple && isSelected && <span>✓</span>}
                                                </button>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="px-5 py-8 text-center text-[10px] font-black uppercase tracking-widest opacity-30">No matches found</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                {required && (!value || (Array.isArray(value) && value.length === 0)) && <input type="text" value="" required className="opacity-0 absolute h-0 w-0" onChange={()=>{}} />}
            </div>
        );
    };

    return (
        <Layout activePage="Academics">
            <div className={`p-4 md:p-8 min-h-screen transition-all duration-500 ${isDarkMode ? 'bg-[#0f1115] text-white' : 'bg-[#f4f7fe] text-gray-900'}`}>
                <ToastContainer theme={theme} />
                
                {/* Modern Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-1.5 h-8 bg-cyan-500 rounded shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
                            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                                Teacher <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Schedule Matrix</span>
                            </h1>
                        </div>
                        <p className={`text-sm font-medium tracking-wide opacity-50 uppercase flex items-center gap-2`}>
                            <FaCalendarAlt className="text-cyan-500" /> Dynamic Resource Allocation System
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className={`flex items-center gap-1 p-1 rounded border ${isDarkMode ? 'bg-gray-800/40 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
                            <button onClick={() => fetchGroupedRoutines()} className={`p-2.5 rounded transition-all ${isDarkMode ? 'hover:bg-gray-700 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500'}`} title="Sync Data">
                                <FaSync className={loading ? 'animate-spin' : ''} />
                            </button>
                            <ExcelImportExport 
                                    data={groupedData.map(item => {
                                        const row = {
                                            teacherName: item.teacher.name,
                                            employeeId: item.teacher.employeeId,
                                            email: item.teacher.email || 'N/A',
                                            mobNum: item.teacher.mobNum || 'N/A'
                                        };
                                        DAYS.forEach(day => {
                                            row[day] = item.days[day]
                                                .map(s => {
                                                    const timeStr = (s.startTime || s.endTime) ? `[${s.startTime || '--:--'}-${s.endTime || '--:--'}]` : '[TBD]';
                                                    const classNameStr = s.className ? `${s.className} (${s.class})` : s.class;
                                                    return `${s.centre} ${timeStr} {${classNameStr}: ${s.subject}} (${s.classHours} hrs)`;
                                                })
                                                .join(" | ");
                                        });
                                        return row;
                                    })}
                                columns={routineColumns}
                                mapping={routineMapping}
                                onImport={handleBulkImport}
                                fileName="Teacher_Operational_Matrix"
                                isDarkMode={isDarkMode}
                            />


                        </div>
                        {canCreate && (
                            <button onClick={() => { setEditId(null); setShowModal(true); }} className="group relative overflow-hidden bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-3 rounded flex items-center gap-3 font-bold text-sm shadow-[0_10px_25px_-5px_rgba(6,182,212,0.4)] transition-all active:scale-95">
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                <FaPlus className="text-xs" /> ADD ROUTINE
                            </button>
                        )}
                    </div>
                </div>

                {/* Glassmorphic Filters */}
                <div className={`mb-10 p-1 rounded bg-gradient-to-br ${isDarkMode ? 'from-gray-800/40 to-cyan-500/10' : 'from-white to-cyan-500/5'} shadow-xl relative z-[100]`}>
                    <div className={`p-6 rounded ${isDarkMode ? 'bg-[#151921]/90' : 'bg-white/90'} backdrop-blur-xl border border-white/5`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="relative group lg:col-span-2 flex gap-4">
                                <div className="relative flex-1">
                                    <FaSearch className={`absolute left-5 top-1/2 -translate-y-1/2 transition-all ${isDarkMode ? 'text-gray-500 group-focus-within:text-cyan-400' : 'text-gray-400 group-focus-within:text-cyan-500'}`} />
                                    <input 
                                        type="text" placeholder="Search by name or ID..." 
                                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                        className={`w-full pl-14 pr-6 py-4 rounded border-2 font-semibold text-sm transition-all focus:outline-none ${isDarkMode ? 'bg-gray-900 border-gray-800 text-white focus:border-cyan-500/50 focus:bg-gray-950' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-cyan-500/30 focus:bg-white focus:shadow-md'}`}
                                    />
                                </div>
                                <button 
                                    onClick={() => {
                                        setFilterCentres([]);
                                        setFilterTeachers([]);
                                        setFilterSubjects([]);
                                        setFilterDays([]);
                                        setFilterEmploymentType([]);
                                        setFilterTime({ start: "", end: "" });
                                        setSearchTerm("");
                                    }}
                                    className={`px-6 py-4 rounded border font-black text-[10px] tracking-[0.2em] uppercase transition-all ${isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-red-50 border-red-100 text-red-600 hover:bg-red-600 hover:text-white'}`}
                                >
                                    Reset
                                </button>
                            </div>
                            <div className="">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Centres</label>
                                <Select
                                    isMulti
                                    isSearchable
                                    options={centres.map(c => ({ value: c.centreName, label: c.centreName }))}
                                    value={filterCentres}
                                    onChange={setFilterCentres}
                                    styles={customSelectStyles}
                                    placeholder="Select Centers"
                                />
                            </div>
                            <div className="">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Teachers</label>
                                <Select
                                    isMulti
                                    isSearchable
                                    options={teachers.map(t => ({ value: t.name, label: t.name }))}
                                    value={filterTeachers}
                                    onChange={setFilterTeachers}
                                    styles={customSelectStyles}
                                    placeholder="Select Teachers"
                                />
                            </div>
                            
                            <div className="">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Subjects</label>
                                <Select
                                    isMulti
                                    isSearchable
                                    options={subjects.map(s => ({ value: s.subName || s.subjectName || s.name, label: s.subName || s.subjectName || s.name }))}
                                    value={filterSubjects}
                                    onChange={setFilterSubjects}
                                    styles={customSelectStyles}
                                    placeholder="Select Subjects"
                                />
                            </div>
                            <div className="">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Days</label>
                                <Select
                                    isMulti
                                    isSearchable
                                    options={DAYS.map(d => ({ value: d, label: d }))}
                                    value={filterDays}
                                    onChange={setFilterDays}
                                    styles={customSelectStyles}
                                    placeholder="Select Days"
                                />
                            </div>
                            <div className="">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Employment</label>
                                <Select
                                    isMulti
                                    isSearchable
                                    options={[{value: 'Full Time', label: 'Full Time'}, {value: 'Part Time', label: 'Part Time'}]}
                                    value={filterEmploymentType}
                                    onChange={setFilterEmploymentType}
                                    styles={customSelectStyles}
                                    placeholder="Select Type"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex-1">
                                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Start Time</label>
                                    <input 
                                        type="time" value={filterTime.start} 
                                        onChange={(e) => setFilterTime(prev => ({ ...prev, start: e.target.value }))}
                                        className={`w-full p-2.5 rounded border text-xs font-bold ${isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>End Time</label>
                                    <input 
                                        type="time" value={filterTime.end} 
                                        onChange={(e) => setFilterTime(prev => ({ ...prev, end: e.target.value }))}
                                        className={`w-full p-2.5 rounded border text-xs font-bold ${isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Premium Grid View */}
                <div className={`rounded border overflow-hidden shadow-2xl overflow-x-auto ${isDarkMode ? 'bg-[#151921] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <table className="w-full border-collapse min-w-[1400px]">
                        <thead>
                            <tr className={`${isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50'} border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                <th className="p-8 text-left sticky left-0 z-10 bg-inherit min-w-[400px] w-[400px]">
                                    <div className="flex items-center gap-3">
                                        <FaUserTie className="text-cyan-500" />
                                        <span className="text-sm font-black uppercase tracking-[0.2em] opacity-60">FACULTY UNIT</span>
                                    </div>

                                </th>

                                {DAYS.filter(day => filterDays.length === 0 || filterDays.includes(day)).map(day => (
                                    <th key={day} className="p-8 text-center min-w-[300px] border-l border-gray-800/10">
                                        <span className="text-sm font-black uppercase tracking-[0.2em] opacity-60">{day}</span>
                                    </th>

                                ))}
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                            {loading ? (
                                <tr><td colSpan="8" className="p-32 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded animate-spin"></div>
                                        <span className="text-sm font-black uppercase tracking-widest text-cyan-500/60">Calibrating Data Stream...</span>
                                    </div>
                                </td></tr>
                            ) : currentTeachers.length === 0 ? (
                                <tr><td colSpan="8" className="p-32 text-center">
                                    <div className="flex flex-col items-center gap-4 opacity-30">
                                        <FaSearch className="text-5xl" />
                                        <span className="text-sm font-black uppercase tracking-widest">No matching faculty found</span>
                                    </div>
                                </td></tr>
                            ) : (
                                currentTeachers.map((item) => (
                                    <tr key={item.teacher._id} className={`group ${isDarkMode ? 'hover:bg-cyan-500/[0.02]' : 'hover:bg-cyan-500/[0.01]'} transition-colors`}>
                                        {/* Sticky Teacher Sidebar */}
                                        <td className={`p-8 sticky left-0 z-10 transition-all min-w-[400px] w-[400px] ${isDarkMode ? 'bg-[#151921] group-hover:bg-[#1a1f26]' : 'bg-white group-hover:bg-[#fcfdff]'} shadow-[10px_0_15px_-10px_rgba(0,0,0,0.1)] rounded-none`}>

                                            <div className="flex items-center gap-5">
                                                <div className="relative flex-shrink-0">
                                                    <div className={`w-16 h-16 rounded border-2 overflow-hidden transition-transform duration-500 group-hover:scale-105 shadow-xl ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-white bg-gray-100'}`}>
                                                        {item.teacher.profileImage ? (
                                                            <img src={item.teacher.profileImage} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-2xl font-black text-cyan-500/50">
                                                                {item.teacher.name.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded border-4 ${isDarkMode ? 'border-[#151921]' : 'border-white'} ${item.teacher.typeOfEmployment === 'Full Time' ? 'bg-green-500' : 'bg-orange-500'}`} title={item.teacher.typeOfEmployment}></div>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-extrabold text-2xl group-hover:text-cyan-500 transition-colors uppercase leading-tight mb-2 break-all">{item.teacher.name}</p>
                                                    <div className="flex flex-col gap-1.5 ">
                                                        <span className={`text-[14px] font-black tracking-widest opacity-60 uppercase`}>{item.teacher.employeeId}</span>
                                                        {item.teacher.email && <span className={`text-[12px] font-bold opacity-40 lowercase`}>{item.teacher.email}</span>}
                                                        {item.teacher.mobNum && <span className={`text-[12px] font-bold opacity-40`}>{item.teacher.mobNum}</span>}
                                                        <span className={`w-fit text-[12px] font-black uppercase px-3 py-1 rounded mt-2 ${item.teacher.typeOfEmployment === 'Full Time' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'}`}>
                                                            {item.teacher.typeOfEmployment}
                                                        </span>
                                                    </div>

                                                </div>
                                            </div>
                                        </td>


                                        {/* Day Cells */}
                                        {DAYS.filter(day => filterDays.length === 0 || filterDays.includes(day)).map(day => (
                                            <td key={day} className="p-4 align-top border-l border-gray-800/10 min-w-[300px]">
                                                <div className="flex flex-col gap-4 min-h-[140px] w-full">
                                                    {item.days[day].map((session) => (
                                                        <div key={session._id} className={`group/card p-5 rounded border-2 transition-all relative ${isDarkMode ? 'bg-gray-900/50 border-gray-800 hover:border-cyan-500/30 hover:bg-gray-900 shadow-xl' : 'bg-white border-gray-100 hover:border-cyan-500/20 hover:shadow-2xl hover:scale-[1.02]'}`}>
                                                            {/* Session Header */}
                                                            <div className="flex items-center justify-between gap-2 mb-4">
                                                                <div className="flex items-center gap-2 opacity-60">
                                                                    <FaLocationArrow className="text-[16px] text-cyan-500 flex-shrink-0 rotate-45" />
                                                                    <span className="text-[14px] font-black uppercase tracking-widest whitespace-normal break-all leading-tight w-full">{session.centre}</span>
                                                                </div>
                                                                <div className="flex gap-2 opacity-0 group-hover/card:opacity-100 transition-all scale-75 group-hover/card:scale-100 pointer-events-none group-hover/card:pointer-events-auto">
                                                                    <button onClick={() => handleEdit(session, item.teacher._id, day)} className={`p-2 rounded bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500 hover:text-white transition-all`} title="Edit Profile">
                                                                        <FaEdit className="text-[12px]" />
                                                                    </button>
                                                                    <button onClick={() => handleDelete(session._id)} className={`p-2 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all`} title="Purge Record">
                                                                        <FaTrash className="text-[12px]" />
                                                                    </button>
                                                                </div>
                                                            </div>


                                                            {/* Session Body */}
                                                            <div className="space-y-1.5">
                                                                <div className="flex items-start gap-2">
                                                                    <FaBookOpen className="text-[20px] text-cyan-500 flex-shrink-0 mt-1" />
                                                                    <div className="flex flex-col w-full">
                                                                        <p className="text-2xl font-black uppercase tracking-tight whitespace-normal break-all leading-tight">{session.className || session.class}</p>
                                                                        {session.className && session.class && (
                                                                            <p className="text-[12px] font-bold uppercase opacity-30 mt-1 break-all">({session.class})</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <p className={`text-base font-extrabold opacity-70 uppercase tracking-tighter pl-8 whitespace-normal break-all leading-snug w-full`}>{session.subject}</p>
                                                            </div>

                                                            <div className="mt-3 flex items-center gap-2">
                                                                <div className="px-3 py-1 rounded bg-cyan-500/10 border border-cyan-500/20">
                                                                    <span className="text-[12px] font-black uppercase tracking-widest text-cyan-500">{session.classHours} CLASS HOURS</span>
                                                                </div>
                                                            </div>


                                                            {/* Session Footer */}
                                                            <div className={`mt-5 pt-4 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-100'} flex items-center justify-between`}>
                                                                <div className="flex items-center gap-1.5 opacity-80">
                                                                    <FaClock className="text-[14px]" />
                                                                    <span className="text-[14px] font-black font-mono">{(session.startTime || session.endTime) ? `${session.startTime || '--:--'} - ${session.endTime || '--:--'}` : 'TBD'}</span>
                                                                </div>
                                                                <span className="text-[16px] font-black text-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.2)]">₹{session.amount}</span>
                                                            </div>

                                                        </div>
                                                    ))}
                                                    {item.days[day].length === 0 && (
                                                        <div className="flex-1 rounded border-2 border-dashed border-gray-800/10 flex items-center justify-center group/empty transition-all hover:border-cyan-500/10">
                                                            <div className="text-[11px] font-black uppercase tracking-[0.3em] opacity-5 -rotate-45 group-hover/empty:opacity-10 transition-opacity">EMPTY SLOT</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer / Pagination */}
                <div className="mt-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className={`px-4 py-2 rounded border text-[12px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'bg-gray-800/50 border-gray-700 text-gray-500' : 'bg-white border-gray-100 text-gray-400'}`}>
                            TOTAL PERSONNEL: <span className="text-cyan-500 ml-1">{filteredData.length}</span>
                        </div>
                    </div>
                    <div className={`flex items-center gap-2 p-1.5 rounded border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} shadow-lg`}>
                        <button 
                            disabled={currentPage === 1} onClick={() => { setCurrentPage(prev => prev - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className={`p-3 rounded transition-all disabled:opacity-20 ${isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                        >
                            <FaChevronLeft className="text-xs" />
                        </button>
                        <div className="flex items-center px-4">
                            <span className="text-xs font-black uppercase tracking-widest">
                                {currentPage} <span className="opacity-30 mx-2">/</span> {totalPages || 1}
                            </span>
                        </div>
                        <button 
                            disabled={currentPage === totalPages || totalPages === 0} onClick={() => { setCurrentPage(prev => prev + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className={`p-3 rounded transition-all disabled:opacity-20 ${isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                        >
                            <FaChevronRight className="text-xs" />
                        </button>
                    </div>
                </div>

                {/* Neo-Modern Modal */}
                {showModal && (
                    <div className="fixed inset-0 flex items-center justify-center z-[130] p-4 scale-in-animation">
                        <div className="absolute inset-0 bg-[#0f1115]/90 backdrop-blur-3xl" onClick={() => setShowModal(false)}></div>
                        <div className={`relative w-full max-w-3xl rounded overflow-hidden border shadow-[0_0_100px_rgba(6,182,212,0.15)] ${isDarkMode ? 'bg-[#151921] border-white/5' : 'bg-white border-gray-200'}`}>
                            <div className="p-10 border-b flex justify-between items-center bg-gradient-to-br from-cyan-600 to-blue-700">
                                <div className="space-y-1">
                                    <h2 className="text-white font-black text-3xl uppercase tracking-tighter">{editId ? "Update Definition" : "New Allocation"}</h2>
                                    <p className="text-white/50 text-[12px] font-bold uppercase tracking-[0.3em]">Resource Reconfiguration Module</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="bg-white/10 hover:bg-white/20 text-white w-12 h-12 rounded transition-all text-3xl font-light active:scale-90">&times;</button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="p-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-8">
                                        <SearchableSelect 
                                            label="Assign Personnel"
                                            name="teacherId"
                                            value={formData.teacherId}
                                            required
                                            options={teachers.map(t => ({ ...t, nameAttr: `${t.name} [${t.employeeId}]` }))}
                                            displayPath="nameAttr"
                                            onChange={handleChange}
                                            placeholder="Select Vector"
                                        />

                                        <SearchableSelect 
                                            label="Operation Hub"
                                            name="centreId"
                                            value={formData.centreId}
                                            options={centres}
                                            displayPath="centreName"
                                            onChange={handleChange}
                                            multiple={true}
                                            placeholder="Hub"
                                        />
                                        <div className="group/field">
                                            <label className="block text-[12px] font-black uppercase tracking-[0.2em] mb-3 opacity-50">Timeline Day</label>
                                            <select name="day" required value={formData.day} onChange={handleChange} className={`w-full p-4 rounded border-2 font-bold text-sm transition-all outline-none ${isDarkMode ? 'bg-gray-800 border-transparent focus:border-cyan-500/30' : 'bg-gray-100 border-transparent focus:border-cyan-500/30'}`}>
                                                <option value="">Day</option>
                                                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="group/field">
                                                <label className="block text-[12px] font-black uppercase tracking-[0.2em] mb-3 opacity-50">START VECTOR</label>
                                                <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className={`w-full p-4 rounded border-2 font-black text-sm transition-all outline-none ${isDarkMode ? 'bg-gray-800 border-transparent focus:border-cyan-500/30' : 'bg-gray-100 border-transparent focus:border-cyan-500/30'}`} />
                                            </div>
                                            <div className="group/field">
                                                <label className="block text-[12px] font-black uppercase tracking-[0.2em] mb-3 opacity-50">END VECTOR</label>
                                                <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className={`w-full p-4 rounded border-2 font-black text-sm transition-all outline-none ${isDarkMode ? 'bg-gray-800 border-transparent focus:border-cyan-500/30' : 'bg-gray-100 border-transparent focus:border-cyan-500/30'}`} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <SearchableSelect 
                                            label="Academic Class"
                                            name="classId"
                                            value={formData.classId}
                                            options={classes}
                                            displayPath="name"
                                            onChange={handleChange}
                                            multiple={true}
                                            placeholder="Select Level"
                                        />

                                        <div className="group/field">
                                            <label className="block text-[12px] font-black uppercase tracking-[0.2em] mb-3 opacity-50">Class Name</label>
                                            <input 
                                                type="text" 
                                                name="className" 
                                                value={formData.className} 
                                                onChange={handleChange} 
                                                placeholder="Custom slot name (optional)"
                                                className={`w-full p-4 rounded border-2 font-bold text-sm transition-all outline-none ${isDarkMode ? 'bg-gray-800 border-transparent focus:border-cyan-500/30 text-white' : 'bg-gray-100 border-transparent focus:border-cyan-500/30 text-gray-900'}`} 
                                            />
                                        </div>
                                        <SearchableSelect 
                                            label="Subject Stream"
                                            name="subjectId"
                                            value={formData.subjectId}
                                            options={subjects}
                                            displayPath="subName"
                                            onChange={handleChange}
                                            multiple={true}
                                            placeholder="Select Subject"
                                        />
                                        <div className="group/field">
                                            <label className="block text-[12px] font-black uppercase tracking-[0.2em] mb-3 opacity-50">Class Hours</label>
                                            <div className="relative">
                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-cyan-500/50 italic">H</span>
                                                <input type="number" name="classHours" value={formData.classHours} onChange={handleChange} step="0.5" className={`w-full pl-12 pr-6 py-4 rounded border-2 font-black text-sm transition-all outline-none ${isDarkMode ? 'bg-gray-900 border-gray-800 text-cyan-500 focus:border-cyan-500' : 'bg-gray-50 border-gray-100 text-cyan-600 focus:border-cyan-400'}`} />
                                            </div>
                                        </div>

                                        <div className="group/field">
                                            <label className="block text-[12px] font-black uppercase tracking-[0.2em] mb-3 opacity-50">Compensation Pulse</label>
                                            <div className="relative">
                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-green-500/50">₹</span>
                                                <input type="number" name="amount" value={formData.amount} onChange={handleChange} className={`w-full pl-12 pr-6 py-4 rounded border-2 font-black text-sm transition-all outline-none ${isDarkMode ? 'bg-gray-900 border-gray-800 text-green-500 focus:border-green-500' : 'bg-gray-50 border-gray-100 text-green-600 focus:border-green-400'}`} />
                                            </div>
                                        </div>
                                        
                                        <div className="pt-6">
                                            <button type="submit" className="w-full bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-700 text-white py-5 rounded font-black uppercase tracking-[0.4em] text-xs shadow-2xl hover:shadow-[0_20px_50px_-10px_rgba(6,182,212,0.5)] transform hover:-translate-y-2 transition-all active:scale-95 active:translate-y-0">
                                                {editId ? "CONFIRM MODIFICATION" : "INITIALIZE DEPLOYMENT"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100;300;400;500;700;900&display=swap');
                
                * {
                    font-family: 'Outfit', sans-serif !important;
                }

                .scale-in-animation {
                    animation: scaleIn 0.4s cubic-bezier(0.2, 1, 0.3, 1);
                }

                @keyframes scaleIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }

                /* Custom Scrollbar */
                ::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                ::-webkit-scrollbar-track {
                    background: transparent;
                }
                ::-webkit-scrollbar-thumb {
                    background: rgba(6, 182, 212, 0.1);
                    border-radius: 4px;
                    border: 2px solid transparent;
                    background-clip: content-box;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: rgba(6, 182, 212, 0.3);
                    background-clip: content-box;
                }

                /* Sticky Header Shadow */
                .sticky-header-shadow {
                    box-shadow: 10px 0 30px -5px rgba(0,0,0,0.1);
                }

                /* Card Hover Glow */
                .group\\/card:hover {
                    box-shadow: 0 25px 60px -15px rgba(6, 182, 212, 0.15);
                }

                /* Smooth Table Transitions */
                table tr {
                    transition: all 0.3s ease;
                }
            `}} />
        </Layout>
    );
};

export default TeacherRoutineSchedule;
