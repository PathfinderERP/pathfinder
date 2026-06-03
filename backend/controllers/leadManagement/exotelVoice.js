import LeadManagement from '../../models/LeadManagement.js';
import User from '../../models/User.js';
import jwt from 'jsonwebtoken';

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

const cleanPhoneNumber = (num) => {
    if (!num) return '';
    return num.replace(/\D/g, '').slice(-10); // Match last 10 digits
};

// Generates access token for Exotel CRM WebSDK and registers user if not registered
export const getVoiceToken = async (req, res) => {
    try {
        const accountSid = process.env.EXOTEL_ACCOUNT_SID;
        const apiKey = process.env.EXOTEL_API_KEY;
        const apiToken = process.env.EXOTEL_API_TOKEN;
        
        const customerId = process.env.EXOTEL_CUSTOMER_ID || accountSid;
        const customerSecret = process.env.EXOTEL_CUSTOMER_SECRET || apiToken;

        if (!customerId || !customerSecret) {
            return res.status(400).json({ 
                message: "Exotel voice configurations are missing on the server (Customer ID or Customer Secret)" 
            });
        }

        const tokenUrl = 'https://integrationscore.mum1.exotel.com/v2/integrations/token';
        
        // 1. Fetch Customer Token (needed for user registration admin API)
        console.log(`[Exotel Voice] Requesting Customer Token from ${tokenUrl} for customer: ${customerId}`);
        const customerTokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                Id: customerId,
                Secret: customerSecret,
                Entity: 'customer'
            })
        });

        const customerTokenData = await customerTokenResponse.json();

        if (!customerTokenResponse.ok || customerTokenData.Status === 'Failed') {
            console.error('[Exotel Voice] Customer Token generation failed:', customerTokenData);
            return res.status(500).json({ 
                message: "Failed to generate Exotel customer token", 
                error: customerTokenData.Error || 'Unknown error' 
            });
        }

        const customerToken = customerTokenData.Data;

        // 2. Resolve App ID and App Secret.
        // We will try to fetch from env first. If not found or if it's not a valid UUID, we search/create programmatically.
        let appId = process.env.EXOTEL_APP_ID;
        let appSecret = process.env.EXOTEL_APP_SECRET;

        const isUuid = (val) => val && val.length === 36 && val.includes('-');

        if (!isUuid(appId)) {
            console.log('[Exotel Voice] App ID not configured as UUID in .env. Searching for existing integration app...');
            const appsUrl = 'https://integrationscore.mum1.exotel.com/v2/integrations/app';
            const appsRes = await fetch(appsUrl, {
                method: 'GET',
                headers: {
                    'Authorization': customerToken,
                    'Content-Type': 'application/json'
                }
            });
            
            const appsData = await appsRes.json();
            let foundApp = null;
            if (appsData.Data && Array.isArray(appsData.Data)) {
                foundApp = appsData.Data.find(a => a.AppName === 'Pathfinder CRM Calling');
            }

            if (foundApp) {
                console.log(`[Exotel Voice] Found existing app: ${foundApp.AppID}`);
                appId = foundApp.AppID;
                appSecret = foundApp.AppSecret;
            } else {
                console.log('[Exotel Voice] Creating new integration application: Pathfinder CRM Calling');
                const createAppRes = await fetch(appsUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': customerToken,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        AppName: 'Pathfinder CRM Calling',
                        ExotelAccountSid: accountSid,
                        ExotelApiKey: apiKey,
                        ExotelApiToken: apiToken,
                        ExotelDomain: 'mumbai',
                        IsActive: true
                    })
                });
                const createAppData = await createAppRes.json();
                if (createAppRes.ok && createAppData.Status === 'Success' && createAppData.Data) {
                    appId = createAppData.Data.AppID;
                    appSecret = createAppData.Data.AppSecret;
                    console.log(`[Exotel Voice] Registered new application. AppID: ${appId}`);
                } else {
                    console.error('[Exotel Voice] App registration failed:', createAppData);
                    return res.status(500).json({
                        message: "Failed to automatically register WebRTC Application",
                        error: createAppData.Error || 'Unknown error'
                    });
                }
            }
        }

        const userId = req.user.email;

        // Note: Individual agent user registration is handled automatically when they are mapped via the User Mapping API below.

        // 4. Fetch App Token (needed by the frontend CRM WebSDK to load app settings & initialize)
        console.log(`[Exotel Voice] Requesting App Token from ${tokenUrl} for App: ${appId}`);
        const appTokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                Id: appId,
                Secret: appSecret,
                Entity: 'app'
            })
        });

        const appTokenData = await appTokenResponse.json();

        if (!appTokenResponse.ok || appTokenData.Status === 'Failed') {
            console.error('[Exotel Voice] App Token generation failed:', appTokenData);
            return res.status(500).json({ 
                message: "Failed to generate Exotel App Token for the frontend WebSDK", 
                error: appTokenData.Error || 'Unknown error' 
            });
        }

        const appToken = appTokenData.Data;

        // 5. Ensure App Settings exist (avoiding SDK 404 blocker on GET /v2/integrations/app_setting)
        console.log(`[Exotel Voice] Verifying app settings for App: ${appId}`);
        const settingsUrl = 'https://integrationscore.mum1.exotel.com/v2/integrations/app_setting';
        try {
            const settingsRes = await fetch(settingsUrl, {
                method: 'GET',
                headers: {
                    'Authorization': appToken,
                    'Content-Type': 'application/json'
                }
            });
            if (settingsRes.status === 404) {
                console.log('[Exotel Voice] App Settings not found (404). Creating default app setting...');
                await fetch(settingsUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': appToken,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        Key: 'webrtc_enabled',
                        Value: 'true'
                    })
                });
            }
        } catch (settingsErr) {
            console.warn('[Exotel Voice] Warning checking/creating app settings:', settingsErr.message);
        }

        // 6. Ensure User Mapping exists (linking AppUserId to Exotel Virtual Number)
        console.log(`[Exotel Voice] Creating/Updating User Mapping for user: ${userId}`);
        const userMappingUrl = 'https://integrationscore.mum1.exotel.com/v2/integrations/usermapping?entity=app';
        try {
            // First check if user mapping already exists
            const checkUrl = `https://integrationscore.mum1.exotel.com/v2/integrations/usermapping?user_id=${encodeURIComponent(userId)}`;
            const checkRes = await fetch(checkUrl, {
                method: 'GET',
                headers: { 'Authorization': appToken }
            });

            let mappingExists = false;
            if (checkRes.ok) {
                const checkData = await checkRes.json();
                if (checkData.Status === 'Success' && checkData.Data && checkData.Data.IsActive) {
                    const virtualNumber = process.env.EXOTEL_VIRTUAL_NUMBER || '08047190000';
                    const cleanedVirtualNumber = virtualNumber.replace(/[^0-9]/g, '');
                    const cleanedConfiguredNumber = (checkData.Data.VirtualNumber || '').replace(/[^0-9]/g, '');
                    if (cleanedVirtualNumber === cleanedConfiguredNumber) {
                        console.log('[Exotel Voice] Active user mapping already exists with correct virtual number. Skipping recreation.');
                        mappingExists = true;
                    }
                }
            }

            if (!mappingExists) {
                try {
                    const oldUserId = `agent_${req.user._id}`;
                    const newUserId = req.user.email;
                    console.log(`[Exotel Voice] Cleaning stale mappings for: ${oldUserId}, ${newUserId}`);
                    await fetch(`https://integrationscore.mum1.exotel.com/v2/integrations/users/${oldUserId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': appToken }
                    });
                    await fetch(`https://integrationscore.mum1.exotel.com/v2/integrations/users/${newUserId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': appToken }
                    });
                } catch (delErr) {
                    console.warn('[Exotel Voice] Warning during user mapping cleanup:', delErr.message);
                }

                const virtualNumber = process.env.EXOTEL_VIRTUAL_NUMBER || '08047190000';
                const mappingResponse = await fetch(userMappingUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': appToken
                    },
                    body: JSON.stringify([
                        {
                            AppUserId: userId,
                            AppUsername: req.user.name || 'Agent User',
                            Email: req.user.email || 'agent@pathfinder.com',
                            ExotelAccountSid: accountSid,
                            ExotelUserName: req.user.name || 'Agent User',
                            VirtualNumber: virtualNumber
                        }
                    ])
                });

                const mappingData = await mappingResponse.json();
                console.log('[Exotel Voice] User Mapping Response:', mappingData);
            }
        } catch (mapError) {
            console.warn('[Exotel Voice] User mapping warning:', mapError.message);
        }

        // Return App Token (needed by SDK to call /v2/integrations/app) and userId to client
        res.status(200).json({ 
            token: appToken,
            userId: userId
        });
    } catch (error) {
        console.error("Exotel Voice Token Error:", error);
        res.status(500).json({ 
            message: "Failed to generate voice access token", 
            error: error.message 
        });
    }
};

// Handles recording status callback webhook from Exotel
export const handleRecordingCallback = async (req, res) => {
    try {
        // Exotel POST parameters: To, RecordingUrl, ConversationDuration, CallSid, Status
        const { To, RecordingUrl, ConversationDuration, CallSid, Status } = req.body;

        console.log(`[Exotel Webhook] Received call callback: Sid ${CallSid}, To: ${To}, Status: ${Status}`);

        if (!To || !RecordingUrl) {
            return res.status(400).send("Missing recipient number (To) or RecordingUrl");
        }

        const cleanTo = cleanPhoneNumber(To);
        if (!cleanTo) {
            return res.status(400).send("Invalid phone number");
        }

        // Find the lead corresponding to this call recipient
        const lead = await LeadManagement.findOne({
            $or: [
                { phoneNumber: { $regex: cleanTo } },
                { secondPhoneNumber: { $regex: cleanTo } }
            ]
        });

        if (!lead) {
            console.warn(`[Exotel Webhook] Lead not found for phone number: ${To}`);
            return res.status(404).send("Lead not found");
        }

        const duration = parseInt(ConversationDuration, 10) || 0;
        const recordingData = {
            audioUrl: RecordingUrl,
            fileName: `Exotel_Call_${new Date().toLocaleDateString("en-IN")}.mp3`,
            uploadedBy: "Exotel System",
            uploadedAt: new Date(),
            transcription: `Exotel call recording saved. Duration: ${duration} seconds.`,
            accuracyScore: 100,
            analysisData: {
                clarity: 100,
                pace: 100,
                confidence: 100
            }
        };

        lead.recordings.push(recordingData);
        await lead.save();

        console.log(`[Exotel Webhook] Attached recording to lead: ${lead._id}`);
        res.status(200).send("Recording successfully attached");
    } catch (error) {
        console.error("[Exotel Webhook] Error processing recording callback:", error);
        res.status(500).send("Internal Server Error");
    }
};

// Securely proxies Exotel and legacy Twilio call recording files to the frontend
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

        // Ensure we only proxy to Exotel domains
        const parsedUrl = new URL(url);
        const isExotel = parsedUrl.hostname.endsWith("exotel.com") || parsedUrl.hostname.endsWith("exotel.in");

        if (!isExotel) {
            return res.status(400).send("Invalid recording source");
        }

        const apiKey = process.env.EXOTEL_API_KEY;
        const apiToken = process.env.EXOTEL_API_TOKEN;
        if (!apiKey || !apiToken) {
            return res.status(500).send("Exotel credentials not configured on the server");
        }
        const auth = Buffer.from(`${apiKey}:${apiToken}`).toString("base64");
        const response = await fetch(url, {
            headers: {
                Authorization: `Basic ${auth}`
            }
        });

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
