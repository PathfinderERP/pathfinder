import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Layout from "../../components/Layout";
import Select from "react-select";
import * as XLSX from "xlsx";
import {
  FaTrain,
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaSync,
  FaTimes,
  FaArrowRight,
  FaClock,
  FaUserTie,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaDownload,
  FaUpload,
  FaFileExcel,
  FaCheck,
  FaTicketAlt
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import usePermission from "../../hooks/usePermission";
import { useTheme } from "../../context/ThemeContext";

const API_URL = import.meta.env.VITE_API_URL;
const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TRAVEL_CLASSES = ["AC", "SL", "3A", "2A", "1A", "2S", "CC", "EC"];

// Helper to format date from Excel or input
const formatDateValue = (val) => {
  if (val === null || val === undefined || val === "") return "";
  if (typeof val === "number") {
    // Excel date serial number
    try {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      const d = String(date.getDate()).padStart(2, "0");
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const y = String(date.getFullYear()).slice(-2);
      return `${d}-${m}-${y}`;
    } catch (e) {
      return String(val);
    }
  }
  return String(val).trim();
};

const TrainTimings = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  // Data states
  const [timings, setTimings] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedJourneyType, setSelectedJourneyType] = useState("");
  const [selectedCentreId, setSelectedCentreId] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Import Modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  // Permissions
  const canCreate = usePermission("academics", "trainTimings", "create");
  const canEdit = usePermission("academics", "trainTimings", "edit");
  const canDelete = usePermission("academics", "trainTimings", "delete");

  // Form State
  const initialFormState = {
    teacherId: "",
    teacherName: "",
    sex: "M",
    age: "",
    dateOfJourney: "",
    fromStation: "",
    toStation: "",
    travelClass: "AC",
    trainName: "",
    trainNumber: "",
    boardingStation: "",
    phoneNo: "",
    centreId: "",
    day: "Monday",
    journeyType: "UP",
    departureTime: "",
    arrivalTime: "",
    remarks: ""
  };
  const [formData, setFormData] = useState(initialFormState);

  // Fetch dropdown data: Teachers & Centres
  const fetchDropdownData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const [teacherRes, centreRes] = await Promise.all([
        fetch(`${API_URL}/academics/teacher/list`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/centre`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (teacherRes.ok) {
        const teacherData = await teacherRes.json();
        setTeachers(Array.isArray(teacherData) ? teacherData : []);
      }
      if (centreRes.ok) {
        const centreData = await centreRes.json();
        setCentres(Array.isArray(centreData) ? centreData : []);
      }
    } catch (err) {
      console.error("Error loading dropdown data:", err);
      toast.error("Failed to load teachers or centres list");
    }
  }, []);

  // Fetch train timings list
  const fetchTimings = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (selectedDay) params.append("day", selectedDay);
      if (selectedJourneyType) params.append("journeyType", selectedJourneyType);
      if (selectedCentreId) params.append("centreId", selectedCentreId);
      if (searchTerm) params.append("search", searchTerm);

      const res = await fetch(`${API_URL}/academics/train-timing?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setTimings(Array.isArray(data.data) ? data.data : []);
      } else {
        toast.error(data.message || "Failed to fetch train timings");
      }
    } catch (err) {
      console.error("Error fetching train timings:", err);
      toast.error("Error fetching train timings");
    } finally {
      setLoading(false);
    }
  }, [selectedDay, selectedJourneyType, selectedCentreId, searchTerm]);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  useEffect(() => {
    fetchTimings();
  }, [fetchTimings]);

  // Handle open create modal
  const handleOpenCreateModal = () => {
    setFormData(initialFormState);
    setIsEditing(false);
    setEditId(null);
    setShowModal(true);
  };

  // Handle open edit modal
  const handleOpenEditModal = (item) => {
    setFormData({
      teacherId: item.teacherId?._id || item.teacherId || "",
      teacherName: item.teacherName || item.teacherId?.name || "",
      sex: item.sex || "M",
      age: item.age || "",
      dateOfJourney: item.dateOfJourney || (item.date ? item.date.split("T")[0] : ""),
      fromStation: item.fromStation || "",
      toStation: item.toStation || "",
      travelClass: item.travelClass || "AC",
      trainName: item.trainName || "",
      trainNumber: item.trainNumber || "",
      boardingStation: item.boardingStation || "",
      phoneNo: item.phoneNo || item.teacherId?.mobNum || "",
      centreId: item.centreId?._id || item.centreId || "",
      day: item.day || "Monday",
      journeyType: item.journeyType || "UP",
      departureTime: item.departureTime || "",
      arrivalTime: item.arrivalTime || "",
      remarks: item.remarks || ""
    });
    setIsEditing(true);
    setEditId(item._id);
    setShowModal(true);
  };

  // Handle teacher select change in modal
  const handleTeacherSelect = (opt) => {
    if (opt && opt.teacher) {
      const t = opt.teacher;
      setFormData((prev) => ({
        ...prev,
        teacherId: t._id,
        teacherName: t.name,
        phoneNo: t.mobNum || prev.phoneNo
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        teacherId: "",
        teacherName: ""
      }));
    }
  };

  // Submit create or edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.teacherName.trim() && !formData.teacherId) {
      toast.warning("Teacher or Passenger Name is required");
      return;
    }
    if (!formData.fromStation.trim() || !formData.toStation.trim() || !formData.trainName.trim()) {
      toast.warning("Train Name, From Station, and To Station are required");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const url = isEditing
        ? `${API_URL}/academics/train-timing/${editId}`
        : `${API_URL}/academics/train-timing`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(isEditing ? "Train schedule updated successfully" : "Train schedule saved successfully");
        setShowModal(false);
        fetchTimings();
      } else {
        toast.error(data.message || "Failed to save train schedule");
      }
    } catch (err) {
      console.error("Submit Error:", err);
      toast.error("Error saving train schedule");
    }
  };

  // Delete Action
  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/academics/train-timing/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Train timing deleted successfully");
        setDeleteConfirmId(null);
        fetchTimings();
      } else {
        toast.error(data.message || "Failed to delete train timing");
      }
    } catch (err) {
      console.error("Delete Error:", err);
      toast.error("Error deleting train timing");
    }
  };

  // ==========================================
  // EXPORT EXCEL (Matches Requisition Format)
  // ==========================================
  const handleExportExcel = () => {
    try {
      if (timings.length === 0) {
        toast.warn("No train schedule records to export");
        return;
      }

      const rows = [
        ["PATHFINDER EDUCATIONAL CENTRE"],
        ["Requisition for  RAILWAY /BUS TICKET"],
        ["Please Purchase the following Tickets."],
        [], // empty row
        ["SL", "NAME", "SEX", "AGE", "DATE OF JOURNEY", "FROM", "TO", "CLASS", "TRAIN NAME", "BORDING STN", "PHONE NO."]
      ];

      timings.forEach((item, index) => {
        const sl = index + 1;
        const name = item.teacherName || item.teacherId?.name || "";
        const sex = item.sex || "M";
        const age = item.age || "";
        const doj = item.dateOfJourney || (item.date ? item.date.split("T")[0] : "");
        const from = item.fromStation || "";
        const to = item.toStation || "";
        const cls = item.travelClass || "AC";
        const trainName = item.trainNumber && !item.trainName.includes(item.trainNumber)
          ? `${item.trainNumber}-${item.trainName}`
          : item.trainName || "";
        const boarding = item.boardingStation || "";
        const phone = item.phoneNo || item.teacherId?.mobNum || "";

        rows.push([sl, name, sex, age, doj, from, to, cls, trainName, boarding, phone]);
      });

      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Merge header title rows across 11 columns
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } }
      ];

      // Set clean column widths
      ws["!cols"] = [
        { wch: 6 },  // SL
        { wch: 25 }, // NAME
        { wch: 8 },  // SEX
        { wch: 8 },  // AGE
        { wch: 18 }, // DATE OF JOURNEY
        { wch: 18 }, // FROM
        { wch: 18 }, // TO
        { wch: 10 }, // CLASS
        { wch: 28 }, // TRAIN NAME
        { wch: 18 }, // BORDING STN
        { wch: 16 }  // PHONE NO.
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ticket Requisition");
      const dateStr = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `Pathfinder_Train_Ticket_Requisition_${dateStr}.xlsx`);
      toast.success("Excel sheet exported successfully");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to export Excel file");
    }
  };

  // ==========================================
  // DOWNLOAD TEMPLATE (Matches Requisition Format)
  // ==========================================
  const handleDownloadTemplate = () => {
    try {
      const templateRows = [
        ["PATHFINDER EDUCATIONAL CENTRE"],
        ["Requisition for  RAILWAY /BUS TICKET"],
        ["Please Purchase the following Tickets."],
        [],
        ["SL", "NAME", "SEX", "AGE", "DATE OF JOURNEY", "FROM", "TO", "CLASS", "TRAIN NAME", "BORDING STN", "PHONE NO."],
        [1, "SUBRATA SARDAR", "M", 32, "03-10-26", "SEALDAH", "MALDA TOWN", "AC", "13189-BALURGHAT EXP.", "BANDEL", "9876543210"],
        [2, "SABIR ALI", "M", 28, "03-10-26", "SEALDAH", "MALDA TOWN", "AC", "13189-BALURGHAT EXP.", "BANDEL", "9876543211"],
        [3, "SABIR ALI", "M", 28, "04-10-26", "MALDA TOWN", "SEALDAH", "AC", "13189-BALURGHAT EXP.", "BANDEL", "9876543211"],
        [4, "SUBRATA SARDAR", "M", 32, "04-10-26", "MALDA TOWN", "SEALDAH", "AC", "13189-BALURGHAT EXP.", "BANDEL", "9876543210"],
        [5, "SAMUDRA CHATTERJEE", "M", 41, "10-10-26", "SEALDAH", "MALDA TOWN", "AC", "13189-BALURGHAT EXP.", "BANDEL", "9876543212"],
        [6, "TUSHAR KANTO DEY", "M", 33, "10-10-26", "SEALDAH", "MALDA TOWN", "AC", "13189-BALURGHAT EXP.", "BANDEL", "9876543213"],
        [7, "TUSHAR KANTO DEY", "M", 33, "11-10-26", "MALDA TOWN", "HOWRAH", "AC", "22302-VANDE BHARAT EXP.", "BANDEL", "9876543213"],
        [8, "SAMUDRA CHATTERJEE", "M", 41, "11-10-26", "MALDA TOWN", "HOWRAH", "AC", "22302-VANDE BHARAT EXP.", "BANDEL", "9876543212"]
      ];

      const ws = XLSX.utils.aoa_to_sheet(templateRows);
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } }
      ];

      ws["!cols"] = [
        { wch: 6 },
        { wch: 25 },
        { wch: 8 },
        { wch: 8 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 10 },
        { wch: 28 },
        { wch: 18 },
        { wch: 16 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ticket Template");
      XLSX.writeFile(wb, "Pathfinder_Train_Ticket_Requisition_Template.xlsx");
      toast.success("Excel template downloaded successfully");
    } catch (err) {
      console.error("Template download error:", err);
      toast.error("Failed to download template");
    }
  };

  // ==========================================
  // IMPORT EXCEL (Smart parser for both formats)
  // ==========================================
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];

        // Parse sheet as raw 2D array of cells
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        if (!rawData || rawData.length === 0) {
          toast.error("The selected Excel sheet is empty");
          return;
        }

        // Find header row: look for row containing "NAME", "FROM", "TO" or "TRAIN"
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(rawData.length, 10); i++) {
          const rowStr = rawData[i].map((c) => String(c).toUpperCase().trim()).join(" ");
          if (
            (rowStr.includes("NAME") && (rowStr.includes("FROM") || rowStr.includes("TO"))) ||
            rowStr.includes("TRAIN") ||
            rowStr.includes("DATE OF JOURNEY")
          ) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          toast.error("Could not find header row. Please use the downloaded template.");
          return;
        }

        const headers = rawData[headerRowIndex].map((h) => String(h).toUpperCase().trim());

        // Find column index mappings
        const getColIdx = (aliases) => {
          return headers.findIndex((h) => aliases.some((a) => h === a || h.includes(a)));
        };

        const slIdx = getColIdx(["SL", "S.NO", "NO"]);
        const nameIdx = getColIdx(["NAME", "TEACHER NAME", "PASSENGER"]);
        const sexIdx = getColIdx(["SEX", "GENDER"]);
        const ageIdx = getColIdx(["AGE"]);
        const dojIdx = getColIdx(["DATE OF JOURNEY", "JOURNEY DATE", "DATE"]);
        const fromIdx = getColIdx(["FROM", "FROM STATION", "SOURCE"]);
        const toIdx = getColIdx(["TO", "TO STATION", "DESTINATION"]);
        const classIdx = getColIdx(["CLASS", "TRAVEL CLASS"]);
        const trainIdx = getColIdx(["TRAIN NAME", "TRAIN", "TRAIN NO"]);
        const bordingIdx = getColIdx(["BORDING STN", "BOARDING STN", "BOARDING", "BORDING"]);
        const phoneIdx = getColIdx(["PHONE NO.", "PHONE NO", "PHONE", "MOBILE", "CONTACT"]);

        const parsedRows = [];
        for (let r = headerRowIndex + 1; r < rawData.length; r++) {
          const row = rawData[r];
          if (!row || row.length === 0) continue;

          const teacherName = nameIdx >= 0 ? String(row[nameIdx] || "").trim() : "";
          const fromStation = fromIdx >= 0 ? String(row[fromIdx] || "").trim() : "";
          const toStation = toIdx >= 0 ? String(row[toIdx] || "").trim() : "";

          // Skip empty trailing rows
          if (!teacherName && !fromStation && !toStation) continue;

          const sl = slIdx >= 0 && row[slIdx] !== "" ? row[slIdx] : parsedRows.length + 1;
          const sex = sexIdx >= 0 ? String(row[sexIdx] || "M").trim() : "M";
          const age = ageIdx >= 0 ? row[ageIdx] : "";
          const dateOfJourney = dojIdx >= 0 ? formatDateValue(row[dojIdx]) : "";
          const travelClass = classIdx >= 0 ? String(row[classIdx] || "AC").trim() : "AC";
          const trainName = trainIdx >= 0 ? String(row[trainIdx] || "Express").trim() : "Express";
          const boardingStation = bordingIdx >= 0 ? String(row[bordingIdx] || "").trim() : "";
          const phoneNo = phoneIdx >= 0 ? String(row[phoneIdx] || "").trim() : "";

          parsedRows.push({
            sl,
            teacherName,
            sex,
            age,
            dateOfJourney,
            fromStation,
            toStation,
            travelClass,
            trainName,
            boardingStation,
            phoneNo
          });
        }

        if (parsedRows.length === 0) {
          toast.warning("No data records found in Excel sheet");
          return;
        }

        setImportPreviewData(parsedRows);
      } catch (err) {
        console.error("Excel Read Error:", err);
        toast.error("Failed to read Excel file. Ensure valid format.");
      }
    };
    reader.readAsBinaryString(file);
  };

  // Confirm and submit bulk import to backend
  const handleConfirmImport = async () => {
    if (!importPreviewData || importPreviewData.length === 0) {
      toast.warning("No records to import");
      return;
    }

    try {
      setIsImporting(true);
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/academics/train-timing/bulk-import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ timings: importPreviewData })
      });

      const data = await res.json();
      if (res.ok) {
        const count = data.importedCount || data.stats?.inserted || importPreviewData.length;
        toast.success(`Import completed successfully! ${count} records inserted.`);
        setShowImportModal(false);
        setImportPreviewData([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchTimings();
      } else {
        toast.error(data.message || "Bulk import failed");
      }
    } catch (err) {
      console.error("Import error:", err);
      toast.error("Error importing records");
    } finally {
      setIsImporting(false);
    }
  };

  // Summary statistics
  const stats = useMemo(() => {
    const total = timings.length;
    const uniqueTeachers = new Set(
      timings.map((t) => (t.teacherName || t.teacherId?.name || "").trim().toLowerCase()).filter(Boolean)
    ).size;
    const upJourneys = timings.filter((t) => t.journeyType === "UP").length;
    const downJourneys = timings.filter((t) => t.journeyType === "DOWN").length;
    const roundTrips = timings.filter((t) => t.journeyType === "ROUND_TRIP").length;
    const uniqueCentres = new Set(timings.map((t) => t.centreId?._id || t.centreId).filter(Boolean)).size;

    return { total, uniqueTeachers, upJourneys, downJourneys, roundTrips, uniqueCentres };
  }, [timings]);

  // Client-side pagination
  const totalPages = Math.ceil(timings.length / itemsPerPage) || 1;
  const paginatedTimings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return timings.slice(start, start + itemsPerPage);
  }, [timings, currentPage, itemsPerPage]);

  // React Select Options for Teachers
  const teacherOptions = useMemo(() => {
    return teachers.map((t) => ({
      value: t._id,
      label: `${t.name} [${t.employeeId || "No ID"}] ${t.mobNum ? `• ${t.mobNum}` : ""}`,
      teacher: t
    }));
  }, [teachers]);

  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      backgroundColor: isDarkMode ? "#181f2a" : "#f8fafc",
      borderColor: state.isFocused ? "#3b82f6" : isDarkMode ? "#374151" : "#d1d5db",
      padding: "2px",
      borderRadius: "0.5rem",
      boxShadow: "none",
      "&:hover": { borderColor: "#3b82f6" }
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
      zIndex: 100
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? (isDarkMode ? "#334155" : "#e2e8f0") : "transparent",
      color: isDarkMode ? "#f1f5f9" : "#1e293b",
      cursor: "pointer"
    }),
    singleValue: (base) => ({
      ...base,
      color: isDarkMode ? "#f1f5f9" : "#0f172a"
    }),
    input: (base) => ({
      ...base,
      color: isDarkMode ? "#f1f5f9" : "#0f172a"
    })
  };

  return (
    <Layout>
      <div className={`p-4 md:p-6 min-h-screen ${isDarkMode ? "bg-[#0b0f17] text-slate-100" : "bg-slate-50 text-slate-800"}`}>
        <ToastContainer position="top-right" autoClose={3000} theme={isDarkMode ? "dark" : "light"} />

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg text-white">
                <FaTrain className="text-2xl" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Train Timings & Allocation</h1>
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Pathfinder Educational Centre — Railway Ticket Requisition & Schedule
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Export Button */}
            <button
              onClick={handleExportExcel}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium text-sm transition-all shadow-sm ${
                isDarkMode
                  ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
              }`}
              title="Export to Requisition Excel format"
            >
              <FaDownload className="text-xs" />
              <span>Export</span>
            </button>

            {/* Import Button */}
            <button
              onClick={() => {
                setImportPreviewData([]);
                setShowImportModal(true);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium text-sm transition-all shadow-sm ${
                isDarkMode
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30"
                  : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
              }`}
              title="Import from Requisition Excel file"
            >
              <FaUpload className="text-xs" />
              <span>Import</span>
            </button>

            {/* Template Download Button */}
            <button
              onClick={handleDownloadTemplate}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium text-sm transition-all shadow-sm ${
                isDarkMode
                  ? "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
                  : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
              }`}
              title="Download Requisition Excel Template"
            >
              <FaFileExcel className="text-emerald-500 text-xs" />
              <span>Template</span>
            </button>

            {/* Allocate Train / Add Ticket Button */}
            {canCreate && (
              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium text-sm shadow-md hover:shadow-lg transition-all"
              >
                <FaPlus className="text-xs" />
                <span>Allocate Train</span>
              </button>
            )}
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"} shadow-sm`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Total Allocations
                </p>
                <h3 className="text-2xl font-bold mt-1 text-blue-500">{stats.total}</h3>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
                <FaTicketAlt className="text-xl" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">Active journey records scheduled</p>
          </div>

          <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"} shadow-sm`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Travelling Teachers
                </p>
                <h3 className="text-2xl font-bold mt-1 text-emerald-500">{stats.uniqueTeachers}</h3>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500">
                <FaUserTie className="text-xl" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">Faculty assigned to train journeys</p>
          </div>

          <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"} shadow-sm`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Journey Directions
                </p>
                <div className="flex items-center gap-2 mt-1 font-bold text-sm">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">UP: {stats.upJourneys}</span>
                  <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400">DOWN: {stats.downJourneys}</span>
                  {stats.roundTrips > 0 && (
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">RT: {stats.roundTrips}</span>
                  )}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
                <FaTrain className="text-xl" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">Distribution by journey type</p>
          </div>

          <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"} shadow-sm`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Centres Connected
                </p>
                <h3 className="text-2xl font-bold mt-1 text-amber-500">{stats.uniqueCentres}</h3>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 text-amber-500">
                <FaMapMarkerAlt className="text-xl" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">Study centres served via train</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className={`p-4 rounded-xl border mb-6 ${isDarkMode ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200"} shadow-sm`}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
            <div className="md:col-span-4 relative">
              <FaSearch className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search teacher, train, station, phone..."
                className={`w-full pl-9 pr-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode
                    ? "bg-slate-800/80 border-slate-700 text-white placeholder-slate-500"
                    : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400"
                }`}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <FaTimes className="text-xs" />
                </button>
              )}
            </div>

            {/* Day Filter */}
            <div className="md:col-span-2">
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className={`w-full py-2 px-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode ? "bg-slate-800/80 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                }`}
              >
                <option value="">All Days</option>
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Journey Type Filter */}
            <div className="md:col-span-2">
              <select
                value={selectedJourneyType}
                onChange={(e) => setSelectedJourneyType(e.target.value)}
                className={`w-full py-2 px-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode ? "bg-slate-800/80 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                }`}
              >
                <option value="">All Journeys</option>
                <option value="UP">UP Journey</option>
                <option value="DOWN">DOWN Journey</option>
                <option value="ROUND_TRIP">ROUND TRIP</option>
              </select>
            </div>

            {/* Centre Filter */}
            <div className="md:col-span-2">
              <select
                value={selectedCentreId}
                onChange={(e) => setSelectedCentreId(e.target.value)}
                className={`w-full py-2 px-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode ? "bg-slate-800/80 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                }`}
              >
                <option value="">All Centres</option>
                {centres.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.centreName}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset & Refresh */}
            <div className="md:col-span-2 flex items-center gap-2 justify-end">
              {(searchTerm || selectedDay || selectedJourneyType || selectedCentreId) && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedDay("");
                    setSelectedJourneyType("");
                    setSelectedCentreId("");
                  }}
                  className={`px-3 py-2 text-sm rounded-lg border flex items-center gap-1.5 transition-colors ${
                    isDarkMode ? "border-slate-700 hover:bg-slate-800 text-slate-300" : "border-slate-200 hover:bg-slate-100 text-slate-600"
                  }`}
                  title="Reset all filters"
                >
                  <FaTimes className="text-xs" />
                  <span>Reset</span>
                </button>
              )}
              <button
                onClick={fetchTimings}
                className={`p-2.5 rounded-lg border transition-colors ${
                  isDarkMode ? "border-slate-700 hover:bg-slate-800 text-slate-300" : "border-slate-200 hover:bg-slate-100 text-slate-600"
                }`}
                title="Refresh Table"
              >
                <FaSync className={`text-xs ${loading ? "animate-spin text-blue-500" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Timings Table Matching Format */}
        <div className={`rounded-xl border overflow-hidden shadow-sm ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200"}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className={`border-b ${isDarkMode ? "bg-slate-800/60 border-slate-800 text-slate-300" : "bg-slate-100/70 border-slate-200 text-slate-700"}`}>
                  <th className="py-3 px-3 font-semibold text-center w-12">SL</th>
                  <th className="py-3 px-4 font-semibold">NAME</th>
                  <th className="py-3 px-3 font-semibold text-center">SEX</th>
                  <th className="py-3 px-3 font-semibold text-center">AGE</th>
                  <th className="py-3 px-4 font-semibold">DATE OF JOURNEY</th>
                  <th className="py-3 px-4 font-semibold">FROM</th>
                  <th className="py-3 px-4 font-semibold">TO</th>
                  <th className="py-3 px-3 font-semibold text-center">CLASS</th>
                  <th className="py-3 px-4 font-semibold">TRAIN NAME</th>
                  <th className="py-3 px-4 font-semibold">BORDING STN</th>
                  <th className="py-3 px-4 font-semibold">PHONE NO.</th>
                  <th className="py-3 px-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan="12" className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FaSync className="animate-spin text-2xl text-blue-500" />
                        <span>Loading train timings...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedTimings.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FaTrain className="text-4xl text-slate-500 mb-1 opacity-50" />
                        <span className="font-medium text-base text-slate-300">No train timing records found</span>
                        <p className="text-xs text-slate-500">
                          {searchTerm || selectedDay || selectedJourneyType
                            ? "Try adjusting your filter search criteria"
                            : "Click 'Allocate Train' or 'Import' above to add train ticket requisitions"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedTimings.map((item, index) => {
                    const teacher = item.teacherId;
                    const teacherDisplayName = item.teacherName || teacher?.name || "N/A";
                    const slNumber = (currentPage - 1) * itemsPerPage + index + 1;
                    const phoneDisplay = item.phoneNo || teacher?.mobNum || "--";
                    const travelClassDisplay = item.travelClass || "AC";

                    return (
                      <tr
                        key={item._id}
                        className={`transition-colors ${
                          isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-slate-50/80"
                        }`}
                      >
                        {/* SL */}
                        <td className="py-3 px-3 text-center font-mono text-xs text-slate-400 font-semibold">
                          {slNumber}
                        </td>

                        {/* NAME */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs uppercase shadow shrink-0">
                              {teacherDisplayName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-sm leading-tight">
                                {teacherDisplayName}
                              </div>
                              {teacher?.employeeId && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium ${
                                  isDarkMode ? "bg-slate-800 text-blue-400" : "bg-blue-50 text-blue-600"
                                }`}>
                                  ID: {teacher.employeeId}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* SEX */}
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                            item.sex === "F" || item.sex === "Female"
                              ? "bg-pink-500/15 text-pink-400 border border-pink-500/30"
                              : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                          }`}>
                            {item.sex === "Female" ? "F" : item.sex === "Male" ? "M" : (item.sex || "M")}
                          </span>
                        </td>

                        {/* AGE */}
                        <td className="py-3 px-3 text-center font-mono text-xs text-slate-300">
                          {item.age || "--"}
                        </td>

                        {/* DATE OF JOURNEY */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs text-blue-400">
                              {item.dateOfJourney || (item.date ? item.date.split("T")[0] : "--")}
                            </span>
                            {item.day && (
                              <span className="text-[11px] text-slate-400">
                                {item.day}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* FROM */}
                        <td className="py-3 px-4 font-medium text-xs uppercase tracking-wide">
                          {item.fromStation || "--"}
                        </td>

                        {/* TO */}
                        <td className="py-3 px-4 font-medium text-xs uppercase tracking-wide">
                          {item.toStation || "--"}
                        </td>

                        {/* CLASS */}
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase">
                            {travelClassDisplay}
                          </span>
                        </td>

                        {/* TRAIN NAME */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-xs flex items-center gap-1.5 text-slate-200">
                            <FaTrain className="text-blue-400 text-[11px] shrink-0" />
                            <span>
                              {item.trainNumber && !item.trainName.includes(item.trainNumber)
                                ? `${item.trainNumber}-${item.trainName}`
                                : item.trainName}
                            </span>
                          </div>
                          {(item.departureTime || item.arrivalTime) && (
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <FaClock className="text-[9px]" />
                              <span>{item.departureTime || "--"} → {item.arrivalTime || "--"}</span>
                            </div>
                          )}
                        </td>

                        {/* BORDING STN */}
                        <td className="py-3 px-4 font-medium text-xs uppercase tracking-wide">
                          {item.boardingStation || "--"}
                        </td>

                        {/* PHONE NO. */}
                        <td className="py-3 px-4 text-xs font-mono text-slate-300">
                          {phoneDisplay !== "--" ? (
                            <span className="flex items-center gap-1.5">
                              <FaPhoneAlt className="text-[10px] text-emerald-400 shrink-0" />
                              {phoneDisplay}
                            </span>
                          ) : (
                            "--"
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {canEdit && (
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className={`p-1.5 rounded hover:scale-110 transition-transform ${
                                  isDarkMode ? "text-blue-400 hover:bg-blue-500/20" : "text-blue-600 hover:bg-blue-50"
                                }`}
                                title="Edit Requisition"
                              >
                                <FaEdit className="text-sm" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => setDeleteConfirmId(item._id)}
                                className={`p-1.5 rounded hover:scale-110 transition-transform ${
                                  isDarkMode ? "text-red-400 hover:bg-red-500/20" : "text-red-600 hover:bg-red-50"
                                }`}
                                title="Delete Allocation"
                              >
                                <FaTrash className="text-sm" />
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

          {/* Pagination Footer */}
          {!loading && timings.length > 0 && (
            <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
              isDarkMode ? "border-slate-800 bg-slate-900/30 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-600"
            }`}>
              <div>
                Showing <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> to{" "}
                <strong>{Math.min(currentPage * itemsPerPage, timings.length)}</strong> of{" "}
                <strong>{timings.length}</strong> allocations
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className={`px-3 py-1.5 rounded border transition-colors ${
                    currentPage === 1
                      ? "opacity-50 cursor-not-allowed"
                      : isDarkMode
                      ? "border-slate-700 hover:bg-slate-800 text-slate-200"
                      : "border-slate-300 hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  Previous
                </button>
                <span className="font-semibold text-slate-200">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className={`px-3 py-1.5 rounded border transition-colors ${
                    currentPage === totalPages
                      ? "opacity-50 cursor-not-allowed"
                      : isDarkMode
                      ? "border-slate-700 hover:bg-slate-800 text-slate-200"
                      : "border-slate-300 hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================== */}
        {/* MODAL: ALLOCATE / EDIT TRAIN TICKET        */}
        {/* ========================================== */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden my-8 ${
              isDarkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-800"
            }`}>
              {/* Modal Header */}
              <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-600/10 to-indigo-600/10 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-600 text-white shadow-md">
                    <FaTrain className="text-lg" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">
                      {isEditing ? "Edit Train Allocation / Ticket" : "Allocate Train Ticket Requisition"}
                    </h3>
                    <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                      Fill in teacher details, stations, train name, travel class, and journey date
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                >
                  <FaTimes className="text-base" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Select Registered Teacher */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-300">
                    Select Teacher (Optional quick-fill)
                  </label>
                  <Select
                    options={teacherOptions}
                    value={teacherOptions.find((opt) => opt.value === formData.teacherId) || null}
                    onChange={handleTeacherSelect}
                    placeholder="Search registered teacher..."
                    styles={customSelectStyles}
                    isClearable
                  />
                </div>

                {/* Teacher / Passenger Name & Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-300">
                      NAME <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SUBRATA SARDAR"
                      value={formData.teacherName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, teacherName: e.target.value }))}
                      className={`w-full py-2.5 px-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-300">
                      PHONE NO.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210"
                      value={formData.phoneNo}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phoneNo: e.target.value }))}
                      className={`w-full py-2.5 px-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                </div>

                {/* Sex & Age */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-300">
                      SEX
                    </label>
                    <select
                      value={formData.sex}
                      onChange={(e) => setFormData((prev) => ({ ...prev, sex: e.target.value }))}
                      className={`w-full py-2.5 px-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    >
                      <option value="M">Male (M)</option>
                      <option value="F">Female (F)</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-300">
                      AGE
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 32"
                      value={formData.age}
                      onChange={(e) => setFormData((prev) => ({ ...prev, age: e.target.value }))}
                      className={`w-full py-2.5 px-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-300">
                      CLASS
                    </label>
                    <select
                      value={formData.travelClass}
                      onChange={(e) => setFormData((prev) => ({ ...prev, travelClass: e.target.value }))}
                      className={`w-full py-2.5 px-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    >
                      {TRAVEL_CLASSES.map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* DATE OF JOURNEY & DAY */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-300">
                      DATE OF JOURNEY
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 03-10-26 or YYYY-MM-DD"
                      value={formData.dateOfJourney}
                      onChange={(e) => setFormData((prev) => ({ ...prev, dateOfJourney: e.target.value }))}
                      className={`w-full py-2.5 px-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-300">
                      Day of Travel
                    </label>
                    <select
                      value={formData.day}
                      onChange={(e) => setFormData((prev) => ({ ...prev, day: e.target.value }))}
                      className={`w-full py-2.5 px-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    >
                      {DAYS_OF_WEEK.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* TRAIN NAME & TRAIN NUMBER */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-300">
                      TRAIN NAME <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 13189-BALURGHAT EXP."
                      value={formData.trainName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, trainName: e.target.value }))}
                      className={`w-full py-2.5 px-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-300">
                      BORDING STN
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BANDEL"
                      value={formData.boardingStation}
                      onChange={(e) => setFormData((prev) => ({ ...prev, boardingStation: e.target.value }))}
                      className={`w-full py-2.5 px-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                </div>

                {/* FROM & TO */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-300">
                      FROM <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SEALDAH"
                      value={formData.fromStation}
                      onChange={(e) => setFormData((prev) => ({ ...prev, fromStation: e.target.value }))}
                      className={`w-full py-2.5 px-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-300">
                      TO <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MALDA TOWN"
                      value={formData.toStation}
                      onChange={(e) => setFormData((prev) => ({ ...prev, toStation: e.target.value }))}
                      className={`w-full py-2.5 px-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                </div>

                {/* Timings: Departure & Arrival (Optional) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-300">
                      Departure Time
                    </label>
                    <input
                      type="time"
                      value={formData.departureTime}
                      onChange={(e) => setFormData((prev) => ({ ...prev, departureTime: e.target.value }))}
                      className={`w-full py-2.5 px-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-300">
                      Arrival Time
                    </label>
                    <input
                      type="time"
                      value={formData.arrivalTime}
                      onChange={(e) => setFormData((prev) => ({ ...prev, arrivalTime: e.target.value }))}
                      className={`w-full py-2.5 px-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-300">
                      Destination Centre
                    </label>
                    <select
                      value={formData.centreId}
                      onChange={(e) => setFormData((prev) => ({ ...prev, centreId: e.target.value }))}
                      className={`w-full py-2.5 px-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    >
                      <option value="">Select Centre (Optional)</option>
                      {centres.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.centreName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-300">
                    Remarks / Specific Instructions
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Any special notes or purchase instructions..."
                    value={formData.remarks}
                    onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
                    className={`w-full py-2.5 px-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                  />
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t flex items-center justify-end gap-3 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className={`px-4 py-2.5 text-sm rounded-lg border font-medium ${
                      isDarkMode ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-300 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-sm rounded-lg font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
                  >
                    {isEditing ? "Update Allocation" : "Save Allocation"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* MODAL: IMPORT EXCEL & TEMPLATE DOWNLOAD    */}
        {/* ========================================== */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
            <div className={`w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden my-8 ${
              isDarkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-800"
            }`}>
              {/* Header */}
              <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-600/10 to-emerald-600/10 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-600 text-white shadow-md">
                    <FaFileExcel className="text-lg" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Import Train Ticket Requisitions</h3>
                    <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                      Upload Pathfinder train ticket requisition Excel sheet (.xlsx, .xls)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                >
                  <FaTimes className="text-base" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                {/* Step 1: Download Template Banner */}
                <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                  isDarkMode ? "bg-slate-800/60 border-slate-700 text-slate-200" : "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                      <FaDownload className="text-lg" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">Need the Excel Template?</h4>
                      <p className="text-xs opacity-80 mt-0.5">
                        Download the sample Excel format with pre-filled headers and sample rows.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleDownloadTemplate}
                    type="button"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-xs shadow transition-all flex items-center gap-2 whitespace-nowrap shrink-0"
                  >
                    <FaFileExcel />
                    <span>Download Template</span>
                  </button>
                </div>

                {/* Step 2: Upload File Box */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-slate-300">
                    Upload Requisition Excel File (.xlsx, .xls)
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                      isDarkMode
                        ? "border-slate-700 hover:border-blue-500 bg-slate-800/40 hover:bg-slate-800/80"
                        : "border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <FaUpload className="text-3xl mx-auto mb-2 text-blue-500 opacity-80" />
                    <p className="text-sm font-semibold">Click to choose or drag & drop Excel file</p>
                    <p className="text-xs text-slate-400 mt-1">Supports both standard table and Pathfinder header requisition files</p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".xlsx, .xls"
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Step 3: Preview Table */}
                {importPreviewData.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold flex items-center gap-2">
                        <span>Preview Data:</span>
                        <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400 font-mono">
                          {importPreviewData.length} records detected
                        </span>
                      </h4>
                      <button
                        onClick={() => {
                          setImportPreviewData([]);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="text-xs text-red-400 hover:underline"
                      >
                        Clear
                      </button>
                    </div>

                    <div className={`max-h-60 overflow-y-auto rounded-lg border ${
                      isDarkMode ? "border-slate-800 bg-slate-950/50" : "border-slate-200 bg-white"
                    }`}>
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className={`sticky top-0 ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}`}>
                          <tr>
                            <th className="py-2 px-3">SL</th>
                            <th className="py-2 px-3">NAME</th>
                            <th className="py-2 px-2 text-center">SEX</th>
                            <th className="py-2 px-2 text-center">AGE</th>
                            <th className="py-2 px-3">DATE OF JOURNEY</th>
                            <th className="py-2 px-3">FROM</th>
                            <th className="py-2 px-3">TO</th>
                            <th className="py-2 px-2 text-center">CLASS</th>
                            <th className="py-2 px-3">TRAIN NAME</th>
                            <th className="py-2 px-3">BORDING STN</th>
                            <th className="py-2 px-3">PHONE NO.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {importPreviewData.slice(0, 50).map((row, idx) => (
                            <tr key={idx} className={isDarkMode ? "hover:bg-slate-800/30" : "hover:bg-slate-50"}>
                              <td className="py-2 px-3 font-mono text-slate-400">{row.sl || idx + 1}</td>
                              <td className="py-2 px-3 font-semibold">{row.teacherName || "--"}</td>
                              <td className="py-2 px-2 text-center">{row.sex || "M"}</td>
                              <td className="py-2 px-2 text-center font-mono">{row.age || "--"}</td>
                              <td className="py-2 px-3 text-blue-400">{row.dateOfJourney || "--"}</td>
                              <td className="py-2 px-3">{row.fromStation || "--"}</td>
                              <td className="py-2 px-3">{row.toStation || "--"}</td>
                              <td className="py-2 px-2 text-center">{row.travelClass || "AC"}</td>
                              <td className="py-2 px-3">{row.trainName || "--"}</td>
                              <td className="py-2 px-3">{row.boardingStation || "--"}</td>
                              <td className="py-2 px-3 font-mono">{row.phoneNo || "--"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {importPreviewData.length > 50 && (
                      <p className="text-[11px] text-slate-400 mt-1 italic text-center">
                        Showing first 50 rows of {importPreviewData.length} records
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className={`px-6 py-4 border-t flex items-center justify-end gap-3 ${
                isDarkMode ? "bg-slate-800/40 border-slate-800" : "bg-slate-50 border-slate-200"
              }`}>
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className={`px-4 py-2 text-sm rounded-lg border font-medium ${
                    isDarkMode ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-300 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={importPreviewData.length === 0 || isImporting}
                  onClick={handleConfirmImport}
                  className="flex items-center gap-2 px-5 py-2 text-sm rounded-lg font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-md transition-all"
                >
                  {isImporting ? (
                    <>
                      <FaSync className="animate-spin text-xs" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <FaCheck className="text-xs" />
                      <span>Confirm & Import ({importPreviewData.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className={`w-full max-w-md rounded-xl p-6 border shadow-2xl ${
              isDarkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-800"
            }`}>
              <div className="flex items-center gap-3 text-red-500 mb-3">
                <FaTrash className="text-2xl" />
                <h3 className="text-lg font-bold">Delete Train Allocation?</h3>
              </div>
              <p className={`text-sm mb-6 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                Are you sure you want to delete this train timing record? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className={`px-4 py-2 text-sm rounded-lg border font-medium ${
                    isDarkMode ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-300 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="px-4 py-2 text-sm rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white shadow"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TrainTimings;
