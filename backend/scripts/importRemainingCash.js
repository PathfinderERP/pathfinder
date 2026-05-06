import mongoose from 'mongoose';
import XLSX from 'xlsx';
import dotenv from 'dotenv';

// Load models
import CentreSchema from '../models/Master_data/Centre.js';
import CashTransfer from '../models/Finance/CashTransfer.js';

dotenv.config({ path: './.env' });

const MONGO_URL = process.env.MONGO_URL;
const EXCEL_PATH = 'c:\\Users\\MALAY\\erp_1\\exports_data\\Cash_Balance.xlsx';

async function importRemaining() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log('Connected to MongoDB');

        const toCentre = await CentreSchema.findOne({ centreName: /HAZRA H\.O/i });
        const workbook = XLSX.readFile(EXCEL_PATH);
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        const fixedUser = new mongoose.Types.ObjectId("69707dce6fe70a368363cf28");
        const fixedAccountNumber = Math.floor(100000000000 + Math.random() * 900000000000).toString();
        const receivedDate = new Date('2026-06-01');
        const debitedDate = new Date('2026-06-01');
        const fromDate = new Date('2026-04-29');
        const toDate = new Date('2026-04-30');
        const today = new Date();

        const manualMap = {
            'BERHAMPORE': 'BERHAMPUR',
            'TARAKESHWAR': 'TARAKESWAR'
        };

        const centres = await CentreSchema.find({ centreName: { $in: ['BERHAMPUR', 'TARAKESWAR'] } });
        const dbCentreMap = {};
        centres.forEach(c => {
            dbCentreMap[c.centreName.trim().toUpperCase()] = c._id;
        });

        const lastTransfer = await CashTransfer.findOne({}, {}, { sort: { serialNumber: -1 } });
        let currentSerial = lastTransfer && lastTransfer.serialNumber ? lastTransfer.serialNumber : 0;

        const transfers = [];
        for (const row of data) {
            const excelName = row['Centre']?.toString().trim().toUpperCase();
            if (manualMap[excelName]) {
                const dbName = manualMap[excelName];
                const fromCentreId = dbCentreMap[dbName];
                const amount = parseFloat(row['Cash Balance']);

                if (fromCentreId && !isNaN(amount)) {
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
                        serialNumber: ++currentSerial,
                        referenceNumber: refNum,
                        receiptFile: '',
                        accountNumber: fixedAccountNumber,
                        transferredBy: fixedUser,
                        receivedBy: fixedUser,
                        fromDate: fromDate,
                        toDate: toDate,
                        remarks: 'Imported from Cash_Balance.xlsx (Manual Match)'
                    });
                }
            }
        }

        if (transfers.length > 0) {
            await CashTransfer.insertMany(transfers);
            console.log(`Successfully imported ${transfers.length} remaining cash transfers.`);
        } else {
            console.log('No remaining data to import.');
        }

    } catch (error) {
        console.error('Import failed:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

importRemaining();
