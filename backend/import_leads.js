import mongoose from 'mongoose';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
import LeadManagement from './models/LeadManagement.js';
import Class from './models/Master_data/Class.js';
import CentreSchema from './models/Master_data/Centre.js';
import Boards from './models/Master_data/Boards.js';

dotenv.config();

const FILES = [
    'c:/Users/USER/erp_1/uploads/Home-visit support A 30/1/26_Leads_2026-01-30_2026-02-04.xls',
    'c:/Users/USER/erp_1/uploads/Home-visit support B 30/1/26_Leads_2026-01-30_2026-02-04.xls',
    'c:/Users/USER/erp_1/uploads/Last-minute board prep A 30/1/26_Leads_2026-01-30_2026-02-04.xls',
    'c:/Users/USER/erp_1/uploads/Last-minute board prep B 30/1/26_Leads_2026-01-30_2026-02-04.xls',
    'c:/Users/USER/erp_1/uploads/Board CRP 19/12/25 A_Leads_2026-01-06_2026-02-04.xls',
    'c:/Users/USER/erp_1/uploads/Board CRP 19/12/25 B_Leads_2026-01-06_2026-02-04.xls',
    'c:/Users/USER/erp_1/uploads/Subhajit Saha Class 2/2/26_Leads_2026-02-02_2026-02-04.xls'
];

const TELECALLERS = ["Pradipta Haldar", "Sumana Haldar", "Simran Mishra"];

const importLeads = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('✅ Connected to MongoDB');

        // Fetch Master Data for mapping
        const classes = await Class.find().lean();
        const centres = await CentreSchema.find().lean();
        const boards = await Boards.find().lean();

        let totalImported = 0;
        let telecallerIndex = 0;

        for (const filePath of FILES) {
            console.log(`\n📄 Processing: ${filePath}`);
            const workbook = XLSX.readFile(filePath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawData = XLSX.utils.sheet_to_json(sheet);

            for (const row of rawData) {
                // Determine field mapping based on row keys (case-insensitive)
                const getVal = (possibleKeys) => {
                    const foundKey = Object.keys(row).find(k => possibleKeys.includes(k.toLowerCase().trim()));
                    return foundKey ? row[foundKey] : null;
                };

                const name = getVal(['full_name', 'name', 'full name']) || 'Imported Lead';
                const phone = String(getVal(['phone', 'phone_number', 'phone number', 'phoneNumber']) || '').replace(/\D/g, '');

                // Normalizing phone number (keeping last 10 digits as convention)
                const normalizedPhone = phone.length > 10 ? phone.slice(-10) : phone;

                // Mappings
                const rawBoard = String(getVal(['choose_board', 'select_board', 'board']) || '').toLowerCase();
                const mappedBoard = boards.find(b =>
                    b.boardCourse.toLowerCase() === 'wbse' && (rawBoard.includes('wb') || rawBoard.includes('wbbse')) ||
                    b.boardCourse.toLowerCase() === rawBoard
                );

                const rawCentre = String(getVal(['choose_nearby__center_', 'centre', 'center']) || '').toLowerCase();
                const mappedCentre = centres.find(c =>
                    c.centreName.toLowerCase().includes(rawCentre) ||
                    c.enterCode.toLowerCase() === rawCentre
                );

                const rawClass = String(getVal(['class', 'className']) || '');
                const mappedClass = classes.find(cl => cl.name === rawClass);

                const city = getVal(['city', 'address', 'location']) || '';

                // Distribute Responsibility
                const leadResponsibility = TELECALLERS[telecallerIndex % TELECALLERS.length];
                telecallerIndex++;

                const leadData = {
                    name: name,
                    email: `${name.replace(/\s+/g, '').toLowerCase()}${normalizedPhone}@imported.com`, // Generated unique-ish placeholder
                    phoneNumber: normalizedPhone,
                    schoolName: 'Imported from Facebook/Leadgen', // Placeholder for required field
                    className: mappedClass?._id,
                    centre: mappedCentre?._id,
                    board: mappedBoard?._id,
                    leadResponsibility: leadResponsibility,
                    source: 'Bulk Import',
                    leadType: 'HOT LEAD',
                    sourceDesc: `File: ${filePath.split('/').pop()}`,
                    // Storing address/city in remarks/followups would be ideal but Lead Schema is restricted
                    // For now we rely on the system mapping or metadata
                };

                // Add initial follow-up with the address info
                if (city) {
                    leadData.followUps = [{
                        feedback: 'Imported Lead Data',
                        remarks: `Address/City from Excel: ${city}`,
                        status: 'HOT LEAD'
                    }];
                }

                const newLead = new LeadManagement(leadData);
                await newLead.save();
                totalImported++;
            }
        }

        console.log(`\n✨ Successfully imported ${totalImported} leads!`);
        await mongoose.connection.close();
    } catch (err) {
        console.error('❌ Error during import:', err);
        process.exit(1);
    }
};

importLeads();
