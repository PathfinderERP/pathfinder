import React, { useState } from 'react';
import Layout from '../../components/Layout';
import Select from "react-select";
import {
    FaUser, FaChalkboardTeacher, FaStar, FaSearch, FaFilter,
    FaCalendarAlt, FaComments, FaAward, FaChartLine, FaEye,
    FaThumbsUp, FaThumbsDown, FaClock, FaBookOpen, FaTimes
} from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';

// Sample data for demonstration
const sampleStudents = [
    {
        id: 1,
        name: "Rahul Sharma",
        class: "Class 12",
        centre: "Kolkata Main Campus",
        profileImage: null,
        allocatedTeachers: [
            {
                id: 1,
                name: "Dr. Priya Singh",
                subject: "Physics",
                rating: 4.8,
                totalReviews: 45,
                lastClass: "2026-01-07"
            },
            {
                id: 2,
                name: "Prof. Amit Kumar",
                subject: "Mathematics",
                rating: 4.9,
                totalReviews: 52,
                lastClass: "2026-01-08"
            }
        ],
        overallSatisfaction: 4.7,
        totalReviews: 8
    },
    {
        id: 2,
        name: "Priya Patel",
        class: "Class 11",
        centre: "Hazra H.O",
        profileImage: null,
        allocatedTeachers: [
            {
                id: 3,
                name: "Ms. Sneha Roy",
                subject: "Chemistry",
                rating: 4.6,
                totalReviews: 38,
                lastClass: "2026-01-07"
            },
            {
                id: 4,
                name: "Mr. Rajesh Gupta",
                subject: "Biology",
                rating: 4.7,
                totalReviews: 41,
                lastClass: "2026-01-08"
            }
        ],
        overallSatisfaction: 4.5,
        totalReviews: 6
    },
    {
        id: 3,
        name: "Arjun Mehta",
        class: "Class 12",
        centre: "Kolkata Salt Lake",
        profileImage: null,
        allocatedTeachers: [
            {
                id: 1,
                name: "Dr. Priya Singh",
                subject: "Physics",
                rating: 4.8,
                totalReviews: 45,
                lastClass: "2026-01-06"
            },
            {
                id: 5,
                name: "Dr. Ananya Das",
                subject: "English",
                rating: 4.9,
                totalReviews: 48,
                lastClass: "2026-01-07"
            }
        ],
        overallSatisfaction: 4.8,
        totalReviews: 10
    },
    {
        id: 4,
        name: "Sneha Kapoor",
        class: "Class 11",
        centre: "Kolkata Gariahat",
        profileImage: null,
        allocatedTeachers: [
            {
                id: 2,
                name: "Prof. Amit Kumar",
                subject: "Mathematics",
                rating: 4.9,
                totalReviews: 52,
                lastClass: "2026-01-08"
            },
            {
                id: 6,
                name: "Mr. Vikram Joshi",
                subject: "Computer Science",
                rating: 4.7,
                totalReviews: 35,
                lastClass: "2026-01-07"
            }
        ],
        overallSatisfaction: 4.6,
        totalReviews: 7
    }
];

const StudentTeacherReview = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showReviewModal, setShowReviewModal] = useState(false);

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

    const classOptions = [
        { value: "Class 11", label: "Class 11" },
        { value: "Class 12", label: "Class 12" }
    ];

    const centreOptions = [
        { value: "Kolkata Main Campus", label: "Kolkata Main Campus" },
        { value: "Hazra H.O", label: "Hazra H.O" },
        { value: "Kolkata Salt Lake", label: "Kolkata Salt Lake" },
        { value: "Kolkata Gariahat", label: "Kolkata Gariahat" }
    ];

    const filteredStudents = sampleStudents.filter(student => {
        const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase());
        
        const classList = selectedClasses.map(v => v.value);
        const matchesClass = classList.length === 0 || classList.includes(student.class);
        
        const centreList = selectedCentres.map(v => v.value);
        const matchesCentre = centreList.length === 0 || centreList.includes(student.centre);
        
        return matchesSearch && matchesClass && matchesCentre;
    });

    const getInitials = (name) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    const getRatingColor = (rating) => {
        if (rating >= 4.5) return isDarkMode ? "text-green-400" : "text-green-600";
        if (rating >= 4.0) return isDarkMode ? "text-yellow-400" : "text-yellow-600";
        return isDarkMode ? "text-orange-400" : "text-orange-600";
    };

    const handleViewDetails = (student) => {
        setSelectedStudent(student);
        setShowReviewModal(true);
    };

    return (
        <Layout activePage="Academics">
            <div className={`p-6 space-y-6 min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#131619]' : 'bg-[#f8fafc]'}`}>
                {/* Header */}
                <div className={`relative overflow-hidden p-8 rounded-3xl border shadow-2xl transition-all ${isDarkMode ? 'bg-gradient-to-br from-[#1a1f24] to-[#252b32] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-3xl shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                                <FaChalkboardTeacher />
                            </div>
                            <div>
                                <h1 className={`text-4xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Student Teacher Review</h1>
                                <p className={`font-medium mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Monitor student feedback and teacher performance</p>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                            <div className={`border rounded-2xl p-4 transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 hover:border-cyan-500/50' : 'bg-gray-50 border-gray-200 hover:border-cyan-400 shadow-sm'}`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 text-xs font-bold uppercase">Total Students</p>
                                        <h3 className={`text-3xl font-black mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{sampleStudents.length}</h3>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500 text-xl">
                                        <FaUser />
                                    </div>
                                </div>
                            </div>

                            <div className={`border rounded-2xl p-4 transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 hover:border-purple-500/50' : 'bg-gray-50 border-gray-200 hover:border-purple-400 shadow-sm'}`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 text-xs font-bold uppercase">Active Teachers</p>
                                        <h3 className={`text-3xl font-black mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>6</h3>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 text-xl">
                                        <FaChalkboardTeacher />
                                    </div>
                                </div>
                            </div>

                            <div className={`border rounded-2xl p-4 transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 hover:border-green-500/50' : 'bg-gray-50 border-gray-200 hover:border-green-400 shadow-sm'}`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 text-xs font-bold uppercase">Avg Rating</p>
                                        <h3 className={`text-3xl font-black mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>4.7</h3>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 text-xl">
                                        <FaStar />
                                    </div>
                                </div>
                            </div>

                            <div className={`border rounded-2xl p-4 transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 hover:border-yellow-500/50' : 'bg-gray-50 border-gray-200 hover:border-yellow-400 shadow-sm'}`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 text-xs font-bold uppercase">Total Reviews</p>
                                        <h3 className={`text-3xl font-black mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>31</h3>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 text-xl">
                                        <FaComments />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} border rounded-2xl p-6 transition-all`}>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <FaFilter className="text-cyan-500" />
                            <h3 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Filters</h3>
                        </div>
                        <button 
                            onClick={() => {
                                setSearchTerm("");
                                setSelectedClasses([]);
                                setSelectedCentres([]);
                            }}
                            className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-colors ${isDarkMode ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                        >
                            <FaTimes /> Clear All
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="relative group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Search Students</label>
                            <div className="relative">
                                <FaSearch className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-gray-500 group-focus-within:text-cyan-400' : 'text-gray-400 group-focus-within:text-cyan-600'}`} />
                                <input
                                    type="text"
                                    placeholder="Search students..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={`w-full rounded-xl pl-12 pr-4 py-3 outline-none transition-all border ${isDarkMode ? 'bg-[#131619] border-gray-700 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-600'}`}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Class</label>
                            <Select
                                isMulti
                                isSearchable
                                placeholder="Select Classes"
                                options={classOptions}
                                value={selectedClasses}
                                onChange={setSelectedClasses}
                                styles={customSelectStyles}
                            />
                        </div>

                        <div className="flex flex-col">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Centre</label>
                            <Select
                                isMulti
                                isSearchable
                                placeholder="Select Centres"
                                options={centreOptions}
                                value={selectedCentres}
                                onChange={setSelectedCentres}
                                styles={customSelectStyles}
                            />
                        </div>
                    </div>
                </div>

                {/* Students Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredStudents.map((student) => (
                        <div
                            key={student.id}
                            className={`border rounded-3xl overflow-hidden hover:border-cyan-500/50 transition-all group ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}
                        >
                            {/* Student Header */}
                            <div className={`p-6 border-b ${isDarkMode ? 'bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                                            {getInitials(student.name)}
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{student.name}</h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className={`text-sm font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{student.class}</span>
                                                <span className={`${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`}>•</span>
                                                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{student.centre}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="flex items-center gap-2 justify-end">
                                            <FaStar className="text-yellow-400" />
                                            <span className={`text-2xl font-black ${getRatingColor(student.overallSatisfaction)}`}>
                                                {student.overallSatisfaction}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">{student.totalReviews} reviews</p>
                                    </div>
                                </div>
                            </div>

                            {/* Allocated Teachers */}
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                        <FaChalkboardTeacher className="text-cyan-500" />
                                        Allocated Teachers
                                    </h4>
                                    <span className={`text-xs px-3 py-1 rounded-full font-black uppercase ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-100 text-cyan-700'}`}>
                                        {student.allocatedTeachers.length} Teachers
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {student.allocatedTeachers.map((teacher) => (
                                        <div
                                            key={teacher.id}
                                            className={`border rounded-2xl p-4 transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 hover:border-cyan-500/30' : 'bg-gray-50 border-gray-200 hover:border-cyan-400 shadow-sm'}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-sm font-bold">
                                                            {getInitials(teacher.name)}
                                                        </div>
                                                        <div>
                                                            <h5 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{teacher.name}</h5>
                                                            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{teacher.subject}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <div className="flex items-center gap-1 justify-end">
                                                        <FaStar className="text-yellow-400 text-sm" />
                                                        <span className={`text-lg font-black ${getRatingColor(teacher.rating)}`}>
                                                            {teacher.rating}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-600 mt-0.5">{teacher.totalReviews} reviews</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 mt-3 text-xs">
                                                <FaClock className={isDarkMode ? 'text-gray-600' : 'text-gray-400'} />
                                                <span className={isDarkMode ? 'text-gray-500' : 'text-gray-500'}>Last class: {new Date(teacher.lastClass).toLocaleDateString('en-GB')}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => handleViewDetails(student)}
                                    className="w-full mt-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-3 rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                                >
                                    <FaEye />
                                    View Detailed Reviews
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredStudents.length === 0 && (
                    <div className={`border rounded-3xl p-12 text-center ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 ${isDarkMode ? 'bg-gray-800 text-gray-600' : 'bg-gray-100 text-gray-300'}`}>
                            <FaUser />
                        </div>
                        <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No Students Found</h3>
                        <p className="text-gray-500">Try adjusting your filters to see more results</p>
                    </div>
                )}

                {/* Review Modal (placeholder) */}
                {showReviewModal && selectedStudent && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                        <div className={`rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-[#1a1f24] border border-gray-800' : 'bg-white border border-gray-200 shadow-lg'}`}>
                            <div className={`sticky top-0 p-6 flex items-center justify-between border-b ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                                <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Detailed Reviews - {selectedStudent.name}</h2>
                                <button
                                    onClick={() => setShowReviewModal(false)}
                                    className="w-10 h-10 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                                >
                                    ×
                                </button>
                            </div>
                            <div className="p-6">
                                <p className="text-gray-400">Detailed review interface coming soon...</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default StudentTeacherReview;