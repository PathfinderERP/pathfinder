import mongoose from 'mongoose';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
import Admission from './models/Admission/Admission.js';

dotenv.config();

const file = 'c:/Users/USER/erp_1/exports_data/abc.xlsx';

async function findNew() {
    await mongoose.connect(process.env.MONGO_URL);
    const workbook = XLSX.readFile(file);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    let newFound = 0;
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const enrollNo = String(row[2] || "").trim();
        const sessionName = String(row[18] || "").trim();
        if (!enrollNo) continue;

        const existingAdms = await Admission.find({ admissionNumber: enrollNo });
        const duplicate = existingAdms.find(a => a.academicSession === sessionName);

        if (!duplicate) {
            console.log(`Row ${i} is NEW: ${enrollNo} | ${sessionName}`);
            newFound++;
        }
        if (newFound >= 10) break;
    }
    await mongoose.disconnect();
}
findNew();
