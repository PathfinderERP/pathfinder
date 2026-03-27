import xlsx from 'xlsx';

const wb = xlsx.readFile('c:\\Users\\MALAY\\erp_1\\exports_data\\RAZORPAY_DEVICE_ID.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(ws, { defval: '' });
console.log("Columns:", Object.keys(data[0]));
console.log("All rows:\n", JSON.stringify(data, null, 2));
