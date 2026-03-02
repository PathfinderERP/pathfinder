import XLSX from 'xlsx';
import path from 'path';

const filePath = 'd:/pathfinder/exports_data/student_data2526all.xlsx';
try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    
    if (rows.length > 0) {
        console.log("Headers:", Object.keys(rows[0]));
        const centers = new Set(rows.map(r => r.Centre || r.Center || 'Unknown'));
        console.log("Centers:", Array.from(centers));
    } else {
        console.log("No data found in sheet.");
    }
} catch (err) {
    console.error("Error reading file:", err.message);
}
