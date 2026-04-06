import mongoose from 'mongoose';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
import LeadManagement from './models/LeadManagement.js';
import User from './models/User.js';
import Class from './models/Master_data/Class.js';
import CentreSchema from './models/Master_data/Centre.js';
import Boards from './models/Master_data/Boards.js';
import Course from './models/Master_data/Courses.js';

dotenv.config();

const filePath = 'c:/Users/MALAY/erp_1/exports_data/TM.xlsx';

const importLeads = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('✅ Connected to MongoDB');

        // Fetch Master Data for mapping
        const classes = await Class.find().lean();
        const centres = await CentreSchema.find().lean();
        const boards = await Boards.find().lean();
        const courses = await Course.find().lean();
        const users = await User.find({}, 'name _id').lean();

        console.log(`\n📄 Processing: ${filePath}`);
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(sheet);

        console.log(`Found ${rawData.length} rows in Excel.`);

        let totalImported = 0;
        let errors = 0;
        let duplicates = 0;

        for (const row of rawData) {
            try {
                // Name (required)
                const name = row['Name'] || 'Imported Lead';

                // Phone
                const phone = String(row['PhoneNumber'] || '').replace(/\D/g, '');
                const normalizedPhone = phone.length > 10 ? phone.slice(-10) : phone;

                // Email
                let email = row['Email'];
                if (!email || email.includes('example.com') || email === 'student@gmail.com') {
                    // Generate a more unique email if it's a placeholder
                    email = `${name.replace(/\s+/g, '').toLowerCase()}.${normalizedPhone || Math.floor(Math.random() * 100000)}@imported.com`;
                }

                // Mappings
                const rawBoard = String(row['Board'] || '').toLowerCase();
                const mappedBoard = boards.find(b =>
                    b.boardCourse?.toLowerCase() === rawBoard ||
                    b.boardName?.toLowerCase() === rawBoard
                );

                const rawCentre = String(row['CENTRE'] || '').toLowerCase();
                const mappedCentre = centres.find(c =>
                    c.centreName?.toLowerCase() === rawCentre ||
                    c.centerCode?.toLowerCase() === rawCentre
                );

                const rawClass = String(row['CLASS'] || '');
                const mappedClass = classes.find(cl => 
                    cl.name === rawClass || 
                    cl.className === rawClass || 
                    cl.name === `Class ${rawClass}` ||
                    cl.className === `Class ${rawClass}`
                );

                const rawCourse = String(row['COURSE'] || '').toLowerCase();
                const mappedCourse = courses.find(co =>
                    co.name?.toLowerCase() === rawCourse ||
                    co.courseName?.toLowerCase() === rawCourse
                );

                // Find the responsible user (Telecaller)
                const respName = row['LEAD RESPONSIBILITY'] || '';
                const responsibleUser = users.find(u => u.name.toLowerCase().includes(respName.toLowerCase()));

                const leadData = {
                    name: name,
                    email: email.toLowerCase(),
                    phoneNumber: normalizedPhone,
                    schoolName: row['SchoolName'] || 'N/A',
                    className: mappedClass?._id,
                    centre: mappedCentre?._id,
                    board: mappedBoard?._id,
                    course: mappedCourse?._id,
                    source: row['SOURSE'] || row['Source'] || 'Bulk Excel Import',
                    targetExam: row['TARGET EXAM'] || row['TargetExam'] || '',
                    leadType: ['HOT LEAD', 'COLD LEAD', 'NEGATIVE'].includes(row['LEAD TYPE']) ? row['LEAD TYPE'] : 'COLD LEAD',
                    leadResponsibility: respName,
                    createdBy: responsibleUser?._id || null
                };

                const newLead = new LeadManagement(leadData);
                await newLead.save();
                totalImported++;
                
                if (totalImported % 50 === 0) console.log(`Imported ${totalImported} leads...`);
            } catch (err) {
                console.error(`❌ Error importing lead ${row['Name']}:`, err.message);
                errors++;
            }
        }

        console.log(`\n✨ Successfully imported ${totalImported} leads!`);
        console.log(`⏭️ Skipped ${duplicates} duplicates.`);
        if (errors > 0) console.log(`⚠️ encountered ${errors} errors.`);

        await mongoose.connection.close();
        console.log('🔌 Disconnected from MongoDB');
    } catch (err) {
        console.error('❌ Critical Error during import:', err);
        process.exit(1);
    }
};

importLeads();
