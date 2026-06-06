import LeadManagement from '../../models/LeadManagement.js';
import User from '../../models/User.js';
import jwt from 'jsonwebtoken';

const formatPhoneNumber = (num) => {
    if (!num) return '';
    const digits = num.replace(/\D/g, '');
    if (digits.length === 10) {
        return `+91${digits}`; // EnableX typically expects standard international formatting
    }
    if (digits.length === 12 && digits.startsWith('91')) {
        return `+${digits}`;
    }
    return `+${digits}`;
};

const cleanPhoneNumber = (num) => {
    if (!num) return '';
    return num.replace(/\D/g, '').slice(-10); // Match last 10 digits
};

// Generates access token for EnableX WebClient WebRTC
export const getVoiceToken = async (req, res) => {
    try {
        const appId = process.env.ENABLEX_APP_ID;
        const appKey = process.env.ENABLEX_APP_KEY;

        const isMockMode = !appId || appId === 'your_enablex_app_id' || !appKey || appKey === 'your_enablex_app_key';

        if (isMockMode) {
            console.log("[EnableX Voice] Credentials missing or placeholder. Returning mock voice token.");
            return res.status(200).json({
                token: "mock-token",
                userId: req.user.email,
                isMock: true
            });
        }

        const domain = process.env.ENABLEX_DOMAIN || req.hostname;
        console.log(`[EnableX Voice] Requesting WebClient Token for domain: ${domain}`);

        const authString = Buffer.from(`${appId}:${appKey}`).toString('base64');
        let tokenResponse;
        try {
            tokenResponse = await fetch('https://api.enablex.io/voice/v1/webclient/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${authString}`
                },
                body: JSON.stringify({ domain })
            });
        } catch (fetchErr) {
            console.error('[EnableX Voice] API Connection failed, falling back to mock mode:', fetchErr.message);
            return res.status(200).json({
                token: "mock-token",
                userId: req.user.email,
                isMock: true,
                warning: "EnableX connection failed. operating in mock mode."
            });
        }

        if (!tokenResponse.ok) {
            const errText = await tokenResponse.text().catch(() => "No response text");
            console.error(`[EnableX Voice] Token generation failed with status ${tokenResponse.status}:`, errText);
            console.warn('[EnableX Voice] Falling back to mock voice token.');
            return res.status(200).json({
                token: "mock-token",
                userId: req.user.email,
                isMock: true,
                warning: `EnableX API returned status ${tokenResponse.status}. Operating in Mock Mode.`
            });
        }

        let tokenData;
        try {
            tokenData = await tokenResponse.json();
        } catch (jsonErr) {
            console.error('[EnableX Voice] JSON parsing failed for token response:', jsonErr.message);
            return res.status(200).json({
                token: "mock-token",
                userId: req.user.email,
                isMock: true,
                warning: "EnableX response was invalid JSON. Operating in Mock Mode."
            });
        }

        res.status(200).json({
            token: tokenData.token,
            userId: req.user.email
        });
    } catch (error) {
        console.error("EnableX Voice Token Error:", error);
        // Fallback to mock mode even on uncaught errors
        return res.status(200).json({
            token: "mock-token",
            userId: req?.user?.email || "mock-user",
            isMock: true,
            warning: error.message
        });
    }
};

// Initiates outbound call via EnableX Voice API
export const initiateEnablexCall = async (req, res) => {
    try {
        const { to } = req.body;
        if (!to) {
            return res.status(400).json({ message: "Recipient number (to) is required" });
        }

        const appId = process.env.ENABLEX_APP_ID;
        const appKey = process.env.ENABLEX_APP_KEY;
        const fromNumber = process.env.ENABLEX_FROM_NUMBER;

        const isMockMode = !appId || appId === 'your_enablex_app_id' || !appKey || appKey === 'your_enablex_app_key';

        if (isMockMode) {
            console.log(`[EnableX Voice] Mock Mode: Initiating mock outbound call to: ${to}`);
            return res.status(200).json({
                isMock: true,
                Call: {
                    Sid: "mock_call_sid_" + Date.now(),
                    From: req.user.email,
                    To: to,
                    Status: "in-progress"
                }
            });
        }

        const formattedTo = formatPhoneNumber(to);
        const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.headers.host}`;
        const eventUrl = `${backendUrl}/api/lead-management/call/recording-callback`;

        const authString = Buffer.from(`${appId}:${appKey}`).toString('base64');
        const payload = {
            name: "outbound-call",
            from: fromNumber || "03344069212",
            to: [formattedTo],
            action_on_connect: {
                play: {
                    text: "Connecting your call from Pathfinder CRM.",
                    language: "en-US",
                    voice: "female"
                }
            },
            event_url: eventUrl
        };

        console.log(`[EnableX Voice] Placing call to: ${formattedTo} using events url: ${eventUrl}`);

        let response;
        try {
            response = await fetch('https://api.enablex.io/voice/v1/call', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${authString}`
                },
                body: JSON.stringify(payload)
            });
        } catch (fetchErr) {
            console.error('[EnableX Voice] Outbound call API connection failed. Placing mock call:', fetchErr.message);
            return res.status(200).json({
                isMock: true,
                Call: {
                    Sid: "mock_call_sid_" + Date.now(),
                    From: req.user.email,
                    To: to,
                    Status: "in-progress"
                },
                warning: "EnableX connection failed. Placed mock call."
            });
        }

        if (!response.ok) {
            const errText = await response.text().catch(() => "No response text");
            console.error(`[EnableX Voice] Outbound call API failed with status ${response.status}:`, errText);
            return res.status(200).json({
                isMock: true,
                Call: {
                    Sid: "mock_call_sid_" + Date.now(),
                    From: req.user.email,
                    To: to,
                    Status: "in-progress"
                },
                warning: `EnableX API returned status ${response.status}. Placed mock call.`
            });
        }

        let responseData;
        try {
            responseData = await response.json();
        } catch (jsonErr) {
            console.error('[EnableX Voice] Outbound call failed to parse response JSON:', jsonErr.message);
            const rawBody = await response.text().catch(() => "");
            console.error('[EnableX Voice] Raw Response body:', rawBody);
            return res.status(200).json({
                isMock: true,
                Call: {
                    Sid: "mock_call_sid_" + Date.now(),
                    From: req.user.email,
                    To: to,
                    Status: "in-progress"
                },
                warning: "EnableX response was invalid JSON. Placed mock call."
            });
        }

        console.log('[EnableX Voice] Outbound call placed successfully:', responseData);
        res.status(200).json(responseData);

    } catch (error) {
        console.error("EnableX Outbound Call Error:", error);
        return res.status(200).json({
            isMock: true,
            Call: {
                Sid: "mock_call_sid_" + Date.now(),
                From: req?.user?.email || "mock-user",
                To: to,
                Status: "in-progress"
            },
            warning: error.message
        });
    }
};

// Handles callbacks/webhooks from EnableX (events and recording URLs)
export const handleRecordingCallback = async (req, res) => {
    try {
        console.log("[EnableX Webhook] Received event payload:", JSON.stringify(req.body));

        // 1. Support both EnableX webhook fields and mock payloads from frontend
        const eventType = req.body.event || req.body.type || req.body.Status;
        const voiceId = req.body.voice_id || req.body.call_id || req.body.CallSid;
        const recipient = req.body.to || req.body.To;
        const recordingUrl = req.body.recording_url || req.body.url || req.body.RecordingUrl;
        const duration = parseInt(req.body.duration || req.body.ConversationDuration, 10) || 0;

        // 2. Handle call answered event: trigger recording start
        if (eventType === 'answered' && voiceId) {
            const appId = process.env.ENABLEX_APP_ID;
            const appKey = process.env.ENABLEX_APP_KEY;
            const isMockMode = !appId || appId === 'your_enablex_app_id' || !appKey || appKey === 'your_enablex_app_key';

            if (!isMockMode) {
                console.log(`[EnableX Webhook] Call answered. Triggering recording start for voiceId: ${voiceId}`);
                const authString = Buffer.from(`${appId}:${appKey}`).toString('base64');
                try {
                    const recRes = await fetch(`https://api.enablex.io/voice/v1/call/${voiceId}/record/start`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Basic ${authString}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    const recData = await recRes.json();
                    console.log(`[EnableX Webhook] Recording start response:`, recData);
                } catch (recErr) {
                    console.error(`[EnableX Webhook] Error starting recording:`, recErr);
                }
            }
        }

        // 3. Handle recording completion or mock callback
        if (recordingUrl && recipient) {
            const cleanTo = cleanPhoneNumber(recipient);
            if (!cleanTo) {
                return res.status(400).send("Invalid phone number");
            }

            const lead = await LeadManagement.findOne({
                $or: [
                    { phoneNumber: { $regex: cleanTo } },
                    { secondPhoneNumber: { $regex: cleanTo } }
                ]
            });

            if (!lead) {
                console.warn(`[EnableX Webhook] Lead not found for phone number: ${recipient}`);
                return res.status(404).send("Lead not found");
            }

            const recordingData = {
                audioUrl: recordingUrl,
                fileName: `EnableX_Call_${new Date().toLocaleDateString("en-IN")}.mp3`,
                uploadedBy: "EnableX System",
                uploadedAt: new Date(),
                transcription: `EnableX call recording saved. Duration: ${duration} seconds.`,
                accuracyScore: 100,
                analysisData: {
                    clarity: 100,
                    pace: 100,
                    confidence: 100
                }
            };

            lead.recordings.push(recordingData);
            await lead.save();

            console.log(`[EnableX Webhook] Attached recording to lead: ${lead._id}`);
            return res.status(200).send("Recording successfully attached");
        }

        res.status(200).send("Event processed");
    } catch (error) {
        console.error("[EnableX Webhook] Error processing recording callback:", error);
        res.status(500).send("Internal Server Error");
    }
};

// Proxies EnableX recording files securely to the client
export const proxyRecording = async (req, res) => {
    try {
        const { url, token } = req.query;
        if (!url) {
            return res.status(400).send("Missing recording URL");
        }
        if (!token) {
            return res.status(401).send("No authentication token provided");
        }

        // Verify the user token
        try {
            jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).send("Invalid or expired authentication token");
        }

        // Ensure we only proxy to EnableX domains or allowed resources (including mock local urls/examples)
        const parsedUrl = new URL(url);
        const isAllowed = parsedUrl.hostname.endsWith("enablex.io") || 
                          parsedUrl.hostname.includes("soundhelix.com") || 
                          process.env.NODE_ENV === 'development';

        if (!isAllowed) {
            return res.status(400).send("Invalid recording source");
        }

        const appId = process.env.ENABLEX_APP_ID;
        const appKey = process.env.ENABLEX_APP_KEY;
        const isMockMode = !appId || appId === 'your_enablex_app_id' || !appKey || appKey === 'your_enablex_app_key';

        let response;
        if (isMockMode || parsedUrl.hostname.includes("soundhelix.com")) {
            // For mock mode or test sound files, fetch directly without credentials
            response = await fetch(url);
        } else {
            const auth = Buffer.from(`${appId}:${appKey}`).toString("base64");
            response = await fetch(url, {
                headers: {
                    Authorization: `Basic ${auth}`
                }
            });
        }

        if (!response.ok) {
            return res.status(response.status).send("Failed to retrieve recording file");
        }

        const contentType = response.headers.get("content-type") || "audio/mpeg";
        res.setHeader("Content-Type", contentType);

        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
    } catch (error) {
        console.error("[Recording Proxy] Proxy error:", error);
        res.status(500).send("Error proxying recording");
    }
};
