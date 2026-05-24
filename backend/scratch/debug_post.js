import "dotenv/config";
import mongoose from "mongoose";
import { createPlanner } from "../controllers/leadManagement/marketingPlannerController.js";
import User from "../models/User.js";

async function main() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected.");

        // Find a user to mock the authenticated session
        const mockUser = await User.findOne({ role: 'marketing' });
        if (!mockUser) {
            console.error("No marketing user found in the database to test with!");
            process.exit(1);
        }
        console.log(`Mocking request with user: ${mockUser.name} (${mockUser._id})`);

        // Mock req and res
        const req = {
            user: mockUser,
            body: {
                date: "2026-05-21",
                expectedLeadTarget: 40,
                expectedHotLeads: 5,
                activities: [
                    {
                        type: "School Visit",
                        place: "Test School",
                        time: "14:30",
                        actualTime: "02:30 PM",
                        expectedLeads: "10",
                        geoTagged: true,
                        latitude: 22.57,
                        longitude: 88.36,
                        locationName: "Kolkata",
                        photos: ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="],
                        submittedAt: "21 May 2026, 02:30 PM"
                    }
                ]
            }
        };

        const res = {
            statusCode: 200,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(data) {
                console.log(`Response Code: ${this.statusCode}`);
                console.log("Response Body:", JSON.stringify(data, null, 2));
            }
        };

        console.log("Running createPlanner...");
        await createPlanner(req, res);

    } catch (err) {
        console.error("FATAL ERROR IN TEST SCRIPT:", err);
    } finally {
        await mongoose.connection.close();
        console.log("DB connection closed.");
    }
}

main();
