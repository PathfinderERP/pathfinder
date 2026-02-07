import mongoose from 'mongoose';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
import path from 'path';

dotenv.config();

const REPAIR_FILE_PATH = 'c:/Users/USER/erp_1/uploads/students/Lead_Import_Template (1).xlsx';
const OUTPUT_FILE_PATH = 'c:/Users/USER/erp_1/uploads/students/Lead_Import_Template_REPAIRED.xlsx';
const DEMO_SCHOOL_NAME = "Demo Public School";

const repairExcel = async () => {
    try {
        console.log('--- STARTING EXCEL REPAIR ---');

        // 1. Connect to Database
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        // 2. Fetch Telecallers
        const User = mongoose.model('User', new mongoose.Schema({ name: String, role: String }));
        const telecallers = await User.find({ role: 'telecaller' });
        const telecallerMap = new Map();
        telecallers.forEach(t => {
            telecallerMap.set(t.name.toLowerCase(), t.name);
        });
        console.log(`Fetched ${telecallers.length} telecallers for mapping`);

        // 3. Read Excel
        const workbook = XLSX.readFile(REPAIR_FILE_PATH);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        console.log(`Read ${data.length} rows from Excel`);

        let schoolFixes = 0;
        let agentFixes = 0;
        let agentsNotFound = new Set();

        // 4. Process Data
        const updatedData = data.map((row, index) => {
            const updatedRow = { ...row };

            // Fix School Name
            if (!row.SchoolName || row.SchoolName.toString().trim() === "") {
                updatedRow.SchoolName = DEMO_SCHOOL_NAME;
                schoolFixes++;
            }

            // Fix Lead Responsibility (Telecaller Name)
            if (row.LeadResponsibility) {
                const searchName = row.LeadResponsibility.toString().trim().toLowerCase();
                if (telecallerMap.has(searchName)) {
                    const correctName = telecallerMap.get(searchName);
                    if (row.LeadResponsibility !== correctName) {
                        updatedRow.LeadResponsibility = correctName;
                        agentFixes++;
                    }
                } else {
                    agentsNotFound.add(row.LeadResponsibility);
                }
            }

            return updatedRow;
        });

        // 5. Save Excel
        const newWorksheet = XLSX.utils.json_to_sheet(updatedData, {
            header: [
                'Name', 'Email', 'PhoneNumber', 'SchoolName', 'Class', 'Centre',
                'Course', 'Board', 'Source', 'TargetExam', 'LeadType', 'LeadResponsibility'
            ]
        });
        workbook.Sheets[sheetName] = newWorksheet;
        XLSX.writeFile(workbook, OUTPUT_FILE_PATH);

        console.log('--- REPAIR SUMMARY ---');
        console.log(`Total Rows Processed: ${data.length}`);
        console.log(`Missing School Names Fixed: ${schoolFixes}`);
        console.log(`Telecaller Names Standardized: ${agentFixes}`);
        if (agentsNotFound.size > 0) {
            console.log(`Agents STILL NOT FOUND (${agentsNotFound.size}):`, Array.from(agentsNotFound));
        }
        console.log('Repaired file successfully saved at:', OUTPUT_FILE_PATH);

    } catch (error) {
        console.error('Error during repair:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

repairExcel();
