import XLSX from 'xlsx';
import path from 'path';

const filePath = 'c:\\Users\\MALAY\\erp_1\\exports_data\\Students list of Bally_Not updated in ERP.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log("Headers:", data[0]);
console.log("Number of rows (including header):", data.length);
console.log("First 3 Data Rows:");
console.log(data.slice(1, 4));
console.log("Last Row (to be excluded):");
console.log(data[data.length - 1]);
