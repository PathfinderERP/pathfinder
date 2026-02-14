import mongoose from 'mongoose';
import XLSX from 'xlsx';
import 'dotenv/config';
import CentreTarget from './models/Sales/CentreTarget.js';
import CentreSchema from './models/Master_data/Centre.js';

const MONGO_URL = process.env.MONGO_URL;

async function importTargets() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(MONGO_URL);
        console.log('Connected.');

        // 1. Get all centres for mapping
        const centers = await CentreSchema.find({}, 'centreName _id');
        const centerMap = {};
        centers.forEach(c => {
            centerMap[c.centreName.trim().toUpperCase()] = c._id;
        });

        const yearlyFile = 'c:/Users/USER/erp_1/uploads/sales/Yearly_Target_Report_2025-2026.xlsx';
        const monthlyFile = 'c:/Users/USER/erp_1/uploads/sales/Monthly_Target_Report_2026_January.xlsx';

        // 2. Process January 2026 Monthly Data
        console.log(`\nProcessing monthly file: ${monthlyFile}`);
        const monthlyWB = XLSX.readFile(monthlyFile);
        const monthlyData = XLSX.utils.sheet_to_json(monthlyWB.Sheets[monthlyWB.SheetNames[0]], { range: 2 });

        let importedMonthly = 0;
        for (const row of monthlyData) {
            const centerName = row['Center Name']?.trim().toUpperCase();
            if (!centerName) continue;

            const centerId = centerMap[centerName];
            if (!centerId) {
                console.warn(`Center not found: ${centerName}`);
                continue;
            }

            const target = parseFloat(row['Target']) || 0;
            const achieved = parseFloat(row['Achieved']) || 0;
            const month = row['Month'] || 'January';
            const year = parseInt(row['Year']) || 2026;
            const financialYear = row['Financial Year'] || '2025-2026';

            await CentreTarget.findOneAndUpdate(
                { centre: centerId, year, month },
                {
                    centre: centerId,
                    financialYear,
                    year,
                    month,
                    targetAmount: target,
                    achievedAmount: achieved
                },
                { upsert: true, new: true }
            );
            importedMonthly++;
        }
        console.log(`Imported/Updated ${importedMonthly} monthly targets for January 2026.`);

        // 3. Process 2025-2026 Yearly Data (as "Annual" month)
        console.log(`\nProcessing yearly file: ${yearlyFile}`);
        const yearlyWB = XLSX.readFile(yearlyFile);
        const yearlyData = XLSX.utils.sheet_to_json(yearlyWB.Sheets[yearlyWB.SheetNames[0]], { range: 2 });

        let importedYearly = 0;
        for (const row of yearlyData) {
            const centerName = row['Center Name']?.trim().toUpperCase();
            if (!centerName) continue;

            const centerId = centerMap[centerName];
            if (!centerId) {
                console.warn(`Center not found: ${centerName}`);
                continue;
            }

            const target = parseFloat(row['Target']) || 0;
            const achieved = parseFloat(row['Achieved']) || 0;
            const financialYear = row['Financial Year'] || '2025-2026';

            // Use month "Annual" to represent the full year summary in the monthly schema
            await CentreTarget.findOneAndUpdate(
                { centre: centerId, financialYear, month: 'Annual' },
                {
                    centre: centerId,
                    financialYear,
                    year: 2025, // Using start year
                    month: 'Annual',
                    targetAmount: target,
                    achievedAmount: achieved
                },
                { upsert: true, new: true }
            );
            importedYearly++;
        }
        console.log(`Imported/Updated ${importedYearly} yearly summaries for 2025-2026.`);

        console.log('\nImport complete.');
        process.exit(0);
    } catch (error) {
        console.error('Import failed:', error);
        process.exit(1);
    }
}

importTargets();
