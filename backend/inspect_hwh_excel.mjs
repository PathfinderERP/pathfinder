import xlsx from 'xlsx';
import path from 'path';

const filePath = 'c:\\Users\\MALAY\\erp_1\\exports_data\\hwh_fnd.xlsx';

try {
    const wb = xlsx.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(ws, { defval: '' });
    
    console.log("Total Rows:", data.length);
    if (data.length > 0) {
        console.log("Columns:", Object.keys(data[0]));
        console.log("First row:", JSON.stringify(data[0], null, 2));
        
        // Count entries with 'enroll' or similar headers
        const headers = Object.keys(data[0]);
        const enrollHeader = headers.find(h => h.toLowerCase().includes('enroll') || h.toLowerCase().includes('admission number'));
        
        if (enrollHeader) {
            const enrolls = data.map(r => r[enrollHeader]).filter(Boolean);
            console.log(`Found ${enrolls.length} enrollment numbers using header "${enrollHeader}"`);
            console.log("Sample enrolls:", enrolls.slice(0, 5));
        } else {
            console.log("Could not find an enrollment header. Available headers:", headers);
        }
    }
} catch (err) {
    console.error("Error reading Excel:", err.message);
}
