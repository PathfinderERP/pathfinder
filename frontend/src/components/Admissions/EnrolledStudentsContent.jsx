import React, { useState, useEffect } from 'react';
import { FaSearch, FaEye, FaDownload, FaFilter, FaUserGraduate, FaSync } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AdmissionDetailsModal from './AdmissionDetailsModal';
import EditEnrolledStudentModal from './EditEnrolledStudentModal';
import ExportButton from '../common/ExportButton';
import MultiSelectFilter from '../common/MultiSelectFilter';
import Pagination from '../common/Pagination';
import { downloadCSV, downloadExcel } from '../../utils/exportUtils';
import './AdmissionsWave.css';
import { hasPermission } from '../../config/permissions';

const EnrolledStudentsContent = () => {
    const navigate = useNavigate();
    const [admissions, setAdmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState([]);
    const [filterCentre, setFilterCentre] = useState([]);
    const [filterLeadStatus, setFilterLeadStatus] = useState([]);
    const [selectedAdmission, setSelectedAdmission] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Permission checks
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isSuperAdmin = user.role === "superAdmin";
    const canEdit = isSuperAdmin || hasPermission(user.granularPermissions, 'admissions', 'enrolledStudents', 'edit');

    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        fetchAdmissions();

        // Set up global function to open edit modal from details modal
        window.openEditModal = (admission) => {
            setSelectedAdmission(admission);
            setShowEditModal(true);
        };

        return () => {
            delete window.openEditModal;
        };
    }, []);

    const fetchAdmissions = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/admission`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                setAdmissions(data);
            } else {
                toast.error("Failed to fetch admissions");
            }
        } catch (error) {
            toast.error("Error fetching admissions");
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterStatus, filterCentre, filterLeadStatus]);

    const handleRefresh = () => {
        setSearchQuery("");
        setFilterStatus([]);
        setFilterCentre([]);
        setFilterLeadStatus([]);
        setCurrentPage(1);
        setLoading(true);
        fetchAdmissions();
        toast.info("Refreshed data and filters");
    };

    // Extract unique centres for filter
    const uniqueCentres = [...new Set(admissions.map(a => a.centre || a.student?.studentsDetails?.[0]?.centre).filter(Boolean))];

    // Filter admissions based on search, status, centre, and lead status
    const filteredAdmissions = admissions.filter(admission => {
        const student = admission.student?.studentsDetails?.[0] || {};
        const studentName = student.studentName || "";
        const admissionNumber = admission.admissionNumber || "";
        const admissionCentre = admission.centre || student.centre || "";
        const courseName = admission.course?.courseName || "";
        const className = admission.class?.name || "";
        const mobile = student.mobileNum || "";
        const email = student.studentEmail || "";

        // Get current lead status (assuming last one is current)
        const studentStatusList = admission.student?.studentStatus || [];
        const currentStatusObj = studentStatusList.length > 0 ? studentStatusList[studentStatusList.length - 1] : {};
        const currentLeadStatus = currentStatusObj.status || "";

        const query = searchQuery.toLowerCase();
        const matchesSearch =
            studentName.toLowerCase().includes(query) ||
            admissionNumber.toLowerCase().includes(query) ||
            admissionCentre.toLowerCase().includes(query) ||
            courseName.toLowerCase().includes(query) ||
            className.toLowerCase().includes(query) ||
            mobile.includes(query) ||
            email.toLowerCase().includes(query) ||
            currentLeadStatus.toLowerCase().includes(query);

        const matchesStatus = filterStatus.length === 0 || filterStatus.includes(admission.admissionStatus);
        const matchesCentre = filterCentre.length === 0 || filterCentre.includes(admissionCentre);
        const matchesLeadStatus = filterLeadStatus.length === 0 || filterLeadStatus.includes(currentLeadStatus);

        return matchesSearch && matchesStatus && matchesCentre && matchesLeadStatus;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case "ACTIVE":
                return "bg-green-500/10 text-green-400 border-green-500/20";
            case "INACTIVE":
                return "bg-gray-500/10 text-gray-400 border-gray-500/20";
            case "CANCELLED":
                return "bg-red-500/10 text-red-400 border-red-500/20";
            case "COMPLETED":
                return "bg-blue-500/10 text-blue-400 border-blue-500/20";
            default:
                return "bg-gray-500/10 text-gray-400 border-gray-500/20";
        }
    };

    const getPaymentStatusColor = (status) => {
        switch (status) {
            case "COMPLETED":
                return "bg-green-500/10 text-green-400";
            case "PARTIAL":
                return "bg-yellow-500/10 text-yellow-400";
            case "PENDING":
                return "bg-red-500/10 text-red-400";
            default:
                return "bg-gray-500/10 text-gray-400";
        }
    };

    const getLeadStatusColor = (status) => {
        switch (status) {
            case "Hot": return "text-red-400";
            case "Cold": return "text-blue-400";
            case "Negative": return "text-gray-400";
            default: return "text-gray-400";
        }
    };

    const handleExportCSV = () => {
        const headers = [
            { label: 'Student Name', key: 'student.studentsDetails.0.studentName' },
            { label: 'Enrollment ID', key: 'admissionNumber' },
            { label: 'Course', key: 'course.courseName' },
            { label: 'Centre', key: 'centre' },
            { label: 'Session', key: 'academicSession' },
            { label: 'Lead Status', key: 'leadStatus' },
            { label: 'Total Fees', key: 'totalFees' },
            { label: 'Paid Amount', key: 'totalPaidAmount' },
            { label: 'Payment Status', key: 'paymentStatus' },
            { label: 'Admission Status', key: 'admissionStatus' },
        ];

        const exportData = filteredAdmissions.map(admission => {
            const student = admission.student?.studentsDetails?.[0] || {};
            const studentStatusList = admission.student?.studentStatus || [];
            const currentStatusObj = studentStatusList.length > 0 ? studentStatusList[studentStatusList.length - 1] : {};
            const leadStatus = currentStatusObj.status || "N/A";
            const centre = admission.centre || student.centre || admission.department?.departmentName || "N/A";

            return {
                student: {
                    studentsDetails: [{
                        studentName: student.studentName || 'N/A',
                    }]
                },
                admissionNumber: admission.admissionNumber || 'N/A',
                course: {
                    courseName: admission.course?.courseName || 'N/A',
                },
                centre: centre,
                academicSession: admission.academicSession || 'N/A',
                leadStatus: leadStatus,
                totalFees: admission.totalFees || 0,
                totalPaidAmount: admission.totalPaidAmount || 0,
                paymentStatus: admission.paymentStatus || 'N/A',
                admissionStatus: admission.admissionStatus || 'N/A',
            };
        });

        downloadCSV(exportData, headers, 'enrolled_students');
        toast.success('CSV exported successfully!');
    };

    const handleExportExcel = () => {
        const headers = [
            { label: 'Student Name', key: 'student.studentsDetails.0.studentName' },
            { label: 'Enrollment ID', key: 'admissionNumber' },
            { label: 'Course', key: 'course.courseName' },
            { label: 'Centre', key: 'centre' },
            { label: 'Session', key: 'academicSession' },
            { label: 'Lead Status', key: 'leadStatus' },
            { label: 'Total Fees', key: 'totalFees' },
            { label: 'Paid Amount', key: 'totalPaidAmount' },
            { label: 'Payment Status', key: 'paymentStatus' },
            { label: 'Admission Status', key: 'admissionStatus' },
        ];

        const exportData = filteredAdmissions.map(admission => {
            const student = admission.student?.studentsDetails?.[0] || {};
            const studentStatusList = admission.student?.studentStatus || [];
            const currentStatusObj = studentStatusList.length > 0 ? studentStatusList[studentStatusList.length - 1] : {};
            const leadStatus = currentStatusObj.status || "N/A";
            const centre = admission.centre || student.centre || admission.department?.departmentName || "N/A";

            return {
                student: {
                    studentsDetails: [{
                        studentName: student.studentName || 'N/A',
                    }]
                },
                admissionNumber: admission.admissionNumber || 'N/A',
                course: {
                    courseName: admission.course?.courseName || 'N/A',
                },
                centre: centre,
                academicSession: admission.academicSession || 'N/A',
                leadStatus: leadStatus,
                totalFees: admission.totalFees || 0,
                totalPaidAmount: admission.totalPaidAmount || 0,
                paymentStatus: admission.paymentStatus || 'N/A',
                admissionStatus: admission.admissionStatus || 'N/A',
            };
        });

        downloadExcel(exportData, headers, 'enrolled_students');
        toast.success('Excel exported successfully!');
    };

    return (
        <div className="flex-1 p-6 overflow-y-auto bg-[#131619]">
            <ToastContainer position="top-right" theme="dark" />

            {/* Header Section */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <FaUserGraduate className="text-cyan-400 text-3xl" />
                    <h2 className="text-2xl font-bold text-white">Enrolled Students</h2>
                </div>
                <div className="flex gap-3">
                    <ExportButton
                        onExportCSV={handleExportCSV}
                        onExportExcel={handleExportExcel}
                    />
                    <button
                        onClick={handleRefresh}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1a1f24] text-gray-300 rounded-lg border border-gray-700 hover:bg-gray-800 hover:text-cyan-400 transition-all"
                        title="Refresh Data & Reset Filters"
                    >
                        <FaSync className={loading ? "animate-spin" : ""} /> Refresh
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-6 mb-8">
                <div className="bg-[#1a1f24] p-6 rounded-xl border-l-4 border-green-500 shadow-lg">
                    <h3 className="text-gray-400 text-sm font-medium mb-2">Total Enrolled</h3>
                    <p className="text-4xl font-bold text-white mb-2">{admissions.length}</p>
                    <p className="text-gray-500 text-xs">All time admissions</p>
                </div>

                <div className="bg-[#1a1f24] p-6 rounded-xl border-l-4 border-cyan-500 shadow-lg">
                    <h3 className="text-gray-400 text-sm font-medium mb-2">Active</h3>
                    <p className="text-4xl font-bold text-white mb-2">
                        {admissions.filter(a => a.admissionStatus === "ACTIVE").length}
                    </p>
                    <p className="text-gray-500 text-xs">Currently studying</p>
                </div>

                <div className="bg-[#1a1f24] p-6 rounded-xl border-l-4 border-yellow-500 shadow-lg">
                    <h3 className="text-gray-400 text-sm font-medium mb-2">Pending Payment</h3>
                    <p className="text-4xl font-bold text-white mb-2">
                        {admissions.filter(a => a.paymentStatus === "PENDING" || a.paymentStatus === "PARTIAL").length}
                    </p>
                    <p className="text-gray-500 text-xs">Incomplete payments</p>
                </div>

                <div className="bg-[#1a1f24] p-6 rounded-xl border-l-4 border-blue-500 shadow-lg">
                    <h3 className="text-gray-400 text-sm font-medium mb-2">Total Collected</h3>
                    <p className="text-4xl font-bold text-white mb-2">
                        ₹{admissions.reduce((sum, a) => sum + (a.totalPaidAmount || 0), 0).toLocaleString()}
                    </p>
                    <p className="text-gray-500 text-xs">Total fees received</p>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="bg-[#1a1f24] p-4 rounded-xl border border-gray-800 mb-6 space-y-4">
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search by name, ID, centre, course, mobile, lead status..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#131619] text-white pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500"
                        />
                    </div>
                </div>

                <div className="flex gap-4 flex-wrap">
                    <MultiSelectFilter
                        label="Status"
                        placeholder="All Status"
                        options={[
                            { value: "ACTIVE", label: "Active" },
                            { value: "INACTIVE", label: "Inactive" },
                            { value: "COMPLETED", label: "Completed" }

                        ]}
                        selectedValues={filterStatus}
                        onChange={setFilterStatus}
                    />

                    <MultiSelectFilter
                        label="Centre"
                        placeholder="All Centres"
                        options={uniqueCentres.map(c => ({ value: c, label: c }))}
                        selectedValues={filterCentre}
                        onChange={setFilterCentre}
                    />

                    {/* <MultiSelectFilter
                        label="Lead Status"
                        placeholder="All Lead Status"
                        options={[
                            { value: "Hot", label: "Hot" },
                            { value: "Cold", label: "Cold" },
                            { value: "Negative", label: "Negative" }
                        ]}
                        selectedValues={filterLeadStatus}
                        onChange={setFilterLeadStatus}
                    /> */}

                    <button
                        onClick={handleRefresh}
                        className="flex items-center gap-2 px-4 py-2 bg-[#131619] text-gray-300 rounded-lg border border-gray-700 hover:bg-gray-800 hover:text-cyan-400 transition-all"
                        title="Refresh Data & Reset Filters"
                    >
                        <FaSync className={loading ? "animate-spin" : ""} /> Refresh
                    </button>
                    <ExportButton
                        onExportCSV={handleExportCSV}
                        onExportExcel={handleExportExcel}
                    />
                </div>
            </div>

            {/* Admissions Table */}
            <div className="bg-[#1a1f24] rounded-xl border border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-800">
                    <h3 className="text-xl font-bold text-white">Admission Records</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#252b32] text-gray-400 text-sm uppercase">
                                <th className="p-4 font-medium">Student</th>
                                <th className="p-4 font-medium">Enrollment Id</th>
                                <th className="p-4 font-medium">Course</th>
                                <th className="p-4 font-medium">Centre</th>
                                <th className="p-4 font-medium">Session</th>
                                {/* <th className="p-4 font-medium">Lead Status</th> */}
                                <th className="p-4 font-medium">Total Fees</th>
                                <th className="p-4 font-medium">Payment Status</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="10" className="p-8 text-center text-gray-500">Loading admissions...</td>
                                </tr>
                            ) : filteredAdmissions.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="p-8 text-center text-gray-500">
                                        {searchQuery ? "No admissions found matching your search." : "No admissions found."}
                                    </td>
                                </tr>
                            ) : (
                                filteredAdmissions
                                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                    .map((admission) => {
                                    const student = admission.student?.studentsDetails?.[0] || {};
                                    const studentImage = admission.studentImage || student.studentImage || null;
                                    const centre = admission.centre || student.centre || admission.department?.departmentName || "N/A";

                                    const studentStatusList = admission.student?.studentStatus || [];
                                    const currentStatusObj = studentStatusList.length > 0 ? studentStatusList[studentStatusList.length - 1] : {};
                                    const leadStatus = currentStatusObj.status || "N/A";

                                    return (
                                        <tr key={admission._id} className="admissions-row-wave transition-colors group">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold overflow-hidden">
                                                        {studentImage ? (
                                                            <img src={studentImage} alt={student.studentName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            student.studentName?.charAt(0).toUpperCase() || "S"
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-medium">{student.studentName || "N/A"}</p>
                                                        <p className="text-gray-400 text-xs">{student.studentEmail || ""}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-cyan-400 font-mono font-semibold">
                                                    {admission.admissionNumber}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-300">{admission.course?.courseName || "N/A"}</td>
                                            <td className="p-4 text-gray-300">{centre}</td>
                                            <td className="p-4 text-gray-300">{admission.academicSession}</td>
                                            {/* <td className="p-4">
                                                <span className={`font-medium ${getLeadStatusColor(leadStatus)}`}>
                                                    {leadStatus}
                                                </span>
                                            </td> */}
                                            <td className="p-4 text-white font-semibold">₹{admission.totalFees?.toLocaleString()}</td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getPaymentStatusColor(admission.paymentStatus)}`}>
                                                    {admission.paymentStatus}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(admission.admissionStatus)}`}>
                                                    {admission.admissionStatus}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setSelectedAdmission(admission)}
                                                        className="p-2 bg-cyan-500/10 text-cyan-400 rounded hover:bg-cyan-500/20 transition-opacity"
                                                        title="View Details"
                                                    >
                                                        <FaEye />
                                                    </button>
                                                    {canEdit && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedAdmission(admission);
                                                                setShowEditModal(true);
                                                            }}
                                                            className="p-2 bg-yellow-500/10 text-yellow-400 rounded hover:bg-yellow-500/20 transition-opacity"
                                                            title="Edit Student Details"
                                                        >
                                                            <FaUserGraduate />
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
            </div>

            <Pagination
                currentPage={currentPage}
                totalItems={filteredAdmissions.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
            />

            {/* Admission Details Modal */}
            {
                selectedAdmission && !showEditModal && (
                    <AdmissionDetailsModal
                        admission={selectedAdmission}
                        onClose={() => setSelectedAdmission(null)}
                        onUpdate={() => {
                            fetchAdmissions();
                            setSelectedAdmission(null);
                        }}
                    />
                )
            }

            {/* Edit Student Modal */}
            {
                selectedAdmission && showEditModal && (
                    <EditEnrolledStudentModal
                        admission={selectedAdmission}
                        onClose={() => {
                            setShowEditModal(false);
                            setSelectedAdmission(null);
                        }}
                        onUpdate={() => {
                            fetchAdmissions();
                            setShowEditModal(false);
                            setSelectedAdmission(null);
                        }}
                    />
                )
            }
        </div >
    );
};

export default EnrolledStudentsContent;
