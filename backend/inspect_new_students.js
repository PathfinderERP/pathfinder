import XLSX from 'xlsx';
import path from 'path';

const files = [
    'c:/Users/USER/erp_1/exports_data/student_data.xlsx',
    'c:/Users/USER/erp_1/exports_data/student_data_2627.xlsx'
];

files.forEach(file => {
    try {
        console.log(`\n--- Inspecting: ${path.basename(file)} ---`);
        const workbook = XLSX.readFile(file);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (data.length > 0) {
            console.log('Headers:', data[0]);
            console.log('Sample Row 1:', data[1]);
            console.log('Sample Row 2:', data[2]);
            console.log(`Total Rows: ${data.length - 1}`);
        } else {
            console.log('Sheet is empty');
        }
    } catch (error) {
        console.error(`Error reading ${file}:`, error.message);
    }
});
