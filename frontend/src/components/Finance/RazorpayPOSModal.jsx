import React, { useState, useEffect } from 'react';
import { FaMobileAlt, FaCheckCircle, FaExclamationTriangle, FaSpinner, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';

const RazorpayPOSModal = ({ isOpen, onClose, amount, invoiceId, onPaymentSuccess, studentInfo }) => {
    const [status, setStatus] = useState('IDLE'); // IDLE, INITIATING, WAITING, SUCCESS, FAILED
    const [p2pRequestId, setP2pRequestId] = useState(null);
    const [deviceId, setDeviceId] = useState(localStorage.getItem('ezetap_device_id') || '');
    const [error, setError] = useState(null);
    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        if (!isOpen) {
            setStatus('IDLE');
            setP2pRequestId(null);
            setError(null);
        }
    }, [isOpen]);

    // Polling logic when waiting for payment
    useEffect(() => {
        let pollInterval;
        if (status === 'WAITING' && p2pRequestId) {
            pollInterval = setInterval(async () => {
                try {
                    const token = localStorage.getItem("token");
                    const response = await fetch(`${apiUrl}/payment/pos/status/${p2pRequestId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const data = await response.json();

                    if (data.status === 'AUTHORIZED' || data.status === 'SUCCESS') {
                        clearInterval(pollInterval);
                        setStatus('SUCCESS');
                        onPaymentSuccess(data);
                    } else if (data.status === 'FAILED' || data.status === 'DECLINED' || data.status === 'EXPIRED' || data.status === 'CANCELLED') {
                        clearInterval(pollInterval);
                        setStatus('FAILED');
                        setError(data.errorMessage || `Payment ${data.status.toLowerCase()}`);
                    }
                } catch (err) {
                    console.error("Polling error:", err);
                }
            }, 5000); // Poll every 5 seconds
        }

        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [status, p2pRequestId, apiUrl, onPaymentSuccess]);

    const handleInitiate = async () => {
        if (!deviceId) {
            toast.error("Please enter a Device ID");
            return;
        }

        localStorage.setItem('ezetap_device_id', deviceId);
        setStatus('INITIATING');
        setError(null);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/payment/pos/initiate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount,
                    externalRefNumber: invoiceId,
                    deviceId,
                    customerMobileNumber: studentInfo?.mobile || "",
                    customerEmail: studentInfo?.email || "",
                    customerName: studentInfo?.name || ""
                })
            });

            const data = await response.json();

            if (data.success) {
                setP2pRequestId(data.p2pRequestId);
                setStatus('WAITING');
            } else {
                setStatus('IDLE');
                setError(data.errorMessage || "Failed to initiate payment");
                toast.error(data.errorMessage || "Failed to initiate payment");
            }
        } catch (err) {
            console.error("Initiate error:", err);
            setStatus('IDLE');
            setError("Network error. Please try again.");
            toast.error("Network error");
        }
    };

    const handleCancel = async () => {
        if (!p2pRequestId) return;
        
        try {
            const token = localStorage.getItem("token");
            await fetch(`${apiUrl}/payment/pos/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ p2pRequestId, deviceId })
            });
            setStatus('IDLE');
            setP2pRequestId(null);
        } catch (err) {
            console.error("Cancel error:", err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
            <div className="bg-[#0d0f11] border border-gray-800 w-full max-w-md rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(6,182,212,0.1)] flex flex-col">
                <div className="p-8 border-b border-gray-800 bg-gradient-to-r from-cyan-500/10 via-transparent to-transparent flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Razorpay <span className="text-cyan-500">POS</span></h2>
                        <div className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Terminal Integration</div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-xl transition-colors text-gray-500 hover:text-white">
                        <FaTimes />
                    </button>
                </div>

                <div className="p-10 flex flex-col items-center text-center">
                    {status === 'IDLE' && (
                        <>
                            <div className="w-20 h-20 bg-cyan-500/10 rounded-3xl flex items-center justify-center text-cyan-500 text-3xl mb-6">
                                <FaMobileAlt />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Initiate POS Payment</h3>
                            <p className="text-gray-400 text-sm mb-8">Ready to send ₹{parseFloat(amount).toLocaleString()} to the POS machine.</p>
                            
                            <div className="w-full mb-8">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block text-left">POS Device ID</label>
                                <input
                                    type="text"
                                    value={deviceId}
                                    onChange={(e) => setDeviceId(e.target.value)}
                                    placeholder="Enter Terminal ID"
                                    className="w-full bg-black/40 border border-gray-800 rounded-2xl py-4 px-6 text-white text-md font-black outline-none focus:border-cyan-500/50 transition-all"
                                />
                            </div>

                            <button
                                onClick={handleInitiate}
                                className="w-full py-4 bg-gradient-to-r from-cyan-600 to-cyan-400 text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-cyan-500/20"
                            >
                                Send to Machine
                            </button>
                        </>
                    )}

                    {status === 'INITIATING' && (
                        <>
                            <div className="w-20 h-20 bg-cyan-500/10 rounded-3xl flex items-center justify-center text-cyan-500 text-3xl mb-6 animate-pulse">
                                <FaSpinner className="animate-spin" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Connecting...</h3>
                            <p className="text-gray-400 text-sm">Communicating with Razorpay Bridge.</p>
                        </>
                    )}

                    {status === 'WAITING' && (
                        <>
                            <div className="w-24 h-24 bg-cyan-500/10 rounded-full flex items-center justify-center relative mb-8">
                                <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full"></div>
                                <div className="absolute inset-0 border-t-4 border-cyan-500 rounded-full animate-spin"></div>
                                <FaMobileAlt className="text-4xl text-cyan-500" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Waiting for <span className="text-cyan-500">POS</span></h3>
                            <p className="text-gray-400 text-sm mb-2">Please complete the transaction on the machine.</p>
                            <div className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-xl text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-8">
                                Request ID: {p2pRequestId}
                            </div>
                            
                            <button
                                onClick={handleCancel}
                                className="text-gray-500 hover:text-red-500 font-black uppercase text-[10px] tracking-widest transition-colors"
                            >
                                Cancel Request
                            </button>
                        </>
                    )}

                    {status === 'SUCCESS' && (
                        <>
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-emerald-500 text-4xl mb-6 animate-bounce">
                                <FaCheckCircle />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Payment <span className="text-emerald-500">Received</span></h3>
                            <p className="text-gray-400 text-sm mb-8">Transaction has been authorized successfully.</p>
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
                            <p className="text-gray-500 text-xs mb-8">Something went wrong with the terminal transaction.</p>
                            <button
                                onClick={() => setStatus('IDLE')}
                                className="w-full py-4 bg-gray-800 text-white font-black uppercase text-xs tracking-widest rounded-2xl border border-gray-700 hover:bg-gray-700 transition-all"
                            >
                                Try Again
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RazorpayPOSModal;
