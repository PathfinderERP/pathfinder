
import XLSX from 'xlsx';

const filePath = 'c:\\Users\\USER\\erp_1\\exports_data\\Monthly_Target_Report_2026_January.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log("Headers:", data[0]);
console.log("First Row:", data[1]);
