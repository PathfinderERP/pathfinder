import mongoose from 'mongoose';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load models
import CentreSchema from '../models/Master_data/Centre.js';
import CashTransfer from '../models/Finance/CashTransfer.js';

dotenv.config({ path: './.env' });

const MONGO_URL = process.env.MONGO_URL || 'mongodb+srv://pathtex:pathtex@pathtex.ariihtc.mongodb.net/PATHFINDER_NEW';
const EXCEL_PATH = 'c:\\Users\\MALAY\\erp_1\\exports_data\\Cash_Balance.xlsx';

async function importData() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log('Connected to MongoDB');

        // 1. Find HAZRA H.O
        const toCentre = await CentreSchema.findOne({ centreName: /HAZRA H\.O/i });
        if (!toCentre) {
            console.error('Target center HAZRA H.O not found!');
            process.exit(1);
        }
        console.log(`Target Center: ${toCentre.centreName} (${toCentre._id})`);

        // 2. Read Excel
        const workbook = XLSX.readFile(EXCEL_PATH);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        console.log(`Read ${data.length} rows from Excel`);

        // 3. Prepare shared data
        const fixedUser = new mongoose.Types.ObjectId("69707dce6fe70a368363cf28");
        const fixedAccountNumber = Math.floor(100000000000 + Math.random() * 900000000000).toString();
        const receivedDate = new Date('2026-06-01');
        const debitedDate = new Date('2026-06-01');
        const fromDate = new Date('2026-04-29');
        const toDate = new Date('2026-04-30');
        const today = new Date();

        // 4. Get all centers for lookup
        const allCentres = await CentreSchema.find({});
        const centreMap = {};
        allCentres.forEach(c => {
            centreMap[c.centreName.trim().toUpperCase()] = c._id;
        });

        const transfers = [];
        let serialCounter = 1;

        for (const row of data) {
            const centreName = row['Centre']?.toString().trim().toUpperCase();
            const amount = parseFloat(row['Cash Balance']);

            if (!centreName || isNaN(amount)) continue;

            const fromCentreId = centreMap[centreName];
            if (!fromCentreId) {
                console.warn(`Center not found in DB: ${row['Centre']}`);
                continue;
            }

            const refNum = Math.random().toString(36).substring(2, 12).toUpperCase();
            const password = Math.random().toString(36).substring(2, 8).toUpperCase();

            transfers.push({
                fromCentre: fromCentreId,
                toCentre: toCentre._id,
                amount: amount,
                transferDate: today,
                receivedDate: receivedDate,
                debitedDate: debitedDate,
                status: 'RECEIVED',
                uniquePassword: password,
                serialNumber: serialCounter++,
                referenceNumber: refNum,
                receiptFile: '',
                accountNumber: fixedAccountNumber,
                transferredBy: fixedUser,
                receivedBy: fixedUser,
                fromDate: fromDate,
                toDate: toDate,
                remarks: 'Imported from Cash_Balance.xlsx'
            });
        }

        if (transfers.length > 0) {
            // We need to handle the serialNumber manually because we are bulk inserting and we want it to start from 1
            // But the model has a pre-save hook. Bulk insert might bypass it or we might have conflicts.
            // Let's check the current max serial number first.
            const lastTransfer = await CashTransfer.findOne({}, {}, { sort: { serialNumber: -1 } });
            let currentSerial = lastTransfer && lastTransfer.serialNumber ? lastTransfer.serialNumber : 0;
            
            transfers.forEach(t => {
                t.serialNumber = ++currentSerial;
            });

            await CashTransfer.insertMany(transfers);
            console.log(`Successfully imported ${transfers.length} cash transfers.`);
        } else {
            console.log('No valid data to import.');
        }

    } catch (error) {
        console.error('Import failed:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

importData();
