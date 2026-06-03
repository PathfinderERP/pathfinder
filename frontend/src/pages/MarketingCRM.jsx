import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import {
    FaBullhorn, FaUsers, FaChartLine, FaMoneyBillWave, FaChartPie, FaChartBar,
    FaFileExcel, FaSync, FaSun, FaMoon, FaFilter, FaSearch, FaArrowLeft,
    FaRedo, FaDownload
} from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import * as XLSX from 'xlsx';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar,
    CartesianGrid, Legend, PieChart, Pie, Cell, LabelList
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const MarketingCRM = () => {
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [allPerformance, setAllPerformance] = useState([]);
    const [globalTrends, setGlobalTrends] = useState([]);
    const [globalAdmissionDetail, setGlobalAdmissionDetail] = useState({ bySource: [], byCenter: [] });
    const [availableCenters, setAvailableCenters] = useState([]);
    const [selectedCenters, setSelectedCenters] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [timePeriod, setTimePeriod] = useState('daily');
    const [filters, setFilters] = useState({ fromDate: "", toDate: "" });

    // Filtered marketing performance data
    const marketingPerformance = allPerformance.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase());
        const uCentres = u.centres || u.centers || [];
        const matchesCenter = selectedCenters.length === 0 || (uCentres.some(c => selectedCenters.includes(c.centreName || c)));
        return u.role === 'marketing' && matchesSearch && matchesCenter;
    });

    // Aggregate summary
    const totalLeads = marketingPerformance.reduce((acc, curr) => acc + (curr.currentCalls || 0), 0);
    const totalConversions = marketingPerformance.reduce((acc, curr) => acc + (curr.admissions || 0), 0);
    const totalHotLeads = marketingPerformance.reduce((acc, curr) => acc + (curr.hotLeads || 0), 0);
    const conversionRate = totalLeads > 0 ? ((totalConversions / totalLeads) * 100).toFixed(1) : "0.0";

    // Chart data - squad comparison
    const chartData = marketingPerformance.map(curr => ({
        name: curr.name.split(' ')[0],
        leads: curr.currentCalls || 0,
        conversions: curr.admissions || 0,
        hotLeads: curr.hotLeads || 0
    }));

    // Daily comparison data
    const dailyComparisonData = marketingPerformance.map(curr => ({
        name: curr.name.split(' ')[0],
        today: curr.todayCalls || 0,
        yesterday: curr.yesterdayCalls || 0
    }));

    // Monthly comparison data
    const monthlyComparisonData = marketingPerformance.map(curr => ({
        name: curr.name.split(' ')[0],
        thisMonth: curr.thisMonthCalls || 0,
        lastMonth: curr.lastMonthCalls || 0
    }));

    // The backend trends use `calls` key for monthly call aggregation
    const chartTrends = globalTrends.length > 0 ? globalTrends : [
        { month: 'Jan', calls: 0, admissions: 0 },
        { month: 'Feb', calls: 0, admissions: 0 },
        { month: 'Mar', calls: 0, admissions: 0 },
        { month: 'Apr', calls: 0, admissions: 0 },
        { month: 'May', calls: Number(totalLeads) || 0, admissions: Number(totalConversions) || 0 },
    ];

    useEffect(() => {
        fetchCentres();
        fetchAllPerformance(timePeriod, filters);
        fetchAuditRecords();
        // eslint-disable-next-line
    }, []);

    useEffect(() => {
        fetchAllPerformance(timePeriod, filters);
        // eslint-disable-next-line
    }, [timePeriod, selectedCenters]);

    const fetchCentres = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/centre`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const uniqueCentres = Array.from(new Map((data || []).map(c => [c._id, c])).values());
                setAvailableCenters(uniqueCentres);
            }
        } catch (error) {
            console.error("Error fetching centres:", error);
        }
    };

    const fetchAllPerformance = async (period = 'daily', customFilters = {}) => {
        setSummaryLoading(true);
        if (allPerformance.length === 0) setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const centreIds = availableCenters
                .filter(c => selectedCenters.includes(c.centreName))
                .map(c => c._id);

            const params = new URLSearchParams({
                period,
                ...customFilters,
                ...(centreIds.length > 0 ? { centre: centreIds } : {})
            });

            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/analytics-all?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                const perfData = data.performance || [];
                const uniquePerf = Array.from(new Map(perfData.map(p => [p._id || p.userId, p])).values());
                setAllPerformance(uniquePerf);
                setGlobalTrends(data.trends || []);
                setGlobalAdmissionDetail(data.admissionDetail || { bySource: [], byCenter: [] });
            }
        } catch (error) {
            console.error("Error fetching performance:", error);
        } finally {
            setSummaryLoading(false);
            setLoading(false);
        }
    };

    const resetFilters = () => {
        const clearedFilters = { fromDate: "", toDate: "" };
        setFilters(clearedFilters);
        fetchAllPerformance(timePeriod, clearedFilters);
    };

    const exportToExcel = () => {
        const exportData = [
            ...globalAdmissionDetail.bySource.map(s => ({ Type: 'Source', Name: s.name, Count: s.value })),
            ...globalAdmissionDetail.byCenter.map(c => ({ Type: 'Center', Name: c.name, Count: c.value }))
        ];
        if (exportData.length === 0) return alert("No data to export");
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Marketing Admissions");
        XLSX.writeFile(workbook, `Marketing_Report_${new Date().toLocaleDateString()}.xlsx`);
    };

    const exportSquadData = () => {
        const exportData = marketingPerformance.map(p => ({
            'Name': p.name,
            'Role': p.role,
            'Centers': (p.centres || p.centers || []).map(c => c.centreName || c).join(', ') || 'N/A',
            'Leads (Current)': p.currentCalls || 0,
            'Leads (Previous)': p.previousCalls || 0,
            'Today Calls': p.todayCalls || 0,
            'Yesterday Calls': p.yesterdayCalls || 0,
            'This Month': p.thisMonthCalls || 0,
            'Last Month': p.lastMonthCalls || 0,
            'Hot Leads': p.hotLeads || 0,
            'Admissions': p.admissions || 0,
            'Conversion %': p.currentCalls > 0 ? ((p.admissions / p.currentCalls) * 100).toFixed(2) + '%' : '0%',
        }));
        if (exportData.length === 0) return alert("No marketing data to export");
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Marketing Squad');
        XLSX.writeFile(workbook, `Marketing_Squad_Report_${timePeriod}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };
    const getTodayDateString = () => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    const getTomorrowDateString = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yyyy = tomorrow.getFullYear();
        const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const dd = String(tomorrow.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const [planDate, setPlanDate] = useState(getTodayDateString());
    const [expectedLeadTarget, setExpectedLeadTarget] = useState("");
    const [expectedHotLeads, setExpectedHotLeads] = useState("");
    const [primaryCentreName, setPrimaryCentreName] = useState("");
    const [activitySources, setActivitySources] = useState([]);

    // Tomorrow Planner States
    const [tomorrowPlanDate, setTomorrowPlanDate] = useState(getTomorrowDateString());
    const [tomorrowTasks, setTomorrowTasks] = useState([]);
    const [tomorrowPlanId, setTomorrowPlanId] = useState(null);
    const [savingTomorrowPlan, setSavingTomorrowPlan] = useState(false);
    const [newTaskForm, setNewTaskForm] = useState({
        taskDetails: "",
        priority: "Medium",
        estimatedDuration: "",
        notes: ""
    });

    const fetchTomorrowPlan = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/tomorrow-planner/my-plan?date=${tomorrowPlanDate}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.plan && data.plan._id) {
                    setTomorrowPlanId(data.plan._id);
                    setTomorrowTasks(data.plan.tasks || []);
                } else {
                    setTomorrowPlanId(null);
                    setTomorrowTasks([]);
                }
            }
        } catch (error) {
            console.error("Error fetching tomorrow plan:", error);
        }
    };

    const handleAddTomorrowTask = (e) => {
        e.preventDefault();
        if (!newTaskForm.taskDetails) {
            toast.error("Task Details are required.");
            return;
        }

        const newTask = {
            _id: `temp_${Date.now()}_${Math.random()}`,
            taskDetails: newTaskForm.taskDetails,
            priority: newTaskForm.priority,
            estimatedDuration: newTaskForm.estimatedDuration,
            notes: newTaskForm.notes,
            status: "Planned"
        };

        setTomorrowTasks(prev => [...prev, newTask]);
        setNewTaskForm({ taskDetails: "", priority: "Medium", estimatedDuration: "", notes: "" });
        toast.info("Task added locally. Remember to save your plan!");
    };

    const handleDeleteTomorrowTask = (taskId) => {
        setTomorrowTasks(prev => prev.filter(t => t._id !== taskId));
        toast.success("Task removed from list.");
    };

    const handleSaveTomorrowPlan = async () => {
        setSavingTomorrowPlan(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/tomorrow-planner/save-plan`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    tasks: tomorrowTasks,
                    planDate: tomorrowPlanDate
                })
            });

            if (response.ok) {
                const data = await response.json();
                toast.success("Tomorrow's field plan saved successfully!");
                if (data.plan && data.plan._id) {
                    setTomorrowPlanId(data.plan._id);
                    setTomorrowTasks(data.plan.tasks || []);
                }
            } else {
                const errData = await response.json();
                toast.error(errData.message || "Failed to save tomorrow's plan.");
            }
        } catch (error) {
            console.error("Error saving tomorrow plan:", error);
            toast.error("Error saving tomorrow's plan.");
        } finally {
            setSavingTomorrowPlan(false);
        }
    };


    // Fetch sources from Master Data
    useEffect(() => {
        const fetchSources = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(`${import.meta.env.VITE_API_URL}/source`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.sources && data.sources.length > 0) {
                        setActivitySources(data.sources.map(s => s.sourceName));
                    }
                }
            } catch (err) {
                console.error("Error fetching sources:", err);
            }
        };
        fetchSources();
    }, []);

    useEffect(() => {
        const fetchEmployeeProfile = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/employee/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.primaryCentre?.centreName) {
                        setPrimaryCentreName(data.primaryCentre.centreName);
                    } else if (data.centres?.[0]?.centreName) {
                        setPrimaryCentreName(data.centres[0].centreName);
                    } else {
                        const user = JSON.parse(localStorage.getItem("user") || "{}");
                        if (user.centres?.[0]?.centreName) {
                            setPrimaryCentreName(user.centres[0].centreName);
                        }
                    }
                } else {
                    const user = JSON.parse(localStorage.getItem("user") || "{}");
                    if (user.centres?.[0]?.centreName) {
                        setPrimaryCentreName(user.centres[0].centreName);
                    }
                }
            } catch (error) {
                console.error("Error fetching employee profile:", error);
                const user = JSON.parse(localStorage.getItem("user") || "{}");
                if (user.centres?.[0]?.centreName) {
                    setPrimaryCentreName(user.centres[0].centreName);
                }
            }
        };

        fetchEmployeeProfile();
    }, []);

    const fetchAuditRecords = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/planner`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.records) {
                    setAuditRecords(data.records);
                    const fetchedApprovals = {};
                    data.records.forEach(r => {
                        fetchedApprovals[r.id] = {
                            status: r.status || "Pending",
                            remarks: r.remarks || ""
                        };
                    });
                    setApprovalState(fetchedApprovals);
                }
            }
        } catch (error) {
            console.error("Error fetching audit records:", error);
        }
    };

    const handleUpdateApprovalStatus = async (recordId, newStatus) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/planner/${recordId}/approval`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                setApprovalState(prev => ({
                    ...prev,
                    [recordId]: { ...prev[recordId], status: newStatus }
                }));
                if (newStatus === "Approved") {
                    toast.success("Activity approved!");
                } else {
                    toast.error("Activity rejected.");
                }
            } else {
                toast.error("Failed to update status in database.");
            }
        } catch (error) {
            console.error("Error updating approval status:", error);
            toast.error("Network error while updating status.");
        }
    };

    const handleSaveRemarks = async (recordId, remarksValue) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/planner/${recordId}/approval`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ remarks: remarksValue })
            });

            if (response.ok) {
                toast.success("Remarks saved.");
            } else {
                toast.error("Failed to save remarks to database.");
            }
        } catch (error) {
            console.error("Error saving remarks:", error);
            toast.error("Network error while saving remarks.");
        }
    };

    const handleSubmitFieldPlan = async (e) => {
        e.preventDefault();
        
        if (!planDate) {
            toast.error("Please select a date for the field plan.");
            return;
        }
        if (!expectedLeadTarget) {
            toast.error("Please enter the expected lead target.");
            return;
        }
        if (!expectedHotLeads) {
            toast.error("Please enter the expected hot leads.");
            return;
        }

        const hasUnverified = todayActivities.some(act => !act.geoTagged);
        if (hasUnverified) {
            toast.error("All activity blocks must be Geo-Tagged and verified before submission.");
            return;
        }

        // Capture real submission datetime
        const now = new Date();
        const submittedAt = now.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
        const submittedTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

        const activitiesPayload = todayActivities.map((act) => ({
            type: act.type,
            place: act.place || "",
            time: act.time || "",
            actualTime: act.actualTime || submittedTime,
            expectedLeads: act.expectedLeads || "0",
            geoTagged: act.geoTagged,
            latitude: act.latitude,
            longitude: act.longitude,
            locationName: act.locationName,
            photos: act.photos || (act.photo ? [act.photo] : []),
            photo: act.photos?.[0] || act.photo || null,
            submittedAt
        }));

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/planner`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    date: planDate,
                    expectedLeadTarget: Number(expectedLeadTarget),
                    expectedHotLeads: Number(expectedHotLeads),
                    activities: activitiesPayload
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.records) {
                    setAuditRecords(prev => [...data.records, ...prev]);

                    const newApprovals = {};
                    data.records.forEach(r => {
                        newApprovals[r.id] = { status: r.status || "Pending", remarks: r.remarks || "" };
                    });
                    setApprovalState(prev => ({ ...prev, ...newApprovals }));

                    toast.success(`Today's Field Plan saved! ${data.records.length} activit${data.records.length === 1 ? 'y' : 'ies'} saved to database and added to Audit.`);
                }
            } else {
                const text = await response.text();
                let errData;
                try {
                    errData = JSON.parse(text);
                } catch (jsonErr) {
                    console.error("Non-JSON error response from server:", text);
                    toast.error(`Server error: ${response.status} - Non-JSON response`);
                    return;
                }
                console.error("Detailed server error:", errData);
                toast.error(errData.message || errData.error || "Failed to save field plan to database.");
                return;
            }
        } catch (error) {
            console.error("Error submitting field plan:", error);
            toast.error("Failed to connect to database. Plan was not saved.");
            return;
        }

        // Switch to Activity Audit tab
        setActiveTab("Activity Audit");
        
        setExpectedLeadTarget("");
        setExpectedHotLeads("");
        setTodayActivities([{ 
            type: activitySources[0] || "", 
            place: "", 
            time: "", 
            expectedLeads: "", 
            isSaved: false, 
            geoTagged: false, 
            latitude: null, 
            longitude: null,
            locationName: "",
            photo: null 
        }]);
    };

    // Geo-Tag verification states
    const [activeVerifyIndex, setActiveVerifyIndex] = useState(null);
    const [tempPhotos, setTempPhotos] = useState([]);   // array of base64 strings
    const [tempLat, setTempLat] = useState(null);
    const [tempLng, setTempLng] = useState(null);
    const [tempLocationName, setTempLocationName] = useState("");
    const [tempActualTime, setTempActualTime] = useState("");
    const [tempCaptureDateTime, setTempCaptureDateTime] = useState(""); // full date+time display
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [stream, setStream] = useState(null);

    // Activity Audit records (populated on plan submit)
    const [auditRecords, setAuditRecords] = useState([]);
    const [previewImage, setPreviewImage] = useState(null);
    // approval state keyed by record index: { status: 'Pending'|'Approved'|'Rejected', remarks: '' }
    const [approvalState, setApprovalState] = useState({});

    // Audit filter state
    const [auditSearch, setAuditSearch] = useState("");
    const [auditFilterType, setAuditFilterType] = useState("All");
    const [auditFilterOwner, setAuditFilterOwner] = useState("All");
    const [auditFilterStatus, setAuditFilterStatus] = useState("All");

    const handleOpenVerifyModal = (idx) => {
        const activity = todayActivities[idx];
        setActiveVerifyIndex(idx);
        // Rehydrate photos array
        setTempPhotos(activity.photos || (activity.photo ? [activity.photo] : []));
        setTempLat(activity.latitude || null);
        setTempLng(activity.longitude || null);
        setTempLocationName(activity.locationName || "");
        setTempActualTime(activity.actualTime || "");
        setTempCaptureDateTime(activity.captureDateTime || "");
        setIsCameraActive(false);
        setGpsLoading(false);
    };

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            setStream(mediaStream);
            setIsCameraActive(true);
            
            setTimeout(() => {
                const video = document.getElementById("webcam-video");
                if (video) {
                    video.srcObject = mediaStream;
                }
            }, 100);

            requestGPS();
        } catch (err) {
            console.error("Camera error:", err);
            toast.error("Could not access camera. Simulation mode activated.");
            setIsCameraActive(true);
            requestGPS();
        }
    };

    const captureSnapshot = () => {
        if (stream) {
            const video = document.getElementById("webcam-video");
            if (video) {
                const canvas = document.createElement("canvas");
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 480;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL("image/jpeg");
                // Append to array — keep camera active for more shots
                setTempPhotos(prev => [...prev, dataUrl]);
                toast.success("📸 Photo captured! You can take more.");
            }
            // Do NOT stop stream here — let user take more
        } else {
            // No camera stream (simulation mode) — add placeholder
            setTempPhotos(prev => [...prev, `https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300&t=${Date.now()}`]);
            toast.success("📸 Photo captured (simulation)!");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsCameraActive(false);
    };

    const reverseGeocode = async (lat, lng) => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
            );
            if (res.ok) {
                const data = await res.json();
                const addr = data.address || {};
                const name = [
                    addr.road || addr.pedestrian || addr.suburb,
                    addr.city || addr.town || addr.village || addr.county,
                    addr.state
                ].filter(Boolean).join(", ");
                setTempLocationName(name || data.display_name || "");
            }
        } catch (err) {
            console.error("Reverse geocode error:", err);
        }
    };

    const getTimeString = () => {
        const now = new Date();
        return now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const getDateTimeString = () => {
        const now = new Date();
        const date = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        return `${date}, ${time}`;
    };

    const requestGPS = () => {
        setGpsLoading(true);
        setTempLocationName("");
        setTempCaptureDateTime("");
        // Capture the real clock time at the moment GPS is triggered
        setTempActualTime(getTimeString());
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude.toFixed(6);
                    const lng = position.coords.longitude.toFixed(6);
                    setTempLat(lat);
                    setTempLng(lng);
                    setGpsLoading(false);
                    // Capture full date+time AFTER GPS resolves
                    setTempCaptureDateTime(getDateTimeString());
                    toast.success("GPS location captured!");
                    await reverseGeocode(lat, lng);
                },
                (error) => {
                    console.error("GPS error:", error);
                    setTimeout(async () => {
                        const lat = (22.5726 + (Math.random() - 0.5) * 0.01).toFixed(6);
                        const lng = (88.3639 + (Math.random() - 0.5) * 0.01).toFixed(6);
                        setTempLat(lat);
                        setTempLng(lng);
                        setGpsLoading(false);
                        setTempCaptureDateTime(getDateTimeString());
                        toast.info("Location simulated via center IP/GPS.");
                        await reverseGeocode(lat, lng);
                    }, 1000);
                }
            );
        } else {
            const lat = "22.572645";
            const lng = "88.363892";
            setTempLat(lat);
            setTempLng(lng);
            setGpsLoading(false);
            setTempCaptureDateTime(getDateTimeString());
            reverseGeocode(lat, lng);
        }
    };

    const handlePhotoUpload = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        // Trigger GPS on first upload if not already fetched
        if (!tempLat) {
            requestGPS();
        } else {
            // Just update the capture datetime stamp
            setTempActualTime(getTimeString());
            setTempCaptureDateTime(getDateTimeString());
        }

        // Read all selected files and append to tempPhotos
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                setTempPhotos(prev => [...prev, event.target.result]);
            };
            reader.readAsDataURL(file);
        });
        toast.success(`${files.length} photo${files.length > 1 ? 's' : ''} uploaded!`);
        // Reset input so same file can be re-uploaded
        e.target.value = '';
    };

    const saveVerification = () => {
        if (tempPhotos.length === 0) {
            toast.error("Please capture or upload at least one photo first.");
            return;
        }
        if (!tempLat || !tempLng) {
            toast.error("GPS location is required for verification.");
            return;
        }

        // Stop camera if still running
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }

        const newActs = [...todayActivities];
        newActs[activeVerifyIndex].geoTagged = true;
        newActs[activeVerifyIndex].photos = tempPhotos;
        newActs[activeVerifyIndex].photo = tempPhotos[0];  // first photo used as primary
        newActs[activeVerifyIndex].latitude = tempLat;
        newActs[activeVerifyIndex].longitude = tempLng;
        newActs[activeVerifyIndex].locationName = tempLocationName;
        newActs[activeVerifyIndex].actualTime = tempActualTime || getTimeString();
        newActs[activeVerifyIndex].captureDateTime = tempCaptureDateTime || getDateTimeString();
        setTodayActivities(newActs);

        setIsCameraActive(false);
        setActiveVerifyIndex(null);
        setTempPhotos([]);
        setTempLocationName("");
        setTempActualTime("");
        setTempCaptureDateTime("");
        toast.success(`Geo-Tag verification saved! ${tempPhotos.length} photo${tempPhotos.length > 1 ? 's' : ''} attached.`);
    };

    const closeVerifyModal = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsCameraActive(false);
        setActiveVerifyIndex(null);
        setTempPhotos([]);
        setTempCaptureDateTime("");
    };

    const toggleSaveActivity = (idx) => {
        const newActs = [...todayActivities];
        newActs[idx].isSaved = !newActs[idx].isSaved;
        setTodayActivities(newActs);
        if (newActs[idx].isSaved) {
            toast.success(`Row ${idx + 1} locked/saved.`);
        } else {
            toast.info(`Row ${idx + 1} unlocked for editing.`);
        }
    };

    const handleDeleteActivity = (idx) => {
        if (todayActivities.length === 1) {
            setTodayActivities([{ 
                type: "School Visit", 
                place: "", 
                time: "", 
                expectedLeads: "", 
                isSaved: false, 
                geoTagged: false, 
                latitude: null, 
                longitude: null, 
                photo: null 
            }]);
            toast.info("First row reset.");
        } else {
            setTodayActivities(todayActivities.filter((_, i) => i !== idx));
            toast.success("Planned activity row removed.");
        }
    };

    const [selectedStaff, setSelectedStaff] = useState(marketingPerformance[0] || null);
    const [activeTab, setActiveTab] = useState("Command Centre");
    const [todayActivities, setTodayActivities] = useState([
        { 
            type: "", 
            place: "", 
            time: "", 
            expectedLeads: "", 
            isSaved: false, 
            geoTagged: false, 
            latitude: null, 
            longitude: null,
            locationName: "",
            photo: null 
        }
    ]);

    const handleAddActivity = () => {
        setTodayActivities([...todayActivities, { 
            type: activitySources[0] || "", 
            place: "", 
            time: "", 
            expectedLeads: "", 
            isSaved: false, 
            geoTagged: false, 
            latitude: null, 
            longitude: null,
            locationName: "",
            photo: null 
        }]);
    };

    useEffect(() => {
        if (marketingPerformance.length > 0 && !selectedStaff) {
            setSelectedStaff(marketingPerformance[0]);
        }
    }, [marketingPerformance, selectedStaff]);

    // Fetch tomorrow plan when tab switches or date changes
    useEffect(() => {
        if (activeTab === "Tomorrow Planner") {
            fetchTomorrowPlan();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, tomorrowPlanDate]);

    return (
        <Layout activePage="Marketing & CRM">
            <div className={`flex flex-col min-h-screen transition-all duration-300 ${isDarkMode ? 'bg-[#0f1215] text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                <ToastContainer theme={isDarkMode ? 'dark' : 'light'} />

                <div className="flex-1 custom-scrollbar overflow-y-auto">
                    {/* HERO SECTION */}
                    <div className="bg-[#05080c] text-white p-8 md:p-12 relative overflow-hidden">
                        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row justify-between gap-8 relative z-10">
                            <div className="flex-1 space-y-6">
                                <div className="flex flex-wrap gap-3">
                                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest">Live ERP Preview</span>
                                    <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-black uppercase tracking-widest">Marketing Field Control</span>
                                    <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-black uppercase tracking-widest">Lead + Proof Audit</span>
                                </div>
                                <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight max-w-2xl">
                                    Marketing Staff Daily Duty & Proof Command Centre
                                </h1>
                                <p className="text-gray-400 text-sm max-w-xl leading-relaxed font-medium">
                                    A waterproof ERP tab where ZMs, CIs and marketing executives must pre-plan tomorrow's market work, execute field activities, upload geo-tagged proof, submit lead data, get approval, and face automatic red flags if target, quality or proof is weak.
                                </p>
                                <div className="flex flex-wrap gap-4 pt-4">
                                    {["Today duty lock", "40 leads minimum", "Geo-tag proof", "CI/ZM approval"].map((text, idx) => (
                                        <div key={idx} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[11px] font-bold text-gray-300 flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                                            {text}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="w-full lg:w-[400px]">
                                <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Today's Control Score</h4>
                                        <span className="text-4xl font-black tracking-tighter">86%</span>
                                    </div>
                                    <div className="space-y-4">
                                        {[
                                            { label: "Lead Achievement", value: 100, color: "bg-emerald-500" },
                                            { label: "Proof Compliance", value: 92, color: "bg-blue-500" },
                                            { label: "Hot Lead Ratio", value: 28, color: "bg-orange-500" }
                                        ].map((stat, idx) => (
                                            <div key={idx} className="space-y-1.5">
                                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                                                    <span>{stat.label}</span>
                                                    <span>{stat.value}%</span>
                                                </div>
                                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div className={`h-full ${stat.color} rounded-full`} style={{ width: `${stat.value}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-[1600px] mx-auto p-8 space-y-8">
                        {/* KPI ROW */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            {[
                                { label: "TOTAL LEADS", value: totalLeads, sub: "200 target across team", color: "text-emerald-500" },
                                { label: "HOT LEADS", value: totalHotLeads, sub: "High conversion priority", color: "text-orange-500" },
                                { label: "PROOF UPLOADS", value: "92", sub: "Photos and documents", color: "text-blue-500" },
                                { label: "PENDING REVIEW", value: "2", sub: "Need CI/ZM action", color: "text-red-500" },
                                { label: "RED FLAGS", value: "2", sub: "Immediate escalation", color: "text-red-500" }
                            ].map((kpi, idx) => (
                                <div key={idx} className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'} transition-all hover:scale-[1.02]`}>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{kpi.label}</p>
                                    <h3 className={`text-4xl font-black tracking-tighter my-2 ${kpi.color}`}>{kpi.value}</h3>
                                    <p className="text-[10px] font-bold text-gray-400">{kpi.sub}</p>
                                </div>
                            ))}
                        </div>

                        {/* NAVIGATION */}
                        <div className="flex flex-wrap items-center gap-2">
                            {[
                                "Command Centre", "Today Planner", "Tomorrow Planner", "Activity Audit"
                            ].map((tab, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab
                                        ? "bg-black text-white shadow-lg"
                                        : "bg-white border border-gray-100 text-gray-500 hover:border-gray-300"
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}

                            {/* ── Upload Leads CTA ── */}
                            <button
                                onClick={() => navigate("/marketing-crm/upload-leads")}
                                className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest
                                    bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30
                                    hover:from-emerald-500 hover:to-teal-500 hover:-translate-y-0.5 active:scale-95 transition-all duration-200
                                    border border-emerald-500/30"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="17 8 12 3 7 8"/>
                                    <line x1="12" y1="3" x2="12" y2="15"/>
                                </svg>
                                Upload Leads
                            </button>
                        </div>

                        {/* MAIN CONTENT SPLIT */}
                        {activeTab === "Command Centre" && (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
                            {/* STAFF BOARD (Left) */}
                            <div className="lg:col-span-4 space-y-6">
                                <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                                    <h2 className={`text-xl font-black tracking-tight mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Staff Board</h2>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6">Filter by role and status</p>
                                    
                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <select className={`px-4 py-2.5 rounded-xl border text-[11px] font-bold outline-none ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200'}`}>
                                            <option>All Roles</option>
                                        </select>
                                        <select className={`px-4 py-2.5 rounded-xl border text-[11px] font-bold outline-none ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200'}`}>
                                            <option>All Status</option>
                                        </select>
                                    </div>

                                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                        {marketingPerformance.map((staff, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => setSelectedStaff(staff)}
                                                className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedStaff?._id === staff._id
                                                    ? 'border-orange-500 bg-orange-500/5'
                                                    : 'border-transparent hover:bg-gray-50'
                                                    } ${isDarkMode && !(selectedStaff?._id === staff._id) ? 'hover:bg-gray-800/50' : ''}`}
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <h4 className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{staff.name}</h4>
                                                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">ZM • Zone Control</p>
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                                        isDarkMode 
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                            : 'bg-emerald-100 text-emerald-600 border-emerald-200'
                                                    }`}>Verified</span>
                                                </div>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {[
                                                        { label: "Leads", value: staff.currentCalls || 0 },
                                                        { label: "Hot", value: staff.hotLeads || 0 },
                                                        { label: "Proof", value: "31" },
                                                        { label: "Score", value: "97%" }
                                                    ].map((m, i) => (
                                                        <div key={i} className={`text-center p-2 rounded-xl transition-all ${isDarkMode ? 'bg-white/5' : 'bg-gray-50/50'}`}>
                                                            <p className={`text-[10px] font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{m.value}</p>
                                                            <p className={`text-[7px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}>{m.label}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* DETAIL PANEL (Right) */}
                            <div className="lg:col-span-8">
                                {selectedStaff ? (
                                    <div className={`p-8 rounded-3xl border min-h-full ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                                        <div className="flex justify-between items-start mb-8">
                                            <div>
                                                <h1 className={`text-4xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedStaff.name}</h1>
                                                <p className="text-gray-500 text-sm font-bold mt-1 uppercase tracking-widest">ZM • South Kolkata Zone • Zone Control</p>
                                            </div>
                                            <span className="px-4 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest">Risk: Low</span>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                                            {[
                                                { label: "Lead Target", value: `${selectedStaff.currentCalls || 0}/40`, status: "Healthy", color: "text-emerald-500", bg: "bg-emerald-500/5" },
                                                { label: "Duties Done", value: "9/9", status: "Healthy", color: "text-emerald-500", bg: "bg-emerald-500/5" },
                                                { label: "Proof Files", value: "31", status: "Healthy", color: "text-emerald-500", bg: "bg-emerald-500/5" },
                                                { label: "Score", value: "97%", status: "Healthy", color: "text-emerald-500", bg: "bg-emerald-500/5" }
                                            ].map((m, idx) => (
                                                <div key={idx} className={`p-6 rounded-2xl ${m.bg} border border-emerald-500/10`}>
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{m.label}</p>
                                                    <h3 className={`text-2xl font-black tracking-tighter my-2 ${m.color}`}>{m.value}</h3>
                                                    <p className={`text-[9px] font-black uppercase ${m.color}`}>{m.status}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            {/* Source Split */}
                                            <div className="space-y-6">
                                                <h4 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Source Split</h4>
                                                <div className="space-y-5">
                                                    {[
                                                        { label: "School Visits", value: 100 },
                                                        { label: "Tuition Visits", value: 67 },
                                                        { label: "Shikkha Bondhu", value: 100 },
                                                        { label: "Referrals", value: 87 }
                                                    ].map((s, idx) => (
                                                        <div key={idx} className="space-y-1.5">
                                                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                                                                <span>{s.label}</span>
                                                                <span>{s.value}%</span>
                                                            </div>
                                                            <div className={`h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                                                <div className={`h-full rounded-full ${isDarkMode ? 'bg-white' : 'bg-black'}`} style={{ width: `${s.value}%` }} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Manager Decision */}
                                            <div className="space-y-6">
                                                <h4 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Manager Decision</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <button className="px-4 py-3 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all">Approve Work</button>
                                                    <button className="px-4 py-3 rounded-xl bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all">Ask Clarification</button>
                                                    <button className="px-4 py-3 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all">Raise Red Flag</button>
                                                    <button className={`px-4 py-3 rounded-xl text-white text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-black'}`}>Assign Follow-up</button>
                                                </div>
                                                <div className="pt-4 border-t border-dashed">
                                                    <p className="text-[10px] text-gray-400 font-medium">Last submitted at <span className={`font-black ${isDarkMode ? 'text-white' : 'text-black'}`}>8:46 PM</span>. Final count is locked only after proof and approval.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400 uppercase font-black text-xs tracking-widest">
                                        Select a staff member to view details
                                    </div>
                                )}
                            </div>
                        </div>
                        )}

                        {/* TODAY PLANNER VIEW */}
                        {activeTab === "Today Planner" && (
                            <div className="space-y-6 animate-fadeIn">
                                <div>
                                    <h2 className="text-3xl font-black tracking-tighter">Today Planner</h2>
                                    <p className="text-gray-500 text-[11px] font-bold mt-1">Staff must submit today's exact duty plan. The ERP should lock vague or weak plans.</p>
                                </div>
                                
                                <div className={`p-8 rounded-[24px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                                    <h3 className="text-xl font-black tracking-tight mb-6">Create Today's Field Plan</h3>
                                    
                                    {/* Form Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                        {/* Date Field */}
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Date *</label>
                                            <input 
                                                type="date" 
                                                value={planDate}
                                                onChange={(e) => setPlanDate(e.target.value)}
                                                className={`w-full px-4 py-3 rounded-xl border text-[11px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-orange-500' : 'bg-white border-gray-200 focus:border-black shadow-sm'}`}
                                            />
                                        </div>

                                        {/* Staff Name Field (Auto-filled) */}
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Staff Name (Auto)</label>
                                            <input 
                                                type="text" 
                                                value={currentUser.name || ""}
                                                readOnly
                                                disabled
                                                placeholder="Staff Name"
                                                className={`w-full px-4 py-3 rounded-xl border text-[11px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800/80 text-gray-500 cursor-not-allowed' : 'bg-gray-100/80 border-gray-200 text-gray-500 cursor-not-allowed shadow-inner'}`}
                                            />
                                        </div>

                                        {/* Role Field (Auto-filled) */}
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Role (Auto)</label>
                                            <input 
                                                type="text" 
                                                value={currentUser.role || ""}
                                                readOnly
                                                disabled
                                                placeholder="Role"
                                                className={`w-full px-4 py-3 rounded-xl border text-[11px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800/80 text-gray-500 cursor-not-allowed' : 'bg-gray-100/80 border-gray-200 text-gray-500 cursor-not-allowed shadow-inner'}`}
                                            />
                                        </div>

                                        {/* Center Field (Auto-filled) */}
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Primary Center (Auto)</label>
                                            <input 
                                                type="text" 
                                                value={primaryCentreName || "Loading..."}
                                                readOnly
                                                disabled
                                                placeholder="Center"
                                                className={`w-full px-4 py-3 rounded-xl border text-[11px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800/80 text-gray-500 cursor-not-allowed' : 'bg-gray-100/80 border-gray-200 text-gray-500 cursor-not-allowed shadow-inner'}`}
                                            />
                                        </div>

                                        {/* Expected Lead Target Field */}
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Expected Lead Target *</label>
                                            <input 
                                                type="number" 
                                                value={expectedLeadTarget}
                                                onChange={(e) => setExpectedLeadTarget(e.target.value)}
                                                placeholder="Expected Lead Target"
                                                className={`w-full px-4 py-3 rounded-xl border text-[11px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-orange-500' : 'bg-white border-gray-200 focus:border-black shadow-sm'}`}
                                            />
                                        </div>

                                        {/* Expected Hot Leads Field */}
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Expected Hot Leads *</label>
                                            <input 
                                                type="number" 
                                                value={expectedHotLeads}
                                                onChange={(e) => setExpectedHotLeads(e.target.value)}
                                                placeholder="Expected Hot Leads"
                                                className={`w-full px-4 py-3 rounded-xl border text-[11px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-orange-500' : 'bg-white border-gray-200 focus:border-black shadow-sm'}`}
                                            />
                                        </div>
                                    </div>

                                    {/* Activity Blocks */}
                                    <div className="space-y-4 mb-8">
                                        <div className="flex justify-between items-center mb-6">
                                            <h4 className="text-lg font-black tracking-tight">Planned Activity Blocks</h4>
                                            <button onClick={handleAddActivity} className="px-4 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:shadow-lg transition-all flex items-center gap-2 active:scale-95">
                                                + Add Activity
                                            </button>
                                        </div>

                                        <div className={`p-6 rounded-2xl border space-y-4 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-[#f4f6f8] border-gray-100'}`}>
                                            {/* Grid Column Headers (Desktop only) */}
                                            <div className="hidden md:grid grid-cols-12 gap-4 px-2 text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 border-b border-gray-800/10 dark:border-gray-800/50 pb-2">
                                                <div className="col-span-3">Activity Type</div>
                                                <div className="col-span-3">Place / Institution</div>
                                                <div className="col-span-2">Time</div>
                                                <div className="col-span-1 text-center">Leads</div>
                                                <div className="col-span-2 text-center">Geo-Tag</div>
                                                <div className="col-span-1 text-center">Actions</div>
                                            </div>

                                            {todayActivities.map((activity, idx) => (
                                                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center animate-fadeIn border-b border-gray-800/10 dark:border-gray-800/30 pb-4 md:pb-0 md:border-b-0">
                                                    {/* Activity Type select — sourced from Master Data /source */}
                                                    <div className="col-span-1 md:col-span-3">
                                                        <label className="block md:hidden text-[9px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Activity Type</label>
                                                        <select 
                                                            disabled={activity.isSaved}
                                                            className={`w-full px-4 py-3 rounded-xl border text-[11px] font-bold outline-none transition-all ${activity.isSaved ? 'bg-gray-100/50 dark:bg-[#1a1f24]/30 border-transparent text-gray-400 cursor-not-allowed' : isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-white' : 'bg-white border-gray-200 shadow-sm'}`}
                                                            value={activity.type}
                                                            onChange={(e) => {
                                                                const newActs = [...todayActivities];
                                                                newActs[idx].type = e.target.value;
                                                                setTodayActivities(newActs);
                                                            }}
                                                        >
                                                            {activitySources.length > 0 ? (
                                                                activitySources.map((src, sIdx) => (
                                                                    <option key={sIdx} value={src}>{src}</option>
                                                                ))
                                                            ) : (
                                                                // Fallback options when API not loaded
                                                                ["School Visit","Tuition Visit","Shikkha Bondhu","Referral Drive","Market Activity"].map((s, sIdx) => (
                                                                    <option key={sIdx} value={s}>{s}</option>
                                                                ))
                                                            )}
                                                        </select>
                                                    </div>

                                                    {/* Place / Institution input */}
                                                    <div className="col-span-1 md:col-span-3">
                                                        <label className="block md:hidden text-[9px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Place / Institution</label>
                                                        <input 
                                                            type="text" 
                                                            disabled={activity.isSaved}
                                                            placeholder="Place / Institution"
                                                            value={activity.place}
                                                            onChange={(e) => {
                                                                const newActs = [...todayActivities];
                                                                newActs[idx].place = e.target.value;
                                                                setTodayActivities(newActs);
                                                            }}
                                                            className={`w-full px-4 py-3 rounded-xl border text-[11px] font-bold outline-none transition-all ${activity.isSaved ? 'bg-gray-100/50 dark:bg-[#1a1f24]/30 border-transparent text-gray-400 cursor-not-allowed' : isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-white' : 'bg-white border-gray-200 shadow-sm'}`}
                                                        />
                                                    </div>

                                                    {/* Time picker */}
                                                    <div className="col-span-1 md:col-span-2">
                                                        <label className="block md:hidden text-[9px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Time</label>
                                                        <input 
                                                            type="time" 
                                                            disabled={activity.isSaved}
                                                            value={activity.time}
                                                            onChange={(e) => {
                                                                const newActs = [...todayActivities];
                                                                newActs[idx].time = e.target.value;
                                                                setTodayActivities(newActs);
                                                            }}
                                                            className={`w-full px-4 py-3 rounded-xl border text-[11px] font-bold outline-none transition-all ${activity.isSaved ? 'bg-gray-100/50 dark:bg-[#1a1f24]/30 border-transparent text-gray-400 cursor-not-allowed' : isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-white' : 'bg-white border-gray-200 shadow-sm'}`}
                                                        />
                                                    </div>

                                                    {/* Expected Leads input */}
                                                    <div className="col-span-1 md:col-span-1">
                                                        <label className="block md:hidden text-[9px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Leads</label>
                                                        <input 
                                                            type="text" 
                                                            disabled={activity.isSaved}
                                                            placeholder="Leads"
                                                            value={activity.expectedLeads}
                                                            onChange={(e) => {
                                                                const newActs = [...todayActivities];
                                                                newActs[idx].expectedLeads = e.target.value;
                                                                setTodayActivities(newActs);
                                                            }}
                                                            className={`w-full px-4 py-3 rounded-xl border text-[11px] font-bold outline-none transition-all text-center ${activity.isSaved ? 'bg-gray-100/50 dark:bg-[#1a1f24]/30 border-transparent text-gray-400 cursor-not-allowed' : isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-white' : 'bg-white border-gray-200 shadow-sm'}`}
                                                        />
                                                    </div>

                                                    {/* Geo-Tag status and action button */}
                                                    <div className="col-span-1 md:col-span-2">
                                                        <label className="block md:hidden text-[9px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Geo-Tag Status</label>
                                                        {activity.geoTagged ? (
                                                            <button 
                                                                onClick={() => handleOpenVerifyModal(idx)}
                                                                className="w-full py-2.5 px-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-500 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-green-500/20 transition-all"
                                                            >
                                                                📍 Verified
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleOpenVerifyModal(idx)}
                                                                className="w-full py-2.5 px-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-500 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-orange-500/20 transition-all"
                                                            >
                                                                📸 Verify Loc
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Actions (Edit and Delete) */}
                                                    <div className="col-span-1 md:col-span-1 flex justify-center items-center gap-2 pt-2 md:pt-0">
                                                        <label className="block md:hidden text-[9px] font-bold text-gray-400 mr-2 uppercase tracking-wider">Actions</label>
                                                        
                                                        {/* Edit/Save Toggle button */}
                                                        <button 
                                                            onClick={() => toggleSaveActivity(idx)}
                                                            title={activity.isSaved ? "Edit Row" : "Save Row"}
                                                            className={`p-2 rounded-lg border transition-all ${activity.isSaved ? 'bg-blue-500/10 border-blue-500/30 text-blue-500 hover:bg-blue-500/20' : 'bg-green-500/10 border-green-500/30 text-green-500 hover:bg-green-500/20'}`}
                                                        >
                                                            {activity.isSaved ? (
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.83 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                                                </svg>
                                                            ) : (
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                                </svg>
                                                            )}
                                                        </button>

                                                        {/* Delete Row button */}
                                                        <button 
                                                            onClick={() => handleDeleteActivity(idx)}
                                                            title="Delete Row"
                                                            className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 transition-all"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleSubmitFieldPlan}
                                        className="w-full py-4 rounded-xl bg-[#05080c] text-white text-[11px] font-black uppercase tracking-widest hover:shadow-xl hover:shadow-black/20 hover:-translate-y-0.5 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Save Today's Field Plan
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Geo-Tag Verification Modal */}
                        {activeVerifyIndex !== null && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                                <div className={`w-full max-w-4xl rounded-[28px] border overflow-hidden shadow-2xl transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white' : 'bg-white border-gray-100 text-gray-800'}`}>
                                    {/* Modal Header */}
                                    <div className="p-6 border-b border-gray-800/10 dark:border-gray-800/50 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-blue-500">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                                            </svg>
                                            <h3 className="text-sm md:text-lg font-black tracking-tight uppercase">Geo-Tagged Photo Verification</h3>
                                        </div>
                                        <button onClick={closeVerifyModal} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Modal Body */}
                                    <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-h-[75vh] overflow-y-auto">
                                        {/* Left Column: Camera / Capture */}
                                        <div className={`p-4 rounded-2xl border flex flex-col gap-3 min-h-[250px] relative transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                            {/* Live Camera View */}
                                            {isCameraActive && (
                                                <div className="flex flex-col gap-3">
                                                    <video 
                                                        id="webcam-video" 
                                                        autoPlay 
                                                        playsInline 
                                                        className="w-full rounded-xl border border-gray-700 bg-black aspect-video object-cover"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={captureSnapshot}
                                                            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                                        >
                                                            📸 Capture
                                                        </button>
                                                        <button 
                                                            onClick={stopCamera}
                                                            className="px-4 py-2.5 bg-gray-600/50 hover:bg-gray-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-95"
                                                        >
                                                            ✕ Done
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Photo grid + open camera button when not active */}
                                            {!isCameraActive && (
                                                <>
                                                    {tempPhotos.length > 0 ? (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {tempPhotos.map((ph, pIdx) => (
                                                                <div key={pIdx} className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 aspect-square bg-black">
                                                                    <img src={ph} alt={`Capture ${pIdx + 1}`} className="w-full h-full object-cover" />
                                                                    <button 
                                                                        onClick={() => setTempPhotos(prev => prev.filter((_, i) => i !== pIdx))}
                                                                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        title="Remove"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                    <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                                                                        #{pIdx + 1}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center flex-1 py-6 text-gray-400 gap-2">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 opacity-40">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                                                            </svg>
                                                            <span className="text-[10px] font-bold uppercase tracking-wider">No photos yet</span>
                                                        </div>
                                                    )}

                                                    <div className="flex gap-2 mt-auto pt-2">
                                                        <button 
                                                            onClick={startCamera}
                                                            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                                        >
                                                            📸 {tempPhotos.length > 0 ? 'Take More' : 'Open Camera'}
                                                        </button>
                                                    </div>
                                                    {tempPhotos.length > 0 && (
                                                        <p className="text-[9px] text-center font-bold text-gray-400 uppercase tracking-wider">
                                                            {tempPhotos.length} photo{tempPhotos.length > 1 ? 's' : ''} captured
                                                        </p>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {/* Right Column: GPS Status & Upload */}
                                        <div className={`p-6 rounded-2xl border flex flex-col justify-between transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center text-white">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4.5 h-4.5">
                                                            <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-black uppercase tracking-wider">Location Tagging</h4>
                                                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">GPS Verification Required</span>
                                                    </div>
                                                </div>

                                                {/* Location Box */}
                                                {gpsLoading ? (
                                                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center gap-2 text-[10px] font-bold animate-pulse uppercase tracking-wider">
                                                        <svg className="animate-spin h-3.5 w-3.5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Fetching GPS &amp; Location...
                                                    </div>
                                                ) : tempLat && tempLng ? (
                                                    <div className="p-3.5 rounded-xl bg-green-500/15 border border-green-500/30 text-green-500 text-center text-[10px] font-black uppercase tracking-wider space-y-1">
                                                        <div>✅ Location Detected</div>
                                                        {tempLocationName && (
                                                            <div className="text-[9px] font-semibold normal-case tracking-normal text-green-600 dark:text-green-400 leading-snug px-1">
                                                                📍 {tempLocationName}
                                                            </div>
                                                        )}
                                                        <div className="text-[9px] font-mono lowercase tracking-normal text-green-600/70 dark:text-green-400/70">lat: {tempLat}, lng: {tempLng}</div>
                                                        {tempCaptureDateTime && (
                                                            <div className="text-[9px] font-bold normal-case tracking-normal text-green-700 dark:text-green-300 border-t border-green-500/20 pt-1 mt-1">
                                                                🕐 {tempCaptureDateTime}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-center text-[10px] font-black uppercase tracking-wider">
                                                        ❌ No Location Detected
                                                    </div>
                                                )}

                                                {/* Upload Button — multiple files */}
                                                <div>
                                                    <input 
                                                        type="file" 
                                                        accept="image/*"
                                                        multiple
                                                        onChange={handlePhotoUpload} 
                                                        className="hidden" 
                                                        id="photo-upload-input" 
                                                    />
                                                    <label 
                                                        htmlFor="photo-upload-input" 
                                                        className="w-full py-2.5 border-2 border-dashed border-blue-500/40 rounded-xl hover:bg-blue-500/5 text-blue-500 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                                                    >
                                                        + Upload Photo(s)
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-gray-800/10 dark:border-gray-800/50 flex gap-4 mt-6">
                                                <button 
                                                    onClick={closeVerifyModal}
                                                    className="flex-1 py-2.5 border border-gray-300 dark:border-gray-800 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    onClick={saveVerification}
                                                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-blue-500/10 transition-all active:scale-95"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TOMORROW PLANNER VIEW */}
                        {activeTab === "Tomorrow Planner" && (
                            <div className="space-y-6 animate-fadeIn">
                                <div>
                                    <h2 className="text-3xl font-black tracking-tighter">Tomorrow Planner</h2>
                                    <p className="text-gray-500 text-[11px] font-bold mt-1">Pre-plan tomorrow's tasks and activities.</p>
                                </div>
                                
                                <div className={`p-8 rounded-[24px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-black tracking-tight">Create Tomorrow's Field Plan</h3>
                                        <div className="flex flex-col gap-1.5 w-48">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Target Date</label>
                                            <input 
                                                type="date" 
                                                value={tomorrowPlanDate}
                                                onChange={(e) => setTomorrowPlanDate(e.target.value)}
                                                className={`w-full px-4 py-2 rounded-xl border text-[11px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-orange-500' : 'bg-white border-gray-200 focus:border-black shadow-sm'}`}
                                            />
                                        </div>
                                    </div>
                                    
                                    <form onSubmit={handleAddTomorrowTask} className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8 p-6 rounded-2xl border bg-[#05080c] border-gray-800 shadow-xl relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 pointer-events-none"></div>
                                        <div className="col-span-1 md:col-span-12 z-10">
                                            <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-blue-500">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Add New Task
                                            </h4>
                                        </div>
                                        
                                        <div className="col-span-1 md:col-span-5 z-10 flex flex-col gap-1.5">
                                            <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Task Details *</label>
                                            <input 
                                                type="text" 
                                                placeholder="What needs to be done?"
                                                value={newTaskForm.taskDetails}
                                                onChange={(e) => setNewTaskForm({...newTaskForm, taskDetails: e.target.value})}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-700 bg-black/50 text-[11px] font-bold text-white outline-none focus:border-blue-500 transition-all placeholder-gray-600"
                                            />
                                        </div>

                                        <div className="col-span-1 md:col-span-2 z-10 flex flex-col gap-1.5">
                                            <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Priority</label>
                                            <select 
                                                value={newTaskForm.priority}
                                                onChange={(e) => setNewTaskForm({...newTaskForm, priority: e.target.value})}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-700 bg-black/50 text-[11px] font-bold text-white outline-none focus:border-blue-500 transition-all"
                                            >
                                                <option value="High">High</option>
                                                <option value="Medium">Medium</option>
                                                <option value="Low">Low</option>
                                            </select>
                                        </div>

                                        <div className="col-span-1 md:col-span-2 z-10 flex flex-col gap-1.5">
                                            <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Est. Duration</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. 2 hours"
                                                value={newTaskForm.estimatedDuration}
                                                onChange={(e) => setNewTaskForm({...newTaskForm, estimatedDuration: e.target.value})}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-700 bg-black/50 text-[11px] font-bold text-white outline-none focus:border-blue-500 transition-all placeholder-gray-600"
                                            />
                                        </div>

                                        <div className="col-span-1 md:col-span-2 z-10 flex flex-col gap-1.5">
                                            <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Notes (Optional)</label>
                                            <input 
                                                type="text" 
                                                placeholder="Any extra info"
                                                value={newTaskForm.notes}
                                                onChange={(e) => setNewTaskForm({...newTaskForm, notes: e.target.value})}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-700 bg-black/50 text-[11px] font-bold text-white outline-none focus:border-blue-500 transition-all placeholder-gray-600"
                                            />
                                        </div>

                                        <div className="col-span-1 md:col-span-1 z-10 flex items-end">
                                            <button 
                                                type="submit"
                                                className="w-full h-[42px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                                                title="Add Task"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                                </svg>
                                            </button>
                                        </div>
                                    </form>

                                    {/* Task List */}
                                    <div className="space-y-4">
                                        <h4 className="text-lg font-black tracking-tight flex items-center gap-2">
                                            Planned Tasks
                                            <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-black">{tomorrowTasks.length}</span>
                                        </h4>
                                        
                                        {tomorrowTasks.length === 0 ? (
                                            <div className={`p-8 rounded-2xl border border-dashed flex flex-col items-center justify-center text-center gap-3 ${isDarkMode ? 'border-gray-800 bg-[#131619]/50' : 'border-gray-200 bg-gray-50/50'}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                                                </svg>
                                                <div>
                                                    <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">No tasks planned yet</p>
                                                    <p className="text-[10px] text-gray-400 font-bold mt-1">Use the form above to add tasks for tomorrow's field plan.</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {tomorrowTasks.map((task, idx) => (
                                                    <div key={task._id || idx} className={`p-5 rounded-2xl border relative group transition-all hover:-translate-y-1 hover:shadow-xl ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                                        <div className="flex justify-between items-start mb-3">
                                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                                task.priority === 'High' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                                task.priority === 'Medium' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                                                'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                            }`}>
                                                                {task.priority} Priority
                                                            </span>
                                                            
                                                            <button 
                                                                onClick={() => handleDeleteTomorrowTask(task._id)}
                                                                className="w-7 h-7 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                                                title="Delete Task"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                        <h5 className={`font-black text-sm mb-3 leading-snug ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{task.taskDetails}</h5>
                                                        
                                                        <div className="flex flex-col gap-2">
                                                            {task.estimatedDuration && (
                                                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                    {task.estimatedDuration}
                                                                </div>
                                                            )}
                                                            {task.notes && (
                                                                <div className="flex items-start gap-2 text-[10px] font-bold text-gray-500 bg-gray-500/5 p-2 rounded-lg">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 flex-shrink-0 mt-0.5">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                                                    </svg>
                                                                    <span className="italic leading-relaxed">{task.notes}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="mt-4 pt-3 border-t border-gray-800/10 dark:border-gray-800/50 flex justify-between items-center">
                                                            <span className={`text-[9px] font-black uppercase tracking-widest ${
                                                                task.status === 'Completed' ? 'text-green-500' :
                                                                task.status === 'Skipped' ? 'text-gray-500' :
                                                                'text-blue-500'
                                                            }`}>
                                                                • {task.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {tomorrowTasks.length > 0 && (
                                            <div className="flex justify-end pt-6 border-t border-gray-800/10 dark:border-gray-800/50 mt-6">
                                                <button
                                                    onClick={handleSaveTomorrowPlan}
                                                    disabled={savingTomorrowPlan}
                                                    className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[11px] font-black uppercase tracking-widest hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-0.5 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                                >
                                                    {savingTomorrowPlan ? (
                                                        <>
                                                            <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            Saving Field Plan...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            Save Tomorrow's Field Plan
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ACTIVITY AUDIT VIEW */}
                        {activeTab === "Activity Audit" && (() => {
                            // Build unique dropdown options from live data
                            const auditTypes = ["All", ...Array.from(new Set(auditRecords.map(r => r.type).filter(Boolean)))];
                            const auditOwners = ["All", ...Array.from(new Set(auditRecords.map(r => r.owner).filter(Boolean)))];
                            const auditStatuses = ["All", "Pending", "Approved", "Rejected"];

                            // Apply search + filters
                            const q = auditSearch.trim().toLowerCase();
                            const filteredAuditRecords = auditRecords.filter(row => {
                                const approval = approvalState[row.id] || { status: "Pending" };
                                const matchesSearch = !q || row.institution?.toLowerCase().includes(q) || row.owner?.toLowerCase().includes(q);
                                const matchesType   = auditFilterType   === "All" || row.type  === auditFilterType;
                                const matchesOwner  = auditFilterOwner  === "All" || row.owner === auditFilterOwner;
                                const matchesStatus = auditFilterStatus === "All" || approval.status === auditFilterStatus;
                                return matchesSearch && matchesType && matchesOwner && matchesStatus;
                            });

                            const filtersActive = auditSearch || auditFilterType !== "All" || auditFilterOwner !== "All" || auditFilterStatus !== "All";

                            const selectCls = `px-3 py-2 rounded-xl border text-[10px] font-black tracking-widest outline-none cursor-pointer appearance-none transition-all ${
                                isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-white' : 'bg-white border-gray-200 text-[#05080c]'
                            }`;

                            return (
                            <div className="space-y-5 animate-fadeIn">
                                {/* Header row */}
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                                    <div>
                                        <h2 className="text-3xl font-black tracking-tighter">Activity Audit</h2>
                                        <p className="text-gray-500 text-[11px] font-bold mt-1">Every submitted field plan is audited here — plan time vs actual time, proof photos, leads and CI/ZM approval.</p>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full self-start md:self-auto ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                        {filteredAuditRecords.length} / {auditRecords.length} Record{auditRecords.length !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                {/* Search + Filter bar */}
                                {auditRecords.length > 0 && (
                                    <div className={`p-4 rounded-2xl border flex flex-wrap gap-3 items-center ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                        {/* Search */}
                                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border flex-1 min-w-[200px] transition-all ${
                                            isDarkMode ? 'bg-[#131619] border-gray-700 focus-within:border-blue-500' : 'bg-white border-gray-200 focus-within:border-black'
                                        }`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 text-gray-400 flex-shrink-0">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
                                            </svg>
                                            <input
                                                type="text"
                                                value={auditSearch}
                                                onChange={e => setAuditSearch(e.target.value)}
                                                placeholder="Search by institution or owner…"
                                                className={`flex-1 bg-transparent outline-none text-[10px] font-bold ${
                                                    isDarkMode ? 'text-white placeholder-gray-600' : 'text-gray-700 placeholder-gray-400'
                                                }`}
                                            />
                                            {auditSearch && (
                                                <button onClick={() => setAuditSearch("")} className="text-gray-400 hover:text-gray-600 transition-colors text-xs leading-none">
                                                    ✕
                                                </button>
                                            )}
                                        </div>

                                        {/* Type filter */}
                                        <div className="relative">
                                            <select value={auditFilterType} onChange={e => setAuditFilterType(e.target.value)} className={selectCls}>
                                                {auditTypes.map(t => <option key={t}>{t}</option>)}
                                            </select>
                                            <span className={`absolute left-3 -top-2 text-[8px] font-black uppercase tracking-widest px-1 ${
                                                isDarkMode ? 'bg-[#1a1f24] text-gray-500' : 'bg-gray-50 text-gray-400'
                                            }`}>Type</span>
                                        </div>

                                        {/* Owner filter */}
                                        <div className="relative">
                                            <select value={auditFilterOwner} onChange={e => setAuditFilterOwner(e.target.value)} className={selectCls}>
                                                {auditOwners.map(o => <option key={o}>{o}</option>)}
                                            </select>
                                            <span className={`absolute left-3 -top-2 text-[8px] font-black uppercase tracking-widest px-1 ${
                                                isDarkMode ? 'bg-[#1a1f24] text-gray-500' : 'bg-gray-50 text-gray-400'
                                            }`}>Owner</span>
                                        </div>

                                        {/* Status filter */}
                                        <div className="relative">
                                            <select value={auditFilterStatus} onChange={e => setAuditFilterStatus(e.target.value)} className={selectCls}>
                                                {auditStatuses.map(s => <option key={s}>{s}</option>)}
                                            </select>
                                            <span className={`absolute left-3 -top-2 text-[8px] font-black uppercase tracking-widest px-1 ${
                                                isDarkMode ? 'bg-[#1a1f24] text-gray-500' : 'bg-gray-50 text-gray-400'
                                            }`}>Status</span>
                                        </div>

                                        {/* Clear filters */}
                                        {filtersActive && (
                                            <button
                                                onClick={() => { setAuditSearch(""); setAuditFilterType("All"); setAuditFilterOwner("All"); setAuditFilterStatus("All"); }}
                                                className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-400/40 text-red-500 hover:bg-red-500/10 transition-all active:scale-95"
                                            >
                                                Clear Filters
                                            </button>
                                        )}
                                    </div>
                                )}

                                {auditRecords.length === 0 ? (
                                    <div className={`p-16 rounded-[24px] border flex flex-col items-center justify-center gap-4 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                                        <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-gray-400">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                            </svg>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">No Audit Records Yet</p>
                                            <p className="text-[10px] text-gray-400 mt-1">Submit a field plan from Today Planner to populate this table.</p>
                                        </div>
                                        <button onClick={() => setActiveTab("Today Planner")} className="px-6 py-2.5 rounded-full bg-black text-white text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all active:scale-95">
                                            Go to Today Planner
                                        </button>
                                    </div>
                                ) : (
                                    <div className={`rounded-[24px] border overflow-hidden ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse min-w-[1100px]">
                                                <thead>
                                                    <tr className="bg-[#05080c] text-white text-[10px] uppercase font-black tracking-widest">
                                                        <th className="px-5 py-4 whitespace-nowrap">Type</th>
                                                        <th className="px-5 py-4 whitespace-nowrap">Institution</th>
                                                        <th className="px-5 py-4 whitespace-nowrap">Owner</th>
                                                        <th className="px-5 py-4 whitespace-nowrap">Plan Time</th>
                                                        <th className="px-5 py-4 whitespace-nowrap">Actual Time</th>
                                                        <th className="px-5 py-4 whitespace-nowrap">Leads</th>
                                                        <th className="px-5 py-4 whitespace-nowrap min-w-[140px]">Proof</th>
                                                        <th className="px-5 py-4 whitespace-nowrap">Status</th>
                                                        <th className="px-5 py-4 whitespace-nowrap min-w-[180px]">Remarks</th>
                                                        <th className="px-5 py-4 whitespace-nowrap min-w-[180px]">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-[11px] font-bold divide-y divide-gray-100 dark:divide-gray-800">
                                                    {filteredAuditRecords.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={10} className="px-5 py-12 text-center">
                                                                <div className="flex flex-col items-center gap-2 text-gray-400">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 opacity-40">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
                                                                    </svg>
                                                                    <p className="text-[10px] font-black uppercase tracking-widest">No records match your filters</p>
                                                                    <button onClick={() => { setAuditSearch(""); setAuditFilterType("All"); setAuditFilterOwner("All"); setAuditFilterStatus("All"); }} className="mt-1 text-[9px] font-black uppercase tracking-wider text-blue-500 hover:underline">
                                                                        Clear all filters
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ) : filteredAuditRecords.map((row, idx) => {
                                                        const approval = approvalState[row.id] || { status: "Pending", remarks: "" };
                                                        const statusColors = {
                                                            Pending: "text-orange-500 bg-orange-500/10 border-orange-500/20",
                                                            Approved: "text-green-500 bg-green-500/10 border-green-500/20",
                                                            Rejected: "text-red-500 bg-red-500/10 border-red-500/20"
                                                        };
                                                        // Collect all photos for this row
                                                        const allPhotos = row.photos?.length > 0 ? row.photos : (row.photo ? [row.photo] : []);
                                                        return (
                                                            <tr key={row.id} className={`${isDarkMode ? 'text-gray-300 hover:bg-gray-800/20' : 'text-gray-700 hover:bg-gray-50/70'} transition-colors align-top`}>
                                                                {/* Type */}
                                                                <td className="px-5 py-4 whitespace-nowrap">
                                                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                                                        {row.type || '—'}
                                                                    </span>
                                                                </td>
                                                                {/* Institution */}
                                                                <td className="px-5 py-4 whitespace-nowrap max-w-[160px] truncate" title={row.institution}>{row.institution}</td>
                                                                {/* Owner */}
                                                                <td className="px-5 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-[8px] font-black flex-shrink-0">
                                                                            {row.owner?.charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <span>{row.owner}</span>
                                                                    </div>
                                                                </td>
                                                                {/* Plan Time */}
                                                                <td className="px-5 py-4 whitespace-nowrap font-mono text-[10px]">{row.plan}</td>
                                                                {/* Actual Time */}
                                                                <td className="px-5 py-4 whitespace-nowrap">
                                                                    <span className="font-mono text-[10px] text-blue-500 font-black">{row.actual}</span>
                                                                </td>
                                                                {/* Leads */}
                                                                <td className="px-5 py-4 whitespace-nowrap">
                                                                    <span className="font-black">{row.leads}</span>
                                                                </td>
                                                                {/* Proof — all photos as thumbnails */}
                                                                <td className="px-5 py-4">
                                                                    {allPhotos.length > 0 ? (
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {allPhotos.map((ph, pIdx) => (
                                                                                <div
                                                                                    key={pIdx}
                                                                                    className="group relative w-11 h-11 rounded-lg overflow-hidden border-2 border-green-400/40 cursor-pointer flex-shrink-0"
                                                                                    onClick={() => setPreviewImage(ph)}
                                                                                    title={`Photo ${pIdx + 1}`}
                                                                                >
                                                                                    <img src={ph} alt={`Proof ${pIdx + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                                                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
                                                                                        </svg>
                                                                                    </div>
                                                                                    {allPhotos.length > 1 && (
                                                                                        <div className="absolute bottom-0.5 left-0.5 bg-black/70 text-white text-[7px] font-black px-1 rounded-sm leading-tight">
                                                                                            {pIdx + 1}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-[9px] text-gray-400 font-bold uppercase">No photo</span>
                                                                    )}
                                                                </td>
                                                                {/* Status — badge only */}
                                                                <td className="px-5 py-4 whitespace-nowrap">
                                                                    <span className={`px-2.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${statusColors[approval.status]}`}>
                                                                        {approval.status}
                                                                    </span>
                                                                </td>
                                                                {/* Remarks — separate column */}
                                                                <td className="px-5 py-4 min-w-[180px]">
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Add remarks…"
                                                                        value={approval.remarks}
                                                                        onChange={(e) => setApprovalState(prev => ({
                                                                            ...prev,
                                                                            [row.id]: { ...prev[row.id], remarks: e.target.value }
                                                                        }))}
                                                                        onBlur={(e) => handleSaveRemarks(row.id, e.target.value)}
                                                                        className={`w-full px-3 py-2 rounded-lg border text-[10px] outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-blue-500 placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-700 focus:border-black placeholder-gray-400'}`}
                                                                    />
                                                                </td>
                                                                {/* Action — Approve + Reject buttons */}
                                                                <td className="px-5 py-4 min-w-[180px]">
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() => handleUpdateApprovalStatus(row.id, "Approved")}
                                                                            className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 ${
                                                                                approval.status === "Approved"
                                                                                    ? 'bg-green-500/15 text-green-500 border border-green-500/30 cursor-default'
                                                                                    : 'bg-green-500 text-white hover:bg-green-600 hover:shadow-md hover:shadow-green-500/20'
                                                                            }`}
                                                                        >
                                                                            ✓ Approve
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleUpdateApprovalStatus(row.id, "Rejected")}
                                                                            className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 ${
                                                                                approval.status === "Rejected"
                                                                                    ? 'bg-red-500/15 text-red-500 border border-red-500/30 cursor-default'
                                                                                    : 'bg-red-500 text-white hover:bg-red-600 hover:shadow-md hover:shadow-red-500/20'
                                                                            }`}
                                                                        >
                                                                            ✕ Reject
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                             </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Full-Screen Image Preview Modal */}
                {previewImage && (
                    <div 
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm transition-opacity duration-300"
                        onClick={() => setPreviewImage(null)}
                    >
                        <div className="relative max-w-[90%] max-h-[90%] flex flex-col items-center">
                            <button 
                                className="absolute -top-12 right-0 text-white hover:text-cyan-400 text-3xl font-black focus:outline-none transition-colors"
                                onClick={() => setPreviewImage(null)}
                            >
                                &times;
                            </button>
                            <img 
                                src={previewImage} 
                                alt="Proof Preview" 
                                className="max-w-full max-h-[80vh] rounded-lg border border-cyan-500/20 object-contain shadow-[0_0_50px_rgba(6,182,212,0.2)]"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                )}

                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                    
                    * {
                        font-family: 'Inter', sans-serif;
                    }

                    .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }

                    .tracking-tighter { letter-spacing: -0.05em; }
                `}</style>
            </div>
        </Layout>
    );
};

export default MarketingCRM;
