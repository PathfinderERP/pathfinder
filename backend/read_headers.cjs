const XLSX = require('xlsx');
const path = require('path');

const files = [
    '../exports_data/student_data_2629.xlsx',
    '../exports_data/student_data2627.xlsx',
    '../exports_data/student_data2632.xlsx',
    '../exports_data/student_data2729.xlsx'
];

files.forEach(file => {
    try {
        const fullPath = path.join(process.cwd(), file);
        const workbook = XLSX.readFile(fullPath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log(`\nFile: ${file}`);
        console.log(`Headers: ${JSON.stringify(data[0])}`);
        console.log(`First row: ${JSON.stringify(data[1])}`);
    } catch (e) {
        console.error(`Error reading ${file}: ${e.message}`);
    }
});
