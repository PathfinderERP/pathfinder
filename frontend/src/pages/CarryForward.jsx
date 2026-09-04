import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { 
    FaSearch, FaFilter, FaEye, FaArrowRight, FaMoneyBillWave, FaTimes, 
    FaUserGraduate, FaCheckCircle, FaBook, FaCalendar, FaSpinner, 
    FaChevronLeft, FaChevronRight, FaMapMarkerAlt, FaGlobe, FaSchool, FaReceipt,
    FaExclamationCircle, FaFileExcel, FaGraduationCap, FaExternalLinkAlt, FaChartLine
} from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import CustomMultiSelect from '../components/common/CustomMultiSelect';

const CarryForward = () => {
    const navigate = useNavigate();
    const apiUrl = import.meta.env.VITE_API_URL;

    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [dbZones, setDbZones] = useState([]);
    const [dbCentres, setDbCentres] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters State
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedZones, setSelectedZones] = useState([]);      // array of { value, label }
    const [selectedCentres, setSelectedCentres] = useState([]);  // array of { value, label }
    const [datePreset, setDatePreset] = useState("");
    const [showCustomDates, setShowCustomDates] = useState(false);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    // Date Preset calculation helper
    const applyDatePreset = (preset) => {
        const now = new Date();
        const fmt = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const today = fmt(now);
        const yesterday = fmt(new Date(now.getTime() - 86400000));
        const dayOfWeek = now.getDay();
        const diffToMon = (dayOfWeek + 6) % 7;
        const thisWeekMon = new Date(now); thisWeekMon.setDate(now.getDate() - diffToMon);
        const prevWeekMon = new Date(thisWeekMon); prevWeekMon.setDate(thisWeekMon.getDate() - 7);
        const prevWeekSun = new Date(thisWeekMon); prevWeekSun.setDate(thisWeekMon.getDate() - 1);
        const y = now.getFullYear(), m = now.getMonth();
        const thisMonStart = fmt(new Date(y, m, 1));
        const prevMonStart = fmt(new Date(y, m - 1, 1));
        const prevMonEnd = fmt(new Date(y, m, 0));
        const thisYearStart = fmt(new Date(y, 0, 1));
        const prevYearStart = fmt(new Date(y - 1, 0, 1));
        const prevYearEnd = fmt(new Date(y - 1, 11, 31));

        setDatePreset(preset);
        if (preset === 'custom') {
            setShowCustomDates(true);
            return;
        }
        setShowCustomDates(false);
        const ranges = {
            today: [today, today],
            yesterday: [yesterday, yesterday],
            thisWeek: [fmt(thisWeekMon), today],
            prevWeek: [fmt(prevWeekMon), fmt(prevWeekSun)],
            thisMonth: [thisMonStart, today],
            prevMonth: [prevMonStart, prevMonEnd],
            thisYear: [thisYearStart, today],
            prevYear: [prevYearStart, prevYearEnd],
        };
        const [from, to] = ranges[preset] || ['', ''];
        setFromDate(from);
        setToDate(to);
        setCurrentPage(1);
    };
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    // Modal State
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentAdmissions, setStudentAdmissions] = useState([]);
    const [modalLoading, setModalLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Tab State
    const [activeTab, setActiveTab] = useState("pendingReport");
    const [enrolledSearchTerm, setEnrolledSearchTerm] = useState("");
    const [searchedStudent, setSearchedStudent] = useState(null);
    const [searchedStudentAdmissions, setSearchedStudentAdmissions] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);

    // Helper to calculate current Financial Year session dynamically (starts April 1st)
    const getCurrentFinancialYearSession = () => {
        const now = new Date();
        const curMonth = now.getMonth(); // 0 = Jan, 3 = Apr
        const curYear = now.getFullYear();
        const fyStart = curMonth >= 3 ? curYear : curYear - 1;
        return `${fyStart}-${fyStart + 1}`;
    };

    // Pending Carry Forward State
    const [pendingReportData, setPendingReportData] = useState(null);
    const [pendingLoading, setPendingLoading] = useState(false);
    const [selectedPendingSession, setSelectedPendingSession] = useState(getCurrentFinancialYearSession);
    const [pendingSearch, setPendingSearch] = useState("");
    const [pendingSelectedZones, setPendingSelectedZones] = useState([]);
    const [pendingSelectedCentres, setPendingSelectedCentres] = useState([]);
    const [pendingSelectedClass, setPendingSelectedClass] = useState("");

    // Drill-down Student Modal State
    const [drillDownModalOpen, setDrillDownModalOpen] = useState(false);
    const [drillDownCentre, setDrillDownCentre] = useState(null);
    const [drillDownClass, setDrillDownClass] = useState(null);
    const [drillDownSearch, setDrillDownSearch] = useState("");
    const [drillDownPage, setDrillDownPage] = useState(1);
    const drillDownPageSize = 25;

    // Fetch Pending Carry Forward Report
    const fetchPendingReport = async (overrideSession) => {
        setPendingLoading(true);
        try {
            const token = localStorage.getItem("token");
            const headers = { "Authorization": `Bearer ${token}` };
            const sess = overrideSession !== undefined ? overrideSession : selectedPendingSession;
            const url = `${apiUrl}/carry-forward/pending-report${sess ? `?session=${encodeURIComponent(sess)}` : ''}`;
            const res = await fetch(url, { headers });
            if (res.ok) {
                const data = await res.json();
                setPendingReportData(data);
                if (data.session && (!selectedPendingSession || !data.availableSessions?.includes(selectedPendingSession))) {
                    setSelectedPendingSession(data.session);
                }
            } else {
                toast.error("Failed to load pending carry forward report");
            }
        } catch (err) {
            console.error("Error fetching pending report:", err);
            toast.error("Error loading pending carry forward data");
        } finally {
            setPendingLoading(false);
        }
    };

    // Fetch Master Data (Zones, Centres, Classes) & Carry Forward Students
    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const headers = { "Authorization": `Bearer ${token}` };

            const [cfRes, classesRes, zonesRes, centresRes] = await Promise.all([
                fetch(`${apiUrl}/carry-forward/students`, { headers }),
                fetch(`${apiUrl}/class`, { headers }),
                fetch(`${apiUrl}/zone`, { headers }),
                fetch(`${apiUrl}/centre`, { headers })
            ]);

            if (cfRes.ok) {
                const cfData = await cfRes.json();
                setStudents(cfData.data || []);
            } else {
                toast.error("Failed to fetch carry forward students");
            }

            if (classesRes.ok) {
                const cData = await classesRes.json();
                setClasses(Array.isArray(cData) ? cData : []);
            }

            if (zonesRes.ok) {
                const zData = await zonesRes.json();
                const zList = Array.isArray(zData) ? zData : (zData.data || zData.zones || []);
                setDbZones(zList.filter(z => z.isActive !== false));
            }

            if (centresRes.ok) {
                const cntData = await centresRes.json();
                const cntList = Array.isArray(cntData) ? cntData : (cntData.centres || []);
                setDbCentres(cntList.filter(c => c.status !== "deactive"));
            }

            // Also load pending report
            await fetchPendingReport();

        } catch (err) {
            console.error("Error fetching carry forward data:", err);
            toast.error("Error loading Carry Forward data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [apiUrl]);

    // Handle Session Change for Pending Report
    const handlePendingSessionChange = (newSession) => {
        setSelectedPendingSession(newSession);
        fetchPendingReport(newSession);
    };

    // Filter available centres based on selected zones
    const filteredCentresList = useMemo(() => {
        if (!selectedZones || selectedZones.length === 0) {
            return dbCentres;
        }
        const selectedZoneIds = new Set(selectedZones.map(z => String(z.value || z._id || z)));
        const selectedZoneNames = new Set(selectedZones.map(z => String(z.label || z.name || z).toLowerCase().trim()));
        const allowedCentreIds = new Set();

        dbZones.forEach(zone => {
            if (selectedZoneIds.has(String(zone._id)) || selectedZoneNames.has(String(zone.name).toLowerCase().trim())) {
                (zone.centres || []).forEach(c => {
                    const cId = String(c._id || c);
                    allowedCentreIds.add(cId);
                });
            }
        });

        return dbCentres.filter(c => allowedCentreIds.has(String(c._id)));
    }, [selectedZones, dbCentres, dbZones]);

    // Centre options for CustomMultiSelect
    const centreOptions = useMemo(() => {
        return filteredCentresList.map(c => ({
            value: c.centreName || c.enterCode || String(c._id),
            label: c.centreName || c.enterCode,
            id: String(c._id)
        }));
    }, [filteredCentresList]);

    // Zone options for CustomMultiSelect
    const zoneOptions = useMemo(() => {
        return dbZones.map(z => ({
            value: String(z._id),
            label: z.name
        }));
    }, [dbZones]);

    // Helper to exclude zagartala, phsps, franchise, rkm, howrah, and durgapur centres in Pending Carry Forward
    const isExcludedPendingCentre = (name) => {
        if (!name) return false;
        const str = String(name).toLowerCase().trim();
        return /zagartala/i.test(str) ||
            /phsps/i.test(str) ||
            /franchise/i.test(str) ||
            /rkm/i.test(str) ||
            /^howrah$/i.test(str) ||
            /^durgapur$/i.test(str);
    };

    // Pending Report - Filter available centres based on selected pending zones (excluding zagartala, phsps, franchise)
    const filteredPendingCentresList = useMemo(() => {
        const allowedCentres = dbCentres.filter(c => !isExcludedPendingCentre(c.centreName || c.enterCode || ''));
        if (!pendingSelectedZones || pendingSelectedZones.length === 0) {
            return allowedCentres;
        }
        const selectedZoneIds = new Set(pendingSelectedZones.map(z => String(z.value || z._id || z)));
        const selectedZoneNames = new Set(pendingSelectedZones.map(z => String(z.label || z.name || z).toLowerCase().trim()));
        const allowedCentreIds = new Set();

        dbZones.forEach(zone => {
            if (selectedZoneIds.has(String(zone._id)) || selectedZoneNames.has(String(zone.name).toLowerCase().trim())) {
                (zone.centres || []).forEach(c => {
                    const cId = String(c._id || c);
                    allowedCentreIds.add(cId);
                });
            }
        });

        return allowedCentres.filter(c => allowedCentreIds.has(String(c._id)));
    }, [pendingSelectedZones, dbCentres, dbZones]);

    const pendingCentreOptions = useMemo(() => {
        return filteredPendingCentresList.map(c => ({
            value: c.centreName || c.enterCode || String(c._id),
            label: c.centreName || c.enterCode,
            id: String(c._id)
        }));
    }, [filteredPendingCentresList]);

    // Pending Report - Filtered Centre Matrix
    const filteredPendingCentres = useMemo(() => {
        if (!pendingReportData?.centreWiseCounts) return [];
        let list = pendingReportData.centreWiseCounts.filter(c => !isExcludedPendingCentre(c.centreName));

        // Zone filter
        if (pendingSelectedZones && pendingSelectedZones.length > 0) {
            const zoneIds = new Set(pendingSelectedZones.map(z => String(z.value || z._id || z)));
            const zoneNames = new Set(pendingSelectedZones.map(z => String(z.label || z.name || z).toLowerCase().trim()));
            list = list.filter(c => zoneIds.has(String(c.zoneId)) || zoneNames.has(String(c.zoneName).toLowerCase().trim()));
        }

        // Centre filter
        if (pendingSelectedCentres && pendingSelectedCentres.length > 0) {
            const centreNames = new Set(pendingSelectedCentres.map(c => String(c.value || c.label || c).toLowerCase().trim()));
            list = list.filter(c => centreNames.has(String(c.centreName).toLowerCase().trim()));
        }

        // Class filter
        if (pendingSelectedClass) {
            const clsKey = `class${pendingSelectedClass}`;
            list = list.filter(c => (c[clsKey] || 0) > 0);
        }

        // Search filter
        if (pendingSearch.trim()) {
            const q = pendingSearch.toLowerCase().trim();
            list = list.filter(c =>
                c.centreName.toLowerCase().includes(q) ||
                (c.zoneName && c.zoneName.toLowerCase().includes(q))
            );
        }

        return list;
    }, [pendingReportData, pendingSelectedZones, pendingSelectedCentres, pendingSelectedClass, pendingSearch]);

    // Pending Report - Column Totals for Filtered Centres
    const pendingTotals = useMemo(() => {
        const totals = {
            class6: 0,
            class7: 0,
            class8: 0,
            class9: 0,
            class10: 0,
            totalPending: 0,
            totalEnrolled: 0,
            carriedForwardCount: 0
        };

        filteredPendingCentres.forEach(c => {
            totals.class6 += (c.class6 || 0);
            totals.class7 += (c.class7 || 0);
            totals.class8 += (c.class8 || 0);
            totals.class9 += (c.class9 || 0);
            totals.class10 += (c.class10 || 0);
            totals.totalPending += (c.totalPending || 0);
            totals.totalEnrolled += (c.totalEnrolled || 0);
            totals.carriedForwardCount += (c.carriedForwardCount || 0);
        });

        const overallConversionRate = totals.totalEnrolled > 0
            ? `${((totals.carriedForwardCount / totals.totalEnrolled) * 100).toFixed(1)}%`
            : "0.0%";

        return { ...totals, overallConversionRate };
    }, [filteredPendingCentres]);

    // Drill-Down Student List Filtering
    const filteredDrillDownStudents = useMemo(() => {
        if (!pendingReportData?.students) return [];
        let list = pendingReportData.students.filter(s => !isExcludedPendingCentre(s.centre));

        if (drillDownCentre) {
            list = list.filter(s => String(s.centre).toLowerCase().trim() === String(drillDownCentre).toLowerCase().trim());
        }

        if (drillDownClass) {
            list = list.filter(s => String(s.currentClass).trim() === String(drillDownClass).trim());
        }

        if (drillDownSearch.trim()) {
            const q = drillDownSearch.toLowerCase().trim();
            list = list.filter(s =>
                (s.name && s.name.toLowerCase().includes(q)) ||
                (s.mobile && s.mobile.includes(q)) ||
                (s.admissionNumber && s.admissionNumber.toLowerCase().includes(q)) ||
                (s.courseName && s.courseName.toLowerCase().includes(q))
            );
        }

        return list;
    }, [pendingReportData, drillDownCentre, drillDownClass, drillDownSearch]);

    const paginatedDrillDownStudents = useMemo(() => {
        const start = (drillDownPage - 1) * drillDownPageSize;
        return filteredDrillDownStudents.slice(start, start + drillDownPageSize);
    }, [filteredDrillDownStudents, drillDownPage, drillDownPageSize]);

    const drillDownTotalPages = Math.ceil(filteredDrillDownStudents.length / drillDownPageSize) || 1;

    const handleOpenDrillDown = (centreName = null, className = null) => {
        setDrillDownCentre(centreName);
        setDrillDownClass(className);
        setDrillDownSearch("");
        setDrillDownPage(1);
        setDrillDownModalOpen(true);
    };

    const handleCloseDrillDown = () => {
        setDrillDownModalOpen(false);
        setDrillDownCentre(null);
        setDrillDownClass(null);
        setDrillDownSearch("");
    };

    // Export Centre-Wise Matrix to Excel
    const handleExportPendingMatrix = () => {
        if (!filteredPendingCentres || filteredPendingCentres.length === 0) {
            toast.warn("No centre data to export");
            return;
        }

        const exportData = filteredPendingCentres.map((c, idx) => ({
            "Sl No": idx + 1,
            "Zone": c.zoneName || "—",
            "Centre Name": c.centreName || "—",
            "Class 6 Pending": c.class6 || 0,
            "Class 7 Pending": c.class7 || 0,
            "Class 8 Pending": c.class8 || 0,
            "Class 9 Pending": c.class9 || 0,
            "Class 10 Pending": c.class10 || 0,
            "Total Pending Carry Forward": c.totalPending || 0,
            "Total Enrolled (6-10)": c.totalEnrolled || 0,
            "Carried Forward Count": c.carriedForwardCount || 0,
            "Conversion Rate": c.conversionRate || "0.0%"
        }));

        exportData.push({
            "Sl No": "TOTAL",
            "Zone": "",
            "Centre Name": "ALL CENTRES",
            "Class 6 Pending": pendingTotals.class6,
            "Class 7 Pending": pendingTotals.class7,
            "Class 8 Pending": pendingTotals.class8,
            "Class 9 Pending": pendingTotals.class9,
            "Class 10 Pending": pendingTotals.class10,
            "Total Pending Carry Forward": pendingTotals.totalPending,
            "Total Enrolled (6-10)": pendingTotals.totalEnrolled,
            "Carried Forward Count": pendingTotals.carriedForwardCount,
            "Conversion Rate": pendingTotals.overallConversionRate
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Centre_Wise_Pending_CF");
        XLSX.writeFile(workbook, `Carry_Forward_Pending_Matrix_${selectedPendingSession || 'Report'}.xlsx`);
        toast.success("Centre-wise pending report exported to Excel!");
    };

    // Export Drill-down Students List to Excel
    const handleExportDrillDownStudents = () => {
        if (!filteredDrillDownStudents || filteredDrillDownStudents.length === 0) {
            toast.warn("No student records to export");
            return;
        }

        const exportRows = filteredDrillDownStudents.map((s, idx) => ({
            "Sl No": idx + 1,
            "Student Name": s.name || "Unknown",
            "Admission / Roll No": s.admissionNumber || "—",
            "Mobile": s.mobile || "—",
            "WhatsApp": s.whatsappNumber || "—",
            "Email": s.email || "—",
            "Current Class": `Class ${s.currentClass}`,
            "Target Promotion": s.currentClass === '10' ? "Class 11 (2-Yr JEE/NEET/Board)" : `Class ${parseInt(s.currentClass, 10) + 1}`,
            "Academic Session": s.academicSession || "—",
            "Enrolled Course": s.courseName || "General",
            "Centre": s.centre || "—",
            "Zone": s.zoneName || "—",
            "Admission Date": s.admissionDate ? new Date(s.admissionDate).toLocaleDateString() : "—"
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Pending_Students");
        const centreTitle = (drillDownCentre || 'All_Centres').replace(/\s+/g, '_');
        XLSX.writeFile(workbook, `Pending_Students_${centreTitle}_${selectedPendingSession}.xlsx`);
        toast.success("Student list exported to Excel!");
    };

    // Client-side filtering for ultra-fast instant UI updates
    const filteredStudents = useMemo(() => {
        let result = students;

        // Search filter
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase().trim();
            result = result.filter(s =>
                (s.name && s.name.toLowerCase().includes(q)) ||
                (s.mobile && s.mobile.includes(q)) ||
                (s.email && s.email.toLowerCase().includes(q)) ||
                (s.admissionNumber && s.admissionNumber.toLowerCase().includes(q)) ||
                (s.centre && s.centre.toLowerCase().includes(q)) ||
                (s._id && s._id.toString().toLowerCase().includes(q))
            );
        }

        // Zone filter (multi-select)
        if (selectedZones && selectedZones.length > 0) {
            const zoneIds = new Set(selectedZones.map(z => String(z.value || z._id || z)));
            const zoneNames = new Set(selectedZones.map(z => String(z.label || z.name || z).toLowerCase().trim()));
            
            // Collect all centre names belonging to selected zones
            const allowedCentreNames = new Set();
            dbZones.forEach(zone => {
                if (zoneIds.has(String(zone._id)) || zoneNames.has(String(zone.name).toLowerCase().trim())) {
                    (zone.centres || []).forEach(c => {
                        if (c) {
                            if (c._id) allowedCentreNames.add(String(c._id).toLowerCase());
                            if (c.centreName) allowedCentreNames.add(String(c.centreName).toLowerCase().trim());
                            if (c.enterCode) allowedCentreNames.add(String(c.enterCode).toLowerCase().trim());
                        }
                    });
                }
            });

            result = result.filter(s => {
                const sZId = s.zoneId ? String(s.zoneId) : "";
                const sZName = s.zoneName ? String(s.zoneName).toLowerCase().trim() : "";
                const sCentre = s.centre ? String(s.centre).toLowerCase().trim() : "";

                return (sZId && zoneIds.has(sZId)) || 
                       (sZName && zoneNames.has(sZName)) ||
                       (sCentre && allowedCentreNames.has(sCentre));
            });
        }

        // Centre filter (multi-select)
        if (selectedCentres && selectedCentres.length > 0) {
            const selectedCentreValues = new Set(selectedCentres.map(c => String(c.value || c.label || c.centreName || c).toLowerCase().trim()));
            result = result.filter(s => 
                s.centre && selectedCentreValues.has(String(s.centre).toLowerCase().trim())
            );
        }

        // Class filter
        if (selectedClass) {
            const norm = (str) => String(str || "").toLowerCase().trim().replace(/^class\s+/i, '');
            const targetClass = norm(selectedClass);
            result = result.filter(s => norm(s.class) === targetClass);
        }

        // Date range filter
        if (fromDate || toDate) {
            const fromStr = fromDate ? String(fromDate).split('T')[0] : null;
            const toStr = toDate ? String(toDate).split('T')[0] : null;
            result = result.filter(s => {
                const rawDate = s.admissionDate || s.createdAt;
                if (!rawDate) return false;
                try {
                    const dStr = new Date(rawDate).toISOString().split('T')[0];
                    if (fromStr && dStr < fromStr) return false;
                    if (toStr && dStr > toStr) return false;
                    return true;
                } catch (e) {
                    return true;
                }
            });
        }

        return result;
    }, [students, searchTerm, selectedZones, selectedCentres, selectedClass, fromDate, toDate, dbZones]);

    // Reset pagination to page 1 on filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedZones, selectedCentres, selectedClass, fromDate, toDate]);

    // Paginated subset
    const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
    const paginatedStudents = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredStudents.slice(start, start + pageSize);
    }, [filteredStudents, currentPage, pageSize]);

    // Open Student Modal & Fetch detailed admissions
    const openStudentModal = async (student) => {
        setSelectedStudent(student);
        setIsModalOpen(true);
        setModalLoading(true);
        try {
            const token = localStorage.getItem("token");
            const headers = { "Authorization": `Bearer ${token}` };
            const res = await fetch(`${apiUrl}/carry-forward/student-details/${student._id}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setStudentAdmissions(data.admissions || []);
                if (data.student) {
                    setSelectedStudent(prev => ({ ...prev, ...data.student }));
                }
            } else {
                toast.error("Failed to load student course details");
            }
        } catch (err) {
            console.error("Error fetching student details:", err);
            toast.error("Error loading admissions");
        } finally {
            setModalLoading(false);
        }
    };

    const closeStudentModal = () => {
        setIsModalOpen(false);
        setSelectedStudent(null);
        setStudentAdmissions([]);
    };

    const handleEnrollNewCourse = () => {
        if (selectedStudent) {
            const existingRollNo = studentAdmissions?.[0]?.admissionNumber || selectedStudent.admissionNumber || selectedStudent.rollNo || '';
            navigate(`/admission/${selectedStudent._id}`, { state: { student: selectedStudent, rollNo: existingRollNo } });
        }
    };

    // Fast search enrolled student by admission number
    const handleSearchEnrolledStudent = async () => {
        if (!enrolledSearchTerm.trim()) {
            toast.error("Please enter an admission number to search");
            return;
        }

        setSearchLoading(true);
        try {
            const token = localStorage.getItem("token");
            const headers = { "Authorization": `Bearer ${token}` };

            const res = await fetch(`${apiUrl}/carry-forward/search-enrolled?admissionNumber=${encodeURIComponent(enrolledSearchTerm.trim())}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setSearchedStudent(data.student);
                setSearchedStudentAdmissions(data.admissions || []);
                toast.success(`Found student with ${data.admissions?.length || 0} enrolled course(s)`);
            } else {
                const errData = await res.json();
                toast.error(errData.message || "Student not found");
                setSearchedStudent(null);
                setSearchedStudentAdmissions([]);
            }
        } catch (err) {
            console.error("Error searching student:", err);
            toast.error("Error searching for student");
        } finally {
            setSearchLoading(false);
        }
    };

    const getInstallmentStatusColor = (status) => {
        switch (status) {
            case "PAID":
                return "bg-green-500/20 text-green-400 border border-green-500/30";
            case "PENDING_CLEARANCE":
                return "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30";
            case "OVERDUE":
                return "bg-red-500/20 text-red-400 border border-red-500/30";
            case "PENDING":
                return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
            default:
                return "bg-gray-500/20 text-gray-400 border border-gray-500/30";
        }
    };

    return (
        <Layout activePage="Course Management">
            <div className="flex-1 bg-[#131619] p-4 sm:p-6 overflow-y-auto text-white h-full">
                <ToastContainer position="top-right" theme="dark" />

                {/* Page Title */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-cyan-400 tracking-tight">Carry Forward Management</h2>
                        <p className="text-gray-400 text-sm mt-1">Track students who have enrolled in multiple courses or have carry forward balances</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-800">
                    <button
                        onClick={() => setActiveTab("pendingReport")}
                        className={`px-6 py-3 font-semibold transition-colors relative flex items-center gap-2 cursor-pointer ${
                            activeTab === "pendingReport"
                                ? "text-cyan-400 border-b-2 border-cyan-400"
                                : "text-gray-400 hover:text-gray-300"
                        }`}
                    >
                        <FaExclamationCircle className="text-amber-400" />
                        Pending Carry Forward (Classes 6-10)
                        {pendingTotals.totalPending > 0 && (
                            <span className="ml-1.5 px-2 py-0.5 text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full font-bold">
                                {pendingTotals.totalPending}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("carryForward")}
                        className={`px-6 py-3 font-semibold transition-colors relative flex items-center gap-2 cursor-pointer ${
                            activeTab === "carryForward"
                                ? "text-cyan-400 border-b-2 border-cyan-400"
                                : "text-gray-400 hover:text-gray-300"
                        }`}
                    >
                        <FaMoneyBillWave />
                        Carry Forward Students ({students.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("enrolled")}
                        className={`px-6 py-3 font-semibold transition-colors relative flex items-center gap-2 cursor-pointer ${
                            activeTab === "enrolled"
                                ? "text-cyan-400 border-b-2 border-cyan-400"
                                : "text-gray-400 hover:text-gray-300"
                        }`}
                    >
                        <FaUserGraduate />
                        Search Enrolled Students
                    </button>
                </div>

                {/* ================= PENDING CARRY FORWARD TAB ================= */}
                {activeTab === "pendingReport" && (
                    <div className="space-y-6">
                        {/* KPI Summary Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                            {/* Total Pending */}
                            <div className="bg-gradient-to-br from-[#1a1f24] to-[#20272f] p-4 rounded-2xl border border-amber-500/30 shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">Total Pending CF</span>
                                <div className="text-2xl sm:text-3xl font-black text-amber-300 mt-1">
                                    {pendingTotals.totalPending.toLocaleString()}
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1 block">
                                    of {pendingTotals.totalEnrolled.toLocaleString()} enrolled
                                </span>
                            </div>

                            {/* Class 6 */}
                            <div 
                                onClick={() => setPendingSelectedClass(pendingSelectedClass === '6' ? '' : '6')}
                                className={`bg-[#1a1f24] p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] shadow-md ${
                                    pendingSelectedClass === '6' ? 'border-blue-400 bg-blue-500/10 shadow-blue-500/10' : 'border-gray-800 hover:border-gray-700'
                                }`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Class 6</span>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold">To Cl. 7</span>
                                </div>
                                <div className="text-xl sm:text-2xl font-bold text-white mt-1">
                                    {pendingTotals.class6.toLocaleString()}
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1 block">pending</span>
                            </div>

                            {/* Class 7 */}
                            <div 
                                onClick={() => setPendingSelectedClass(pendingSelectedClass === '7' ? '' : '7')}
                                className={`bg-[#1a1f24] p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] shadow-md ${
                                    pendingSelectedClass === '7' ? 'border-cyan-400 bg-cyan-500/10 shadow-cyan-500/10' : 'border-gray-800 hover:border-gray-700'
                                }`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Class 7</span>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold">To Cl. 8</span>
                                </div>
                                <div className="text-xl sm:text-2xl font-bold text-white mt-1">
                                    {pendingTotals.class7.toLocaleString()}
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1 block">pending</span>
                            </div>

                            {/* Class 8 */}
                            <div 
                                onClick={() => setPendingSelectedClass(pendingSelectedClass === '8' ? '' : '8')}
                                className={`bg-[#1a1f24] p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] shadow-md ${
                                    pendingSelectedClass === '8' ? 'border-teal-400 bg-teal-500/10 shadow-teal-500/10' : 'border-gray-800 hover:border-gray-700'
                                }`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Class 8</span>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-semibold">To Cl. 9</span>
                                </div>
                                <div className="text-xl sm:text-2xl font-bold text-white mt-1">
                                    {pendingTotals.class8.toLocaleString()}
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1 block">pending</span>
                            </div>

                            {/* Class 9 */}
                            <div 
                                onClick={() => setPendingSelectedClass(pendingSelectedClass === '9' ? '' : '9')}
                                className={`bg-[#1a1f24] p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] shadow-md ${
                                    pendingSelectedClass === '9' ? 'border-purple-400 bg-purple-500/10 shadow-purple-500/10' : 'border-gray-800 hover:border-gray-700'
                                }`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Class 9</span>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold">To Cl. 10</span>
                                </div>
                                <div className="text-xl sm:text-2xl font-bold text-white mt-1">
                                    {pendingTotals.class9.toLocaleString()}
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1 block">pending</span>
                            </div>

                            {/* Class 10 (Target: 2-Year JEE/NEET/Board) */}
                            <div 
                                onClick={() => setPendingSelectedClass(pendingSelectedClass === '10' ? '' : '10')}
                                className={`bg-gradient-to-br from-[#1a1f24] to-[#2b1f2a] p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] shadow-md ${
                                    pendingSelectedClass === '10' ? 'border-rose-400 bg-rose-500/20 ring-1 ring-rose-400' : 'border-rose-500/30 hover:border-rose-400/60'
                                }`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Class 10</span>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">2-Yr JEE/NEET</span>
                                </div>
                                <div className="text-xl sm:text-2xl font-bold text-rose-300 mt-1">
                                    {pendingTotals.class10.toLocaleString()}
                                </div>
                                <span className="text-[10px] text-rose-400/80 mt-1 block font-medium">To Class 11</span>
                            </div>

                            {/* Carry Forward Conversion Rate */}
                            <div className="bg-[#1a1f24] p-4 rounded-2xl border border-emerald-500/30 shadow-md">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Promoted Rate</span>
                                <div className="text-xl sm:text-2xl font-bold text-emerald-300 mt-1">
                                    {pendingTotals.overallConversionRate}
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1 block truncate">
                                    {pendingTotals.carriedForwardCount.toLocaleString()} promoted
                                </span>
                            </div>
                        </div>

                        {/* Filters & Actions Bar */}
                        <div className="bg-[#1a1f24] p-4 sm:p-5 rounded-2xl border border-gray-800 shadow-lg">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
                                {/* Academic Session Selector */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block flex items-center gap-1.5">
                                        <FaCalendar className="text-xs" /> Academic Session
                                    </label>
                                    <select
                                        value={selectedPendingSession}
                                        onChange={(e) => handlePendingSessionChange(e.target.value)}
                                        className="w-full bg-[#131619] border border-cyan-500/40 rounded-xl px-3 py-2 text-xs text-cyan-300 font-semibold focus:outline-none focus:border-cyan-400 cursor-pointer h-[38px]"
                                    >
                                        {(pendingReportData?.availableSessions || []).map(sess => (
                                            <option key={sess} value={sess}>Session {sess}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Zone Multi-Select */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Zone</label>
                                    <CustomMultiSelect
                                        options={zoneOptions}
                                        value={pendingSelectedZones}
                                        onChange={(selected) => {
                                            setPendingSelectedZones(selected || []);
                                            setPendingSelectedCentres([]);
                                        }}
                                        placeholder="All Zones"
                                        isDarkMode={true}
                                        maxShowTags={1}
                                    />
                                </div>

                                {/* Centre Multi-Select */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Centre</label>
                                    <CustomMultiSelect
                                        options={pendingCentreOptions}
                                        value={pendingSelectedCentres}
                                        onChange={(selected) => setPendingSelectedCentres(selected || [])}
                                        placeholder="All Centres"
                                        isDarkMode={true}
                                        maxShowTags={1}
                                    />
                                </div>

                                {/* Class Filter */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Filter by Class</label>
                                    <select
                                        value={pendingSelectedClass}
                                        onChange={(e) => setPendingSelectedClass(e.target.value)}
                                        className="w-full bg-[#131619] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer h-[38px]"
                                    >
                                        <option value="">All Classes (6 to 10)</option>
                                        <option value="6">Class 6 (→ Class 7)</option>
                                        <option value="7">Class 7 (→ Class 8)</option>
                                        <option value="8">Class 8 (→ Class 9)</option>
                                        <option value="9">Class 9 (→ Class 10)</option>
                                        <option value="10">Class 10 (→ Class 11 2-Yr JEE/NEET/Board)</option>
                                    </select>
                                </div>

                                {/* Search & Export Buttons */}
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
                                        <input
                                            type="text"
                                            placeholder="Search centre..."
                                            value={pendingSearch}
                                            onChange={(e) => setPendingSearch(e.target.value)}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 h-[38px]"
                                        />
                                    </div>
                                    <button
                                        onClick={handleExportPendingMatrix}
                                        className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer h-[38px] transition-all"
                                        title="Export Centre Summary to Excel"
                                    >
                                        <FaFileExcel size={13} />
                                        <span className="hidden sm:inline">Export</span>
                                    </button>
                                </div>
                            </div>

                            {/* Active Filter Badges */}
                            {(pendingSelectedZones.length > 0 || pendingSelectedCentres.length > 0 || pendingSelectedClass || pendingSearch) && (
                                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-800 text-xs">
                                    <span className="text-gray-400 font-semibold text-[11px]">Filters:</span>
                                    {pendingSelectedZones.map(z => (
                                        <span key={z.value} className="px-2 py-0.5 bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded-lg flex items-center gap-1 text-[11px]">
                                            Zone: {z.label}
                                            <button onClick={() => setPendingSelectedZones(p => p.filter(x => x.value !== z.value))} className="hover:text-white cursor-pointer ml-1">×</button>
                                        </span>
                                    ))}
                                    {pendingSelectedCentres.map(c => (
                                        <span key={c.value} className="px-2 py-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/30 rounded-lg flex items-center gap-1 text-[11px]">
                                            Centre: {c.label}
                                            <button onClick={() => setPendingSelectedCentres(p => p.filter(x => x.value !== c.value))} className="hover:text-white cursor-pointer ml-1">×</button>
                                        </span>
                                    ))}
                                    {pendingSelectedClass && (
                                        <span className="px-2 py-0.5 bg-rose-500/10 text-rose-300 border border-rose-500/30 rounded-lg flex items-center gap-1 text-[11px]">
                                            Class: {pendingSelectedClass}
                                            <button onClick={() => setPendingSelectedClass("")} className="hover:text-white cursor-pointer ml-1">×</button>
                                        </span>
                                    )}
                                    {pendingSearch && (
                                        <span className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded-lg flex items-center gap-1 text-[11px]">
                                            Search: "{pendingSearch}"
                                            <button onClick={() => setPendingSearch("")} className="hover:text-white cursor-pointer ml-1">×</button>
                                        </span>
                                    )}
                                    <button
                                        onClick={() => {
                                            setPendingSelectedZones([]);
                                            setPendingSelectedCentres([]);
                                            setPendingSelectedClass("");
                                            setPendingSearch("");
                                        }}
                                        className="text-red-400 hover:text-red-300 text-[11px] font-semibold underline cursor-pointer ml-1"
                                    >
                                        Clear
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Centre-Wise Breakdown Matrix Table */}
                        <div className="bg-[#1a1f24] rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-6 py-4 border-b border-gray-800 bg-[#171b20] gap-2">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-sm font-bold text-white tracking-wide">Centre-Wise Pending Carry Forward</span>
                                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold">
                                        {filteredPendingCentres.length} Centres
                                    </span>
                                </div>
                                <div className="text-xs text-gray-400 flex items-center gap-2">
                                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                                    <span>Click any count cell to view student details</span>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-[#1e2329] text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-800">
                                            <th className="px-4 py-3.5 w-12 text-center">#</th>
                                            <th className="px-4 py-3.5">Zone</th>
                                            <th className="px-4 py-3.5">Centre Name</th>
                                            <th className="px-3 py-3.5 text-center font-bold text-blue-300">Class 6</th>
                                            <th className="px-3 py-3.5 text-center font-bold text-cyan-300">Class 7</th>
                                            <th className="px-3 py-3.5 text-center font-bold text-teal-300">Class 8</th>
                                            <th className="px-3 py-3.5 text-center font-bold text-purple-300">Class 9</th>
                                            <th className="px-3 py-3.5 text-center font-bold text-rose-300 bg-rose-500/5">
                                                Class 10 <span className="text-[9px] font-normal block opacity-80">(JEE/NEET)</span>
                                            </th>
                                            <th className="px-4 py-3.5 text-center font-bold text-amber-300 bg-amber-500/5">Total Pending</th>
                                            <th className="px-3 py-3.5 text-center">Enrolled</th>
                                            <th className="px-3 py-3.5 text-center text-emerald-400">Promoted</th>
                                            <th className="px-3 py-3.5 text-center">Rate</th>
                                            <th className="px-4 py-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800/60 font-sans">
                                        {pendingLoading ? (
                                            <tr>
                                                <td colSpan="13" className="p-16 text-center text-gray-400">
                                                    <FaSpinner className="text-3xl text-cyan-400 animate-spin mx-auto mb-3" />
                                                    <p className="text-sm">Calculating pending carry forward counts across all centres...</p>
                                                </td>
                                            </tr>
                                        ) : filteredPendingCentres.length === 0 ? (
                                            <tr>
                                                <td colSpan="13" className="p-16 text-center text-gray-500">
                                                    <FaGraduationCap className="text-4xl mx-auto mb-3 opacity-30" />
                                                    <p className="text-sm">No centres matching criteria or 0 students pending carry forward.</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredPendingCentres.map((centreRow, idx) => (
                                                <tr key={centreRow.centreName || idx} className="hover:bg-gray-800/35 transition-colors">
                                                    <td className="px-4 py-3 text-center text-gray-500 font-mono">{idx + 1}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 whitespace-nowrap">
                                                            {centreRow.zoneName || "—"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="font-bold text-white text-xs tracking-tight">
                                                            {centreRow.centreName}
                                                        </span>
                                                    </td>

                                                    {/* Class 6 */}
                                                    <td className="px-3 py-3 text-center">
                                                        <button
                                                            disabled={!centreRow.class6}
                                                            onClick={() => handleOpenDrillDown(centreRow.centreName, '6')}
                                                            className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${
                                                                centreRow.class6 > 0
                                                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 hover:scale-105 cursor-pointer'
                                                                    : 'text-gray-600 cursor-default'
                                                            }`}
                                                        >
                                                            {centreRow.class6 || 0}
                                                        </button>
                                                    </td>

                                                    {/* Class 7 */}
                                                    <td className="px-3 py-3 text-center">
                                                        <button
                                                            disabled={!centreRow.class7}
                                                            onClick={() => handleOpenDrillDown(centreRow.centreName, '7')}
                                                            className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${
                                                                centreRow.class7 > 0
                                                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 hover:scale-105 cursor-pointer'
                                                                    : 'text-gray-600 cursor-default'
                                                            }`}
                                                        >
                                                            {centreRow.class7 || 0}
                                                        </button>
                                                    </td>

                                                    {/* Class 8 */}
                                                    <td className="px-3 py-3 text-center">
                                                        <button
                                                            disabled={!centreRow.class8}
                                                            onClick={() => handleOpenDrillDown(centreRow.centreName, '8')}
                                                            className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${
                                                                centreRow.class8 > 0
                                                                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 hover:scale-105 cursor-pointer'
                                                                    : 'text-gray-600 cursor-default'
                                                            }`}
                                                        >
                                                            {centreRow.class8 || 0}
                                                        </button>
                                                    </td>

                                                    {/* Class 9 */}
                                                    <td className="px-3 py-3 text-center">
                                                        <button
                                                            disabled={!centreRow.class9}
                                                            onClick={() => handleOpenDrillDown(centreRow.centreName, '9')}
                                                            className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${
                                                                centreRow.class9 > 0
                                                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 hover:scale-105 cursor-pointer'
                                                                    : 'text-gray-600 cursor-default'
                                                            }`}
                                                        >
                                                            {centreRow.class9 || 0}
                                                        </button>
                                                    </td>

                                                    {/* Class 10 (Target: 2-Year JEE/NEET/Board) */}
                                                    <td className="px-3 py-3 text-center bg-rose-500/5">
                                                        <button
                                                            disabled={!centreRow.class10}
                                                            onClick={() => handleOpenDrillDown(centreRow.centreName, '10')}
                                                            className={`px-3 py-1 rounded-lg font-extrabold text-xs transition-all ${
                                                                centreRow.class10 > 0
                                                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 hover:scale-105 cursor-pointer shadow-sm'
                                                                    : 'text-gray-600 cursor-default'
                                                            }`}
                                                            title="Class 10 students pending promotion to Class 11 2-Yr JEE/NEET/Board"
                                                        >
                                                            {centreRow.class10 || 0}
                                                        </button>
                                                    </td>

                                                    {/* Total Pending */}
                                                    <td className="px-4 py-3 text-center bg-amber-500/5">
                                                        <button
                                                            disabled={!centreRow.totalPending}
                                                            onClick={() => handleOpenDrillDown(centreRow.centreName, null)}
                                                            className={`px-3 py-1 rounded-xl font-black text-xs transition-all ${
                                                                centreRow.totalPending > 0
                                                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 hover:scale-105 cursor-pointer'
                                                                    : 'text-gray-600 cursor-default'
                                                            }`}
                                                        >
                                                            {centreRow.totalPending || 0}
                                                        </button>
                                                    </td>

                                                    <td className="px-3 py-3 text-center text-gray-300 font-mono">{centreRow.totalEnrolled || 0}</td>
                                                    <td className="px-3 py-3 text-center text-emerald-400 font-mono font-bold">{centreRow.carriedForwardCount || 0}</td>
                                                    <td className="px-3 py-3 text-center text-gray-400 text-[11px] font-mono">{centreRow.conversionRate}</td>

                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            onClick={() => handleOpenDrillDown(centreRow.centreName, null)}
                                                            className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-xl text-[11px] font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                                                        >
                                                            <FaEye size={11} /> Students
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>

                                    {/* Table Footer - Sticky Grand Totals */}
                                    {filteredPendingCentres.length > 0 && (
                                        <tfoot>
                                            <tr className="bg-[#14181c] border-t-2 border-gray-700 font-bold text-white text-xs">
                                                <td className="px-4 py-3.5 text-center text-cyan-400 font-mono">Σ</td>
                                                <td className="px-4 py-3.5 text-gray-400 uppercase text-[10px]">Total</td>
                                                <td className="px-4 py-3.5 text-cyan-300 uppercase tracking-wider font-extrabold">
                                                    ALL CENTRES ({filteredPendingCentres.length})
                                                </td>
                                                <td className="px-3 py-3.5 text-center text-blue-300 font-mono text-sm">{pendingTotals.class6.toLocaleString()}</td>
                                                <td className="px-3 py-3.5 text-center text-cyan-300 font-mono text-sm">{pendingTotals.class7.toLocaleString()}</td>
                                                <td className="px-3 py-3.5 text-center text-teal-300 font-mono text-sm">{pendingTotals.class8.toLocaleString()}</td>
                                                <td className="px-3 py-3.5 text-center text-purple-300 font-mono text-sm">{pendingTotals.class9.toLocaleString()}</td>
                                                <td className="px-3 py-3.5 text-center text-rose-300 font-mono text-sm bg-rose-500/10 font-black">{pendingTotals.class10.toLocaleString()}</td>
                                                <td className="px-4 py-3.5 text-center text-amber-300 font-mono text-sm bg-amber-500/10 font-black">{pendingTotals.totalPending.toLocaleString()}</td>
                                                <td className="px-3 py-3.5 text-center text-gray-300 font-mono">{pendingTotals.totalEnrolled.toLocaleString()}</td>
                                                <td className="px-3 py-3.5 text-center text-emerald-400 font-mono font-black">{pendingTotals.carriedForwardCount.toLocaleString()}</td>
                                                <td className="px-3 py-3.5 text-center text-emerald-300 font-mono">{pendingTotals.overallConversionRate}</td>
                                                <td className="px-4 py-3.5 text-right">
                                                    <button
                                                        onClick={() => handleOpenDrillDown(null, null)}
                                                        className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer shadow-md"
                                                    >
                                                        View All Students
                                                    </button>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ================= CARRY FORWARD STUDENTS TAB ================= */}
                {activeTab === "carryForward" && (
                    <>
                        {/* Filters & Search Row */}
                        <div className="bg-[#1a1f24] p-5 rounded-2xl border border-gray-800 mb-6 shadow-lg">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                {/* Search input */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Search</label>
                                    <div className="relative">
                                        <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
                                        <input
                                            type="text"
                                            placeholder="Name, Mobile or ID..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all h-[38px]"
                                        />
                                    </div>
                                </div>

                                {/* Multi-Selection Zone Filter */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Zone</label>
                                    <CustomMultiSelect
                                        options={zoneOptions}
                                        value={selectedZones}
                                        onChange={(selected) => {
                                            setSelectedZones(selected || []);
                                            setSelectedCentres([]);
                                        }}
                                        placeholder="All Zones"
                                        isDarkMode={true}
                                        maxShowTags={1}
                                    />
                                </div>

                                {/* Multi-Selection Centre Filter (Cascaded by Zone) */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Centre</label>
                                    <CustomMultiSelect
                                        options={centreOptions}
                                        value={selectedCentres}
                                        onChange={(selected) => setSelectedCentres(selected || [])}
                                        placeholder="All Centres"
                                        isDarkMode={true}
                                        maxShowTags={1}
                                    />
                                </div>

                                {/* Class filter */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Class</label>
                                    <select
                                        value={selectedClass}
                                        onChange={(e) => setSelectedClass(e.target.value)}
                                        className="w-full bg-[#131619] border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer transition-all h-[38px]"
                                    >
                                        <option value="">All Classes</option>
                                        {classes.map(cls => (
                                            <option key={cls._id || cls.name} value={cls.name}>{cls.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Date Range Filter */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Date Range</label>
                                    <select
                                        value={datePreset}
                                        onChange={(e) => applyDatePreset(e.target.value)}
                                        className={`w-full bg-[#131619] border rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer transition-all h-[38px] ${
                                            datePreset ? 'border-cyan-500 text-cyan-300' : 'border-gray-700'
                                        }`}
                                    >
                                        <option value="">-- Select Range --</option>
                                        <option value="today">Today</option>
                                        <option value="yesterday">Yesterday</option>
                                        <option value="thisWeek">This Week</option>
                                        <option value="prevWeek">Previous Week</option>
                                        <option value="thisMonth">This Month</option>
                                        <option value="prevMonth">Previous Month</option>
                                        <option value="thisYear">This Year</option>
                                        <option value="prevYear">Previous Year</option>
                                        <option value="custom">Custom</option>
                                    </select>
                                </div>
                            </div>

                            {/* Custom Date Pickers (Shown when Custom is selected) */}
                            {showCustomDates && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-800/80">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">From Date</label>
                                        <input
                                            type="date"
                                            value={fromDate}
                                            onChange={(e) => {
                                                setFromDate(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">To Date</label>
                                        <input
                                            type="date"
                                            value={toDate}
                                            onChange={(e) => {
                                                setToDate(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Active Filter Badges */}
                            {(selectedZones.length > 0 || selectedCentres.length > 0 || selectedClass || searchTerm || fromDate || toDate) && (
                                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-800/80 text-xs">
                                    <span className="text-gray-400 font-semibold">Active Filters:</span>
                                    {selectedZones.map(z => (
                                        <span key={z.value} className="px-2.5 py-1 bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded-lg flex items-center gap-1.5">
                                            Zone: {z.label}
                                            <button onClick={() => setSelectedZones(p => p.filter(x => x.value !== z.value))} className="hover:text-white cursor-pointer">×</button>
                                        </span>
                                    ))}
                                    {selectedCentres.map(c => (
                                        <span key={c.value} className="px-2.5 py-1 bg-purple-500/10 text-purple-300 border border-purple-500/30 rounded-lg flex items-center gap-1.5">
                                            Centre: {c.label}
                                            <button onClick={() => setSelectedCentres(p => p.filter(x => x.value !== c.value))} className="hover:text-white cursor-pointer">×</button>
                                        </span>
                                    ))}
                                    {selectedClass && (
                                        <span className="px-2.5 py-1 bg-blue-500/10 text-blue-300 border border-blue-500/30 rounded-lg flex items-center gap-1.5">
                                            Class: {selectedClass}
                                            <button onClick={() => setSelectedClass("")} className="hover:text-white cursor-pointer">×</button>
                                        </span>
                                    )}
                                    {(fromDate || toDate) && (
                                        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-lg flex items-center gap-1.5">
                                            Date: {fromDate || 'Start'} → {toDate || 'End'}
                                            <button onClick={() => {
                                                setDatePreset("");
                                                setShowCustomDates(false);
                                                setFromDate("");
                                                setToDate("");
                                            }} className="hover:text-white cursor-pointer">×</button>
                                        </span>
                                    )}
                                    {searchTerm && (
                                        <span className="px-2.5 py-1 bg-gray-700 text-gray-300 rounded-lg flex items-center gap-1.5">
                                            Search: "{searchTerm}"
                                            <button onClick={() => setSearchTerm("")} className="hover:text-white cursor-pointer">×</button>
                                        </span>
                                    )}
                                    <button
                                        onClick={() => {
                                            setSelectedZones([]);
                                            setSelectedCentres([]);
                                            setSelectedClass("");
                                            setSearchTerm("");
                                            setDatePreset("");
                                            setShowCustomDates(false);
                                            setFromDate("");
                                            setToDate("");
                                        }}
                                        className="text-red-400 hover:text-red-300 ml-2 font-semibold underline cursor-pointer"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Students List Table */}
                        <div className="bg-[#1a1f24] rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#171b20]">
                                <div className="flex items-center gap-2 text-sm text-gray-300 font-semibold">
                                    <span>Students</span>
                                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                        {filteredStudents.length} record(s)
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <span>Rows per page:</span>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => setPageSize(Number(e.target.value))}
                                        className="bg-[#131619] border border-gray-700 rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                                    >
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                        <option value={200}>200</option>
                                    </select>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-[#1e2329] text-gray-400 text-xs uppercase tracking-wider font-semibold border-b border-gray-800">
                                            <th className="px-5 py-4">Student Name</th>
                                            <th className="px-5 py-4">Mobile</th>
                                            <th className="px-5 py-4">Zone</th>
                                            <th className="px-5 py-4">Centre</th>
                                            <th className="px-5 py-4">Class</th>
                                            <th className="px-5 py-4 text-center">Courses</th>
                                            <th className="px-5 py-4">CF Balance</th>
                                            <th className="px-5 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800/60">
                                        {loading ? (
                                            <tr>
                                                <td colSpan="8" className="p-16 text-center text-gray-400">
                                                    <FaSpinner className="text-3xl text-cyan-400 animate-spin mx-auto mb-3" />
                                                    <p>Loading carry forward students...</p>
                                                </td>
                                            </tr>
                                        ) : paginatedStudents.length === 0 ? (
                                            <tr>
                                                <td colSpan="8" className="p-16 text-center text-gray-500">
                                                    <FaUserGraduate className="text-4xl mx-auto mb-3 opacity-30" />
                                                    <p>No carry forward students found matching criteria</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedStudents.map(student => {
                                                const hasMultipleCourses = student.admissionCount > 1;
                                                const hasCarryForward = student.carryForwardBalance > 0 || student.markedForCarryForward;

                                                return (
                                                    <tr
                                                        key={student._id}
                                                        className="hover:bg-gray-800/40 transition-colors cursor-pointer"
                                                        onClick={() => openStudentModal(student)}
                                                    >
                                                        <td className="px-5 py-4">
                                                            <div className="font-semibold text-white">{student.name || "Unknown"}</div>
                                                            {student.email && (
                                                                <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[220px]">{student.email}</div>
                                                            )}
                                                            <div className="flex gap-1.5 mt-1.5">
                                                                {hasMultipleCourses && (
                                                                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[10px] font-semibold uppercase">
                                                                        Next Course
                                                                    </span>
                                                                )}
                                                                {hasCarryForward && (
                                                                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded text-[10px] font-semibold uppercase">
                                                                        CF Balance
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4 text-gray-300 font-mono text-xs">{student.mobile || "—"}</td>
                                                        <td className="px-5 py-4">
                                                            <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                                                {student.zoneName || "—"}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-4 text-gray-200 font-medium">{student.centre || "—"}</td>
                                                        <td className="px-5 py-4">
                                                            <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold">
                                                                {student.class || "—"}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-4 text-center">
                                                            <span className="inline-flex items-center justify-center w-7 h-7 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold">
                                                                {student.admissionCount || 0}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-4 text-yellow-400 font-bold text-sm">
                                                            ₹{(student.carryForwardBalance || 0).toLocaleString()}
                                                        </td>
                                                        <td className="px-5 py-4 text-right">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openStudentModal(student);
                                                                }}
                                                                className="px-3.5 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                                                            >
                                                                View Details <FaEye size={11} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {filteredStudents.length > pageSize && (
                                <div className="px-6 py-4 bg-[#171b20] border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-400">
                                    <div>
                                        Showing <span className="text-white font-semibold">{((currentPage - 1) * pageSize) + 1}</span> to <span className="text-white font-semibold">{Math.min(currentPage * pageSize, filteredStudents.length)}</span> of <span className="text-white font-semibold">{filteredStudents.length}</span> students
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 transition-all"
                                        >
                                            <FaChevronLeft size={10} /> Prev
                                        </button>
                                        <span className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-cyan-400 font-semibold">
                                            {currentPage} / {totalPages}
                                        </span>
                                        <button
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 transition-all"
                                        >
                                            Next <FaChevronRight size={10} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ================= SEARCH ENROLLED STUDENTS TAB ================= */}
                {activeTab === "enrolled" && (
                    <>
                        <div className="bg-[#1a1f24] p-6 rounded-2xl border border-gray-800 mb-6 shadow-xl">
                            <p className="text-gray-400 text-sm mb-4">
                                Search for enrolled students by their Admission Number or Mobile to view course details and enroll them into new courses.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
                                    <input
                                        type="text"
                                        placeholder="Enter Admission Number (e.g., PATH202300001) or Mobile Number..."
                                        value={enrolledSearchTerm}
                                        onChange={(e) => setEnrolledSearchTerm(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearchEnrolledStudent()}
                                        className="w-full bg-[#131619] border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all text-sm"
                                    />
                                </div>
                                <button
                                    onClick={handleSearchEnrolledStudent}
                                    disabled={searchLoading}
                                    className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {searchLoading ? <FaSpinner className="animate-spin" /> : "Search"}
                                </button>
                            </div>
                        </div>

                        {/* Search Results */}
                        {searchedStudent && (
                            <div className="bg-[#1a1f24] rounded-2xl border border-gray-800 p-6 shadow-xl">
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-6 border-b border-gray-800">
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-2">
                                            {searchedStudent.studentsDetails?.[0]?.studentName || "Student Details"}
                                        </h3>
                                        <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                                            <span>Admission No: <strong className="text-cyan-400">{searchedStudentAdmissions?.[0]?.admissionNumber || "N/A"}</strong></span>
                                            <span>Mobile: <strong className="text-gray-200">{searchedStudent.studentsDetails?.[0]?.mobileNum || "N/A"}</strong></span>
                                            <span>Centre: <strong className="text-gray-200">{searchedStudent.studentsDetails?.[0]?.centre || "N/A"}</strong></span>
                                            <span>Email: <strong className="text-gray-200">{searchedStudent.studentsDetails?.[0]?.studentEmail || "N/A"}</strong></span>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            onClick={() => {
                                                const existingRollNo = searchedStudentAdmissions?.[0]?.admissionNumber || searchedStudent?.admissionNumber || searchedStudent?.rollNo || '';
                                                navigate(`/admission/${searchedStudent._id}`, { state: { student: searchedStudent, rollNo: existingRollNo } });
                                            }}
                                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
                                            title="Enroll in a Normal Course"
                                        >
                                            Enroll Normal Course <FaArrowRight />
                                        </button>
                                        <button
                                            onClick={() => {
                                                const existingRollNo = searchedStudentAdmissions?.[0]?.admissionNumber || searchedStudent?.admissionNumber || searchedStudent?.rollNo || '';
                                                navigate(`/board-course-admission/${searchedStudent._id}`, { state: { student: searchedStudent, rollNo: existingRollNo } });
                                            }}
                                            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-500/20 flex items-center gap-2 cursor-pointer"
                                            title="Enroll in a Board Course"
                                        >
                                            Enroll Board Course <FaArrowRight />
                                        </button>
                                        <button
                                            onClick={() => navigate(`/pntse/add-student`, { state: { student: searchedStudent, rollNo: searchedStudentAdmissions?.[0]?.admissionNumber || '' } })}
                                            className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-cyan-500/20 flex items-center gap-2 cursor-pointer"
                                            title="Carry Forward to PNTSE Course"
                                        >
                                            Carry Forward PNTSE <FaArrowRight />
                                        </button>
                                        <button
                                            onClick={() => navigate(`/pmo/add-student`, { state: { student: searchedStudent, rollNo: searchedStudentAdmissions?.[0]?.admissionNumber || '' } })}
                                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer"
                                            title="Carry Forward to PMO Course"
                                        >
                                            Carry Forward PMO <FaArrowRight />
                                        </button>
                                    </div>
                                </div>

                                {/* Enrolled Courses */}
                                <div className="space-y-4">
                                    <h4 className="text-base font-semibold text-cyan-400 flex items-center gap-2">
                                        <FaBook /> Enrolled Courses ({searchedStudentAdmissions.length})
                                    </h4>
                                    {searchedStudentAdmissions.map((admission, idx) => (
                                        <div key={admission._id || idx} className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/80">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h5 className="text-white font-semibold">{admission.course?.courseName || admission.boardCourseName || "Course"}</h5>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {admission.department?.departmentName || "General"} • Session: {admission.academicSession || "N/A"}
                                                    </p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                                                    admission.paymentStatus === 'COMPLETED' || admission.paymentStatus === 'PAID' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                                    admission.paymentStatus === 'PARTIAL' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                                    'bg-red-500/20 text-red-400 border border-red-500/30'
                                                }`}>
                                                    {admission.paymentStatus || 'ACTIVE'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 text-xs">
                                                <div className="bg-[#131619] p-3 rounded-lg border border-gray-800">
                                                    <span className="text-gray-400 block mb-0.5">Total Fees:</span>
                                                    <p className="text-white font-bold text-sm">₹{(admission.totalFees || 0).toLocaleString()}</p>
                                                </div>
                                                <div className="bg-[#131619] p-3 rounded-lg border border-gray-800">
                                                    <span className="text-gray-400 block mb-0.5">Paid:</span>
                                                    <p className="text-emerald-400 font-bold text-sm">₹{(admission.totalPaidAmount || 0).toLocaleString()}</p>
                                                </div>
                                                <div className="bg-[#131619] p-3 rounded-lg border border-gray-800">
                                                    <span className="text-gray-400 block mb-0.5">Pending:</span>
                                                    <p className="text-yellow-400 font-bold text-sm">
                                                        ₹{Math.max(0, (admission.totalFees || 0) - (admission.totalPaidAmount || 0)).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ================= STUDENT DETAILS MODAL ================= */}
                {isModalOpen && selectedStudent && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                        <div className="bg-[#1a1f24] rounded-2xl w-full max-w-5xl border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto my-8 text-left">
                            {/* Modal Header */}
                            <div className="sticky top-0 bg-[#171b20] p-6 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10">
                                <div>
                                    <h3 className="text-xl font-bold text-white">
                                        {selectedStudent.name || selectedStudent.studentsDetails?.[0]?.studentName || "Student Details"}
                                    </h3>
                                    <div className="flex flex-wrap gap-4 text-xs text-gray-400 mt-1.5">
                                        <span>Admission No: <strong className="text-cyan-400">{selectedStudent.admissionNumber || "N/A"}</strong></span>
                                        <span>Mobile: <strong className="text-gray-200">{selectedStudent.mobile || selectedStudent.studentsDetails?.[0]?.mobileNum || "N/A"}</strong></span>
                                        <span>Zone: <strong className="text-cyan-300">{selectedStudent.zoneName || "—"}</strong></span>
                                        <span>Centre: <strong className="text-gray-200">{selectedStudent.centre || "—"}</strong></span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleEnrollNewCourse}
                                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                                        title="Enroll in a Normal Course"
                                    >
                                        Enroll Normal <FaArrowRight size={10} />
                                    </button>
                                    <button
                                        onClick={() => navigate(`/board-course-admission/${selectedStudent._id}`)}
                                        className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                                        title="Enroll in a Board Course"
                                    >
                                        Enroll Board <FaArrowRight size={10} />
                                    </button>
                                    <button
                                        onClick={() => navigate(`/pntse/add-student`, { state: { student: selectedStudent, rollNo: selectedStudent.admissionNumber || '' } })}
                                        className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                                        title="Carry Forward to PNTSE Course"
                                    >
                                        Carry Forward PNTSE <FaArrowRight size={10} />
                                    </button>
                                    <button
                                        onClick={() => navigate(`/pmo/add-student`, { state: { student: selectedStudent, rollNo: selectedStudent.admissionNumber || '' } })}
                                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                                        title="Carry Forward to PMO Course"
                                    >
                                        Carry Forward PMO <FaArrowRight size={10} />
                                    </button>
                                    <button
                                        onClick={closeStudentModal}
                                        className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-gray-800 transition-colors cursor-pointer"
                                    >
                                        <FaTimes size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Carry Forward Balance Banner */}
                                {(selectedStudent.carryForwardBalance > 0 || selectedStudent.markedForCarryForward) && (
                                    <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl flex items-center gap-3">
                                        <FaMoneyBillWave className="text-yellow-400 text-2xl shrink-0" />
                                        <div>
                                            <p className="text-yellow-400 text-xs uppercase font-bold tracking-wider">Carry Forward Balance</p>
                                            <p className="text-2xl font-bold text-yellow-300 mt-0.5">
                                                ₹{(selectedStudent.carryForwardBalance || 0).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Enrolled Courses */}
                                <div>
                                    <h4 className="text-base font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                                        <FaBook /> All Enrolled Courses ({studentAdmissions.length})
                                    </h4>

                                    {modalLoading ? (
                                        <div className="text-center py-12 text-gray-400">
                                            <FaSpinner className="text-2xl text-cyan-400 animate-spin mx-auto mb-2" />
                                            <p className="text-xs">Loading enrolled courses...</p>
                                        </div>
                                    ) : studentAdmissions.length === 0 ? (
                                        <div className="bg-gray-800/30 p-6 rounded-xl border border-gray-800 text-center text-gray-400 text-xs">
                                            No course admissions found for this student.
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {studentAdmissions.map((admission, index) => (
                                                <div key={admission._id || index} className="bg-gray-800/40 rounded-xl border border-gray-700/70 overflow-hidden">
                                                    {/* Course Header */}
                                                    <div className="bg-[#171b20] p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-800">
                                                        <div>
                                                            <h5 className="text-base font-bold text-white">
                                                                Course {index + 1}: {admission.course?.courseName || admission.boardCourseName || "Course"}
                                                            </h5>
                                                            <p className="text-xs text-gray-400 mt-0.5">
                                                                {admission.department?.departmentName || "Department"} • Session: {admission.academicSession || "N/A"} • Centre: {admission.centre || "—"} • 
                                                                Admission Date: {admission.admissionDate ? new Date(admission.admissionDate).toLocaleDateString() : "—"}
                                                            </p>
                                                        </div>
                                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                                                            admission.paymentStatus === 'COMPLETED' || admission.paymentStatus === 'PAID' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                                            admission.paymentStatus === 'PARTIAL' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                                            'bg-red-500/20 text-red-400 border border-red-500/30'
                                                        }`}>
                                                            {admission.paymentStatus || 'ACTIVE'}
                                                        </span>
                                                    </div>

                                                    <div className="p-4 space-y-4">
                                                        {/* Fee Summary */}
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                                            <div className="bg-[#131619] p-3 rounded-lg border border-gray-800">
                                                                <p className="text-gray-400">Total Fees</p>
                                                                <p className="text-base font-bold text-cyan-400 mt-0.5">
                                                                    ₹{(admission.totalFees || 0).toLocaleString()}
                                                                </p>
                                                            </div>
                                                            <div className="bg-[#131619] p-3 rounded-lg border border-gray-800">
                                                                <p className="text-gray-400">Total Paid</p>
                                                                <p className="text-base font-bold text-emerald-400 mt-0.5">
                                                                    ₹{(admission.totalPaidAmount || 0).toLocaleString()}
                                                                </p>
                                                            </div>
                                                            <div className="bg-[#131619] p-3 rounded-lg border border-gray-800">
                                                                <p className="text-gray-400">Pending</p>
                                                                <p className="text-base font-bold text-yellow-400 mt-0.5">
                                                                    ₹{Math.max(0, (admission.totalFees || 0) - (admission.totalPaidAmount || 0)).toLocaleString()}
                                                                </p>
                                                            </div>
                                                            <div className="bg-[#131619] p-3 rounded-lg border border-gray-800">
                                                                <p className="text-gray-400">Down Payment</p>
                                                                <p className="text-base font-bold text-blue-400 mt-0.5">
                                                                    ₹{(admission.downPayment || 0).toLocaleString()}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Payment Breakdown Schedule */}
                                                        {admission.paymentBreakdown && admission.paymentBreakdown.length > 0 && (
                                                            <div>
                                                                <h6 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                    <FaCalendar /> Payment Schedule ({admission.paymentBreakdown.length} installments)
                                                                </h6>
                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full text-xs">
                                                                        <thead>
                                                                            <tr className="bg-[#131619] text-gray-400 uppercase tracking-wider border-b border-gray-800">
                                                                                <th className="p-2.5 text-left">Inst #</th>
                                                                                <th className="p-2.5 text-left">Due Date</th>
                                                                                <th className="p-2.5 text-left">Amount</th>
                                                                                <th className="p-2.5 text-left">Paid</th>
                                                                                <th className="p-2.5 text-left">Method</th>
                                                                                <th className="p-2.5 text-left">Status</th>
                                                                                <th className="p-2.5 text-left">Remarks</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-gray-800/50">
                                                                            {admission.paymentBreakdown.map((payment, pIdx) => (
                                                                                <tr key={payment.installmentNumber || pIdx} className="hover:bg-gray-800/30">
                                                                                    <td className="p-2.5 text-white font-mono">#{payment.installmentNumber}</td>
                                                                                    <td className="p-2.5 text-gray-300">
                                                                                        {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : "—"}
                                                                                    </td>
                                                                                    <td className="p-2.5 text-white font-medium">
                                                                                        ₹{(payment.amount || 0).toLocaleString()}
                                                                                    </td>
                                                                                    <td className="p-2.5 text-emerald-400 font-medium">
                                                                                        ₹{(payment.paidAmount || 0).toLocaleString()}
                                                                                    </td>
                                                                                    <td className="p-2.5 text-gray-300">
                                                                                        {payment.paymentMethod || "—"}
                                                                                    </td>
                                                                                    <td className="p-2.5">
                                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getInstallmentStatusColor(payment.status)}`}>
                                                                                            {payment.status === "PENDING_CLEARANCE" ? "IN PROCESS" : (payment.status || "PENDING")}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="p-2.5 text-gray-400 text-[11px] truncate max-w-[150px]">
                                                                                        {payment.remarks || "—"}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ================= DRILL-DOWN PENDING STUDENTS MODAL ================= */}
                {drillDownModalOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                        <div className="bg-[#1a1f24] rounded-2xl w-full max-w-6xl border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto my-8 text-left flex flex-col">
                            {/* Modal Header */}
                            <div className="sticky top-0 bg-[#171b20] p-5 sm:p-6 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <FaUserGraduate className="text-cyan-400" />
                                            Pending Carry Forward Students
                                        </h3>
                                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                                            {filteredDrillDownStudents.length} Students
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2.5 text-xs text-gray-400 mt-2">
                                        <span>Centre: <strong className="text-cyan-300 font-semibold">{drillDownCentre || "All Centres"}</strong></span>
                                        <span>•</span>
                                        <span>Class: <strong className="text-purple-300 font-semibold">{drillDownClass ? `Class ${drillDownClass}` : "All Classes (6 to 10)"}</strong></span>
                                        <span>•</span>
                                        <span>Session: <strong className="text-emerald-300 font-semibold">{selectedPendingSession}</strong></span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                                    <button
                                        onClick={handleExportDrillDownStudents}
                                        className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                                        title="Export Student Roster to Excel"
                                    >
                                        <FaFileExcel size={13} /> Export Excel
                                    </button>
                                    <button
                                        onClick={handleCloseDrillDown}
                                        className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-gray-800 transition-colors cursor-pointer"
                                    >
                                        <FaTimes size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body & Table */}
                            <div className="p-5 sm:p-6 space-y-4 flex-1 overflow-y-auto">
                                {/* Search within modal & Class fast switcher */}
                                <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                                    <div className="relative flex-1 max-w-md">
                                        <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
                                        <input
                                            type="text"
                                            placeholder="Search by student name, roll number, mobile, course..."
                                            value={drillDownSearch}
                                            onChange={(e) => {
                                                setDrillDownSearch(e.target.value);
                                                setDrillDownPage(1);
                                            }}
                                            className="w-full bg-[#131619] border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1 overflow-x-auto text-xs pb-1 sm:pb-0">
                                        <span className="text-gray-400 text-[11px] font-semibold mr-1">Class:</span>
                                        {['', '6', '7', '8', '9', '10'].map(cls => (
                                            <button
                                                key={cls}
                                                onClick={() => {
                                                    setDrillDownClass(cls || null);
                                                    setDrillDownPage(1);
                                                }}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                                    (drillDownClass === cls || (!drillDownClass && cls === ''))
                                                        ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20'
                                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                                }`}
                                            >
                                                {cls ? `Cl. ${cls}` : 'All'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Students Table */}
                                <div className="bg-[#131619] rounded-xl border border-gray-800 overflow-hidden shadow-inner">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-[#1e2329] text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-800">
                                                    <th className="px-4 py-3 text-center w-12">#</th>
                                                    <th className="px-4 py-3">Student Name</th>
                                                    <th className="px-4 py-3">Admission No</th>
                                                    <th className="px-4 py-3">Contact</th>
                                                    <th className="px-4 py-3">Centre / Zone</th>
                                                    <th className="px-3 py-3 text-center">Current Class</th>
                                                    <th className="px-4 py-3">Next Promotion Target</th>
                                                    <th className="px-4 py-3">Current Course</th>
                                                    <th className="px-4 py-3 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-800/60">
                                                {paginatedDrillDownStudents.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="9" className="p-12 text-center text-gray-500">
                                                            <FaUserGraduate className="text-3xl mx-auto mb-2 opacity-30" />
                                                            <p>No students found matching the search criteria.</p>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    paginatedDrillDownStudents.map((student, sIdx) => {
                                                        const isClass10 = student.currentClass === '10';
                                                        const targetPromotion = isClass10
                                                            ? 'Class 11 (2-Yr JEE / NEET / Board)'
                                                            : `Class ${parseInt(student.currentClass, 10) + 1}`;

                                                        return (
                                                            <tr key={student._id || sIdx} className="hover:bg-gray-800/30 transition-colors">
                                                                <td className="px-4 py-3 text-center text-gray-500 font-mono">
                                                                    {((drillDownPage - 1) * drillDownPageSize) + sIdx + 1}
                                                                </td>
                                                                <td className="px-4 py-3 font-semibold text-white">
                                                                    <div className="truncate max-w-[170px]">{student.name}</div>
                                                                    {student.email && (
                                                                        <div className="text-[10px] text-gray-400 truncate max-w-[170px] font-normal">{student.email}</div>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-cyan-400 font-mono font-medium">
                                                                    {student.admissionNumber || "—"}
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-300 font-mono text-xs">
                                                                    <div>{student.mobile || "—"}</div>
                                                                    {student.whatsappNumber && student.whatsappNumber !== student.mobile && (
                                                                        <div className="text-[10px] text-gray-400 font-normal">WA: {student.whatsappNumber}</div>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="text-gray-200 font-medium">{student.centre || "—"}</div>
                                                                    <div className="text-[10px] text-gray-400">{student.zoneName || "—"}</div>
                                                                </td>
                                                                <td className="px-3 py-3 text-center">
                                                                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                                                                        isClass10 
                                                                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                                                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                                                    }`}>
                                                                        Class {student.currentClass}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 w-fit ${
                                                                        isClass10
                                                                            ? 'bg-gradient-to-r from-rose-500/20 to-purple-500/20 text-rose-300 border border-rose-500/30'
                                                                            : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                                                    }`}>
                                                                        <FaArrowRight size={9} />
                                                                        {targetPromotion}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-300 truncate max-w-[150px]" title={student.courseName}>
                                                                    {student.courseName || "General Course"}
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <div className="flex items-center justify-end gap-1.5">
                                                                        {isClass10 ? (
                                                                            <>
                                                                                <button
                                                                                    onClick={() => navigate(`/admission/${student.studentId}`, { state: { student, rollNo: student.admissionNumber } })}
                                                                                    className="px-2.5 py-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-[11px] font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                                                                    title="Enroll into Class 11 2-Year Course (JEE/NEET)"
                                                                                >
                                                                                    2-Yr JEE/NEET <FaArrowRight size={9} />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => navigate(`/board-course-admission/${student.studentId}`, { state: { student, rollNo: student.admissionNumber } })}
                                                                                    className="px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600/40 text-purple-300 border border-purple-500/40 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap"
                                                                                    title="Enroll into Class 11 Board Course"
                                                                                >
                                                                                    Board Course
                                                                                </button>
                                                                            </>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => navigate(`/admission/${student.studentId}`, { state: { student, rollNo: student.admissionNumber } })}
                                                                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                                                                title={`Carry Forward / Enroll into Class ${parseInt(student.currentClass, 10) + 1}`}
                                                                            >
                                                                                Carry Forward <FaArrowRight size={9} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination Controls */}
                                    {filteredDrillDownStudents.length > drillDownPageSize && (
                                        <div className="px-5 py-3 bg-[#171b20] border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-400">
                                            <div>
                                                Showing <span className="text-white font-semibold">{((drillDownPage - 1) * drillDownPageSize) + 1}</span> to <span className="text-white font-semibold">{Math.min(drillDownPage * drillDownPageSize, filteredDrillDownStudents.length)}</span> of <span className="text-white font-semibold">{filteredDrillDownStudents.length}</span> students
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    disabled={drillDownPage === 1}
                                                    onClick={() => setDrillDownPage(p => Math.max(1, p - 1))}
                                                    className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                                                >
                                                    <FaChevronLeft size={9} /> Prev
                                                </button>
                                                <span className="px-2.5 py-1 bg-gray-900 border border-gray-700 rounded-lg text-cyan-400 font-semibold">
                                                    {drillDownPage} / {drillDownTotalPages}
                                                </span>
                                                <button
                                                    disabled={drillDownPage === drillDownTotalPages}
                                                    onClick={() => setDrillDownPage(p => Math.min(drillDownTotalPages, p + 1))}
                                                    className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                                                >
                                                    Next <FaChevronRight size={9} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default CarryForward;
