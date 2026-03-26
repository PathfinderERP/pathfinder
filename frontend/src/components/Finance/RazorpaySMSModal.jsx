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
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
            <div className="bg-[#0d0f11] border border-gray-800 w-full max-w-md rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(6,182,212,0.1)] flex flex-col transition-all duration-500">
                <div className="p-8 border-b border-gray-800 bg-gradient-to-r from-orange-500/10 via-transparent to-transparent flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Razorpay <span className="text-orange-500">SMS PAY</span></h2>
                        <div className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">{admissionType} Admission Support</div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-xl transition-colors text-gray-500 hover:text-white">
                        <FaTimes />
                    </button>
                </div>

                <div className="p-10 flex flex-col items-center text-center">
                    {status === 'IDLE' && (
                        <>
                            <div className="w-20 h-20 bg-orange-500/10 rounded-3xl flex items-center justify-center text-orange-500 text-3xl mb-6 shadow-[0_0_30px_rgba(249,115,22,0.1)]">
                                <FaSms />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2 italic uppercase">Send Payment Link</h3>
                            <div className="text-gray-400 text-sm mb-8 space-y-1">
                                <p>A secure link for <b>₹{displayAmount.toLocaleString()}</b> will be sent to:</p>
                                <p className="text-white font-black">{studentInfo?.mobile || studentInfo?.mobileNum}</p>
                                {(paidExamFee > 0 || paidAdditionalThings > 0) && (
                                    <div className="pt-2 mt-2 border-t border-gray-800 text-[10px] uppercase font-bold text-gray-500">
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
                            <div className="w-20 h-20 bg-orange-500/10 rounded-3xl flex items-center justify-center text-orange-500 text-3xl mb-6 animate-pulse">
                                <FaSpinner className="animate-spin" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Generating Link...</h3>
                            <p className="text-gray-400 text-sm">Connecting to Razorpay API.</p>
                        </>
                    )}

                    {status === 'SENT' && (
                        <>
                            <div className="w-24 h-24 bg-orange-500/10 rounded-full flex items-center justify-center relative mb-8 shadow-[0_0_50px_rgba(249,115,22,0.2)]">
                                <div className="absolute inset-0 border-4 border-orange-500/20 rounded-full"></div>
                                <div className="absolute inset-0 border-t-4 border-orange-500 rounded-full animate-spin"></div>
                                <FaSms className="text-4xl text-orange-500" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Link <span className="text-orange-500">Sent!</span></h3>
                            <p className="text-gray-400 text-sm mb-6 uppercase font-bold tracking-tighter">Waiting for student to complete payment...</p>
                            
                            <div className="w-full bg-black/40 border border-gray-800 rounded-2xl p-4 mb-6 relative group">
                                <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 block text-left">Payment URL</div>
                                <div className="flex items-center gap-3">
                                    <FaLink className="text-orange-500 text-xs flex-shrink-0" />
                                    <div className="text-[10px] text-gray-300 font-mono truncate select-all">{shortUrl}</div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 w-full">
                                <div className="flex items-center justify-center gap-2 text-[9px] font-black text-orange-500/50 uppercase tracking-widest animate-pulse">
                                    <FaSyncAlt className="animate-spin-slow" /> Auto-refreshing status...
                                </div>
                                <button
                                    onClick={onClose}
                                    className="text-gray-500 hover:text-white font-black uppercase text-[10px] tracking-widest transition-colors mt-2"
                                >
                                    Close and Pay Later
                                </button>
                            </div>
                        </>
                    )}

                    {status === 'SUCCESS' && (
                        <>
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-emerald-500 text-4xl mb-6 animate-bounce shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                                <FaCheckCircle />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Payment <span className="text-emerald-500">Confirmed!</span></h3>
                            <p className="text-gray-400 text-sm mb-8">Transaction completed via SMS Link.</p>
                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-emerald-500 text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-500/20"
                            >
                                Done
                            </button>
                        </>
                    )}

                    {status === 'FAILED' && (
                        <>
                            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500 text-4xl mb-6">
                                <FaExclamationTriangle />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Payment <span className="text-red-500">Failed</span></h3>
                            <p className="text-red-500 text-sm mb-2 font-bold uppercase">{error}</p>
                            <p className="text-gray-500 text-xs mb-8">The payment link has expired or was cancelled.</p>
                            <button
                                onClick={() => setStatus('IDLE')}
                                className="w-full py-4 bg-gray-800 text-white font-black uppercase text-xs tracking-widest rounded-2xl border border-gray-700 hover:bg-gray-700 transition-all"
                            >
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
