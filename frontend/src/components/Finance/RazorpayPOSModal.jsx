import React, { useState, useEffect } from 'react';
import { FaMobileAlt, FaCheckCircle, FaExclamationTriangle, FaSpinner, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';

const RazorpayPOSModal = ({ isOpen, onClose, amount, invoiceId, onPaymentSuccess, studentInfo, admissionId, admissionType }) => {
    const [status, setStatus] = useState('IDLE'); // IDLE, INITIATING, WAITING, SUCCESS, FAILED
    const [p2pRequestId, setP2pRequestId] = useState(null);
    const [manualTxnId, setManualTxnId] = useState("");
    const [deviceId, setDeviceId] = useState(localStorage.getItem('ezetap_device_id') || '');
    const [mode, setMode] = useState('CARD'); // CARD or UPI
    const [error, setError] = useState(null);
    const [timeLeft, setTimeLeft] = useState(180); // 3 minutes timer (machine gets 120s + buffer)
    const [timerExpired, setTimerExpired] = useState(false); // track timer end without cancelling
    const apiUrl = import.meta.env.VITE_API_URL;

    const [terminalInfo, setTerminalInfo] = useState(null);

    useEffect(() => {
        if (!isOpen) {
            setStatus('IDLE');
            setP2pRequestId(null);
            setManualTxnId("");
            setError(null);
            setTerminalInfo(null);
            setTimeLeft(180);
            setTimerExpired(false);
        }
    }, [isOpen]);

    // Timer logic — counts down but does NOT auto-cancel (machine may still be processing)
    useEffect(() => {
        let timer;
        if (status === 'WAITING' && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && status === 'WAITING') {
            // DO NOT cancel — the backend recovery job will pick up authorized payments.
            // Just show a warning and keep polling.
            setTimerExpired(true);
        }
        return () => clearInterval(timer);
    }, [status, timeLeft]);

    // Polling logic when waiting for payment — continues even after timer expires
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

                    // Update terminal message if available (Swipe Card, etc)
                    if (data.apiMessageText || data.status) {
                        setTerminalInfo({
                            message: data.apiMessageText || data.status,
                            time: data.txnTime || data.swipeTime || ""
                        });
                    }

                    if (data.status === 'AUTHORIZED' || data.status === 'SUCCESS') {
                        clearInterval(pollInterval);
                        setStatus('SUCCESS');
                        setTimerExpired(false);
                        // Wrap response to ensure p2pRequestId and method are always present
                        onPaymentSuccess({
                            ...data,
                            p2pRequestId: p2pRequestId,
                            method: "RAZORPAY_POS",
                            transactionId: data.transactionId || data.txnId || data.externalTransactionId || p2pRequestId
                        });
                    } else if (data.status === 'FAILED' || data.status === 'DECLINED' || data.status === 'EXPIRED' || data.status === 'CANCELLED') {
                        clearInterval(pollInterval);
                        setStatus('FAILED');
                        setError(data.errorMessage || `Payment ${data.status.toLowerCase()}`);
                    }
                } catch (err) {
                    console.error("Polling error:", err);
                }
            }, 3000); // Poll every 3 seconds for smoother UI
        }

        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [status, p2pRequestId, apiUrl, onPaymentSuccess]);

    const handleInitiate = async () => {
        if (deviceId) {
            localStorage.setItem('ezetap_device_id', deviceId);
        }
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
                    customerName: studentInfo?.name || "",
                    centerName: studentInfo?.centre || "",
                    mode: mode,
                    admissionId: admissionId,
                    admissionType: admissionType || "NORMAL"
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
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block text-left">Payment Mode</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setMode('CARD')}
                                        className={`py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest border transition-all ${mode === 'CARD' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-500 shadow-lg shadow-cyan-500/10' : 'bg-black/40 border-gray-800 text-gray-500 hover:border-gray-700'}`}
                                    >
                                        Card Payment
                                    </button>
                                    <button
                                        onClick={() => setMode('UPI')}
                                        className={`py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest border transition-all ${mode === 'UPI' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-500 shadow-lg shadow-cyan-500/10' : 'bg-black/40 border-gray-800 text-gray-500 hover:border-gray-700'}`}
                                    >
                                        UPI / QR
                                    </button>
                                </div>
                            </div>

                            <div className="w-full mb-8">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block text-left">POS Device ID (Optional - defaults to Centre's Code)</label>
                                <input
                                    type="text"
                                    value={deviceId}
                                    onChange={(e) => setDeviceId(e.target.value)}
                                    placeholder={`Leave blank to use ${studentInfo?.centre || "Centre"} Code`}
                                    className="w-full bg-black/40 border border-gray-800 rounded-2xl py-4 px-6 text-white text-md font-black outline-none focus:border-cyan-500/50 transition-all font-mono"
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
                                <div className="absolute inset-0 border-4 border-cyan-500/10 rounded-full"></div>
                                <svg className="absolute inset-0 w-24 h-24 -rotate-90">
                                    <circle
                                        cx="48"
                                        cy="48"
                                        r="46"
                                        fill="transparent"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        className="text-cyan-500 transition-all duration-1000"
                                        strokeDasharray="290"
                                        strokeDashoffset={290 - (290 * (timeLeft / 180))}
                                    />
                                </svg>
                                <FaMobileAlt className="text-4xl text-cyan-500 z-10" />
                            </div>

                            <div className="mb-4">
                                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-1">Waiting for <span className="text-cyan-500">POS</span></h3>
                                {!timerExpired ? (
                                    <div className="text-[14px] font-black text-cyan-400 font-mono tracking-widest">
                                        EXPIRES IN {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                                    </div>
                                ) : (
                                    <div className="text-[12px] font-black text-amber-400 font-mono tracking-widest animate-pulse">
                                        STILL CHECKING... PLEASE WAIT
                                    </div>
                                )}
                            </div>

                            {timerExpired ? (
                                <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-6">
                                    <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">⚠ Timer Expired — Still Waiting for Machine</div>
                                    <div className="text-xs text-gray-400">If you completed the payment on the machine, it will be automatically recorded. Do not close this window yet.</div>
                                </div>
                            ) : (
                                <p className="text-gray-400 text-xs mb-6 max-w-xs uppercase font-black tracking-widest opacity-60">Please complete the transaction on the machine before the timer ends.</p>
                            )}

                            {terminalInfo && (
                                <div className="w-full bg-cyan-500/5 border border-cyan-500/10 rounded-2xl p-4 mb-6 animate-in slide-in-from-top-2 duration-500 shadow-[0_0_40px_rgba(6,182,200,0.05)]">
                                    <div className="text-[9px] font-black text-cyan-500/50 uppercase tracking-widest mb-1">Live Terminal Feedback</div>
                                    <div className="text-sm font-black text-white uppercase italic break-words">{terminalInfo.message || "Ready for Swipe"}</div>
                                    {terminalInfo.time && <div className="text-[8px] text-gray-600 mt-2 font-mono uppercase tracking-[0.2em]">{terminalInfo.time}</div>}
                                </div>
                            )}

                            <div className="px-5 py-3 bg-gray-900 border border-gray-800 rounded-2xl text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-8 shadow-[0_0_20px_rgba(6,182,212,0.05)] flex items-center gap-3">
                                <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(6,182,212,1)]"></span>
                                Request ID: {p2pRequestId}
                            </div>

                            <div className="flex flex-col gap-4 w-full">
                                <button
                                    onClick={handleCancel}
                                    className="text-gray-500 hover:text-red-500 font-black uppercase text-[10px] tracking-widest transition-colors"
                                >
                                    Cancel Request
                                </button>

                                {timeLeft < 150 && (
                                    <div className="w-full space-y-4 animate-in fade-in zoom-in slide-in-from-bottom-4 duration-700 delay-300">
                                        <div className="text-center space-y-1">
                                            <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest block">
                                                Manual Transaction Sync
                                            </label>
                                            <div className="text-[8px] text-gray-500 uppercase font-black tracking-widest opacity-60">
                                                Enter ID from Machine Receipt
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            value={manualTxnId}
                                            onChange={(e) => setManualTxnId(e.target.value)}
                                            placeholder="EZETAP TXN ID"
                                            className="w-full bg-black/60 border border-amber-500/30 rounded-2xl py-4 px-6 text-white text-md font-black outline-none focus:border-amber-500/60 transition-all font-mono text-center shadow-[0_0_30px_rgba(245,158,11,0.05)] placeholder:text-gray-700"
                                        />
                                        <button
                                            onClick={() => {
                                                if (!manualTxnId.trim()) {
                                                    toast.warning("Please enter the Transaction ID manually.");
                                                    return;
                                                }
                                                if (window.confirm("Only use this if the machine has ALREADY generated a success bill. This will sync the payment without waiting for machine status.")) {
                                                    onPaymentSuccess({ 
                                                        status: 'AUTHORIZED', 
                                                        p2pRequestId, 
                                                        transactionId: manualTxnId.trim(),
                                                        method: "RAZORPAY_POS",
                                                        forced: true 
                                                    });
                                                }
                                            }}
                                            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-xs tracking-widest py-4 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                                        >
                                            Confirm & Sync Bill
                                        </button>
                                    </div>
                                )}
                            </div>
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
