import dotenv from "dotenv";
dotenv.config();

// ============================================
// CHOOSE YOUR SMS GATEWAY BELOW
// Uncomment the one you want to use
// ============================================

// Option 1: TWILIO (Recommended for testing)
// npm install twilio
import twilio from 'twilio';

const SMS_GATEWAY = process.env.SMS_GATEWAY || 'TWILIO'; // Options: TWILIO, MSG91, FAST2SMS, MOCK

// ============================================
// TWILIO CONFIGURATION
// ============================================
let twilioClient;
if (SMS_GATEWAY === 'TWILIO') {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

    if (accountSid && authToken && twilioNumber) {
        twilioClient = twilio(accountSid, authToken);
        console.log('✅ Twilio SMS service initialized');
    } else {
        console.warn('⚠️  Twilio credentials missing. Using MOCK mode.');
    }
}

// ============================================
// SEND SMS FUNCTION
// ============================================
export const sendSMS = async (phoneNumber, message) => {
    try {
        // Format phone number (ensure +91 prefix for India)
        let formattedNumber = phoneNumber;
        if (!phoneNumber.startsWith('+')) {
            formattedNumber = `+91${phoneNumber}`;
        }

        console.log(`📱 Attempting to send SMS to ${formattedNumber}`);
        console.log(`📝 Message: ${message}`);

        // TWILIO Implementation
        if (SMS_GATEWAY === 'TWILIO' && twilioClient) {
            try {
                const result = await twilioClient.messages.create({
                    body: message,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: formattedNumber
                });

                console.log(`✅ SMS sent successfully via Twilio!`);
                console.log(`   Message SID: ${result.sid}`);
                console.log(`   Status: ${result.status}`);

                return {
                    success: true,
                    messageId: result.sid,
                    status: result.status,
                    timestamp: new Date(),
                    gateway: 'TWILIO'
                };
            } catch (twilioError) {
                console.error('❌ Twilio SMS Error:', twilioError.message);
                return {
                    success: false,
                    error: twilioError.message,
                    gateway: 'TWILIO'
                };
            }
        }

        // MSG91 Implementation
        if (SMS_GATEWAY === 'MSG91') {
            const authKey = process.env.MSG91_AUTH_KEY;
            const senderId = process.env.MSG91_SENDER_ID || 'PATHFN';

            if (!authKey) {
                throw new Error('MSG91_AUTH_KEY not configured');
            }

            const response = await fetch('https://api.msg91.com/api/v5/flow/', {
                method: 'POST',
                headers: {
                    'authkey': authKey,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    sender: senderId,
                    short_url: '0',
                    mobiles: formattedNumber.replace('+91', ''),
                    message: message
                })
            });

            const data = await response.json();
            
            if (response.ok && data.type === 'success') {
                console.log(`✅ SMS sent successfully via MSG91!`);
                return {
                    success: true,
                    messageId: data.message,
                    timestamp: new Date(),
                    gateway: 'MSG91'
                };
            } else {
                throw new Error(data.message || 'MSG91 API error');
            }
        }

        // FAST2SMS Implementation
        if (SMS_GATEWAY === 'FAST2SMS') {
            const apiKey = process.env.FAST2SMS_API_KEY;

            if (!apiKey) {
                throw new Error('FAST2SMS_API_KEY not configured');
            }

            const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
                method: 'POST',
                headers: {
                    'authorization': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    route: 'v3',
                    sender_id: 'PATHFN',
                    message: message,
                    language: 'english',
                    flash: 0,
                    numbers: formattedNumber.replace('+91', '')
                })
            });

            const data = await response.json();

            if (data.return && data.return === true) {
                console.log(`✅ SMS sent successfully via Fast2SMS!`);
                return {
                    success: true,
                    messageId: data.message_id,
                    timestamp: new Date(),
                    gateway: 'FAST2SMS'
                };
            } else {
                throw new Error(data.message || 'Fast2SMS API error');
            }
        }

        // MOCK Implementation (for testing without SMS gateway)
        console.log('📱 MOCK MODE - SMS not actually sent');
        console.log(`   To: ${formattedNumber}`);
        console.log(`   Message: ${message}`);
        console.log('');
        console.log('⚠️  To send real SMS:');
        console.log('   1. Choose an SMS gateway (Twilio, MSG91, or Fast2SMS)');
        console.log('   2. Add credentials to .env file');
        console.log('   3. Set SMS_GATEWAY in .env');
        console.log('   See SMS_GATEWAY_SETUP.md for details');
        
        return {
            success: true,
            messageId: `MOCK_${Date.now()}`,
            timestamp: new Date(),
            gateway: 'MOCK',
            note: 'SMS not actually sent - using MOCK mode'
        };

    } catch (error) {
        console.error('❌ Error sending SMS:', error.message);
        return {
            success: false,
            error: error.message,
            gateway: SMS_GATEWAY
        };
    }
};

// ============================================
// PAYMENT REMINDER SMS
// ============================================
export const sendPaymentReminder = async (studentName, phoneNumber, dueAmount, daysOverdue, dueDate) => {
    const message = daysOverdue > 0
        ? `Dear ${studentName}, Your payment of ₹${dueAmount} was due on ${new Date(dueDate).toLocaleDateString('en-IN')}. You are ${daysOverdue} day(s) overdue. Please pay immediately to avoid penalties. - Pathfinder ERP`
        : `Dear ${studentName}, Your payment of ₹${dueAmount} is due on ${new Date(dueDate).toLocaleDateString('en-IN')}. Please pay on time. - Pathfinder ERP`;
    
    return await sendSMS(phoneNumber, message);
};

// ============================================
// PAYMENT CONFIRMATION SMS
// ============================================
export const sendPaymentConfirmation = async (studentName, phoneNumber, amount, receiptNo) => {
    const message = `Dear ${studentName}, We have received your payment of ₹${amount}. Receipt No: ${receiptNo}. Thank you! - Pathfinder ERP`;
    return await sendSMS(phoneNumber, message);
};

// ============================================
// TEST SMS FUNCTION
// ============================================
export const sendTestSMS = async (phoneNumber) => {
    const message = `Hello! This is a test message from Pathfinder ERP. Your SMS system is working correctly! Time: ${new Date().toLocaleString('en-IN')}`;
    return await sendSMS(phoneNumber, message);
};
