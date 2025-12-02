import React, { useState, useEffect } from 'react';
import { FaSearch, FaEye, FaCommentDots, FaCheckCircle, FaExclamationCircle, FaTimesCircle, FaPaperPlane, FaFileInvoice } from 'react-icons/fa';
import { toast } from 'react-toastify';
import BillGenerator from './BillGenerator';

const StudentFeeList = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [messageMode, setMessageMode] = useState('TEMPLATE'); // TEMPLATE or CUSTOM
    const [customMessage, setCustomMessage] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState('REMINDER');
    const [sending, setSending] = useState(false);
    const [billModal, setBillModal] = useState({ show: false, admission: null, installment: null });

    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        fetchStudentFees();
    }, []);

    const fetchStudentFees = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${apiUrl}/payment-reminder/student-fees`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setStudents(data.data);
            } else {
                toast.error('Failed to fetch student fees');
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error loading student fees');
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!selectedStudent) return;

        let messageToSend = customMessage;
        if (messageMode === 'TEMPLATE') {
            // Construct template message based on selection
            const nextDue = selectedStudent.nextDueDate ? new Date(selectedStudent.nextDueDate).toLocaleDateString('en-IN') : 'N/A';
            const amount = selectedStudent.nextDueAmount;

            if (selectedTemplate === 'REMINDER') {
                messageToSend = `Dear ${selectedStudent.studentName}, your fee installment of Rs.${amount} is due on ${nextDue}. Please pay on time. - Pathfinder ERP`;
            } else if (selectedTemplate === 'OVERDUE') {
                messageToSend = `Dear ${selectedStudent.studentName}, your fee of Rs.${amount} was due on ${nextDue} and is currently OVERDUE. Please pay immediately. - Pathfinder ERP`;
            }
        }

        if (!messageToSend) {
            toast.warning('Please enter a message');
            return;
        }

        setSending(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${apiUrl}/payment-reminder/send-custom-message`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    phoneNumber: selectedStudent.phoneNumber,
                    message: messageToSend,
                    studentId: selectedStudent.admissionId
                })
            });

            const data = await response.json();
            if (data.success) {
                toast.success('Message sent successfully');
                setCustomMessage('');
                // Don't close modal immediately so user can see success
            } else {
                toast.error(data.message || 'Failed to send message');
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error sending message');
        } finally {
            setSending(false);
        }
    };

    const filteredStudents = students.filter(student =>
        student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-[#1a1f24] rounded-xl border border-gray-800 overflow-hidden">
            {/* Header & Search */}
            <div className="p-6 border-b border-gray-800 flex justify-between items-center flex-wrap gap-4">
                <h3 className="text-xl font-bold text-white">Student Fee List</h3>
                <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search student..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-[#131619] text-white pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-cyan-500 w-64"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[#252b32] text-gray-400 text-sm uppercase">
                            <th className="p-4 font-medium">Student</th>
                            <th className="p-4 font-medium">Course</th>
                            <th className="p-4 font-medium">Total Fee</th>
                            <th className="p-4 font-medium">Paid</th>
                            <th className="p-4 font-medium">Due</th>
                            <th className="p-4 font-medium">Next Due Date</th>
                            <th className="p-4 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {loading ? (
                            <tr><td colSpan="7" className="p-8 text-center text-gray-500">Loading...</td></tr>
                        ) : filteredStudents.length === 0 ? (
                            <tr><td colSpan="7" className="p-8 text-center text-gray-500">No students found</td></tr>
                        ) : (
                            filteredStudents.map((student, index) => (
                                <tr key={index} className="hover:bg-[#252b32] transition-colors text-sm">
                                    <td className="p-4">
                                        <div className="font-medium text-white">{student.studentName}</div>
                                        <div className="text-xs text-gray-500">{student.admissionNumber}</div>
                                    </td>
                                    <td className="p-4 text-gray-300">{student.courseName}</td>
                                    <td className="p-4 text-gray-300">₹{student.totalFees.toLocaleString('en-IN')}</td>
                                    <td className="p-4 text-green-400">₹{student.totalPaid.toLocaleString('en-IN')}</td>
                                    <td className="p-4 text-red-400">₹{student.remainingAmount.toLocaleString('en-IN')}</td>
                                    <td className="p-4 text-gray-300">
                                        {student.nextDueDate ? new Date(student.nextDueDate).toLocaleDateString('en-IN') : 'Completed'}
                                    </td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => setSelectedStudent(student)}
                                            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2"
                                        >
                                            <FaEye /> Details
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Detail Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a1f24] rounded-xl border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-[#1a1f24]">
                            <h2 className="text-xl font-bold text-white">Fee Details: {selectedStudent.studentName}</h2>
                            <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-white text-xl">&times;</button>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left Column: Fee Breakdown */}
                            <div>
                                <h3 className="text-lg font-semibold text-cyan-400 mb-4">Fee Structure</h3>
                                <div className="space-y-3 text-sm text-gray-300 bg-[#252b32] p-4 rounded-lg">
                                    <div className="flex justify-between"><span>Total Fee:</span> <span className="text-white font-bold">₹{selectedStudent.totalFees}</span></div>
                                    <div className="flex justify-between"><span>Discount/Waiver:</span> <span className="text-green-400">-₹{selectedStudent.discountAmount}</span></div>
                                    <div className="flex justify-between"><span>Down Payment:</span> <span className="text-white">₹{selectedStudent.downPayment}</span></div>
                                    <div className="border-t border-gray-600 my-2 pt-2 flex justify-between">
                                        <span>Total Paid:</span> <span className="text-green-400 font-bold">₹{selectedStudent.totalPaid}</span>
                                    </div>
                                    <div className="flex justify-between"><span>Remaining Due:</span> <span className="text-red-400 font-bold">₹{selectedStudent.remainingAmount}</span></div>
                                </div>

                                <h3 className="text-lg font-semibold text-cyan-400 mt-6 mb-4">Installment History</h3>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                    {selectedStudent.installments.map((inst, idx) => (
                                        <div key={idx} className={`p-3 rounded border ${inst.status === 'PAID' ? 'border-green-500/30 bg-green-500/10' : inst.status === 'OVERDUE' ? 'border-red-500/30 bg-red-500/10' : 'border-gray-700 bg-gray-800'}`}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-medium text-white">Inst #{inst.installmentNumber}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded ${inst.status === 'PAID' ? 'bg-green-500 text-black' : inst.status === 'OVERDUE' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black'}`}>
                                                    {inst.status}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-xs text-gray-400">
                                                <span>Due: {new Date(inst.dueDate).toLocaleDateString('en-IN')}</span>
                                                <span className="text-white font-bold">₹{inst.amount}</span>
                                            </div>
                                            {inst.paidDate && (
                                                <div className="text-xs text-green-400 mt-1">Paid on: {new Date(inst.paidDate).toLocaleDateString('en-IN')}</div>
                                            )}
                                            {inst.status === 'PAID' && (
                                                <button
                                                    onClick={() => setBillModal({ show: true, admission: { _id: selectedStudent.admissionId, student: { name: selectedStudent.studentName, admissionNumber: selectedStudent.admissionNumber, phoneNumber: selectedStudent.phoneNumber, email: selectedStudent.email || 'N/A' }, course: { courseName: selectedStudent.courseName }, department: {}, examTag: {}, class: {} }, installment: inst })}
                                                    className="mt-2 w-full px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded text-xs flex items-center justify-center gap-1"
                                                >
                                                    <FaFileInvoice /> Generate Bill
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right Column: Messaging */}
                            <div>
                                <h3 className="text-lg font-semibold text-cyan-400 mb-4">Send Message</h3>
                                <div className="bg-[#252b32] p-4 rounded-lg">
                                    <div className="flex gap-2 mb-4">
                                        <button
                                            onClick={() => setMessageMode('TEMPLATE')}
                                            className={`flex-1 py-2 text-sm rounded ${messageMode === 'TEMPLATE' ? 'bg-cyan-500 text-black font-bold' : 'bg-gray-700 text-gray-300'}`}
                                        >
                                            Templates
                                        </button>
                                        <button
                                            onClick={() => setMessageMode('CUSTOM')}
                                            className={`flex-1 py-2 text-sm rounded ${messageMode === 'CUSTOM' ? 'bg-cyan-500 text-black font-bold' : 'bg-gray-700 text-gray-300'}`}
                                        >
                                            Custom Text
                                        </button>
                                    </div>

                                    {messageMode === 'TEMPLATE' ? (
                                        <div className="space-y-3">
                                            <label className="block text-sm text-gray-400">Select Template type:</label>
                                            <select
                                                value={selectedTemplate}
                                                onChange={(e) => setSelectedTemplate(e.target.value)}
                                                className="w-full bg-gray-800 border border-gray-600 text-white rounded p-2 text-sm"
                                            >
                                                <option value="REMINDER">Upcoming Due Reminder</option>
                                                <option value="OVERDUE">Overdue Warning</option>
                                            </select>

                                            <div className="p-3 bg-gray-800 rounded text-xs text-gray-400 italic border border-gray-700 mt-2">
                                                Preview: "Dear {selectedStudent.studentName}, your fee installment of Rs.{selectedStudent.nextDueAmount} is due on {selectedStudent.nextDueDate ? new Date(selectedStudent.nextDueDate).toLocaleDateString('en-IN') : 'N/A'}..."
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <label className="block text-sm text-gray-400">Write your message:</label>
                                            <textarea
                                                value={customMessage}
                                                onChange={(e) => setCustomMessage(e.target.value)}
                                                rows="4"
                                                className="w-full bg-gray-800 border border-gray-600 text-white rounded p-2 text-sm focus:border-cyan-500 focus:outline-none"
                                                placeholder="Type message here..."
                                            ></textarea>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleSendMessage}
                                        disabled={sending}
                                        className="w-full mt-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <FaPaperPlane /> {sending ? 'Sending...' : 'Send SMS'}
                                    </button>

                                    <p className="text-xs text-gray-500 mt-2 text-center">
                                        Message will be sent to: {selectedStudent.phoneNumber}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bill Generator Modal */}
            {billModal.show && (
                <BillGenerator
                    admission={billModal.admission}
                    installment={billModal.installment}
                    onClose={() => setBillModal({ show: false, admission: null, installment: null })}
                />
            )}
        </div>
    );
};

export default StudentFeeList;
