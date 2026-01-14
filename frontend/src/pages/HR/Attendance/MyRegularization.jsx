import React, { useState, useEffect, useRef } from "react";
import Layout from "../../../components/Layout";
import { FaCalendarAlt, FaHistory, FaCheck, FaTimes, FaSpinner, FaPlus, FaClock, FaBriefcase, FaHome, FaExclamationCircle, FaLaptopHouse, FaStopwatch, FaUserClock, FaCamera, FaMapMarkerAlt, FaVideoSlash } from "react-icons/fa";
import { toast } from "react-toastify";

const MyRegularization = () => {
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
    
    // Camera and Location States
    const [stream, setStream] = useState(null);
    const [capturedPhoto, setCapturedPhoto] = useState(null);
    const [location, setLocation] = useState({ latitude: null, longitude: null });
    const [locationLoading, setLocationLoading] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchEmployeeProfile();
    }, []);

    useEffect(() => {
        if (employeeId) {
            fetchRequests();
        }
    }, [employeeId]);

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

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            getLocation();
        } catch (err) {
            toast.error("Camera access denied or not available");
            console.error(err);
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
                setCapturedPhoto(blob);
            }, 'image/jpeg', 0.8);
            
            stopCamera();
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast.error("Please upload an image file");
                return;
            }
            // Validate file size (e.g., 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File size should be less than 5MB");
                return;
            }
            setCapturedPhoto(file);
            stopCamera(); // Stop camera if it was running
            getLocation(); // Still try to get location if possible
        }
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
        
        if (!capturedPhoto) {
            toast.error("Please take a geo-tagged photo for verification");
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
            formDataPayload.append('photo', capturedPhoto, `attendance_${Date.now()}.jpg`);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/attendance/regularizations`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formDataPayload
            });

            if (response.ok) {
                toast.success("Request submitted successfully");
                setFormData({ date: "", type: "On Duty", reason: "", fromTime: "", toTime: "" });
                setCapturedPhoto(null);
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

    return (
        <Layout activePage="Employee Center">
            <div className="p-4 md:p-6 space-y-6 animate-fade-in max-w-5xl mx-auto pb-20">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                            <FaHistory className="text-blue-500" /> My Regularizations
                        </h1>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Correct your attendance records</p>
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                    >
                        <FaPlus className={`${showForm ? 'rotate-45' : ''} transition-transform`} />
                        {showForm ? 'Close Form' : 'New Request'}
                    </button>
                </div>

                {/* Submission Form */}
                {showForm && (
                    <div className="bg-white dark:bg-[#1a1f24] rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-6 md:p-8 animate-slide-in-top">
                        <h2 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-wider mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">Submit Correction Request</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Select Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-800 dark:text-white outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">From Time</label>
                                    <input
                                        type="time"
                                        value={formData.fromTime}
                                        onChange={(e) => setFormData({ ...formData, fromTime: e.target.value })}
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-800 dark:text-white outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">To Time</label>
                                    <input
                                        type="time"
                                        value={formData.toTime}
                                        onChange={(e) => setFormData({ ...formData, toTime: e.target.value })}
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-800 dark:text-white outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>
                            </div>



                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Regularization Type</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[
                                        {
                                            id: 'On Duty',
                                            title: 'On Duty',
                                            description: 'Client visit or Field Work',
                                            icon: FaBriefcase,
                                            color: 'text-purple-500',
                                            bg: 'bg-purple-500/10',
                                            activeBorder: 'border-purple-500 bg-purple-50 dark:bg-purple-900/10'
                                        },
                                        {
                                            id: 'Missed Punch',
                                            title: 'Missed Punch',
                                            description: 'Forgot to Check-in/out',
                                            icon: FaUserClock,
                                            color: 'text-orange-500',
                                            bg: 'bg-orange-500/10',
                                            activeBorder: 'border-orange-500 bg-orange-50 dark:bg-orange-900/10'
                                        },
                                        {
                                            id: 'Work From Home',
                                            title: 'Work From Home',
                                            description: 'Remote work approval',
                                            icon: FaLaptopHouse,
                                            color: 'text-blue-500',
                                            bg: 'bg-blue-500/10',
                                            activeBorder: 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                                        },
                                        {
                                            id: 'Late Login / Early Logout',
                                            title: 'Late / Early',
                                            description: 'Timing adjustment',
                                            icon: FaStopwatch,
                                            color: 'text-rose-500',
                                            bg: 'bg-rose-500/10',
                                            activeBorder: 'border-rose-500 bg-rose-50 dark:bg-rose-900/10'
                                        },
                                        {
                                            id: 'Other',
                                            title: 'Other Reason',
                                            description: 'System issue or other',
                                            icon: FaExclamationCircle,
                                            color: 'text-gray-500',
                                            bg: 'bg-gray-500/10',
                                            activeBorder: 'border-gray-500 bg-gray-50 dark:bg-gray-800'
                                        }
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
                                                    <h3 className={`text-sm font-black uppercase tracking-tight ${formData.type === type.id ? 'text-gray-800 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                                        {type.title}
                                                    </h3>
                                                    <p className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-wider">
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
                                    placeholder="Explain why you need regularization (e.g. 'Visited Client X, returned late')..."
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-800 dark:text-white outline-none focus:border-blue-500 transition-colors resize-none"
                                />
                            </div>

                            {/* Geo-tagged Photo Section */}
                            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <FaCamera className="text-blue-500" /> Geo-tagged Photo Verification
                                </label>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Camera/Preview Area */}
                                    <div className="relative aspect-video bg-gray-100 dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center">
                                        {stream ? (
                                            <div className="relative w-full h-full">
                                                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                                <button 
                                                    type="button"
                                                    onClick={takePhoto}
                                                    className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white text-blue-600 p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-transform"
                                                >
                                                    <FaCamera size={24} />
                                                </button>
                                            </div>
                                        ) : capturedPhoto ? (
                                            <div className="relative w-full h-full">
                                                <img src={URL.createObjectURL(capturedPhoto)} className="w-full h-full object-cover" alt="Captured" />
                                                <button 
                                                    type="button"
                                                    onClick={() => { setCapturedPhoto(null); startCamera(); }}
                                                    className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl"
                                                >
                                                    Retake Photo
                                                </button>
                                            </div>
                                        ) : (
                                            <button 
                                                type="button"
                                                onClick={startCamera}
                                                className="flex flex-col items-center gap-2 text-gray-400 hover:text-blue-500 transition-colors"
                                            >
                                                <FaCamera size={40} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Open Camera</span>
                                            </button>
                                        )}
                                        <canvas ref={canvasRef} className="hidden" />
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            onChange={handleFileUpload} 
                                            accept="image/*" 
                                            className="hidden" 
                                        />
                                    </div>

                                    {/* Location Info Area */}
                                    <div className="flex flex-col justify-center space-y-4 p-6 bg-blue-50/50 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/10">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20">
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
                                                    <FaSpinner className="animate-spin" /> Detecting Location...
                                                </div>
                                            ) : location.latitude ? (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                                                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Latitude</span>
                                                        <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{location.latitude.toFixed(6)}</span>
                                                    </div>
                                                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                                                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Longitude</span>
                                                        <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{location.longitude.toFixed(6)}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-4 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-100 dark:border-rose-500/20 text-rose-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                                    <FaVideoSlash /> No Location Data Detected
                                                </div>
                                            )}
                                            
                                            <button 
                                                type="button" 
                                                onClick={getLocation}
                                                className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                                            >
                                                Refresh GPS
                                            </button>
                                            
                                            <div className="pt-2 border-t border-blue-100 dark:border-blue-500/10">
                                                <button 
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="w-full bg-white dark:bg-gray-800 text-blue-600 border border-blue-200 dark:border-blue-800 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <FaPlus /> Upload Photo Instead
                                                </button>
                                                <p className="text-[8px] text-gray-400 mt-2 text-center font-bold uppercase tracking-tighter italic">If camera is not working, you can host regularize via file upload</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-6 border-t border-gray-100 dark:border-gray-800">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-600/30 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed group flex items-center gap-3"
                                >
                                    {submitting ? (
                                        <>
                                            <FaSpinner className="animate-spin" /> Submitting...
                                        </>
                                    ) : (
                                        <>
                                            Submit Correction <FaCheck className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )
                }

                {/* Request List */}
                <div className="space-y-4">
                    <h2 className="text-lg font-black text-gray-800 dark:text-gray-400 uppercase tracking-wider pl-1">Request History</h2>

                    {loading ? (
                        <div className="flex justify-center py-20"><FaSpinner className="animate-spin text-blue-500 text-4xl" /></div>
                    ) : requests.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {requests.map(req => (
                                <div key={req._id} className="bg-white dark:bg-[#1a1f24] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-blue-500/30 transition-all">
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-1 p-3 rounded-xl ${req.type === 'On Duty' ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400' :
                                            req.type === 'Missed Punch' ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400' :
                                                'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                                            }`}>
                                            {req.type === 'On Duty' ? <FaBriefcase /> : req.type === 'Missed Punch' ? <FaClock /> : <FaExclamationCircle />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-lg font-black text-gray-800 dark:text-white">{new Date(req.date).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${req.status === 'Approved' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' :
                                                    req.status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' :
                                                        'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20'
                                                    }`}>
                                                    {req.status}
                                                </span>
                                            </div>
                                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{req.type}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                                                "{req.reason}"
                                            </p>
                                            {req.fromTime && req.toTime && (
                                                <p className="mt-1 text-xs font-mono text-gray-500">
                                                    Requested Time: {req.fromTime} - {req.toTime}
                                                </p>
                                            )}
                                            {req.reviewRemark && (
                                                <div className="mt-2 text-xs text-gray-400">
                                                    <span className="font-bold uppercase text-gray-500">Admin Remark:</span> {req.reviewRemark}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white dark:bg-[#1a1f24] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                            <FaHistory className="mx-auto text-gray-300 text-4xl mb-3" />
                            <p className="text-gray-500 font-bold uppercase text-xs">No regularization history</p>
                        </div>
                    )}
                </div>
            </div >
        </Layout >
    );
};

export default MyRegularization;
