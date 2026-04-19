import mongoose from 'mongoose';
import dotenv from 'dotenv';
import xlsx from 'xlsx';
import path from 'path';
import Student from './models/Students.js';
import Admission from './models/Admission/Admission.js';
import Course from './models/Master_data/Courses.js';
import Centre from './models/Master_data/Centre.js';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;
const EXCEL_PATH = 'c:\\Users\\MALAY\\erp_1\\exports_data\\hwh_fnd.xlsx';

async function analyzeData() {
    try {
        if (!MONGO_URL) {
            console.error("MONGO_URL not found in .env");
            return;
        }

        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB");

        const wb = xlsx.readFile(EXCEL_PATH);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(ws, { defval: '' });

        console.log(`\n📊 DATA ANALYSIS FOR: ${path.basename(EXCEL_PATH)}`);
        console.log(`Total records in Excel: ${data.length}`);

        // 1. Check Center
        const targetCenterLabel = "HOWRAH_FRANCHISE";
        const centerExists = await Centre.findOne({ centreName: targetCenterLabel });
        
        let centerStatus = "";
        if (centerExists) {
            centerStatus = `✅ Center "${targetCenterLabel}" exists.`;
        } else {
            centerStatus = `❌ Center "${targetCenterLabel}" NOT found.`;
            const similar = await Centre.find({ centreName: { $regex: 'HOWRAH', $options: 'i' } }).limit(5);
            if (similar.length > 0) {
                centerStatus += ` Similar centers found: ${similar.map(c => c.centreName).join(', ')}`;
            }
        }
        console.log(centerStatus);

        // 2. Check Enrollments
        const enrollNumbers = data.map(r => r["Enroll No"]).filter(Boolean);
        const uniqueEnrolls = [...new Set(enrollNumbers)];
        
        const existingAdmissions = await Admission.find({
            admissionNumber: { $in: uniqueEnrolls }
        }).select('admissionNumber');

        const existingEnrollSet = new Set(existingAdmissions.map(a => a.admissionNumber));
        
        const duplicates = uniqueEnrolls.filter(e => existingEnrollSet.has(e));
        const uniqueNew = uniqueEnrolls.filter(e => !existingEnrollSet.has(e));

        console.log(`\n🆔 Enrollment Check:`);
        console.log(`- Unique Enrolls in Excel: ${uniqueEnrolls.length}`);
        console.log(`- Already exists in DB: ${duplicates.length}`);
        console.log(`- New (to be added): ${uniqueNew.length}`);

        if (duplicates.length > 0) {
            console.log(`- Sample duplicates: ${duplicates.slice(0, 5).join(', ')}`);
        }

        // 3. Check Courses
        const courseNames = [...new Set(data.map(r => r["Course Name"]).filter(Boolean))];
        const existingCourses = await Course.find({
            courseName: { $in: courseNames }
        }).select('courseName');
        
        const existingCourseNames = new Set(existingCourses.map(c => c.courseName));
        const missingCourses = courseNames.filter(c => !existingCourseNames.has(c));
        
        console.log(`\n🎓 Course Check:`);
        console.log(`- Unique Course Names in Excel: ${courseNames.length}`);
        if (missingCourses.length > 0) {
            console.log(`- ❌ Missing Courses in DB (${missingCourses.length}):`);
            missingCourses.forEach(c => console.log(`  - ${c}`));
        } else {
            console.log("- ✅ All courses matched in database.");
        }

        // 4. Financial Details
        let totalCommited = 0;
        let totalPaid = 0;
        data.forEach(r => {
            totalCommited += parseFloat(r["Commited Amount"]) || 0;
            totalPaid += parseFloat(r["Total Amount Paid Till Date"]) || 0;
        });

        console.log(`\n💰 Financial Summary:`);
        console.log(`- Total Committed Amount: ₹${totalCommited.toFixed(2)}`);
        console.log(`- Total Paid Amount: ₹${totalPaid.toFixed(2)}`);

        // 5. Session Distribution
        const sessions = {};
        data.forEach(r => {
            const s = r["Session"] || "N/A";
            sessions[s] = (sessions[s] || 0) + 1;
        });
        console.log(`\n📅 Session Distribution:`);
        Object.entries(sessions).forEach(([s, count]) => {
            console.log(`- ${s}: ${count} students`);
        });

    } catch (err) {
        console.error("Error during analysis:", err);
    } finally {
        await mongoose.disconnect();
    }
}

analyzeData();
