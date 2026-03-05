import XLSX from 'xlsx';

const filePath = 'c:\\Users\\USER\\erp_1\\exports_data\\student_data2628Arambagh.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet);

console.log("Total Rows:", data.length);
if (data.length > 0) {
    console.log("Headers (keys of first object):", Object.keys(data[0]));
    console.log("First Row Sample:", JSON.stringify(data[0], null, 2));
} else {
    console.log("No data found in sheet.");
}
