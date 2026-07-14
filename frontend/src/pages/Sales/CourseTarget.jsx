import React, { useState, useEffect, useCallback, useRef } from "react";
import Layout from "../../components/Layout";
import { FaPlus, FaDownload, FaSun, FaMoon, FaFilter, FaSync, FaChevronDown, FaChevronUp, FaChartBar, FaTable, FaEdit, FaGraduationCap, FaTag, FaBuilding, FaLayerGroup } from "react-icons/fa";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";
import axios from "axios";
import CustomMultiSelect from "../../components/common/CustomMultiSelect";
import { useNavigate } from "react-router-dom";
import AddCourseTargetModal from "../../components/Sales/AddCourseTargetModal";
import { hasPermission } from "../../config/permissions";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const CourseTarget = () => {
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [centres, setCentres] = useState([]);
    const [data, setData] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailData, setDetailData] = useState(null);
    const [showTargetModal, setShowTargetModal] = useState(false);
    const [targetModalData, setTargetModalData] = useState(null);

    // Student drill-down modal
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [studentModalData, setStudentModalData] = useState({ centreName: "", deptName: "", tagName: "", students: [], loading: false });
    const [selectedProgrammes, setSelectedProgrammes] = useState(() => {
        try {
            const saved = localStorage.getItem("courseTarget_selectedProgrammes");
            return saved ? JSON.parse(saved) : ["CRP", "NCRP"];
        } catch {
            return ["CRP", "NCRP"];
        }
    });
    const [sessions, setSessions] = useState([]);
    const [selectedSessions, setSelectedSessions] = useState(() => {
        try {
            const saved = localStorage.getItem("courseTarget_selectedSessions");
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [classes, setClasses] = useState([]);
    const [selectedClasses, setSelectedClasses] = useState(() => {
        try {
            const saved = localStorage.getItem("courseTarget_selectedClasses");
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [activeCardModal, setActiveCardModal] = useState(null);

    const handleOpenTargetModal = (centre, deptName, deptId, currentTarget) => {
        setTargetModalData({
            centreId: centre.centreId,
            departmentId: deptId,
            targetCount: currentTarget || "",
            targetType: viewMode,
            year: selectedYear,
            month: selectedMonth,
            quarter: selectedQuarter,
            week: selectedWeek
        });
        setShowTargetModal(true);
    };

    const handleTargetSuccess = () => {
        setShowTargetModal(false);
        fetchData();
    };

    const getWeeksForMonth = (year, monthName) => {
        const mIdx = monthNames.indexOf(monthName);
        const daysInMonth = new Date(year, mIdx + 1, 0).getDate();
        const firstDowJS = new Date(year, mIdx, 1).getDay();
        const firstMonOffset = (firstDowJS + 6) % 7; // Mon=0, Tue=1 … Sun=6
        
        const weeks = [];
        let day = 1;
        let weekNum = 1;
        
        while (day <= daysInMonth) {
            const days = [];
            const startOffset = weekNum === 1 ? firstMonOffset : 0;
            
            for (let i = 0; i < startOffset; i++) {
                days.push({ isEmpty: true });
            }
            
            while (day <= daysInMonth && days.length < 7) {
                days.push({ day, isEmpty: false });
                day++;
            }
            
            while (days.length < 7) {
                days.push({ isEmpty: true });
            }
            
            const startDay = days.find(d => !d.isEmpty)?.day ?? null;
            const endDay = [...days].reverse().find(d => !d.isEmpty)?.day ?? null;
            
            weeks.push({ weekNumber: weekNum, startDay, endDay });
            weekNum++;
        }
        return weeks;
    };

    // Compute date range from current filter settings for the admissions API
    const getDateRange = () => {
        const mIdx = monthNames.indexOf(selectedMonth);
        if (viewMode === "CUSTOM") {
            return { startDate: customStartDate, endDate: customEndDate };
        } else if (viewMode === "MONTHLY") {
            const s = new Date(selectedYear, mIdx, 1).toISOString().split('T')[0];
            const e = new Date(selectedYear, mIdx + 1, 0).toISOString().split('T')[0];
            return { startDate: s, endDate: e };
        } else if (viewMode === "WEEKLY") {
            const weeks = getWeeksForMonth(selectedYear, selectedMonth);
            const currentWeekRange = weeks.find(w => w.weekNumber === selectedWeek) || weeks[0];
            const startDay = currentWeekRange ? currentWeekRange.startDay : 1;
            const endDay = currentWeekRange ? currentWeekRange.endDay : 7;
            const s = new Date(selectedYear, mIdx, startDay).toISOString().split('T')[0];
            const e = new Date(selectedYear, mIdx, endDay).toISOString().split('T')[0];
            return { startDate: s, endDate: e };
        } else if (viewMode === "QUARTERLY") {
            const qMap = {
                Q1: { s: [selectedYear, 3, 1], e: [selectedYear, 5, 30] },
                Q2: { s: [selectedYear, 6, 1], e: [selectedYear, 8, 30] },
                Q3: { s: [selectedYear, 9, 1], e: [selectedYear, 11, 31] },
                Q4: { s: [selectedYear + 1, 0, 1], e: [selectedYear + 1, 2, 31] }
            };
            const q = qMap[selectedQuarter];
            return {
                startDate: new Date(...q.s).toISOString().split('T')[0],
                endDate: new Date(...q.e).toISOString().split('T')[0]
            };
        } else { // YEARLY
            return {
                startDate: new Date(selectedYear, 3, 1).toISOString().split('T')[0],
                endDate: new Date(parseInt(selectedYear) + 1, 2, 31).toISOString().split('T')[0]
            };
        }
    };

    const fetchStudentAdmissions = async (centreName, deptId, deptName, tagName) => {
        setShowStudentModal(true);
        setStudentModalData({ centreName, deptName, tagName, students: [], loading: true });
        
        const localGetBaseExamTag = (tag) => {
            if (!tag) return "Uncategorized";
            const name = tag.toUpperCase().trim();
            if (name.includes("WBBSE") || name === "MADHYAMIK") return "WBBSE";
            if (name.includes("WBCHSE") || name === "HS" || name.includes("HIGHER SECONDARY")) return "WBCHSE";
            if (name.includes("CBSE")) return "CBSE";
            if (name.includes("ICSE")) return "ICSE";
            if (name.includes("ISC")) return "ISC";
            return tag.trim();
        };

        try {
            const token = localStorage.getItem("token");
            const { startDate, endDate } = getDateRange();
            const params = new URLSearchParams({ centreName, departmentId: deptId, startDate, endDate });
            if (tagName) {
                params.append("tagName", tagName);
            }
            if (selectedProgrammes && selectedProgrammes.length > 0) {
                params.append("programme", selectedProgrammes.join(','));
            }
            if (selectedSessions && selectedSessions.length > 0) {
                params.append("sessions", selectedSessions.join(','));
            }
            if (selectedClasses && selectedClasses.length > 0) {
                params.append("classIds", selectedClasses.join(','));
            }
            const res = await fetch(`${import.meta.env.VITE_API_URL}/sales/course-target/admissions?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            if (res.ok) {
                // Filter by tagName if provided (not "All")
                let students = json.data || [];
                if (tagName && tagName !== "All") {
                    students = students.filter(s => 
                        (s.examTag || "").toLowerCase() === tagName.toLowerCase()
                    );
                }
                setStudentModalData({ centreName, deptName, tagName, students, loading: false });
            } else {
                toast.error(json.message || "Failed to load student details");
                setStudentModalData(prev => ({ ...prev, loading: false }));
            }
        } catch (e) {
            console.error(e);
            toast.error("Error loading student admissions");
            setStudentModalData(prev => ({ ...prev, loading: false }));
        }
    };


    // Filters
    const [selectedCentres, setSelectedCentres] = useState(() => {
        try {
            const saved = localStorage.getItem("courseTarget_selectedCentres");
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [zones, setZones] = useState([]);
    const [selectedZones, setSelectedZones] = useState(() => {
        try {
            const saved = localStorage.getItem("courseTarget_selectedZones");
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [selectedYear, setSelectedYear] = useState(() => {
        const saved = localStorage.getItem("courseTarget_selectedYear");
        return saved ? parseInt(saved, 10) : new Date().getFullYear();
    });
    const [viewMode, setViewMode] = useState(() => {
        const saved = localStorage.getItem("courseTarget_viewMode");
        return saved || "MONTHLY";
    });
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const saved = localStorage.getItem("courseTarget_selectedMonth");
        return saved || new Date().toLocaleString('default', { month: 'long' });
    });
    const [selectedQuarter, setSelectedQuarter] = useState(() => {
        const saved = localStorage.getItem("courseTarget_selectedQuarter");
        return saved || "Q1";
    });
    const [selectedWeek, setSelectedWeek] = useState(() => {
        const saved = localStorage.getItem("courseTarget_selectedWeek");
        return saved ? parseInt(saved, 10) : 1;
    });
    const [customStartDate, setCustomStartDate] = useState(() => {
        const saved = localStorage.getItem("courseTarget_customStartDate");
        return saved || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    });
    const [customEndDate, setCustomEndDate] = useState(() => {
        const saved = localStorage.getItem("courseTarget_customEndDate");
        return saved || new Date().toISOString().split('T')[0];
    });

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canCreate = hasPermission(user, 'sales', 'centreTarget', 'create'); // Reusing centreTarget permission for now

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const quarters = ["Q1", "Q2", "Q3", "Q4"];
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

    // Save filters to localStorage on changes
    useEffect(() => {
        if (selectedCentres.length > 0) {
            localStorage.setItem("courseTarget_selectedCentres", JSON.stringify(selectedCentres));
        }
    }, [selectedCentres]);

    useEffect(() => {
        if (selectedZones.length > 0) {
            localStorage.setItem("courseTarget_selectedZones", JSON.stringify(selectedZones));
        }
    }, [selectedZones]);

    useEffect(() => {
        localStorage.setItem("courseTarget_selectedYear", selectedYear);
    }, [selectedYear]);

    useEffect(() => {
        localStorage.setItem("courseTarget_viewMode", viewMode);
    }, [viewMode]);

    useEffect(() => {
        localStorage.setItem("courseTarget_selectedMonth", selectedMonth);
    }, [selectedMonth]);

    useEffect(() => {
        localStorage.setItem("courseTarget_selectedQuarter", selectedQuarter);
    }, [selectedQuarter]);

    useEffect(() => {
        localStorage.setItem("courseTarget_selectedWeek", selectedWeek);
    }, [selectedWeek]);

    useEffect(() => {
        localStorage.setItem("courseTarget_customStartDate", customStartDate);
    }, [customStartDate]);

    useEffect(() => {
        localStorage.setItem("courseTarget_customEndDate", customEndDate);
    }, [customEndDate]);

    useEffect(() => {
        localStorage.setItem("courseTarget_selectedProgrammes", JSON.stringify(selectedProgrammes));
    }, [selectedProgrammes]);

    useEffect(() => {
        localStorage.setItem("courseTarget_selectedSessions", JSON.stringify(selectedSessions));
    }, [selectedSessions]);

    useEffect(() => {
        localStorage.setItem("courseTarget_selectedClasses", JSON.stringify(selectedClasses));
    }, [selectedClasses]);

    useEffect(() => {
        fetchCentres();
        fetchDepartments();
        fetchExamTags();
        fetchSessions();
        fetchZones();
        fetchClasses();
    }, []);

    useEffect(() => {
        const weeks = getWeeksForMonth(selectedYear, selectedMonth);
        if (selectedWeek > weeks.length) {
            setSelectedWeek(1);
        }
    }, [selectedMonth, selectedYear, selectedWeek]);

    const fetchCentres = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/centre`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            let centerList = res.data;

            if (user.role !== 'superAdmin' && user.centres) {
                const allowed = user.centres.map(id => typeof id === 'object' ? id._id : id);
                centerList = centerList.filter(c => allowed.includes(c._id));
            }

            // Exclude deactive centres
            centerList = centerList.filter(c => c.status !== 'deactive');

            centerList = centerList.sort((a, b) => (a.centreName || "").localeCompare((b.centreName || ""), undefined, { sensitivity: 'base' }));
            setCentres(centerList);
            if (centerList.length > 0) {
                const saved = localStorage.getItem("courseTarget_selectedCentres");
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            const validIds = parsed.filter(id => centerList.some(c => c._id === id));
                            if (validIds.length > 0) {
                                setSelectedCentres(validIds);
                                return;
                            }
                        }
                    } catch (e) {
                        console.error(e);
                    }
                }
                const allIds = centerList.map(c => c._id);
                setSelectedCentres(allIds);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchZones = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/zone`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const zoneList = res.data?.data || [];
            setZones(zoneList);
            const saved = localStorage.getItem("courseTarget_selectedZones");
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const validIds = parsed.filter(id => zoneList.some(z => z._id === id));
                        if (validIds.length > 0) {
                            setSelectedZones(validIds);
                            return;
                        }
                    }
                } catch (e) {
                    console.error(e);
                }
            }
            setSelectedZones(zoneList.map(z => z._id));
        } catch (e) {
            console.error("Error fetching zones:", e);
        }
    };

    const handleZoneChange = (selected) => {
        let newSelectedZones = [];
        if (selected && selected.some(o => o.value === 'all')) {
            newSelectedZones = zones.map(z => z._id);
        } else {
            newSelectedZones = selected ? selected.map(o => o.value) : [];
        }
        setSelectedZones(newSelectedZones);

        if (newSelectedZones.length === 0 || newSelectedZones.length === zones.length) {
            setSelectedCentres(centres.map(c => c._id));
        } else {
            const activeZones = zones.filter(z => newSelectedZones.includes(z._id));
            const zoneCentreIds = new Set();
            activeZones.forEach(z => {
                if (z.centres) {
                    z.centres.forEach(zc => {
                        const id = zc && typeof zc === 'object' ? (zc._id || zc.id) : zc;
                        if (id) zoneCentreIds.add(id.toString().trim().toLowerCase());
                    });
                }
            });
            const allowedInZones = centres
                .filter(c => c._id && zoneCentreIds.has(c._id.toString().trim().toLowerCase()))
                .map(c => c._id);
            setSelectedCentres(allowedInZones);
        }
    };

    const fetchDepartments = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/department`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Filter by showInAdmission if the API doesn't already
            const visibleDepts = res.data
                .filter(d => d.showInAdmission !== false)
                .map(d => d.departmentName)
                .sort();
            setDepartments(visibleDepts);
        } catch (e) {
            console.error(e);
        }
    };

    const [allExamTags, setAllExamTags] = useState([]);

    const fetchExamTags = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/examTag`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAllExamTags(res.data || []);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchSessions = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/session/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const sessionList = (Array.isArray(res.data) ? res.data : [])
                .filter(s => s.isGlobalActive)
                .sort((a, b) => (b.sessionName || "").localeCompare(a.sessionName || ""));
            setSessions(sessionList);
            const saved = localStorage.getItem("courseTarget_selectedSessions");
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const validSessions = parsed.filter(name => sessionList.some(s => s.sessionName === name));
                        if (validSessions.length > 0) {
                            setSelectedSessions(validSessions);
                            return;
                        }
                    }
                } catch (e) {
                    console.error(e);
                }
            }
            setSelectedSessions(sessionList.map(s => s.sessionName));
        } catch (e) {
            console.error("Error fetching sessions:", e);
        }
    };

    const fetchClasses = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/class`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const classList = res.data || [];
            classList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
            setClasses(classList);
            const saved = localStorage.getItem("courseTarget_selectedClasses");
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const validClasses = parsed.filter(id => classList.some(c => c._id === id));
                        if (validClasses.length > 0) {
                            setSelectedClasses(validClasses);
                            return;
                        }
                    }
                } catch (e) {
                    console.error(e);
                }
            }
            setSelectedClasses(classList.map(c => c._id));
        } catch (e) {
            console.error("Error fetching classes:", e);
        }
    };

    const fetchData = useCallback(async () => {
        if (selectedCentres.length === 0) {
            setData([]);
            return;
        }
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            // selectedCentres is an array of plain _id strings
            const centreParam = selectedCentres.join(',');
            const params = {
                centre: centreParam || 'all',
                year: selectedYear,
                targetType: viewMode,
                month: selectedMonth,
                quarter: selectedQuarter,
                week: selectedWeek,
                startDate: customStartDate,
                endDate: customEndDate
            };

            if (selectedProgrammes && selectedProgrammes.length > 0) {
                params.programme = selectedProgrammes.join(',');
            }
            if (selectedSessions && selectedSessions.length > 0) {
                params.sessions = selectedSessions.join(',');
            }
            if (selectedClasses && selectedClasses.length > 0) {
                params.classIds = selectedClasses.join(',');
            }

            const res = await axios.get(`${import.meta.env.VITE_API_URL}/sales/course-target/analysis`, {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log("Analysis Data Received:", res.data.data?.length, "centres");
            let fetchedData = res.data.data || [];
            fetchedData.sort((a, b) => (a.centreName || "").localeCompare((b.centreName || ""), undefined, { sensitivity: 'base' }));
            setData(fetchedData);

        } catch (e) {
            console.error(e);
            toast.error("Failed to load course target analysis");
        } finally {
            setLoading(false);
        }
    }, [selectedCentres, selectedYear, viewMode, selectedMonth, selectedQuarter, selectedWeek, customStartDate, customEndDate, selectedProgrammes, selectedSessions, selectedClasses]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getDeptStats = (centreData, deptName) => {
        if (!centreData || !centreData.departments) return { target: 0, achieved: 0, pct: 0 };

        // Find department by name (case-insensitive and trimmed)
        const dept = centreData.departments.find(d =>
            d.name?.trim().toLowerCase() === deptName?.trim().toLowerCase()
        );

        if (!dept) return { target: 0, achieved: 0, pct: 0, id: null, examTags: [], examTagAchieved: [] };
        return {
            target: dept.target || 0,
            achieved: dept.achieved || 0,
            pct: dept.pct || 0,
            id: dept.id,
            examTags: dept.examTags || [],
            examTagAchieved: dept.examTagAchieved || []
        };
    };

    const getCentreTotalAchieved = (centreData) => {
        if (!centreData || !centreData.departments) return 0;
        return centreData.departments.reduce((sum, d) => sum + (d.achieved || 0), 0);
    };

    const getTotalAchieved = (centreData) => {
        return centreData.departments.reduce((sum, dept) => sum + (dept.achieved || 0), 0);
    };

    const exportMatrixToExcel = () => {
        if (data.length === 0) {
            toast.info("No data to export");
            return;
        }

        const rows = data.map(centre => {
            const row = { "Centre Name": centre.centreName };
            uniqueDeptColumns.forEach(deptName => {
                const { target, achieved } = getDeptStatsByName(centre, deptName);
                if (viewMode === "YEARLY" || viewMode === "WEEKLY") {
                    row[deptName] = `${achieved} / ${target > 0 ? target : "-"}`;
                } else {
                    row[deptName] = achieved;
                }
            });
            row["Grand Total"] = getCentreTotalAchieved(centre);
            return row;
        });

        // Add a Total row at the bottom
        const totalRow = { "Centre Name": "TOTAL" };
        uniqueDeptColumns.forEach(deptName => {
            let deptAchievedSum = 0;
            let deptTargetSum = 0;
            data.forEach(centre => {
                const { target, achieved } = getDeptStatsByName(centre, deptName);
                deptAchievedSum += achieved;
                deptTargetSum += target;
            });
            if (viewMode === "YEARLY" || viewMode === "WEEKLY") {
                totalRow[deptName] = `${deptAchievedSum} / ${deptTargetSum > 0 ? deptTargetSum : "-"}`;
            } else {
                totalRow[deptName] = deptAchievedSum;
            }
        });
        totalRow["Grand Total"] = data.reduce((sum, centre) => sum + getCentreTotalAchieved(centre), 0);
        rows.push(totalRow);

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Admission Matrix");
        
        let filename = `Admission_Matrix_${viewMode}`;
        if (viewMode === "MONTHLY" || viewMode === "WEEKLY") {
            filename += `_${selectedMonth}`;
        }
        if (viewMode === "WEEKLY") {
            filename += `_Week${selectedWeek}`;
        }
        if (viewMode === "QUARTERLY") {
            filename += `_${selectedQuarter}`;
        }
        if (viewMode !== "CUSTOM") {
            filename += `_${selectedYear}`;
        } else {
            filename += `_${customStartDate}_to_${customEndDate}`;
        }
        
        XLSX.writeFile(wb, `${filename}.xlsx`);
        toast.success("Excel report exported successfully!");
    };

    let filteredCentreOptions = centres;
    if (selectedZones.length > 0 && selectedZones.length < zones.length) {
        const activeZones = zones.filter(z => selectedZones.includes(z._id));
        const zoneCentreIds = new Set();
        activeZones.forEach(z => {
            if (z.centres) {
                z.centres.forEach(zc => {
                    const id = zc && typeof zc === 'object' ? (zc._id || zc.id) : zc;
                    if (id) zoneCentreIds.add(id.toString().trim().toLowerCase());
                });
            }
        });
        filteredCentreOptions = centres.filter(c => c._id && zoneCentreIds.has(c._id.toString().trim().toLowerCase()));
    }

    // Calculate visible data for table and dynamic flash cards
    const visibleData = data.filter(centre => {
        const name = (centre.centreName || "").toLowerCase();
        const isSpecial = name.includes("phsps") || name.includes("rkm") || name.includes("franchise");
        if (isSpecial) {
            // Only hide if BOTH all zones and all centres are selected (i.e. default dashboard view)
            const isAllZonesSelected = selectedZones.length === zones.length;
            const isAllCentresSelected = selectedCentres.length === filteredCentreOptions.length;
            if (isAllZonesSelected && isAllCentresSelected) {
                return false;
            }
        }
        return true;
    });

    // Calculate stats dynamically for cards
    const totalAdmissionsCount = visibleData.reduce((sum, centre) => {
        return sum + (centre.departments ? centre.departments.reduce((dSum, d) => dSum + (d.achieved || 0), 0) : 0);
    }, 0);

    const tagsMap = {};
    const centresMapObj = {};
    const deptsMapObj = {};
    const admissionsBreakdownList = [];

    visibleData.forEach(centre => {
        let centreTotal = 0;
        if (centre.departments) {
            centre.departments.forEach(dept => {
                if (dept.achieved > 0) {
                    centreTotal += dept.achieved;
                    deptsMapObj[dept.name] = (deptsMapObj[dept.name] || 0) + dept.achieved;

                    admissionsBreakdownList.push({
                        centreName: centre.centreName,
                        deptName: dept.name,
                        count: dept.achieved
                    });
                }

                if (dept.examTagAchieved) {
                    dept.examTagAchieved.forEach(tag => {
                        const name = tag.tagName || "Uncategorized";
                        tagsMap[name] = (tagsMap[name] || 0) + tag.count;
                    });
                }
            });
        }
        if (centreTotal > 0) {
            centresMapObj[centre.centreName] = centreTotal;
        }
    });

    const totalUniqueTags = Object.keys(tagsMap).length;
    const totalUniqueCentres = Object.keys(centresMapObj).length;
    const totalUniqueDepts = Object.keys(deptsMapObj).length;

    const tagsBreakdownList = Object.entries(tagsMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    const centresBreakdownList = Object.entries(centresMapObj)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    const deptsBreakdownList = Object.entries(deptsMapObj)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    admissionsBreakdownList.sort((a, b) => b.count - a.count);

    const isBoardMatchingDept = (boardCourse, deptName) => {
        const bName = (boardCourse || "").toUpperCase();
        const dName = (deptName || "").toUpperCase();
        
        if (dName.includes(bName) || bName.includes(dName)) return true;
        
        if (bName === 'WBBSE' && dName.includes('MADHYAMIK')) return true;
        if (dName.includes('WBBSE') && bName.includes('MADHYAMIK')) return true;
        
        if (bName === 'WBCHSE' && (dName.includes('HS') || dName.includes('HIGHER SECONDARY'))) return true;
        
        return false;
    };

    // Calculate unique department columns dynamically from the fetched data
    // Only show departments that actually have at least one admission in the selected period
    const activeDeptNamesSet = new Set();
    visibleData.forEach(centre => {
        if (centre.departments) {
            centre.departments.forEach(dept => {
                if ((dept.achieved || 0) > 0) {
                    activeDeptNamesSet.add(dept.name);
                }
            });
        }
    });

    // Sort departments alphabetically (they come from the master departments list)
    const uniqueDeptColumns = Array.from(activeDeptNamesSet).sort((a, b) => a.localeCompare(b));

    // Look up stats for a specific department name within a centre's data
    const getDeptStatsByName = (centreData, deptName) => {
        if (!centreData || !centreData.departments) return { achieved: 0, target: 0, id: null };
        const dept = centreData.departments.find(
            d => (d.name || "").trim().toLowerCase() === (deptName || "").trim().toLowerCase()
        );
        if (!dept) return { achieved: 0, target: 0, id: null };
        return {
            achieved: dept.achieved || 0,
            target: dept.target || 0,
            id: dept.id,
            examTagAchieved: dept.examTagAchieved || []
        };
    };


    return (
        <Layout activePage="Sales">
            <div className={`space-y-6 min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#131619]' : 'bg-gray-50'} p-4 md:p-8`}>

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Admission Matrix</h1>
                        <p className={`${isDarkMode ? 'text-amber-400' : 'text-amber-600'} font-semibold uppercase text-xs tracking-widest`}>Department-wise Performance Report</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className={`p-2.5 rounded-lg border transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-widest ${isDarkMode
                                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500 hover:text-black'
                                : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500 hover:text-white'
                                }`}
                        >
                            {isDarkMode ? <><FaSun /> Gold Mode</> : <><FaMoon /> Night Mode</>}
                        </button>
                        <button
                            onClick={exportMatrixToExcel}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${isDarkMode
                                ? 'bg-green-600/90 text-white hover:bg-green-500 hover:shadow-lg hover:shadow-green-500/20'
                                : 'bg-green-600 text-white hover:bg-green-700 shadow-md'
                                }`}
                        >
                            <FaDownload size={14} /> Export Matrix
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div 
                        onClick={() => setActiveCardModal("admissions")}
                        className={`rounded-2xl border p-5 flex items-center gap-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-blue-500/50 active:scale-95 transition-all duration-200 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}
                    >
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-blue-500/15 text-blue-500"><FaGraduationCap /></div>
                        <div className="min-w-0">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Total Admissions</p>
                            <p className={`text-2xl font-black mt-0.5 ${isDarkMode ? "text-white" : "text-gray-900"}`}>{totalAdmissionsCount.toLocaleString("en-IN")}</p>
                        </div>
                    </div>
                    
                    <div 
                        onClick={() => setActiveCardModal("tags")}
                        className={`rounded-2xl border p-5 flex items-center gap-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-blue-500/50 active:scale-95 transition-all duration-200 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}
                    >
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-violet-500/15 text-violet-500"><FaTag /></div>
                        <div className="min-w-0">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Exam Tags</p>
                            <p className={`text-2xl font-black mt-0.5 ${isDarkMode ? "text-white" : "text-gray-900"}`}>{totalUniqueTags}</p>
                        </div>
                    </div>

                    <div 
                        onClick={() => setActiveCardModal("centres")}
                        className={`rounded-2xl border p-5 flex items-center gap-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-blue-500/50 active:scale-95 transition-all duration-200 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}
                    >
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-amber-500/15 text-amber-500"><FaBuilding /></div>
                        <div className="min-w-0">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Centres</p>
                            <p className={`text-2xl font-black mt-0.5 ${isDarkMode ? "text-white" : "text-gray-900"}`}>{totalUniqueCentres}</p>
                        </div>
                    </div>

                    <div 
                        onClick={() => setActiveCardModal("departments")}
                        className={`rounded-2xl border p-5 flex items-center gap-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-blue-500/50 active:scale-95 transition-all duration-200 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}
                    >
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-emerald-500/15 text-emerald-500"><FaLayerGroup /></div>
                        <div className="min-w-0">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Departments</p>
                            <p className={`text-2xl font-black mt-0.5 ${isDarkMode ? "text-white" : "text-gray-900"}`}>{totalUniqueDepts}</p>
                        </div>
                    </div>
                </div>

                {/* Filter Section - Matching CentreTarget UI */}
                <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-md'} p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4`}>
                    <div className="flex items-center gap-4">
                        <h3 className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold flex items-center gap-2`}>
                            <FaFilter className="text-cyan-400" /> Filters
                        </h3>
                        <div className={`flex p-1 rounded-xl border ${isDarkMode ? 'bg-black/20 border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
                            {["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"].map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all ${viewMode === mode
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                        : `${isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                                        }`}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Zone Filter */}
                        <div className="min-w-[180px] z-20 w-full sm:w-56">
                            <CustomMultiSelect
                                options={[
                                    { value: 'all', label: 'All Zones' },
                                    ...zones.map(z => ({ value: z._id, label: z.name }))
                                ]}
                                value={
                                    selectedZones.length === zones.length && zones.length > 0
                                        ? [{ value: 'all', label: 'All Zones' }]
                                        : zones.map(z => ({ value: z._id, label: z.name })).filter(opt => selectedZones.includes(opt.value))
                                }
                                onChange={(selected) => handleZoneChange(selected)}
                                placeholder="Select Zones"
                                isDarkMode={isDarkMode}
                            />
                        </div>

                        {/* Centres Dropdown */}
                        <div className="min-w-[200px] z-20 w-full sm:w-64">
                            <CustomMultiSelect
                                options={[
                                    { value: 'all', label: 'All Centres' },
                                    ...filteredCentreOptions.map(c => ({ value: c._id, label: c.centreName }))
                                ]}
                                value={
                                    selectedCentres.length === filteredCentreOptions.length && filteredCentreOptions.length > 0
                                        ? [{ value: 'all', label: 'All Centres' }]
                                        : filteredCentreOptions.map(c => ({ value: c._id, label: c.centreName })).filter(opt => selectedCentres.includes(opt.value))
                                }
                                onChange={(selected) => {
                                    if (selected && selected.some(o => o.value === 'all')) {
                                        setSelectedCentres(filteredCentreOptions.map(c => c._id));
                                    } else {
                                        setSelectedCentres(selected ? selected.map(o => o.value) : []);
                                    }
                                }}
                                placeholder="Select Centres"
                                isDarkMode={isDarkMode}
                            />
                        </div>

                        <div className="min-w-[150px] z-20 w-full sm:w-44">
                            <CustomMultiSelect
                                options={[
                                    { value: 'all', label: 'All Programs' },
                                    { value: 'CRP', label: 'CRP' },
                                    { value: 'NCRP', label: 'NCRP' }
                                ]}
                                value={
                                    selectedProgrammes.length === 2
                                        ? [{ value: 'all', label: 'All Programs' }]
                                        : [
                                            { value: 'CRP', label: 'CRP' },
                                            { value: 'NCRP', label: 'NCRP' }
                                        ].filter(opt => selectedProgrammes.includes(opt.value))
                                }
                                onChange={(selected) => {
                                    if (selected && selected.some(o => o.value === 'all')) {
                                        setSelectedProgrammes(['CRP', 'NCRP']);
                                    } else {
                                        setSelectedProgrammes(selected ? selected.map(o => o.value) : []);
                                    }
                                }}
                                placeholder="Select Programs"
                                isDarkMode={isDarkMode}
                            />
                        </div>

                        <div className="min-w-[180px] z-20 w-full sm:w-56">
                            <CustomMultiSelect
                                options={[{ value: 'all', label: 'All Sessions' }, ...sessions.map(s => ({ value: s.sessionName, label: s.sessionName }))]}
                                value={
                                    selectedSessions.length === sessions.length && sessions.length > 0
                                        ? [{ value: 'all', label: 'All Sessions' }]
                                        : sessions.map(s => ({ value: s.sessionName, label: s.sessionName })).filter(opt => selectedSessions.includes(opt.value))
                                }
                                onChange={(selected) => {
                                    if (selected && selected.some(o => o.value === 'all')) {
                                        setSelectedSessions(sessions.map(s => s.sessionName));
                                    } else {
                                        setSelectedSessions(selected ? selected.map(o => o.value) : []);
                                    }
                                }}
                                placeholder="Select Sessions"
                                isDarkMode={isDarkMode}
                            />
                        </div>

                        <div className="min-w-[180px] z-20 w-full sm:w-56">
                            <CustomMultiSelect
                                options={[{ value: 'all', label: 'All Classes' }, ...classes.map(c => ({ value: c._id, label: c.name }))]}
                                value={
                                    selectedClasses.length === classes.length && classes.length > 0
                                        ? [{ value: 'all', label: 'All Classes' }]
                                        : classes.map(c => ({ value: c._id, label: c.name })).filter(opt => selectedClasses.includes(opt.value))
                                }
                                onChange={(selected) => {
                                    if (selected && selected.some(o => o.value === 'all')) {
                                        setSelectedClasses(classes.map(c => c._id));
                                    } else {
                                        setSelectedClasses(selected ? selected.map(o => o.value) : []);
                                    }
                                }}
                                placeholder="Select Classes"
                                isDarkMode={isDarkMode}
                            />
                        </div>

                        {(viewMode === "MONTHLY" || viewMode === "WEEKLY") && (
                            <div className="min-w-[120px] z-20">
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className={`border text-xs rounded-lg block px-3 py-2 outline-none font-bold transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-gray-300 focus:border-cyan-500' : 'bg-white border-gray-300 text-gray-700 focus:border-cyan-500 shadow-sm'}`}
                                >
                                    {monthNames.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        )}

                        {viewMode === "WEEKLY" && (
                            <div className="min-w-[150px] z-20">
                                <select
                                    value={selectedWeek}
                                    onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                                    className={`border text-xs rounded-lg block w-full px-3 py-2 outline-none font-bold transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-gray-300 focus:border-cyan-500' : 'bg-white border-gray-300 text-gray-700 focus:border-cyan-500 shadow-sm'}`}
                                >
                                    {getWeeksForMonth(selectedYear, selectedMonth).map((wk) => (
                                        <option key={wk.weekNumber} value={wk.weekNumber}>
                                            Week {wk.weekNumber} ({wk.startDay} {selectedMonth.substring(0, 3)} - {wk.endDay} {selectedMonth.substring(0, 3)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {viewMode === "QUARTERLY" && (
                            <div className="min-w-[100px] z-20">
                                <select
                                    value={selectedQuarter}
                                    onChange={(e) => setSelectedQuarter(e.target.value)}
                                    className={`border text-xs rounded-lg block px-3 py-2 outline-none font-bold transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-gray-300 focus:border-cyan-500' : 'bg-white border-gray-300 text-gray-700 focus:border-cyan-500 shadow-sm'}`}
                                >
                                    {quarters.map(q => <option key={q} value={q}>{q}</option>)}
                                </select>
                            </div>
                        )}

                        {viewMode === "CUSTOM" && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className={`border text-xs rounded-lg block px-3 py-2 outline-none font-bold transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-gray-300 focus:border-cyan-500' : 'bg-white border-gray-300 text-gray-700 focus:border-cyan-500 shadow-sm'}`}
                                />
                                <span className="text-gray-500">to</span>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className={`border text-xs rounded-lg block px-3 py-2 outline-none font-bold transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-gray-300 focus:border-cyan-500' : 'bg-white border-gray-300 text-gray-700 focus:border-cyan-500 shadow-sm'}`}
                                />
                            </div>
                        )}

                        {viewMode !== "CUSTOM" && (
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className={`border text-xs rounded-lg block px-3 py-2 outline-none font-bold transition-all w-28 ${isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-gray-300 focus:border-cyan-500' : 'bg-white border-gray-300 text-gray-700 focus:border-cyan-500 shadow-sm'}`}
                            >
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        )}

                        <button
                            className="p-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors flex items-center gap-2 text-xs font-bold uppercase"
                            onClick={fetchData}
                        >
                            <FaSync className={loading ? "animate-spin" : ""} /> Sync
                        </button>


                        {canCreate && viewMode === "YEARLY" && (
                            <button
                                onClick={() => {
                                    setTargetModalData(null);
                                    setShowTargetModal(true);
                                }}
                                className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2 text-xs font-bold uppercase shadow-lg shadow-blue-600/20"
                            >
                                <FaPlus /> Set Target
                            </button>
                        )}

                        {canCreate && viewMode === "WEEKLY" && (
                            <button
                                onClick={() => {
                                    setTargetModalData({
                                        targetType: "WEEKLY",
                                        year: selectedYear,
                                        month: selectedMonth,
                                        week: selectedWeek,
                                        centreId: selectedCentres.length === 1 ? selectedCentres[0] : "",
                                        departmentId: "",
                                        targetCount: ""
                                    });
                                    setShowTargetModal(true);
                                }}
                                className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2 text-xs font-bold uppercase shadow-lg shadow-blue-600/20"
                            >
                                <FaPlus /> Set Weekly Target
                            </button>
                        )}

                    </div>
                </div>

                {/* Main Table - Matrix Layout */}
                <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-xl'} rounded-xl border overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`uppercase font-black text-xs border-b transition-colors ${isDarkMode ? 'bg-black/20 text-gray-400 border-gray-800' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                    <th className="px-6 py-4 sticky left-0 z-10 bg-inherit border-r border-inherit">Centre Name</th>
                                    {uniqueDeptColumns.map(deptName => (
                                        <th key={deptName} className="px-6 py-4 text-center border-r border-inherit min-w-[160px]">
                                            <div className="flex flex-col items-center">
                                                <span className="text-cyan-500 mb-1">{deptName}</span>
                                                <div className="flex gap-4 text-[9px] opacity-60">
                                                    <span>ADMISSIONS</span>
                                                </div>
                                            </div>
                                        </th>
                                    ))}
                                    <th className="px-6 py-4 text-center border-r border-inherit bg-amber-500/5">
                                        <div className="flex flex-col items-center">
                                            <span className="text-amber-500 uppercase tracking-widest">Grand Total</span>
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan={uniqueDeptColumns.length + 3} className="px-6 py-12 text-center text-cyan-400 font-bold animate-pulse">
                                            Aggregating Course Intelligence Data...
                                        </td>
                                    </tr>
                                ) : visibleData.length === 0 ? (
                                    <tr>
                                        <td colSpan={uniqueDeptColumns.length + 3} className="px-6 py-12 text-center text-gray-500 font-medium">
                                            No admission data found for the selected period.
                                        </td>
                                    </tr>
                                ) : (
                                    visibleData.map((centre) => {
                                        return (
                                            <tr key={centre.centreId} className={`transition-all ${isDarkMode ? 'hover:bg-cyan-500/5' : 'hover:bg-gray-50'}`}>
                                                <td className="px-6 py-5 sticky left-0 z-10 bg-inherit border-r border-inherit">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        <span className={`text-xs font-black uppercase tracking-tighter ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                                                            {centre.centreName}
                                                        </span>
                                                    </div>
                                                </td>

                                                {uniqueDeptColumns.map(deptName => {
                                                    const { achieved, target, id: deptId, examTagAchieved } = getDeptStatsByName(centre, deptName);
                                                    return (
                                                        <td
                                                            key={deptName}
                                                            className="px-6 py-5 text-center border-r border-inherit relative group/cell cursor-pointer hover:bg-cyan-500/5 transition-colors"
                                                            onClick={() => {
                                                                if (achieved > 0) {
                                                                    fetchStudentAdmissions(centre.centreName, deptId, deptName, null);
                                                                }
                                                            }}
                                                        >
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className={`text-xl font-black ${achieved > 0 ? 'text-emerald-500' : 'opacity-20'}`}>
                                                                    {achieved}
                                                                    {(viewMode === "YEARLY" || viewMode === "WEEKLY") && (
                                                                        <>
                                                                            <span className="text-gray-500 font-normal mx-1">/</span>
                                                                            <span className={target > 0 ? (isDarkMode ? 'text-cyan-400' : 'text-cyan-600') : 'text-gray-600 opacity-40 font-normal'}>
                                                                                {target > 0 ? target : "-"}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </span>

                                                                {/* Edit/Add Target Icon on cell hover */}
                                                                {canCreate && (viewMode === "YEARLY" || viewMode === "WEEKLY") && deptId && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleOpenTargetModal(centre, deptName, deptId, target);
                                                                        }}
                                                                        className="absolute top-1.5 right-1.5 p-1 rounded-md opacity-0 group-hover/cell:opacity-100 transition-opacity hover:bg-cyan-500/20 text-cyan-400"
                                                                        title={target > 0 ? "Update Weekly Target" : "Set Weekly Target"}
                                                                    >
                                                                        <FaEdit size={12} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                })}

                                                <td className="px-6 py-5 text-center border-r border-inherit bg-amber-500/5">
                                                    <span className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{getCentreTotalAchieved(centre)}</span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                            {!loading && visibleData.length > 0 && (
                                <tfoot>
                                    <tr className={`border-t-2 font-black text-xs uppercase transition-colors ${isDarkMode ? 'bg-black/40 text-white border-gray-700' : 'bg-gray-100 text-gray-900 border-gray-300'}`}>
                                        <td className="px-6 py-5 sticky left-0 z-10 bg-inherit border-r border-inherit font-black">
                                            Grand Total
                                        </td>
                                        {uniqueDeptColumns.map(deptName => {
                                            let deptAchievedSum = 0;
                                            let deptTargetSum = 0;
                                            visibleData.forEach(centre => {
                                                const { achieved, target } = getDeptStatsByName(centre, deptName);
                                                deptAchievedSum += achieved;
                                                deptTargetSum += target;
                                            });

                                            return (
                                                <td key={deptName} className="px-6 py-5 text-center border-r border-inherit">
                                                    <span className={`text-base font-black ${deptAchievedSum > 0 ? 'text-emerald-500' : 'opacity-40'}`}>
                                                        {deptAchievedSum}
                                                        {(viewMode === "YEARLY" || viewMode === "WEEKLY") && (
                                                            <>
                                                                <span className="text-gray-500 font-normal mx-1">/</span>
                                                                <span className={deptTargetSum > 0 ? (isDarkMode ? 'text-cyan-400' : 'text-cyan-600') : 'text-gray-600 opacity-40 font-normal'}>
                                                                    {deptTargetSum > 0 ? deptTargetSum : "-"}
                                                                </span>
                                                            </>
                                                        )}
                                                    </span>
                                                </td>
                                            );
                                        })}
                                        <td className="px-6 py-5 text-center border-r border-inherit bg-amber-500/10">
                                            <span className="text-lg font-black text-amber-500">
                                                {visibleData.reduce((sum, centre) => sum + getCentreTotalAchieved(centre), 0)}
                                            </span>
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>

                {showDetailModal && detailData && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'} border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200`}>
                            <div className="p-6 border-b border-inherit flex justify-between items-center">
                                <div>
                                    <h3 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} uppercase tracking-tighter`}>Breakdown Details</h3>
                                    <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest">{detailData.centreName} • {detailData.deptName}</p>
                                </div>
                                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-full transition-colors">
                                    <FaPlus className="rotate-45" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-baseline mb-2">
                                    <span className={`text-xs font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500 uppercase'}`}>Total Achieved</span>
                                    <span className="text-2xl font-black text-emerald-500">{detailData.achieved}</span>
                                </div>
                                <div className="space-y-2">
                                    <h4 className={`text-[10px] font-black ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-[0.2em] mb-3`}>Exam Tag Wise Achieved</h4>
                                    {detailData.breakdown.length > 0 ? (
                                        <div className="grid gap-2">
                                            {/* "All" row to see all students in this dept */}
                                            <button
                                                onClick={() => fetchStudentAdmissions(
                                                    detailData.centreName,
                                                    detailData.deptId,
                                                    detailData.deptName,
                                                    "All"
                                                )}
                                                className={`w-full flex justify-between items-center p-3 rounded-xl border cursor-pointer transition-all group text-left ${isDarkMode ? 'bg-blue-500/10 border-blue-500/30 hover:border-blue-400' : 'bg-blue-50 border-blue-200 hover:border-blue-400'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                                    <span className={`text-sm font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>All Students</span>
                                                </div>
                                                <span className={`text-sm font-black ${isDarkMode ? 'text-blue-300' : 'text-blue-600'} flex items-center gap-1`}>
                                                    {detailData.achieved} Admissions
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                </span>
                                            </button>
                                            {detailData.breakdown.map((tag, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => fetchStudentAdmissions(
                                                        detailData.centreName,
                                                        detailData.deptId,
                                                        detailData.deptName,
                                                        tag.tagName
                                                    )}
                                                    className={`w-full flex justify-between items-center p-3 rounded-xl border cursor-pointer transition-all group text-left ${isDarkMode ? 'bg-black/20 border-gray-800 hover:border-cyan-500/50' : 'bg-gray-50 border-gray-100 hover:border-cyan-500/50'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 group-hover:animate-ping" />
                                                        <span className={`text-sm font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{tag.tagName}</span>
                                                    </div>
                                                    <span className="text-sm font-black text-cyan-500 flex items-center gap-1">
                                                        {tag.count} Admissions
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 opacity-40 italic text-sm">No specific exam tags recorded.</div>
                                    )}
                                </div>
                            </div>
                            <div className={`p-4 ${isDarkMode ? 'bg-black/20' : 'bg-gray-50'} border-t border-inherit flex justify-end`}>
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Student Admissions Drill-Down Modal ─────────────────── */}
                {showStudentModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'} border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]`}>
                            {/* Header */}
                            <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'} flex justify-between items-start flex-shrink-0`}>
                                <div>
                                    <h3 className={`text-base font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Student Admissions</h3>
                                    <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mt-0.5">
                                        {studentModalData.centreName} · {studentModalData.deptName}
                                        {studentModalData.tagName !== "All" && ` · ${studentModalData.tagName}`}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowStudentModal(false)}
                                    className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-full transition-colors"
                                >
                                    <FaPlus className="rotate-45" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="overflow-y-auto flex-1 p-4">
                                {studentModalData.loading ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                                        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                                        <p className={`text-xs font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Fetching student records...</p>
                                    </div>
                                ) : studentModalData.students.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-2 opacity-50">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        <p className={`text-sm font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No student records found</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                            {studentModalData.students.length} Student{studentModalData.students.length !== 1 ? 's' : ''} Found
                                        </p>
                                        {studentModalData.students.map((s, idx) => (
                                            <div key={s._id || idx} className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${isDarkMode ? 'bg-black/20 border-gray-800 hover:border-cyan-500/30' : 'bg-gray-50 border-gray-100 hover:border-cyan-400/50'}`}>
                                                {/* Index badge */}
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
                                                    {idx + 1}
                                                </div>
                                                {/* Name & Course */}
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-black truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{s.studentName}</p>
                                                    <p className={`text-[10px] font-semibold truncate ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                                        {s.course || "—"}
                                                    </p>
                                                </div>
                                                {/* Down Payment */}
                                                <div className="text-center flex-shrink-0">
                                                    <p className={`text-[9px] font-bold uppercase tracking-wide ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>D. Pay</p>
                                                    <p className={`text-[12px] font-black ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                                        ₹{(s.downPayment || 0).toLocaleString('en-IN')}
                                                    </p>
                                                </div>
                                                {/* Admission Number & Date */}
                                                <div className="text-right flex-shrink-0">
                                                    <p className={`text-[11px] font-black ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{s.admissionNumber || "—"}</p>
                                                    <p className={`text-[9px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                                                        {s.admissionDate ? new Date(s.admissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ""}
                                                    </p>
                                                </div>
                                                {/* Exam Tag badge */}
                                                {s.examTag && s.examTag !== "NORMAL" && (
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0 ${isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                                                        {s.examTag}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className={`px-6 py-3 border-t ${isDarkMode ? 'border-gray-800 bg-black/20' : 'border-gray-100 bg-gray-50'} flex justify-between items-center flex-shrink-0`}>
                                <button
                                    onClick={() => { setShowStudentModal(false); }}
                                    className={`text-xs font-bold px-4 py-1.5 rounded-lg border transition-all ${isDarkMode ? 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500' : 'border-gray-300 text-gray-600 hover:text-gray-900'}`}
                                >
                                    ← Back to Breakdown
                                </button>
                                <button
                                    onClick={() => setShowStudentModal(false)}
                                    className="px-5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeCardModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'} border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]`}>
                            <div className="p-6 border-b border-inherit flex justify-between items-center flex-shrink-0">
                                <div>
                                    <h3 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} uppercase tracking-tighter`}>
                                        {activeCardModal === 'admissions' && "Admissions Breakdown"}
                                        {activeCardModal === 'tags' && "Exam Tags Breakdown"}
                                        {activeCardModal === 'centres' && "Centres Breakdown"}
                                        {activeCardModal === 'departments' && "Departments Breakdown"}
                                    </h3>
                                    <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest">Global Performance Overview</p>
                                </div>
                                <button onClick={() => setActiveCardModal(null)} className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-full transition-colors">
                                    <FaPlus className="rotate-45" />
                                </button>
                            </div>
                            
                            <div className="p-6 overflow-y-auto flex-1 space-y-4">
                                <table className="w-full border-collapse text-left">
                                    <thead>
                                        <tr className={`border-b text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'border-gray-800 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                                            {activeCardModal === 'admissions' && (
                                                <>
                                                    <th className="pb-3">Centre</th>
                                                    <th className="pb-3">Department</th>
                                                    <th className="pb-3 text-right">Admissions</th>
                                                </>
                                            )}
                                            {activeCardModal === 'tags' && (
                                                <>
                                                    <th className="pb-3">Exam Tag / Course</th>
                                                    <th className="pb-3 text-right">Total Admissions</th>
                                                </>
                                            )}
                                            {activeCardModal === 'centres' && (
                                                <>
                                                    <th className="pb-3">Centre Name</th>
                                                    <th className="pb-3 text-right">Total Admissions</th>
                                                </>
                                            )}
                                            {activeCardModal === 'departments' && (
                                                <>
                                                    <th className="pb-3">Department Name</th>
                                                    <th className="pb-3 text-right">Total Admissions</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y text-sm ${isDarkMode ? 'divide-gray-800 text-gray-300' : 'divide-gray-100 text-gray-700'}`}>
                                        {activeCardModal === 'admissions' && admissionsBreakdownList.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-cyan-500/5 transition-colors">
                                                <td className="py-3 font-semibold">{item.centreName}</td>
                                                <td className="py-3 text-xs font-medium text-cyan-500">{item.deptName}</td>
                                                <td className="py-3 text-right font-black text-emerald-500">{item.count}</td>
                                            </tr>
                                        ))}
                                        {activeCardModal === 'tags' && tagsBreakdownList.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-cyan-500/5 transition-colors">
                                                <td className="py-3 font-semibold">{item.name}</td>
                                                <td className="py-3 text-right font-black text-cyan-500">{item.count}</td>
                                            </tr>
                                        ))}
                                        {activeCardModal === 'centres' && centresBreakdownList.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-cyan-500/5 transition-colors">
                                                <td className="py-3 font-semibold">{item.name}</td>
                                                <td className="py-3 text-right font-black text-amber-500">{item.count}</td>
                                            </tr>
                                        ))}
                                        {activeCardModal === 'departments' && deptsBreakdownList.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-cyan-500/5 transition-colors">
                                                <td className="py-3 font-semibold">{item.name}</td>
                                                <td className="py-3 text-right font-black text-purple-500">{item.count}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className={`border-t-2 font-black ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                                            <td colSpan={activeCardModal === 'admissions' ? 2 : 1} className="py-4 text-right text-xs uppercase tracking-widest">Total</td>
                                            <td className="py-4 text-right text-lg font-black text-emerald-500">{totalAdmissionsCount}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            
                            <div className={`p-4 ${isDarkMode ? 'bg-black/20' : 'bg-gray-50'} border-t border-inherit flex justify-end flex-shrink-0`}>
                                <button
                                    onClick={() => setActiveCardModal(null)}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showTargetModal && (
                    <AddCourseTargetModal
                        onClose={() => setShowTargetModal(false)}
                        onSuccess={handleTargetSuccess}
                        centres={centres}
                        isDarkMode={isDarkMode}
                        initialData={targetModalData}
                    />
                )}
            </div>
        </Layout>
    );
};

export default CourseTarget;
