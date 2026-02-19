import XLSX from 'xlsx';

const file = 'c:/Users/USER/erp_1/exports_data/abc.xlsx';
const workbook = XLSX.readFile(file);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
console.log('Headers:', data[0]);
console.log('Row 1:', data[1]);
console.log('Total Rows:', data.length);
