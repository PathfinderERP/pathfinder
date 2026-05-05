import React, { useState, useEffect } from 'react';
import { FaSms, FaPaperPlane, FaCheckCircle, FaExclamationTriangle, FaSpinner, FaTimes, FaLink, FaSyncAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';

const RazorpaySMSModal = ({ 
    isOpen, 
    onClose, 
    amount, 
    installmentNumber, 
    admissionId, 
    studentInfo, 
    onPaymentSuccess,
    isDarkMode,
    admissionType = "NORMAL",
    paidExamFee = 0,
    paidAdditionalThings = 0,
    installmentId = null
}) => {
    const [status, setStatus] = useState('IDLE'); // IDLE, INITIATING, SENT, SUCCESS, FAILED
    const [paymentLinkId, setPaymentLinkId] = useState(null);
    const [shortUrl, setShortUrl] = useState(null);
    const [error, setError] = useState(null);
    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        if (!isOpen) {
            setStatus('IDLE');
            setPaymentLinkId(null);
            setShortUrl(null);
            setError(null);
        }
    }, [isOpen]);

    // Polling logic when link is sent
    useEffect(() => {
        let pollInterval;
        if (status === 'SENT' && paymentLinkId) {
            pollInterval = setInterval(async () => {
                try {
                    const token = localStorage.getItem("token");
                    const response = await fetch(`${apiUrl}/payment/sms/status/${paymentLinkId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const data = await response.json();

                    if (data.status === 'paid') {
                        clearInterval(pollInterval);
                        setStatus('SUCCESS');
                        onPaymentSuccess(data);
                    } else if (data.status === 'expired' || data.status === 'cancelled') {
                        clearInterval(pollInterval);
                        setStatus('FAILED');
                        setError(`Payment link ${data.status}`);
                    }
                } catch (err) {
                    console.error("Polling error:", err);
                }
            }, 10000); // Poll every 10 seconds for SMS pay
        }

        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [status, paymentLinkId, apiUrl, onPaymentSuccess]);

    const handleSendSMS = async () => {
        setStatus('INITIATING');
        setError(null);

        // Calculate total amount if extra fees are present (backend will also verify)
        const totalAmount = parseFloat(amount) + parseFloat(paidExamFee || 0) + parseFloat(paidAdditionalThings || 0);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/payment/sms/initiate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: totalAmount,
                    description: `${admissionType} Ind. #${installmentNumber} payment for ${studentInfo?.name || studentInfo?.studentName}`,
                    customerName: studentInfo?.name || studentInfo?.studentName,
                    customerMobile: studentInfo?.mobile || studentInfo?.mobileNum,
                    customerEmail: studentInfo?.email || "",
                    admissionId: admissionId,
                    installmentNumber: installmentNumber,
                    admissionType,
                    paidExamFee,
                    paidAdditionalThings,
                    installmentId
                })
            });

            const data = await response.json();

            if (data.success) {
                setPaymentLinkId(data.paymentLinkId);
                setShortUrl(data.shortUrl);
                setStatus('SENT');
                toast.success("Payment link sent via SMS!");
            } else {
                setStatus('IDLE');
                setError(data.message || "Failed to send payment link");
                toast.error(data.message || "Failed to send payment link");
            }
        } catch (err) {
            console.error("Initiate error:", err);
            setStatus('IDLE');
            setError("Network error. Please try again.");
            toast.error("Network error");
        }
    };

    if (!isOpen) return null;

    const displayAmount = parseFloat(amount) + parseFloat(paidExamFee || 0) + parseFloat(paidAdditionalThings || 0);

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all duration-300">
            <div className={`border w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl flex flex-col transition-all duration-500 ${isDarkMode ? 'bg-[#0f1215] border-gray-800 shadow-orange-500/10' : 'bg-white border-gray-200'}`}>
                <div className={`p-8 border-b flex justify-between items-center transition-all ${isDarkMode ? 'border-gray-800 bg-gradient-to-r from-orange-500/10 via-transparent to-transparent' : 'border-gray-100 bg-gray-50'}`}>
                    <div>
                        <h2 className={`text-2xl font-black italic uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Razorpay <span className="text-orange-500">SMS PAY</span></h2>
                        <div className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">{admissionType} Admission Support</div>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'text-gray-500 hover:bg-gray-800 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900'}`}>
                        <FaTimes />
                    </button>
                </div>

                <div className="p-10 flex flex-col items-center text-center">
                    {status === 'IDLE' && (
                        <>
                            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-3xl mb-6 shadow-lg ${isDarkMode ? 'bg-orange-500/10 text-orange-500' : 'bg-orange-50 text-orange-600'}`}>
                                <FaSms />
                            </div>
                            <h3 className={`text-xl font-bold mb-2 italic uppercase ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Send Payment Link</h3>
                            <div className={`text-sm mb-8 space-y-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                <p>A secure link for <b>₹{displayAmount.toLocaleString()}</b> will be sent to:</p>
                                <p className={`font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{studentInfo?.mobile || studentInfo?.mobileNum}</p>
                                {(paidExamFee > 0 || paidAdditionalThings > 0) && (
                                    <div className={`pt-2 mt-2 border-t text-[10px] uppercase font-bold ${isDarkMode ? 'border-gray-800 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
                                        {paidExamFee > 0 && <div>+ Exam Fee: ₹{paidExamFee}</div>}
                                        {paidAdditionalThings > 0 && <div>+ Additional Things: ₹{paidAdditionalThings}</div>}
                                    </div>
                                )}
                            </div>
                            
                            <button
                                onClick={handleSendSMS}
                                className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-400 text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3"
                            >
                                <FaPaperPlane /> Send SMS Pay Link
                            </button>
                        </>
                    )}

                    {status === 'INITIATING' && (
                        <>
                            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-3xl mb-6 animate-pulse ${isDarkMode ? 'bg-orange-500/10 text-orange-500' : 'bg-orange-50 text-orange-600'}`}>
                                <FaSpinner className="animate-spin" />
                            </div>
                            <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Generating Link...</h3>
                            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Connecting to Razorpay API.</p>
                        </>
                    )}

                    {status === 'SENT' && (
                        <>
                            <div className="w-24 h-24 rounded-full flex items-center justify-center relative mb-8 shadow-xl">
                                <div className={`absolute inset-0 border-4 rounded-full ${isDarkMode ? 'border-orange-500/20' : 'border-orange-50'}`}></div>
                                <div className="absolute inset-0 border-t-4 border-orange-500 rounded-full animate-spin"></div>
                                <FaSms className="text-4xl text-orange-500" />
                            </div>
                            <h3 className={`text-2xl font-black uppercase italic tracking-tighter mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Link <span className="text-orange-500">Sent!</span></h3>
                            <p className={`text-sm mb-6 uppercase font-bold tracking-tighter ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Waiting for student to complete payment...</p>
                            
                            <div className={`w-full border rounded-2xl p-4 mb-6 relative group transition-all ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block text-left">Payment URL</div>
                                <div className="flex items-center gap-3">
                                    <FaLink className="text-orange-500 text-xs flex-shrink-0" />
                                    <div className={`text-[10px] font-mono truncate select-all ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{shortUrl}</div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 w-full">
                                <div className="flex items-center justify-center gap-2 text-[9px] font-black text-orange-500 uppercase tracking-widest animate-pulse">
                                    <FaSyncAlt className="animate-spin-slow" /> Auto-refreshing status...
                                </div>
                                <button onClick={onClose} className="text-gray-500 hover:text-orange-500 font-black uppercase text-[10px] tracking-widest transition-colors mt-2">
                                    Close and Pay Later
                                </button>
                            </div>
                        </>
                    )}

                    {status === 'SUCCESS' && (
                        <>
                            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-6 animate-bounce shadow-xl ${isDarkMode ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-50 text-emerald-600'}`}>
                                <FaCheckCircle />
                            </div>
                            <h3 className={`text-2xl font-black uppercase italic tracking-tighter mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Payment <span className="text-emerald-500">Confirmed!</span></h3>
                            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Transaction completed via SMS Link.</p>
                            <button onClick={onClose} className="w-full py-4 bg-emerald-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl">
                                Done
                            </button>
                        </>
                    )}

                    {status === 'FAILED' && (
                        <>
                            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-xl ${isDarkMode ? 'bg-red-500/10 text-red-500' : 'bg-red-50 text-red-600'}`}>
                                <FaExclamationTriangle />
                            </div>
                            <h3 className={`text-2xl font-black uppercase italic tracking-tighter mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Payment <span className="text-red-500">Failed</span></h3>
                            <p className="text-red-500 text-sm mb-2 font-bold uppercase">{error}</p>
                            <button onClick={() => setStatus('IDLE')} className={`w-full py-4 font-black uppercase text-xs tracking-widest rounded-2xl border transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700' : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'}`}>
                                Resend Link
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RazorpaySMSModal;
