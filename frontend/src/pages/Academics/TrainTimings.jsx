import React, { useState, useEffect, useCallback, useMemo } from "react";
import Layout from "../../components/Layout";
import Select from "react-select";
import {
  FaTrain,
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaFilter,
  FaSync,
  FaTimes,
  FaArrowRight,
  FaClock,
  FaUserTie,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaInfoCircle,
  FaExchangeAlt,
  FaCheckCircle
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import usePermission from "../../hooks/usePermission";
import ExcelImportExport from "../../components/common/ExcelImportExport";
import { useTheme } from "../../context/ThemeContext";

const API_URL = import.meta.env.VITE_API_URL;
const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const exportColumns = [
  { header: "Teacher Name", key: "teacherName" },
  { header: "Employee ID", key: "employeeId" },
  { header: "Subject", key: "subject" },
  { header: "Centre", key: "centreName" },
  { header: "Day", key: "day" },
  { header: "Journey Type", key: "journeyType" },
  { header: "Train Name", key: "trainName" },
  { header: "Train Number", key: "trainNumber" },
  { header: "From Station", key: "fromStation" },
  { header: "To Station", key: "toStation" },
  { header: "Departure Time", key: "departureTime" },
  { header: "Arrival Time", key: "arrivalTime" },
  { header: "Class Start Time", key: "classStartTime" },
  { header: "Class End Time", key: "classEndTime" },
  { header: "Remarks", key: "remarks" }
];

const importMapping = {
  "Teacher Name": "teacherName",
  "Employee ID": "employeeId",
  "Centre": "centreName",
  "Day": "day",
  "Journey Type": "journeyType",
  "Train Name": "trainName",
  "Train Number": "trainNumber",
  "From Station": "fromStation",
  "To Station": "toStation",
  "Departure Time": "departureTime",
  "Arrival Time": "arrivalTime",
  "Class Start Time": "classStartTime",
  "Class End Time": "classEndTime",
  "Remarks": "remarks"
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
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedCentreId, setSelectedCentreId] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Permissions
  const canCreate = usePermission("academics", "trainTimings", "create");
  const canEdit = usePermission("academics", "trainTimings", "edit");
  const canDelete = usePermission("academics", "trainTimings", "delete");

  // Form State
  const initialFormState = {
    teacherId: "",
    centreId: "",
    day: "Monday",
    date: "",
    trainName: "",
    trainNumber: "",
    journeyType: "UP",
    fromStation: "",
    toStation: "",
    departureTime: "",
    arrivalTime: "",
    classStartTime: "",
    classEndTime: "",
    remarks: ""
  };
  const [formData, setFormData] = useState(initialFormState);

  // Fetch initial dropdown data: Teachers & Centres
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
      if (selectedTeacherId) params.append("teacherId", selectedTeacherId);
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
  }, [selectedDay, selectedJourneyType, selectedTeacherId, selectedCentreId, searchTerm]);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  useEffect(() => {
    fetchTimings();
  }, [fetchTimings]);

  // Selected teacher detail lookup for the modal preview
  const currentSelectedTeacher = useMemo(() => {
    return teachers.find((t) => t._id === formData.teacherId) || null;
  }, [teachers, formData.teacherId]);

  // Reset & Open Modal
  const handleOpenCreateModal = () => {
    setFormData(initialFormState);
    setIsEditing(false);
    setEditId(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (item) => {
    setFormData({
      teacherId: item.teacherId?._id || item.teacherId || "",
      centreId: item.centreId?._id || item.centreId || "",
      day: item.day || "Monday",
      date: item.date ? item.date.split("T")[0] : "",
      trainName: item.trainName || "",
      trainNumber: item.trainNumber || "",
      journeyType: item.journeyType || "UP",
      fromStation: item.fromStation || "",
      toStation: item.toStation || "",
      departureTime: item.departureTime || "",
      arrivalTime: item.arrivalTime || "",
      classStartTime: item.classStartTime || "",
      classEndTime: item.classEndTime || "",
      remarks: item.remarks || ""
    });
    setIsEditing(true);
    setEditId(item._id);
    setShowModal(true);
  };

  // Form submit (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.teacherId) {
      toast.warning("Please select a teacher");
      return;
    }
    if (!formData.trainName || !formData.fromStation || !formData.toStation) {
      toast.warning("Train name, from station, and to station are required");
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
        toast.success(isEditing ? "Train timing updated successfully" : "Train timing allocated successfully");
        setShowModal(false);
        fetchTimings();
      } else {
        toast.error(data.message || "Failed to save train timing");
      }
    } catch (err) {
      console.error("Submit Error:", err);
      toast.error("Error saving train timing");
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

  // Bulk Import
  const handleBulkImport = async (importedRecords) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/academics/train-timing/bulk-import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(importedRecords)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Import completed! ${data.importedCount} records processed.`);
        fetchTimings();
      } else {
        toast.error(data.message || "Bulk import failed");
      }
    } catch (err) {
      console.error("Bulk Import Error:", err);
      toast.error("Error performing bulk import");
    }
  };

  // Prepare export data
  const exportData = useMemo(() => {
    return timings.map((item) => ({
      teacherName: item.teacherId?.name || "N/A",
      employeeId: item.teacherId?.employeeId || "N/A",
      subject: Array.isArray(item.teacherId?.subject) ? item.teacherId.subject.join(", ") : (item.teacherId?.subject || "N/A"),
      centreName: item.centreId?.centreName || "N/A",
      day: item.day || "",
      journeyType: item.journeyType || "",
      trainName: item.trainName || "",
      trainNumber: item.trainNumber || "",
      fromStation: item.fromStation || "",
      toStation: item.toStation || "",
      departureTime: item.departureTime || "",
      arrivalTime: item.arrivalTime || "",
      classStartTime: item.classStartTime || "",
      classEndTime: item.classEndTime || "",
      remarks: item.remarks || ""
    }));
  }, [timings]);

  // Summary statistics
  const stats = useMemo(() => {
    const total = timings.length;
    const uniqueTeachers = new Set(timings.map((t) => t.teacherId?._id || t.teacherId)).size;
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

  // React Select Options
  const teacherOptions = useMemo(() => {
    return teachers.map((t) => ({
      value: t._id,
      label: `${t.name} [${t.employeeId || "No ID"}] ${t.subject ? `• ${Array.isArray(t.subject) ? t.subject.join(", ") : t.subject}` : ""}`,
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
                  Allocate and track train travel, routes, and schedules for teachers across centres
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ExcelImportExport
              data={exportData}
              columns={exportColumns}
              onImport={handleBulkImport}
              fileName="Teacher_Train_Timings"
              templateHeaders={exportColumns.map((c) => c.header)}
              mapping={importMapping}
              isDarkMode={isDarkMode}
            />

            {canCreate && (
              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
              >
                <FaPlus className="text-sm" />
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
                <FaTrain className="text-xl" />
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
                <FaExchangeAlt className="text-xl" />
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
                placeholder="Search teacher, employee ID, train, station..."
                className={`w-full pl-9 pr-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode ? "bg-slate-800/80 border-slate-700 text-white placeholder-slate-500" : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400"
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

            {/* Action buttons */}
            <div className="md:col-span-2 flex items-center gap-2 justify-end">
              {(searchTerm || selectedDay || selectedJourneyType || selectedTeacherId || selectedCentreId) && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedDay("");
                    setSelectedJourneyType("");
                    setSelectedTeacherId("");
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

        {/* Timings Table */}
        <div className={`rounded-xl border overflow-hidden shadow-sm ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200"}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className={`border-b ${isDarkMode ? "bg-slate-800/60 border-slate-800 text-slate-300" : "bg-slate-100/70 border-slate-200 text-slate-700"}`}>
                  <th className="py-3 px-4 font-semibold">Teacher Details</th>
                  <th className="py-3 px-4 font-semibold">Day & Journey</th>
                  <th className="py-3 px-4 font-semibold">Train Information</th>
                  <th className="py-3 px-4 font-semibold">Route & Stations</th>
                  <th className="py-3 px-4 font-semibold">Timings</th>
                  <th className="py-3 px-4 font-semibold">Centre</th>
                  <th className="py-3 px-4 font-semibold">Remarks</th>
                  <th className="py-3 px-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FaSync className="animate-spin text-2xl text-blue-500" />
                        <span>Loading train timings...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedTimings.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FaTrain className="text-4xl text-slate-500 mb-1 opacity-50" />
                        <span className="font-medium text-base text-slate-300">No train timings found</span>
                        <p className="text-xs text-slate-500">
                          {searchTerm || selectedDay || selectedJourneyType
                            ? "Try adjusting your filter search criteria"
                            : "Click 'Allocate Train' above to assign train timings for a teacher"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedTimings.map((item) => {
                    const teacher = item.teacherId;
                    const journeyBadgeColor =
                      item.journeyType === "UP"
                        ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                        : item.journeyType === "DOWN"
                        ? "bg-sky-500/15 text-sky-500 border-sky-500/30"
                        : "bg-purple-500/15 text-purple-500 border-purple-500/30";

                    return (
                      <tr
                        key={item._id}
                        className={`transition-colors ${
                          isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-slate-50/80"
                        }`}
                      >
                        {/* Teacher Details */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs uppercase shadow">
                              {teacher?.name ? teacher.name.charAt(0) : "T"}
                            </div>
                            <div>
                              <div className="font-semibold text-sm leading-tight flex items-center gap-2">
                                <span>{teacher?.name || "Unknown Teacher"}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${
                                  isDarkMode ? "bg-slate-800 text-blue-400" : "bg-blue-50 text-blue-600"
                                }`}>
                                  ID: {teacher?.employeeId || "N/A"}
                                </span>
                                {teacher?.subject && (
                                  <span className="text-xs text-slate-400">
                                    • {Array.isArray(teacher.subject) ? teacher.subject.join(", ") : teacher.subject}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Day & Journey */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-sm flex items-center gap-1.5">
                              <FaCalendarAlt className="text-xs text-slate-400" />
                              {item.day || "Any Day"}
                            </span>
                            <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border w-fit ${journeyBadgeColor}`}>
                              {item.journeyType}
                            </span>
                          </div>
                        </td>

                        {/* Train Info */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-sm text-slate-100 flex items-center gap-1.5">
                            <FaTrain className="text-xs text-blue-400" />
                            <span>{item.trainName}</span>
                          </div>
                          {item.trainNumber && (
                            <div className="text-xs font-mono text-slate-400 mt-0.5">
                              No: {item.trainNumber}
                            </div>
                          )}
                        </td>

                        {/* Route & Stations */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <span className={isDarkMode ? "text-slate-200" : "text-slate-700"}>
                              {item.fromStation}
                            </span>
                            <FaArrowRight className="text-xs text-blue-500 shrink-0" />
                            <span className={isDarkMode ? "text-slate-200" : "text-slate-700"}>
                              {item.toStation}
                            </span>
                          </div>
                        </td>

                        {/* Timings */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-0.5 text-xs">
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <FaClock className="text-amber-400 text-xs" />
                              <span>Dep: <strong className="font-semibold text-slate-100">{item.departureTime || "--:--"}</strong></span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <FaClock className="text-emerald-400 text-xs" />
                              <span>Arr: <strong className="font-semibold text-slate-200">{item.arrivalTime || "--:--"}</strong></span>
                            </div>
                            {(item.classStartTime || item.classEndTime) && (
                              <div className="text-[11px] text-indigo-400 mt-0.5">
                                Class: {item.classStartTime || "--"} - {item.classEndTime || "--"}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Centre */}
                        <td className="py-3.5 px-4">
                          {item.centreId?.centreName ? (
                            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-medium ${
                              isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
                            }`}>
                              <FaMapMarkerAlt className="text-amber-500 text-xs" />
                              {item.centreId.centreName}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">Not Specified</span>
                          )}
                        </td>

                        {/* Remarks */}
                        <td className="py-3.5 px-4 max-w-[150px] truncate text-xs text-slate-400">
                          {item.remarks || "--"}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {canEdit && (
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className={`p-1.5 rounded hover:scale-110 transition-transform ${
                                  isDarkMode ? "text-blue-400 hover:bg-blue-500/20" : "text-blue-600 hover:bg-blue-50"
                                }`}
                                title="Edit Allocation"
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

        {/* Modal: Allocate / Edit Train Timing */}
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
                      {isEditing ? "Edit Train Allocation" : "Allocate Train Timing to Teacher"}
                    </h3>
                    <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                      Select the teacher and specify the train number, stations, and timings
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
                {/* Teacher Selection */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-300">
                    Select Teacher <span className="text-red-500">*</span>
                  </label>
                  <Select
                    options={teacherOptions}
                    value={teacherOptions.find((opt) => opt.value === formData.teacherId) || null}
                    onChange={(opt) => setFormData((prev) => ({ ...prev, teacherId: opt ? opt.value : "" }))}
                    placeholder="Search by Teacher Name or Employee ID..."
                    styles={customSelectStyles}
                    isClearable
                  />
                </div>

                {/* Teacher Details Preview Box */}
                {currentSelectedTeacher && (
                  <div className={`p-3 rounded-xl border flex items-center justify-between gap-4 ${
                    isDarkMode ? "bg-blue-950/30 border-blue-800/50 text-blue-200" : "bg-blue-50/70 border-blue-200 text-blue-900"
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow">
                        {currentSelectedTeacher.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-sm flex items-center gap-2">
                          <span>{currentSelectedTeacher.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-bold">
                            EMP ID: {currentSelectedTeacher.employeeId || "N/A"}
                          </span>
                        </div>
                        <div className="text-xs opacity-80 mt-0.5">
                          Subject: {Array.isArray(currentSelectedTeacher.subject) ? currentSelectedTeacher.subject.join(", ") : (currentSelectedTeacher.subject || "N/A")}
                          {currentSelectedTeacher.mobNum && ` • Mobile: ${currentSelectedTeacher.mobNum}`}
                        </div>
                      </div>
                    </div>
                    <FaCheckCircle className="text-blue-400 text-lg shrink-0" />
                  </div>
                )}

                {/* Centre & Day */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-300">
                      Day of Travel <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.day}
                      onChange={(e) => setFormData((prev) => ({ ...prev, day: e.target.value }))}
                      required
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

                {/* Journey Type Pill Selector */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-slate-300">
                    Journey Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {["UP", "DOWN", "ROUND_TRIP"].map((type) => {
                      const isSelected = formData.journeyType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, journeyType: type }))}
                          className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-center ${
                            isSelected
                              ? type === "UP"
                                ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20"
                                : type === "DOWN"
                                ? "bg-sky-600 text-white border-sky-500 shadow-md shadow-sky-500/20"
                                : "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/20"
                              : isDarkMode
                              ? "bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800"
                              : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {type === "UP" && "UP (To Centre)"}
                          {type === "DOWN" && "DOWN (Return)"}
                          {type === "ROUND_TRIP" && "ROUND TRIP"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Train Name & Train Number */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-300">
                      Train Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Black Diamond Express / Local Train"
                      value={formData.trainName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, trainName: e.target.value }))}
                      className={`w-full py-2.5 px-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-300">
                      Train Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 12341 or 31812"
                      value={formData.trainNumber}
                      onChange={(e) => setFormData((prev) => ({ ...prev, trainNumber: e.target.value }))}
                      className={`w-full py-2.5 px-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                </div>

                {/* Stations: From & To */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-300">
                      From Station <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Howrah / Sealdah"
                      value={formData.fromStation}
                      onChange={(e) => setFormData((prev) => ({ ...prev, fromStation: e.target.value }))}
                      className={`w-full py-2.5 px-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-300">
                      To Station <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bardhaman / Kharagpur"
                      value={formData.toStation}
                      onChange={(e) => setFormData((prev) => ({ ...prev, toStation: e.target.value }))}
                      className={`w-full py-2.5 px-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                </div>

                {/* Timings: Departure & Arrival */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>

                {/* Class Timings (Optional alignment) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-300">
                      Class Start Time (Optional)
                    </label>
                    <input
                      type="time"
                      value={formData.classStartTime}
                      onChange={(e) => setFormData((prev) => ({ ...prev, classStartTime: e.target.value }))}
                      className={`w-full py-2.5 px-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-300">
                      Class End Time (Optional)
                    </label>
                    <input
                      type="time"
                      value={formData.classEndTime}
                      onChange={(e) => setFormData((prev) => ({ ...prev, classEndTime: e.target.value }))}
                      className={`w-full py-2.5 px-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-300">
                    Remarks / Specific Instructions
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Add platform notes, connecting trains, or special instructions..."
                    value={formData.remarks}
                    onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
                    className={`w-full py-2.5 px-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                  />
                </div>

                {/* Submit & Cancel Buttons */}
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
                    {isEditing ? "Update Allocation" : "Allocate Train"}
                  </button>
                </div>
              </form>
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
