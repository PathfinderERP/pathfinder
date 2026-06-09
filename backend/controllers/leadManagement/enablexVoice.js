import LeadManagement from '../../models/LeadManagement.js';
import User from '../../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { EventEmitter } from 'events';

const callEvents = new EventEmitter();
const activeCalls = new Map(); // voiceId -> agentEmail
const apiHost = process.env.ENABLEX_API_HOST || 'api-qa.enablex.io';

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

// Generates dummy token for client-side to bypass WebRTC registration gracefully
export const getVoiceToken = async (req, res) => {
    try {
        return res.status(200).json({
            token: "mock-token",
            userId: req.user.email,
            isMock: true
        });
    } catch (error) {
        console.error("EnableX Voice Token Error:", error);
        return res.status(200).json({
            token: "mock-token",
            userId: req?.user?.email || "mock-user",
            isMock: true
        });
    }
};

// Initiates outbound call via EnableX Voice API and bridges it to agent mobile
export const initiateEnablexCall = async (req, res) => {
    try {
        const { to } = req.body;
        if (!to) {
            return res.status(400).json({ message: "Recipient number (to) is required" });
        }

        const agentPhone = req.user.mobNum;
        if (!agentPhone) {
            return res.status(400).json({ message: "Please configure your mobile number in your profile to bridge outbound calls." });
        }

        const appId = process.env.ENABLEX_APP_ID;
        const appKey = process.env.ENABLEX_APP_KEY;
        const fromNumber = process.env.ENABLEX_FROM_NUMBER;

        const isMockMode = !appId || appId === 'your_enablex_app_id' || !appKey || appKey === 'your_enablex_app_key';

        const formattedTo = formatPhoneNumber(to);
        const formattedAgentPhone = formatPhoneNumber(agentPhone);

        if (isMockMode) {
            console.log(`[EnableX Voice] Mock Mode: Initiating mock outbound call from ${fromNumber || "MockNum"} to ${formattedTo} bridged to ${formattedAgentPhone}`);
            const mockVoiceId = "mock_call_sid_" + Date.now();
            activeCalls.set(mockVoiceId, req.user.email);

            // Simulate events asynchronously for mock mode
            setTimeout(() => {
                callEvents.emit(`call_event:${req.user.email}`, {
                    state: 'connected',
                    voice_id: mockVoiceId,
                    isMock: true
                });
            }, 3000);

            return res.status(200).json({
                voice_id: mockVoiceId,
                status: 'initiated',
                isMock: true,
                Call: {
                    Sid: mockVoiceId,
                    From: req.user.email,
                    To: to,
                    Status: "in-progress"
                }
            });
        }

        const backendUrl = process.env.PUBLIC_WEBHOOK_URL || process.env.BACKEND_URL || `${req.protocol}://${req.headers.host}`;
        const eventUrl = `${backendUrl}/api/lead-management/call/recording-callback`;

        const authString = Buffer.from(`${appId}:${appKey}`).toString('base64');
        const payload = {
            name: "outbound-call-bridge",
            owner_ref: fromNumber,
            from: fromNumber || "+911169040030",
            to: formattedTo,
            auto_record: true,
            action_on_connect: {
                connect: {
                    from: fromNumber,
                    to: formattedAgentPhone
                }
            },
            event_url: eventUrl
        };

        console.log(`[EnableX Voice] Placing bridged call to: ${formattedTo} (Agent: ${formattedAgentPhone}) using events url: ${eventUrl}`);

        const response = await fetch(`https://${apiHost}/voice/v1/call`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${authString}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => "No response text");
            console.error(`[EnableX Voice] Outbound call API failed with status ${response.status}:`, errText);
            return res.status(response.status).json({ message: "Failed to initiate outbound call with EnableX", detail: errText });
        }

        const responseData = await response.json();
        console.log('[EnableX Voice] Outbound call placed successfully:', responseData);

        if (responseData.voice_id) {
            activeCalls.set(responseData.voice_id, req.user.email);
        }

        res.status(200).json(responseData);
    } catch (error) {
        console.error("EnableX Outbound Call Error:", error);
        res.status(500).json({ message: "Error initiating outbound call", error: error.message });
    }
};

// Handles callbacks/webhooks from EnableX (events and recording URLs)
export const handleRecordingCallback = async (req, res) => {
    try {
        console.log("[EnableX Webhook] Received event payload:", JSON.stringify(req.body));

        let eventBody = req.body;
        if (req.headers['x-algoritm'] !== undefined) {
            try {
                const key = crypto.createDecipher(req.headers['x-algoritm'], process.env.ENABLEX_APP_ID);
                let decryptedData = key.update(req.body.encrypted_data, req.headers['x-format'], req.headers['x-encoding']);
                decryptedData += key.final(req.headers['x-encoding']);
                eventBody = JSON.parse(decryptedData);
                console.log("[EnableX Webhook] Decrypted payload:", JSON.stringify(eventBody));
            } catch (decErr) {
                console.error("[EnableX Webhook] Failed to decrypt payload:", decErr.message);
            }
        }

        const eventType = eventBody.event || eventBody.type || eventBody.Status || eventBody.state;
        const voiceId = eventBody.voice_id || eventBody.call_id || eventBody.CallSid;
        const recipient = eventBody.to || eventBody.To;
        const recordingUrl = eventBody.recording_url || eventBody.url || eventBody.RecordingUrl;
        const duration = parseInt(eventBody.duration || eventBody.ConversationDuration, 10) || 0;

        // 1. Broadcast call state events to active SSE client
        if (voiceId) {
            const agentEmail = activeCalls.get(voiceId);
            if (agentEmail) {
                console.log(`[EnableX Webhook] Routing event '${eventType}' to agent ${agentEmail}`);
                callEvents.emit(`call_event:${agentEmail}`, eventBody);

                if (eventType === 'disconnected') {
                    activeCalls.delete(voiceId);
                }
            }
        }

        // 2. Handle call answered event: trigger recording start (fallback if auto_record didn't start)
        if (eventType === 'answered' && voiceId) {
            const appId = process.env.ENABLEX_APP_ID;
            const appKey = process.env.ENABLEX_APP_KEY;
            const isMockMode = !appId || appId === 'your_enablex_app_id' || !appKey || appKey === 'your_enablex_app_key';

            if (!isMockMode) {
                console.log(`[EnableX Webhook] Call answered. Triggering recording start for voiceId: ${voiceId}`);
                const authString = Buffer.from(`${appId}:${appKey}`).toString('base64');
                try {
                    const recRes = await fetch(`https://${apiHost}/voice/v1/call/${voiceId}/record/start`, {
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

        // 3. Handle recording completion and save metadata to Lead record
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
        console.error("[EnableX Webhook] Error processing callback:", error);
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

        try {
            jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).send("Invalid or expired authentication token");
        }

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

// SSE stream endpoint
export const getEventStream = async (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    const agentEmail = req.user.email;
    console.log(`[SSE] Agent ${agentEmail} connected to event-stream.`);

    // Send initial ping to establish connection
    res.write(`data: ${JSON.stringify({ type: "ping", status: "connected" })}\n\n`);

    const onCallEvent = (event) => {
        console.log(`[SSE] Forwarding event to agent ${agentEmail}:`, JSON.stringify(event));
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    callEvents.on(`call_event:${agentEmail}`, onCallEvent);

    req.on('close', () => {
        console.log(`[SSE] Agent ${agentEmail} disconnected from event-stream.`);
        callEvents.off(`call_event:${agentEmail}`, onCallEvent);
    });
};

// Programmatically hangs up/terminates call leg
export const hangupEnablexCall = async (req, res) => {
    try {
        const { voiceId } = req.body;
        if (!voiceId) {
            return res.status(400).json({ message: "voiceId is required to hang up call" });
        }

        const agentEmail = req.user.email;
        const mappedEmail = activeCalls.get(voiceId);

        if (mappedEmail && mappedEmail !== agentEmail) {
            return res.status(403).json({ message: "You are not authorized to terminate this call session" });
        }

        if (voiceId.startsWith("mock_call_sid_")) {
            console.log(`[EnableX Voice] Mock Mode: Hanging up call ${voiceId}`);
            activeCalls.delete(voiceId);
            callEvents.emit(`call_event:${agentEmail}`, {
                state: 'disconnected',
                voice_id: voiceId
            });
            return res.status(200).json({ message: "Mock call terminated successfully" });
        }

        const appId = process.env.ENABLEX_APP_ID;
        const appKey = process.env.ENABLEX_APP_KEY;
        const authString = Buffer.from(`${appId}:${appKey}`).toString('base64');

        console.log(`[EnableX Voice] Terminating call ${voiceId}`);
        const response = await fetch(`https://${apiHost}/voice/v1/call/${voiceId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Basic ${authString}`
            }
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => "No response text");
            console.error(`[EnableX Voice] Hang up call failed with status ${response.status}:`, errText);
            return res.status(response.status).json({ message: "Failed to hang up call with EnableX", detail: errText });
        }

        activeCalls.delete(voiceId);
        res.status(200).json({ message: "Call hung up successfully" });
    } catch (error) {
        console.error("EnableX Hangup Call Error:", error);
        res.status(500).json({ message: "Error hanging up call", error: error.message });
    }
};
