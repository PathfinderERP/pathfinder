import XLSX from 'xlsx';
const workbook = XLSX.readFile('c:/Users/MALAY/erp_1/exports_data/TM.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet).slice(0, 5);
console.log(JSON.stringify(data, null, 2));
