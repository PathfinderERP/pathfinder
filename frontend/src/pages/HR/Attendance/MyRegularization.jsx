import React, { useState, useEffect, useRef } from "react";
import Layout from "../../../components/Layout";
import { FaCalendarAlt, FaHistory, FaCheck, FaTimes, FaSpinner, FaPlus, FaClock, FaBriefcase, FaHome, FaExclamationCircle, FaLaptopHouse, FaStopwatch, FaUserClock, FaCamera, FaMapMarkerAlt, FaVideoSlash, FaCheckCircle, FaSyncAlt, FaEye, FaEdit } from "react-icons/fa";
import { toast } from "react-toastify";
import { useTheme } from "../../../context/ThemeContext";

const MyRegularization = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [employeeId, setEmployeeId] = useState(null);

    const [formData, setFormData] = useState({
        date: "",
        type: "On Duty",
        reason: "",
        fromTime: "",
        toTime: ""
    });

    const [showForm, setShowForm] = useState(false);
    const [selectedDateAttendance, setSelectedDateAttendance] = useState(null);
    const [checkingDate, setCheckingDate] = useState(false);
    // View & Edit Modal States
    const [viewModalReq, setViewModalReq] = useState(null);
    const [editModalReq, setEditModalReq] = useState(null);
    const [editFormData, setEditFormData] = useState({ date: "", type: "On Duty", reason: "", fromTime: "", toTime: "" });
    const [editSubmitting, setEditSubmitting] = useState(false);

    const handleOpenEditModal = (req) => {
        setEditModalReq(req);
        const dateFormatted = req.date ? new Date(req.date).toISOString().split('T')[0] : "";
        setEditFormData({
            date: dateFormatted,
            type: req.type || "On Duty",
            reason: req.reason || "",
            fromTime: req.fromTime || "",
            toTime: req.toTime || ""
        });
    };

    const handleUpdateSubmittedReq = async (e) => {
        e.preventDefault();
        if (!editModalReq) return;
        setEditSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            const body = new FormData();
            body.append("date", editFormData.date);
            body.append("type", editFormData.type);
            body.append("reason", editFormData.reason);
            body.append("fromTime", editFormData.fromTime);
            body.append("toTime", editFormData.toTime);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/attendance/regularizations/${editModalReq._id}`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` },
                body
            });

            if (response.ok) {
                toast.success("Regularization updated successfully!");
                setEditModalReq(null);
                fetchRequests();
            } else {
                const err = await response.json();
                toast.error(err.message || "Failed to update regularization");
            }
        } catch (error) {
            console.error("Update Regularization error:", error);
            toast.error("An error occurred while updating");
        } finally {
            setEditSubmitting(false);
        }
    };

    // Camera and Location States
    const [facingMode, setFacingMode] = useState("user");
    const [stream, setStream] = useState(null);
    const [capturedPhotos, setCapturedPhotos] = useState([]);
    const [location, setLocation] = useState({ latitude: null, longitude: null });
    const [locationLoading, setLocationLoading] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchEmployeeProfile();
    }, []);

    const checkDateAttendance = async (date) => {
        if (!date) {
            setSelectedDateAttendance(null);
            return;
        }
        setCheckingDate(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/attendance/check-date?date=${date}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSelectedDateAttendance(data);
            } else {
                setSelectedDateAttendance(null);
            }
        } catch (error) {
            console.error("Error checking date attendance:", error);
            setSelectedDateAttendance(null);
        } finally {
            setCheckingDate(false);
        }
    };

    useEffect(() => {
        checkDateAttendance(formData.date);
    }, [formData.date]);

    useEffect(() => {
        if (employeeId) {
            fetchRequests();
        }
    }, [employeeId]);

    // Ensure video srcObject is set when stream changes and component re-renders
    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.error("Video play error:", e));
        }
    }, [stream]);

    const fetchEmployeeProfile = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/employee/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setEmployeeId(data._id);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/attendance/regularizations?employeeId=${employeeId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setRequests(data);
            }
        } catch (error) {
            toast.error("Failed to load requests");
        } finally {
            setLoading(false);
        }
    };

    const startCamera = async (targetModeOverride) => {
        const mode = typeof targetModeOverride === 'string' ? targetModeOverride : facingMode;
        try {
            const constraints = {
                video: {
                    facingMode: { ideal: mode },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };
            
            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(mediaStream);
            // srcObject assignment moved to useEffect for reliability
            getLocation();
        } catch (err) {
            console.error("Camera access error:", err);
            if (fileInputRef.current) {
                toast.info("Switching to native camera...");
                fileInputRef.current.setAttribute("capture", mode === "user" ? "user" : "environment");
                fileInputRef.current.click();
            } else {
                toast.error("Camera access denied or not available");
            }
        }
    };

    const switchCamera = () => {
        const newMode = facingMode === "user" ? "environment" : "user";
        setFacingMode(newMode);
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            setTimeout(() => {
                startCamera(newMode);
            }, 100);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const takePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            canvas.toBlob((blob) => {
                if (blob) {
                    const photoFile = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
                    setCapturedPhotos(prev => [...prev, photoFile].slice(0, 5));
                    toast.success("Photo captured!");
                }
            }, 'image/jpeg', 0.8);
        }
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            const validFiles = files.filter(file => {
                if (!file.type.startsWith('image/')) {
                    toast.error(`${file.name} is not an image file`);
                    return false;
                }
                if (file.size > 50 * 1024 * 1024) {
                    toast.error(`${file.name} exceeds 50MB size limit`);
                    return false;
                }
                return true;
            });

            if (validFiles.length > 0) {
                setCapturedPhotos(prev => [...prev, ...validFiles].slice(0, 5));
                stopCamera();
                getLocation();
            }
        }
    };

    const removePhoto = (index) => {
        setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const getLocation = () => {
        setLocationLoading(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                    setLocationLoading(false);
                },
                (error) => {
                    toast.error("Location access denied or failed");
                    setLocationLoading(false);
                }
            );
        } else {
            toast.error("Geolocation not supported");
            setLocationLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (capturedPhotos.length === 0) {
            toast.error("Please provide at least one photo for verification");
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            const formDataPayload = new FormData();

            if (employeeId && employeeId !== "null") {
                formDataPayload.append('employeeId', employeeId);
            }
            formDataPayload.append('date', formData.date);
            formDataPayload.append('type', formData.type);
            formDataPayload.append('reason', formData.reason);
            formDataPayload.append('fromTime', formData.fromTime);
            formDataPayload.append('toTime', formData.toTime);
            formDataPayload.append('latitude', location.latitude);
            formDataPayload.append('longitude', location.longitude);
            
            capturedPhotos.forEach((photo, index) => {
                formDataPayload.append('photos', photo, `attendance_${Date.now()}_${index}.jpg`);
            });

            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/attendance/regularizations`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formDataPayload
            });

            if (response.ok) {
                toast.success("Request submitted successfully");
                setFormData({ date: "", type: "On Duty", reason: "", fromTime: "", toTime: "" });
                setCapturedPhotos([]);
                setLocation({ latitude: null, longitude: null });
                setShowForm(false);
                fetchRequests();
            } else {
                const errData = await response.json();
                toast.error(errData.message || "Failed to submit request");
            }
        } catch (error) {
            toast.error("Error submitting request");
        } finally {
            setSubmitting(false);
        }
    };

    const getRequestedDuration = () => {
        if (!formData.fromTime || !formData.toTime) return 0;
        const [fromH, fromM] = formData.fromTime.split(':').map(Number);
        const [toH, toM] = formData.toTime.split(':').map(Number);
        const diff = (toH * 60 + toM) - (fromH * 60 + fromM);
        return diff > 0 ? parseFloat((diff / 60).toFixed(2)) : 0;
    };

    const requestedDuration = getRequestedDuration();
    const totalSimulatedHours = selectedDateAttendance 
        ? parseFloat(((selectedDateAttendance.workingHours || 0) + requestedDuration).toFixed(2))
        : requestedDuration;

    return (
        <Layout activePage="Employee Center">
            <div className="p-4 md:p-6 space-y-6 animate-fade-in max-w-5xl mx-auto pb-20">

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} uppercase tracking-tight flex items-center gap-2`}>
                            <FaHistory className="text-blue-500" /> My Regularizations
                        </h1>
                        <p className={`text-xs font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest mt-1`}>Correct your attendance records</p>
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                    >
                        <FaPlus className={`${showForm ? 'rotate-45' : ''} transition-transform`} />
                        {showForm ? 'Close Form' : 'New Request'}
                    </button>
                </div>

                {showForm && (
                    <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-xl'} rounded-2xl border p-6 md:p-8 animate-slide-in-top`}>
                        <h2 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} uppercase tracking-wider mb-6 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'} pb-4`}>Submit Correction Request</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                <div className="space-y-2">
                                    <label className={`text-[10px] font-black ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest`}>Select Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className={`w-full p-4 ${isDarkMode ? 'bg-gray-900 text-white border-gray-700' : 'bg-gray-50 text-gray-800 border-gray-200'} border rounded-xl font-bold outline-none focus:border-blue-500 transition-colors`}
                                    />
                                </div>
                                <div className="space-y-2">
                                    {checkingDate && (
                                        <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider animate-pulse flex items-center gap-2 p-4">
                                            <FaSpinner className="animate-spin" /> Fetching attendance details...
                                        </div>
                                    )}

                                    {!checkingDate && selectedDateAttendance && (
                                        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-blue-950/20 border-blue-900/50 text-blue-300' : 'bg-blue-50 border-blue-100 text-blue-800'} text-xs font-bold leading-relaxed space-y-1 shadow-sm`}>
                                            {selectedDateAttendance.exists ? (
                                                <>
                                                    <p className="font-black text-[10px] uppercase tracking-widest mb-1 text-blue-500">Attendance Status Found</p>
                                                    <p>You checked in at <span className="font-mono text-emerald-500">{selectedDateAttendance.checkIn || '--:--'}</span> and checked out at <span className="font-mono text-emerald-500">{selectedDateAttendance.checkOut || '--:--'}</span> on this day.</p>
                                                    <p>Existing marked time: <span className="text-emerald-500 font-extrabold">{selectedDateAttendance.workingHours} hours</span> (Status: <span className="uppercase">{selectedDateAttendance.status}</span>).</p>
                                                    <p className="text-[10px] uppercase tracking-wide opacity-80 mt-1">💡 Any approved regularization hours will be added to this existing time.</p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="font-black text-[10px] uppercase tracking-widest mb-1 text-amber-500">No Attendance Found</p>
                                                    <p>No check-in or check-out is recorded for this date. You can request regularization for the full day (typically up to {selectedDateAttendance.targetHours} hours).</p>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className={`text-[10px] font-black ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest`}>From Time</label>
                                    <input
                                        type="time"
                                        value={formData.fromTime}
                                        onChange={(e) => setFormData({ ...formData, fromTime: e.target.value })}
                                        className={`w-full p-4 ${isDarkMode ? 'bg-gray-900 text-white border-gray-700' : 'bg-gray-50 text-gray-800 border-gray-200'} border rounded-xl font-bold outline-none focus:border-blue-500 transition-colors`}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-[10px] font-black ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest`}>To Time</label>
                                    <input
                                        type="time"
                                        value={formData.toTime}
                                        onChange={(e) => setFormData({ ...formData, toTime: e.target.value })}
                                        className={`w-full p-4 ${isDarkMode ? 'bg-gray-900 text-white border-gray-700' : 'bg-gray-50 text-gray-800 border-gray-200'} border rounded-xl font-bold outline-none focus:border-blue-500 transition-colors`}
                                    />
                                </div>
                            </div>

                            {requestedDuration > 0 && (
                                <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-300' : 'bg-emerald-50 border-emerald-100 text-emerald-800'} text-xs font-bold leading-relaxed space-y-1 shadow-sm animate-fade-in`}>
                                    <p className="font-black text-[10px] uppercase tracking-widest mb-1 text-emerald-500">Regularization Calculation</p>
                                    <p>Requested Duration: <span className="font-mono text-emerald-500 font-extrabold">{requestedDuration} hours</span></p>
                                    {selectedDateAttendance?.exists && (
                                        <p>Total Working Hours after approval: <span className="font-mono text-emerald-500 font-extrabold">{selectedDateAttendance.workingHours}h (physical) + {requestedDuration}h (regularized) = {totalSimulatedHours} hours</span></p>
                                    )}
                                </div>
                            )}

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Regularization Type</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[
                                        { id: 'On Duty', title: 'On Duty', description: 'Field Work', icon: FaBriefcase, color: 'text-purple-500', bg: 'bg-purple-500/10', activeBorder: 'border-purple-500 bg-purple-50 dark:bg-purple-900/10' },
                                        { id: 'Missed Punch', title: 'Missed Punch', description: 'Timing Error', icon: FaUserClock, color: 'text-orange-500', bg: 'bg-orange-500/10', activeBorder: 'border-orange-500 bg-orange-50 dark:bg-orange-900/10' },
                                        { id: 'Work From Home', title: 'WFH', description: 'Remote Work', icon: FaLaptopHouse, color: 'text-blue-500', bg: 'bg-blue-500/10', activeBorder: 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' },
                                        { id: 'Late Login / Early Logout', title: 'Late / Early', description: 'Adjustment', icon: FaStopwatch, color: 'text-rose-500', bg: 'bg-rose-500/10', activeBorder: 'border-rose-500 bg-rose-50 dark:bg-rose-900/10' },
                                        { id: 'Teaching on other Center', title: 'Teaching Out', description: 'Other center', icon: FaBriefcase, color: 'text-teal-500', bg: 'bg-teal-500/10', activeBorder: 'border-teal-500 bg-teal-50 dark:bg-teal-900/10' },
                                        { id: 'Other', title: 'Other', description: 'System issue', icon: FaExclamationCircle, color: 'text-gray-500', bg: 'bg-gray-500/10', activeBorder: 'border-gray-500 bg-gray-50 dark:bg-gray-800' }
                                    ].map((type) => (
                                        <div
                                            key={type.id}
                                            onClick={() => setFormData({ ...formData, type: type.id })}
                                            className={`relative cursor-pointer p-4 rounded-2xl border-2 transition-all duration-200 group ${formData.type === type.id
                                                ? `${type.activeBorder} shadow-lg`
                                                : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-[#131619] hover:border-gray-200 dark:hover:border-gray-700'
                                                }`}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={`p-3 rounded-xl ${type.bg} ${type.color}`}>
                                                    <type.icon size={20} />
                                                </div>
                                                <div>
                                                    <h3 className={`text-sm font-black uppercase tracking-tight ${formData.type === type.id ? (isDarkMode ? 'text-white' : 'text-gray-900') : (isDarkMode ? 'text-gray-300' : 'text-gray-600')}`}>
                                                        {type.title}
                                                    </h3>
                                                    <p className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-0.5 uppercase tracking-wider`}>
                                                        {type.description}
                                                    </p>
                                                </div>
                                            </div>
                                            {formData.type === type.id && (
                                                <div className={`absolute top-4 right-4 text-xs ${type.color}`}>
                                                    <FaCheck />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Reason / Description</label>
                                <textarea
                                    required
                                    rows="3"
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    placeholder="Explain why you need regularization..."
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-800 dark:text-white outline-none focus:border-blue-500 transition-colors resize-none"
                                />
                            </div>

                            {/* Camera Section */}
                            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <FaCamera className="text-blue-500" /> Geo-tagged Photo Verification
                                </label>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex flex-col gap-4">
                                        <div className="relative aspect-video bg-gray-100 dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center">
                                            {stream ? (
                                                <div className="relative w-full h-full">
                                                    <video 
                                                        ref={(el) => {
                                                            videoRef.current = el;
                                                            if (el && stream && el.srcObject !== stream) {
                                                                el.srcObject = stream;
                                                                console.log("Stream attached to video element");
                                                            }
                                                        }} 
                                                        autoPlay 
                                                        playsInline 
                                                        muted 
                                                        className="w-full h-full object-cover" 
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={takePhoto}
                                                        className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-transform z-20"
                                                    >
                                                        <FaCamera size={24} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={switchCamera}
                                                        title="Switch Camera"
                                                        className="absolute top-4 left-4 bg-gray-800/80 hover:bg-gray-700 text-white p-2.5 rounded-full shadow-lg backdrop-blur-sm transition-all z-20"
                                                    >
                                                        <FaSyncAlt size={16} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={stopCamera}
                                                        className="absolute top-4 right-4 bg-red-600 text-white p-2 rounded-full shadow-lg z-20"
                                                    >
                                                        <FaTimes />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={startCamera}
                                                    className="flex flex-col items-center gap-2 text-gray-400 hover:text-blue-500 transition-colors p-10 w-full h-full"
                                                >
                                                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-2 shadow-inner">
                                                        <FaCamera size={32} />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-center">Open Camera / Capture Snapshot</span>
                                                </button>
                                            )}
                                            <canvas ref={canvasRef} className="hidden" />
                                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" multiple className="hidden" />
                                        </div>

                                        {capturedPhotos.length > 0 && (
                                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                    <FaCheckCircle className="text-green-500" /> {capturedPhotos.length} Attached Photos
                                                </p>
                                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                                    {capturedPhotos.map((photo, idx) => (
                                                        <div key={idx} className="relative aspect-square group">
                                                            <img src={URL.createObjectURL(photo)} className="w-full h-full object-cover rounded-xl shadow-sm border border-gray-200 dark:border-gray-700" alt={`Captured ${idx + 1}`} />
                                                            <button
                                                                type="button"
                                                                onClick={() => removePhoto(idx)}
                                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 text-[10px] hover:bg-red-600 shadow-md"
                                                            >
                                                                <FaTimes />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {capturedPhotos.length < 5 && !stream && (
                                                        <button
                                                            type="button"
                                                            onClick={startCamera}
                                                            className="flex flex-col items-center justify-center aspect-square bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-500 text-gray-400 hover:text-blue-500 transition-all"
                                                        >
                                                            <FaPlus size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col justify-center space-y-4 p-6 bg-blue-50/50 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/10">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-blue-500 text-white rounded-xl shadow-lg">
                                                <FaMapMarkerAlt size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-tight">Location Tagging</h3>
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">GPS Verification Required</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {locationLoading ? (
                                                <div className="flex items-center gap-2 text-blue-500 font-bold text-xs uppercase tracking-widest animate-pulse">
                                                    <FaSpinner className="animate-spin" /> Detecting GPS...
                                                </div>
                                            ) : location.latitude ? (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                                                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Lat</span>
                                                        <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{location.latitude.toFixed(4)}</span>
                                                    </div>
                                                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                                                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Long</span>
                                                        <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{location.longitude.toFixed(4)}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-4 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-100 dark:border-rose-500/20 text-rose-500 text-[10px] font-bold uppercase tracking-widest">No Location Detected</div>
                                            )}
                                            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full bg-white dark:bg-gray-800 text-blue-600 border border-blue-200 dark:border-blue-800 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-blue-50 flex items-center justify-center gap-2">
                                                <FaPlus /> Upload Photo
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-6 border-t border-gray-100 dark:border-gray-800">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-600/30 transition-all disabled:opacity-50 flex items-center gap-3"
                                >
                                    {submitting ? <FaSpinner className="animate-spin" /> : 'Submit Correction'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="space-y-4">
                    <h2 className="text-lg font-black text-gray-800 dark:text-gray-400 uppercase tracking-wider pl-1">Request History</h2>
                    {loading ? (
                        <div className="flex justify-center py-20"><FaSpinner className="animate-spin text-blue-500 text-4xl" /></div>
                    ) : requests.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {requests.map(req => (
                                <div key={req._id} className="bg-white dark:bg-[#1a1f24] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-blue-500/30 transition-all">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className={`mt-1 p-3 rounded-xl ${req.type === 'On Duty' ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'}`}>
                                            {req.type === 'On Duty' ? <FaBriefcase /> : <FaClock />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{new Date(req.date).toLocaleDateString()}</span>
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                                                    req.status === 'Approved' ? 'bg-green-100 text-green-700 border-green-200' :
                                                    req.status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                                                    'bg-yellow-100 text-yellow-700 border-yellow-200'
                                                }`}>{req.status}</span>
                                            </div>
                                            <p className="text-sm font-bold text-gray-500 uppercase">{req.type}</p>
                                            <p className="text-sm mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">"{req.reason}"</p>
                                            {req.fromTime && req.toTime && (
                                                <p className="text-xs font-bold text-cyan-600 dark:text-cyan-400 mt-1">
                                                    Timings: {req.fromTime} - {req.toTime}
                                                </p>
                                            )}
                                            {req.photos && req.photos.length > 0 && (
                                                <div className="flex gap-2 mt-3 flex-wrap">
                                                    {req.photos.map((photo, idx) => (
                                                        <img key={idx} src={photo} alt="Proof" className="w-14 h-14 rounded-lg object-cover cursor-pointer hover:opacity-80 border border-gray-200 dark:border-gray-700" onClick={() => window.open(photo, '_blank')} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-start md:self-center">
                                        <button
                                            type="button"
                                            onClick={() => setViewModalReq(req)}
                                            className="px-3 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-black uppercase tracking-wider hover:bg-cyan-500/20 transition-all flex items-center gap-1.5"
                                        >
                                            <FaEye size={12} /> View Details
                                        </button>
                                        {req.status !== 'Approved' && (
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEditModal(req)}
                                                className="px-3 py-2 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-wider hover:bg-blue-500/20 transition-all flex items-center gap-1.5"
                                            >
                                                <FaEdit size={12} /> Edit
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white dark:bg-[#1a1f24] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                            <p className="text-gray-500 font-bold uppercase text-xs">No history found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* View Details Modal */}
            {viewModalReq && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className={`w-full max-w-xl p-6 rounded-3xl border shadow-2xl space-y-6 ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                        <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-800">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-cyan-500">Regularization Details</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase">{new Date(viewModalReq.date).toLocaleDateString()}</p>
                            </div>
                            <button onClick={() => setViewModalReq(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
                                <FaTimes />
                            </button>
                        </div>

                        <div className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Status</span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                                        viewModalReq.status === 'Approved' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                        viewModalReq.status === 'Rejected' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                        'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                    }`}>
                                        {viewModalReq.status}
                                    </span>
                                </div>
                                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Type</span>
                                    <span className="font-extrabold uppercase">{viewModalReq.type}</span>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Reason</span>
                                <p className="font-medium italic text-gray-300">"{viewModalReq.reason}"</p>
                            </div>

                            {viewModalReq.fromTime && viewModalReq.toTime && (
                                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Regularized Hours</span>
                                    <p className="font-mono font-bold text-cyan-400">{viewModalReq.fromTime} - {viewModalReq.toTime}</p>
                                </div>
                            )}

                            {(viewModalReq.latitude || viewModalReq.longitude) && (
                                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center gap-3">
                                    <FaMapMarkerAlt className="text-red-500" size={18} />
                                    <div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block">GPS Coordinates</span>
                                        <span className="font-mono text-xs font-bold text-gray-300">{viewModalReq.latitude}, {viewModalReq.longitude}</span>
                                    </div>
                                </div>
                            )}

                            {viewModalReq.reviewedBy && (
                                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                    <span className="text-[9px] font-black uppercase tracking-widest block mb-1">Reviewed By Manager</span>
                                    <p className="font-bold">{viewModalReq.reviewedBy?.name || 'Manager'}</p>
                                    {viewModalReq.reviewRemark && <p className="italic text-xs mt-1">"{viewModalReq.reviewRemark}"</p>}
                                </div>
                            )}

                            {viewModalReq.photos && viewModalReq.photos.length > 0 && (
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-2">Attached Proof Photos</span>
                                    <div className="flex gap-2 flex-wrap">
                                        {viewModalReq.photos.map((p, idx) => (
                                            <img key={idx} src={p} alt="Proof" className="w-20 h-20 rounded-xl object-cover border border-gray-700 cursor-pointer hover:scale-105 transition-all" onClick={() => window.open(p, '_blank')} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-800">
                            <button onClick={() => setViewModalReq(null)} className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 font-bold uppercase text-xs tracking-wider text-white">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Regularization Modal */}
            {editModalReq && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className={`w-full max-w-xl p-6 rounded-3xl border shadow-2xl space-y-6 ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                        <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-800">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-blue-500 flex items-center gap-2">
                                    <FaEdit /> Edit Regularization
                                </h3>
                                <p className="text-xs text-gray-400 font-bold uppercase">Update your submitted regularization details</p>
                            </div>
                            <button onClick={() => setEditModalReq(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateSubmittedReq} className="space-y-4 text-xs">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Date</label>
                                <input
                                    type="date"
                                    value={editFormData.date}
                                    onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                                    required
                                    className={`w-full p-3 rounded-xl border font-bold outline-none ${isDarkMode ? 'bg-black/50 border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Regularization Type</label>
                                <select
                                    value={editFormData.type}
                                    onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                                    className={`w-full p-3 rounded-xl border font-bold outline-none ${isDarkMode ? 'bg-black/50 border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                                >
                                    <option value="On Duty">On Duty</option>
                                    <option value="Attendance Correction">Attendance Correction</option>
                                    <option value="Mis-punch">Mis-punch</option>
                                    <option value="Work From Home">Work From Home</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">From Time</label>
                                    <input
                                        type="time"
                                        value={editFormData.fromTime}
                                        onChange={(e) => setEditFormData({ ...editFormData, fromTime: e.target.value })}
                                        className={`w-full p-3 rounded-xl border font-bold outline-none ${isDarkMode ? 'bg-black/50 border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">To Time</label>
                                    <input
                                        type="time"
                                        value={editFormData.toTime}
                                        onChange={(e) => setEditFormData({ ...editFormData, toTime: e.target.value })}
                                        className={`w-full p-3 rounded-xl border font-bold outline-none ${isDarkMode ? 'bg-black/50 border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Reason / Explanation</label>
                                <textarea
                                    rows={3}
                                    value={editFormData.reason}
                                    onChange={(e) => setEditFormData({ ...editFormData, reason: e.target.value })}
                                    required
                                    className={`w-full p-3 rounded-xl border font-medium outline-none ${isDarkMode ? 'bg-black/50 border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                                <button type="button" onClick={() => setEditModalReq(null)} className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 font-bold uppercase text-xs tracking-wider text-white">
                                    Cancel
                                </button>
                                <button type="submit" disabled={editSubmitting} className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-black uppercase text-xs tracking-wider text-white flex items-center gap-2">
                                    {editSubmitting ? <FaSpinner className="animate-spin" /> : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default MyRegularization;
