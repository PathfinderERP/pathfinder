import XLSX from 'xlsx';

const file = 'c:/Users/USER/erp_1/uploads/leads/CI_ZM_Migrated.xlsx';
const workbook = XLSX.readFile(file);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

const uniqueCenters = [...new Set(data.map(row => row['Center Name']))];
console.log('Unique Center Names in Excel:', uniqueCenters);

const usersWithCenters = data.filter(row => row['Center Name'] && row['Center Name'].trim() !== '');
console.log('Users with Center Name specified in Excel:', usersWithCenters.length);

if (usersWithCenters.length > 0) {
    console.log('First 3 users with centers:', usersWithCenters.slice(0, 3));
}
