import twilio from 'twilio';
import jwt from 'jsonwebtoken';
import LeadManagement from '../../models/LeadManagement.js';
import User from '../../models/User.js';

const formatPhoneNumber = (num) => {
    if (!num) return '';
    const digits = num.replace(/\D/g, '');
    if (digits.length === 10) {
        return `+91${digits}`;
    }
    if (digits.length > 10 && !num.startsWith('+')) {
        return `+${digits}`;
    }
    return num.startsWith('+') ? num : `+${num}`;
};

export const initiateTwilioCall = async (req, res) => {
    try {
        const { leadId } = req.body;
        if (!leadId) {
            return res.status(400).json({ message: "Lead ID is required" });
        }

        const lead = await LeadManagement.findById(leadId);
        if (!lead) {
            return res.status(404).json({ message: "Lead not found" });
        }

        const agent = await User.findById(req.user._id);
        if (!agent) {
            return res.status(404).json({ message: "Agent profile not found" });
        }

        const agentNumber = formatPhoneNumber(agent.mobNum);
        const leadNumber = formatPhoneNumber(lead.phoneNumber || lead.secondPhoneNumber);

        if (!agentNumber) {
            return res.status(400).json({ message: "Your user profile does not have a valid mobile number configured" });
        }
        if (!leadNumber) {
            return res.status(400).json({ message: "Lead does not have a valid phone number configured" });
        }

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

        if (!accountSid || !authToken || !twilioNumber) {
            return res.status(500).json({ message: "Twilio credentials are not configured on the server" });
        }

        const client = twilio(accountSid, authToken);
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

        // Initiate call to the Agent first
        const call = await client.calls.create({
            url: `${backendUrl}/api/lead-management/call/twiml?leadNumber=${encodeURIComponent(leadNumber)}&leadId=${leadId}`,
            to: agentNumber,
            from: twilioNumber
        });

        res.status(200).json({ message: "Call initiated! Twilio is dialing your mobile number first.", callSid: call.sid });
    } catch (error) {
        console.error("Twilio Voice Call Error:", error);
        res.status(500).json({ message: "Failed to initiate call through Twilio", error: error.message });
    }
};

export const getCallTwiML = (req, res) => {
    try {
        const { leadNumber, leadId } = req.query;
        
        res.type('text/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Connecting you to the lead. Please wait.</Say>
    <Dial record="record-from-answer-dual" recordingStatusCallback="${process.env.BACKEND_URL || 'http://localhost:5000'}/api/lead-management/call/recording-callback?leadId=${leadId}">
        <Number>${leadNumber}</Number>
    </Dial>
</Response>`);
    } catch (error) {
        console.error("Error generating TwiML:", error);
        res.status(500).send("Error generating TwiML");
    }
};

export const handleRecordingCallback = async (req, res) => {
    try {
        const { leadId } = req.query;
        const { RecordingUrl, RecordingDuration } = req.body;

        console.log(`Twilio Recording Webhook received for lead: ${leadId}, URL: ${RecordingUrl}`);

        if (!leadId || !RecordingUrl) {
            return res.status(400).send("Missing leadId or RecordingUrl");
        }

        const lead = await LeadManagement.findById(leadId);
        if (!lead) {
            return res.status(404).send("Lead not found");
        }

        const recordingData = {
            audioUrl: RecordingUrl,
            fileName: `Twilio_Call_${new Date().toLocaleDateString("en-IN")}.mp3`,
            uploadedBy: "Twilio System",
            uploadedAt: new Date(),
            transcription: `Twilio call recording saved. Duration: ${RecordingDuration || 0} seconds.`,
            accuracyScore: 100,
            analysisData: {
                clarity: 100,
                pace: 100,
                confidence: 100
            }
        };

        lead.recordings.push(recordingData);
        await lead.save();

        res.status(200).send("Recording successfully attached");
    } catch (error) {
        console.error("Twilio Recording Webhook Error:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const proxyRecording = async (req, res) => {
    try {
        const { url, token } = req.query;
        if (!url) {
            return res.status(400).send("Missing recording URL");
        }
        if (!token) {
            return res.status(401).send("No authentication token provided");
        }

        // Verify the user token from query param
        try {
            jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).send("Invalid or expired authentication token");
        }

        // Only allow proxying requests to Twilio domains for security
        if (!url.startsWith("https://api.twilio.com/") && !url.startsWith("https://media.twilio.com/")) {
            return res.status(400).send("Invalid recording source");
        }

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;

        if (!accountSid || !authToken) {
            return res.status(500).send("Twilio credentials not configured");
        }

        // Fetch from Twilio using Basic Auth
        const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
        const response = await fetch(url, {
            headers: {
                Authorization: `Basic ${auth}`
            }
        });

        if (!response.ok) {
            return res.status(response.status).send("Failed to retrieve recording from Twilio");
        }

        // Set appropriate content type and stream it
        const contentType = response.headers.get("content-type") || "audio/mpeg";
        res.setHeader("Content-Type", contentType);
        
        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
    } catch (error) {
        console.error("Recording proxy error:", error);
        res.status(500).send("Error proxying recording");
    }
};

export const getVoiceToken = async (req, res) => {
    try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const apiKey = process.env.TWILIO_API_KEY;
        const apiSecret = process.env.TWILIO_API_SECRET;
        const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

        if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
            return res.status(400).json({ message: "Twilio voice configurations are missing on the server" });
        }

        const AccessToken = twilio.jwt.AccessToken;
        const VoiceGrant = AccessToken.VoiceGrant;

        const identity = `agent_${req.user._id}`;
        const token = new AccessToken(accountSid, apiKey, apiSecret, { identity });
        
        const voiceGrant = new VoiceGrant({
            outgoingApplicationSid: twimlAppSid,
            incomingAllow: false
        });
        
        token.addGrant(voiceGrant);
        
        res.status(200).json({ token: token.toJwt() });
    } catch (error) {
        console.error("Twilio Voice Token Error:", error);
        res.status(500).json({ message: "Failed to generate voice access token", error: error.message });
    }
};

export const getVoiceTwiML = (req, res) => {
    try {
        const leadNumber = req.body.leadNumber || req.query.leadNumber;
        const leadId = req.body.leadId || req.query.leadId;

        console.log(`Voice TwiML request received. Lead Number: ${leadNumber}, Lead ID: ${leadId}`);

        res.type('text/xml');
        if (!leadNumber) {
            res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Error: Lead phone number was not provided.</Say>
</Response>`);
            return;
        }

        const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
        const recordingCallback = `${backendUrl}/api/lead-management/call/recording-callback?leadId=${leadId}`;

        res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial record="record-from-answer-dual" recordingStatusCallback="${recordingCallback}">
        <Number>${leadNumber}</Number>
    </Dial>
</Response>`);
    } catch (error) {
        console.error("Error generating voice TwiML:", error);
        res.status(500).send("Error generating TwiML");
    }
};
