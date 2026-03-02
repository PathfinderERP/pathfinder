import mongoose from 'mongoose';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import Student from '../models/Students.js';
import Admission from '../models/Admission/Admission.js';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

const MONGO_URL = process.env.MONGO_URL;

async function generateCredentials() {
    try {
        if (!MONGO_URL) {
            throw new Error("MONGO_URL not found in .env file");
        }

        await mongoose.connect(MONGO_URL);
        console.log("✅ Connected to MongoDB");

        // Fetch admissions and populate student details
        const admissions = await Admission.find({ admissionStatus: 'ACTIVE' })
            .populate('student')
            .lean();

        console.log(`📊 Found ${admissions.length} active admissions.`);

        const outputDir = path.join(process.cwd(), 'exports_data', 'students_credentials');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`📁 Created directory: ${outputDir}`);
        }

        // Group by center
        const centerGroups = {};

        admissions.forEach(adm => {
            const centerName = adm.centre || 'Unknown';
            if (!centerGroups[centerName]) {
                centerGroups[centerName] = [];
            }

            const studentData = adm.student;
            const primaryDetails = (studentData && studentData.studentsDetails && studentData.studentsDetails.length > 0) 
                ? studentData.studentsDetails[0] 
                : {};

            centerGroups[centerName].push({
                'Student Name': primaryDetails.studentName || 'N/A',
                'Email': primaryDetails.studentEmail || 'N/A',
                'Enrollment Number': adm.admissionNumber || 'N/A',
                'Centre': centerName,
                'Session': adm.academicSession || 'N/A'
            });
        });

        // Generate Excel files for each center
        for (const [center, students] of Object.entries(centerGroups)) {
            const fileName = `${center.replace(/[/\\?%*:|"<>]/g, '_')}_Credentials.xlsx`;
            const filePath = path.join(outputDir, fileName);

            const worksheet = XLSX.utils.json_to_sheet(students);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Credentials');

            XLSX.writeFile(workbook, filePath);
            console.log(`📄 Generated: ${fileName} (${students.length} students)`);
        }

        console.log("\n✅ Student credential generation completed successfully.");

    } catch (error) {
        console.error("💥 Error generating credentials:", error);
    } finally {
        await mongoose.disconnect();
    }
}

generateCredentials();
