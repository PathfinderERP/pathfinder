import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import LeadManagement from '../models/LeadManagement.js';
import User from '../models/User.js';

dotenv.config();

const runTest = async () => {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB successfully.");

        // 1. Find a test lead or create one if none exists
        let lead = await LeadManagement.findOne();
        if (!lead) {
            console.log("No leads found. Creating a temporary test lead...");
            lead = new LeadManagement({
                name: "Test EnableX Lead",
                email: "test_enablex@example.com",
                phoneNumber: "9876543210"
            });
            await lead.save();
        }
        const leadPhone = lead.phoneNumber || "9876543210";
        console.log(`Using Lead phone number: ${leadPhone}`);

        // 2. Find a user or create a temporary one to sign JWT
        let user = await User.findOne();
        if (!user) {
            console.log("No users found. Creating a temporary test user...");
            user = new User({
                name: "Temporary Test User",
                email: "temp_test_user@example.com",
                password: "hashedpassword",
                role: "superAdmin"
            });
            await user.save();
        }

        // Generate JWT token directly
        const jwtSecret = process.env.JWT_SECRET || "fallback_secret";
        const jwtToken = jwt.sign(
            { id: user._id, role: user.role, email: user.email },
            jwtSecret,
            { expiresIn: '1h' }
        );
        console.log("Generated test JWT Token directly using backend secret key.");

        // 3. Test token generation endpoint
        console.log("Requesting EnableX Voice token from /api/lead-management/call/token...");
        const tokenRes = await fetch('http://localhost:5000/api/lead-management/call/token', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${jwtToken}`
            }
        });

        if (!tokenRes.ok) {
            throw new Error(`Token fetch failed: ${tokenRes.statusText}`);
        }

        const tokenData = await tokenRes.json();
        console.log("Voice Token response:", JSON.stringify(tokenData, null, 2));

        // 4. Test outbound call initialization
        console.log(`Initiating call to ${leadPhone} via /api/lead-management/call/outbound-call...`);
        const callRes = await fetch('http://localhost:5000/api/lead-management/call/outbound-call', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify({ to: leadPhone })
        });

        if (!callRes.ok) {
            throw new Error(`Outbound call failed: ${callRes.statusText}`);
        }

        const callData = await callRes.json();
        console.log("Outbound Call response:", JSON.stringify(callData, null, 2));

        // 5. Test recording callback / webhook handling
        const mockCallSid = `test_enablex_call_sid_${Date.now()}`;
        console.log("Sending mock recording callback payload to /api/lead-management/call/recording-callback...");
        const callbackRes = await fetch('http://localhost:5000/api/lead-management/call/recording-callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                To: leadPhone,
                RecordingUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
                ConversationDuration: 45,
                CallSid: mockCallSid,
                Status: "completed"
            })
        });

        if (!callbackRes.ok) {
            throw new Error(`Callback failed: ${callbackRes.statusText}`);
        }

        const callbackData = await callbackRes.text();
        console.log("Callback response:", callbackData);

        // 6. Verify lead has the call recording attached
        console.log("Verifying lead database updates...");
        const updatedLead = await LeadManagement.findById(lead._id);
        const addedRecording = updatedLead.recordings.find(rec => rec.audioUrl === "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");

        if (addedRecording) {
            console.log("✅ SUCCESS: Recording is successfully attached to the lead!");
            console.log("Attached recording details:", JSON.stringify(addedRecording, null, 2));
        } else {
            console.error("❌ FAILURE: Recording was not found on the lead!");
        }

        await mongoose.disconnect();
        process.exit(addedRecording ? 0 : 1);
    } catch (error) {
        console.error("❌ Test script error:", error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

runTest();
