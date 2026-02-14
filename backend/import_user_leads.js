import mongoose from 'mongoose';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
import LeadManagement from './models/LeadManagement.js';
import Class from './models/Master_data/Class.js';
import CentreSchema from './models/Master_data/Centre.js';
import Boards from './models/Master_data/Boards.js';
import Course from './models/Master_data/Courses.js';

dotenv.config();

const filePath = 'c:/Users/USER/erp_1/uploads/leads/Lead_Import_Template (4)2.xlsx';

const importLeads = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('✅ Connected to MongoDB');

        // Fetch Master Data for mapping
        const classes = await Class.find().lean();
        const centres = await CentreSchema.find().lean();
        const boards = await Boards.find().lean();
        const courses = await Course.find().lean();

        console.log(`\n📄 Processing: ${filePath}`);
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(sheet);

        let totalImported = 0;
        let errors = 0;

        for (const row of rawData) {
            try {
                // Name (required)
                const name = row['Name'] || 'Imported Lead';

                // Phone
                const phone = String(row['Phone'] || '').replace(/\D/g, '');
                const normalizedPhone = phone.length > 10 ? phone.slice(-10) : phone;

                // Email (required) - if placeholder, generate one
                let email = row['Email'];
                if (!email || email === 'john@example.com') {
                    email = `${name.replace(/\s+/g, '').toLowerCase()}${normalizedPhone || Math.floor(Math.random() * 10000)}@imported.com`;
                }

                // Mappings
                const rawBoard = String(row['Board'] || '').toLowerCase();
                const mappedBoard = boards.find(b =>
                    b.boardCourse?.toLowerCase() === rawBoard ||
                    b.boardName?.toLowerCase() === rawBoard
                );

                const rawCentre = String(row['Centre'] || '').toLowerCase();
                const mappedCentre = centres.find(c =>
                    c.centreName?.toLowerCase() === rawCentre ||
                    c.centerCode?.toLowerCase() === rawCentre ||
                    c.enterCode?.toLowerCase() === rawCentre
                );

                const rawClass = String(row['Class'] || '');
                const mappedClass = classes.find(cl => cl.name === rawClass || cl.className === rawClass);

                const rawCourse = String(row['Course'] || '').toLowerCase();
                const mappedCourse = courses.find(co =>
                    co.name?.toLowerCase() === rawCourse ||
                    co.courseName?.toLowerCase() === rawCourse
                );

                const leadData = {
                    name: name,
                    email: email,
                    phoneNumber: normalizedPhone,
                    schoolName: row['School'] || 'N/A',
                    className: mappedClass?._id,
                    centre: mappedCentre?._id,
                    board: mappedBoard?._id,
                    course: mappedCourse?._id,
                    source: row['Source'] || 'Bulk Excel Import',
                    targetExam: row['TargetExam'] || '',
                    leadType: ['HOT LEAD', 'COLD LEAD', 'NEGATIVE'].includes(row['Lead Type']) ? row['Lead Type'] : 'COLD LEAD',
                    leadResponsibility: row['Telecaller'] || '',
                };

                const newLead = new LeadManagement(leadData);
                await newLead.save();
                totalImported++;
                if (totalImported % 10 === 0) console.log(`Imported ${totalImported} leads...`);
            } catch (err) {
                console.error(`❌ Error importing lead ${row['Name']}:`, err.message);
                errors++;
            }
        }

        console.log(`\n✨ Successfully imported ${totalImported} leads!`);
        if (errors > 0) console.log(`⚠️ encountered ${errors} errors.`);

        await mongoose.connection.close();
    } catch (err) {
        console.error('❌ Critical Error during import:', err);
        process.exit(1);
    }
};

importLeads();
