import XLSX from 'xlsx';
import path from 'path';

const filePath = 'c:\\Users\\MALAY\\erp_1\\exports_data\\Cash_Balance.xlsx';

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    if (data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
        console.log('Sample Row:', JSON.stringify(data[0], null, 2));
    } else {
        console.log('Excel file is empty');
    }
} catch (error) {
    console.error('Error reading excel file:', error);
}
