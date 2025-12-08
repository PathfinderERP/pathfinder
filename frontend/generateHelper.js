import XLSX from "xlsx";
import fs from "fs";

// Dummy Data Generators
const firstNames = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan", "Diya", "Saanvi", "Ananya", "Aadhya", "Pari", "Anika", "Navya", "Angel", "Myra", "Diya"];
const lastNames = ["Sharma", "Verma", "Gupta", "Malhotra", "Bhatia", "Saxena", "Mehta", "Chopra", "Desai", "Joshi", "Singh", "Patel", "Reddy", "Nair", "Iyer", "Rao", "Kumar", "Das", "Banerjee", "Ghosh"];
const schools = ["Delhi Public School", "Ryan International", "Kendriya Vidyalaya", "St. Xaviers", "Modern School", "Dav Public School", "Army Public School", "Heritage School"];

const generatePhone = () => "9" + Math.floor(Math.random() * 900000000 + 100000000);

const data = [];

// Generate 20 records
for (let i = 0; i < 20; i++) {
    const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const school = schools[Math.floor(Math.random() * schools.length)];

    data.push({
        Name: `${fName} ${lName}`,
        Email: `${fName.toLowerCase()}.${lName.toLowerCase()}${Math.floor(Math.random() * 99)}@example.com`,
        PhoneNumber: generatePhone(),
        SchoolName: school,
        Class: i % 2 === 0 ? "Class 11" : "Class 12", // Assuming these exist
        Centre: "Kolkata Main Campus",                // Assuming this exists
        Course: "JEE Main Two Year Program",          // Assuming this exists
        Source: i % 3 === 0 ? "Facebook" : (i % 3 === 1 ? "Instagram" : "Walk-in"),
        TargetExam: i % 2 === 0 ? "JEE" : "NEET",
        LeadType: i % 4 === 0 ? "HOT LEAD" : "COLD LEAD",
        LeadResponsibility: "Mike Telecaller" // Same for all as requested
    });
}

// Create Worksheet
const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Leads");

// Write to file
const fileName = "Dummy_Leads_Import.xlsx";
XLSX.writeFile(wb, fileName);

console.log(`✅ Successfully generated ${fileName} with 20 records.`);
console.log("Lead Responsibility set to: Mike Telecaller");
