import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FaMobileAlt, FaPaperPlane } from 'react-icons/fa';

const SMSTestPanel = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [sending, setSending] = useState(false);
    const apiUrl = import.meta.env.VITE_API_URL;

    const sendTestSMS = async () => {
        if (!phoneNumber || phoneNumber.length < 10) {
            toast.error('Please enter a valid 10-digit phone number');
            return;
        }

        setSending(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${apiUrl}/payment-reminder/test-sms`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ phoneNumber })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                toast.success(`Test SMS sent to ${phoneNumber}! Check your phone.`);
                console.log('SMS Result:', data.data);

                if (data.data.gateway === 'MOCK') {
                    toast.info('Using MOCK mode - SMS not actually sent. Configure SMS gateway in .env to send real SMS.', {
                        autoClose: 8000
                    });
                }
            } else {
                toast.error(data.message || 'Failed to send test SMS');
                console.error('SMS Error:', data);
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error sending test SMS');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="bg-[#1a1f24] p-6 rounded-xl border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
                <FaMobileAlt className="text-cyan-400 text-xl" />
                <h3 className="text-lg font-bold text-white">Test SMS Gateway</h3>
            </div>

            <p className="text-sm text-gray-400 mb-4">
                Send a test SMS to verify your SMS gateway configuration
            </p>

            <div className="flex gap-3">
                <input
                    type="tel"
                    placeholder="Enter phone number (10 digits)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500"
                    maxLength="10"
                />
                <button
                    onClick={sendTestSMS}
                    disabled={sending || phoneNumber.length < 10}
                    className="flex items-center gap-2 px-6 py-3 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <FaPaperPlane />
                    {sending ? 'Sending...' : 'Send Test SMS'}
                </button>
            </div>

            <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-400">
                    <strong className="text-cyan-400">Note:</strong> If using MOCK mode, SMS will only be logged to console.
                    To send real SMS, configure Twilio, MSG91, or Fast2SMS in your .env file.
                    <br />
                    <a
                        href="/SMS_QUICK_START.md"
                        target="_blank"
                        className="text-cyan-400 hover:text-cyan-300 underline mt-1 inline-block"
                    >
                        View Setup Guide →
                    </a>
                </p>
            </div>
        </div>
    );
};

export default SMSTestPanel;
