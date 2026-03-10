import XLSX from 'xlsx';
import path from 'path';

const filePath = 'c:\\Users\\MALAY\\erp_1\\exports_data\\MISSING DETAILS_ERP2.xlsx';

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log(JSON.stringify(data, null, 2));
} catch (error) {
    console.error('Error reading Excel file:', error.message);
}
