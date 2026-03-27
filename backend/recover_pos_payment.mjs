/**
 * One-time POS Payment Recovery Script
 * Run this to recover the payment from 2026-03-27 that was authorized on the
 * Razorpay POS machine but not reflected in the ERP.
 * 
 * Usage: node recover_pos_payment.mjs
 */

import "dotenv/config";
import mongoose from "mongoose";
import { recoverPendingPosPayments } from "./services/posRecoveryService.js";

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
    console.error("❌ MONGO_URL not found in .env — make sure .env is in the backend folder");
    process.exit(1);
}

console.log("🔗 Connecting to MongoDB...");
await mongoose.connect(MONGO_URL, { family: 4 });
console.log("✅ Connected. Running POS recovery...\n");

// The recovery service checks all WAITING/CANCELLED transactions from last 30 minutes.
// Since this payment is older, we need to directly check the specific transaction.

import PosTransaction from "./models/Payment/PosTransaction.js";

// Look for transactions from today that are still WAITING or CANCELLED
const startOfDay = new Date("2026-03-27T00:00:00+05:30");
const endOfDay = new Date("2026-03-27T23:59:59+05:30");

const todayTxns = await PosTransaction.find({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
}).sort({ createdAt: -1 });

if (todayTxns.length === 0) {
    console.log("ℹ No POS transactions found for today (2026-03-27).");
} else {
    console.log(`📋 Found ${todayTxns.length} transaction(s) for today:`);
    todayTxns.forEach(t => {
        console.log(`  - ID: ${t.p2pRequestId} | Status: ${t.status} | Amount: ₹${t.amount} | Admission: ${t.admissionId || 'N/A'} | Time: ${t.createdAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    });

    // Temporarily extend the recovery window to cover today's transactions
    const waitingOrCancelled = todayTxns.filter(t => ["WAITING", "CANCELLED"].includes(t.status));
    
    if (waitingOrCancelled.length > 0) {
        console.log(`\n🔄 Attempting to recover ${waitingOrCancelled.length} unresolved transaction(s) from Ezetap...\n`);
        
        // Temporarily modify to check today's transactions
        for (const tx of waitingOrCancelled) {
            const getBaseUrl = () => process.env.EZETAP_MODE === 'production'
                ? "https://www.ezetap.com/api/3.0/p2padapter"
                : "https://demo.ezetap.com/api/3.0/p2padapter";

            const payload = {
                appKey: process.env.EZETAP_APP_KEY,
                username: process.env.EZETAP_USERNAME,
                p2pRequestId: tx.p2pRequestId
            };

            console.log(`  Checking ${tx.p2pRequestId} on Ezetap...`);
            
            try {
                const response = await fetch(`${getBaseUrl()}/status`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                console.log(`  Ezetap response:`, JSON.stringify(data, null, 2));
                
                if (data?.success && ["AUTHORIZED", "SUCCESS"].includes(data?.status)) {
                    // Reset to WAITING so the recovery service can process it
                    tx.status = "WAITING";
                    await tx.save();
                    console.log(`  ✅ Reset ${tx.p2pRequestId} to WAITING — running recovery...`);
                    await recoverPendingPosPayments();
                } else {
                    console.log(`  ℹ Status from Ezetap: ${data?.status || 'Unknown'} — no action needed.`);
                }
            } catch (err) {
                console.error(`  ❌ Error checking ${tx.p2pRequestId}:`, err.message);
            }
        }
    } else {
        console.log("\n✅ All today's transactions are already in a final state. No recovery needed.");
        console.log("   If you expected a payment to show in ERP but it's not there, the transaction");
        console.log("   may have been created with status AUTHORIZED already. Check above list.");
    }
}

await mongoose.disconnect();
console.log("\n✅ Done.");
