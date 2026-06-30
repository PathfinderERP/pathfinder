import mongoose from "mongoose";
import dotenv from "dotenv";
import { getDailyCollectionReportData } from "../services/dailyCollectionService.js";
import { getTransactionReport } from "../controllers/sales/transactionReportController.js";
import User from "../models/User.js";

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const superAdmin = await User.findOne({ role: /superadmin/i });
        if (!superAdmin) {
            console.log("SuperAdmin not found");
            return;
        }

        // Test 1: Daily Collection Report filtering
        console.log("\n--- Testing Daily Collection Report Default Centres ---");
        const dailyReport = await getDailyCollectionReportData({
            query: {},
            user: { id: superAdmin._id.toString(), role: "superAdmin" }
        });

        const dailyReportCentres = Object.keys(dailyReport.centreTargets);
        const dailyFranchiseOrPhsps = dailyReportCentres.filter(name => /franchise/i.test(name) || /phsps/i.test(name));
        console.log("Daily targets map size:", dailyReportCentres.length);
        console.log("Found franchise/PHSPS in daily target keys:", dailyFranchiseOrPhsps);

        // Test 2: Transaction Report filtering
        console.log("\n--- Testing Transaction Report Default Centres ---");
        // Mock res.status().json()
        let resData = null;
        const mockRes = {
            status: function(code) {
                return {
                    json: function(data) {
                        resData = data;
                        return this;
                    }
                };
            }
        };

        const mockReq = {
            query: {},
            user: {
                _id: superAdmin._id,
                id: superAdmin._id.toString(),
                role: "superAdmin"
            }
        };

        await getTransactionReport(mockReq, mockRes);
        
        if (resData) {
            const txCentres = resData.centreRevenue.map(c => c._id);
            const txFranchiseOrPhsps = txCentres.filter(name => name && (/franchise/i.test(name) || /phsps/i.test(name)));
            console.log("Transaction centreRevenue size:", txCentres.length);
            console.log("Found franchise/PHSPS in transaction revenue keys:", txFranchiseOrPhsps);

            const detailedCentres = Array.from(new Set(resData.detailedReport.map(r => r.centre).filter(Boolean)));
            const detailedFranchiseOrPhsps = detailedCentres.filter(name => /franchise/i.test(name) || /phsps/i.test(name));
            console.log("Transaction detailedReport distinct centres count:", detailedCentres.length);
            console.log("Found franchise/PHSPS in detailed report centres:", detailedFranchiseOrPhsps);
        } else {
            console.log("Failed to get transaction report data.");
        }

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

run();
