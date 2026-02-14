import XLSX from 'xlsx';
import path from 'path';

const yearlyFile = 'c:/Users/USER/erp_1/uploads/sales/Yearly_Target_Report_2025-2026.xlsx';
const monthlyFile = 'c:/Users/USER/erp_1/uploads/sales/Monthly_Target_Report_2026_January.xlsx';

function readExcel(filePath) {
    console.log(`\nReading: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Print first 5 rows to see structure
    console.log('First 5 rows:');
    data.slice(0, 5).forEach((row, i) => {
        console.log(`Row ${i}:`, row);
    });

    const json = XLSX.utils.sheet_to_json(worksheet);
    console.log('First JSON object:');
    console.log(json[0]);
}

try {
    readExcel(yearlyFile);
    readExcel(monthlyFile);
} catch (error) {
    console.error('Error reading Excel:', error.message);
}
