import mongoose from 'mongoose';
import dotenv from 'dotenv';
import xlsx from 'xlsx';
import Admission from './models/Admission/Admission.js';

dotenv.config();

const findSkipped = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const workbook = xlsx.readFile('c:/Users/MALAY/erp_1/exports_data/student_datahf.xlsx');
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        const enrollNos = data.map(r => r['Enroll No']).filter(Boolean);
        const uniqueEnrollNos = [...new Set(enrollNos)];
        
        console.log(`Unique Enroll Nos in Excel: ${uniqueEnrollNos.length}`);
        console.log(`Duplicate Enroll Nos in Excel: ${enrollNos.length - uniqueEnrollNos.length}`);

        // Find which ones were already in the DB *before* this or are duplicates within the file
        const alreadyInDB = [];
        const seenInFile = new Set();
        const fileDuplicates = [];

        for (const row of data) {
            const enroll = row['Enroll No'];
            const name = row['Student Name'];
            if (seenInFile.has(enroll)) {
                fileDuplicates.push({ enroll, name });
            } else {
                seenInFile.add(enroll);
            }
        }

        console.log("\nDuplicated Enrollment Numbers within the Excel file:");
        fileDuplicates.forEach(f => console.log(`- ${f.enroll} (${f.name})`));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

findSkipped();
