
import XLSX from 'xlsx';

const file = 'c:/Users/USER/erp_1/uploads/students/student_data3.xlsx';
const workbook = XLSX.readFile(file);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Get header row

console.log('Headers:', rows[0]);
console.log('First Row Data:', rows[1]);
