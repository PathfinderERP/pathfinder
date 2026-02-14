import XLSX from 'xlsx';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import CentreSchema from './models/Master_data/Centre.js';
import connectDB from './db/connect.js';

dotenv.config();

// Import the full permission modules configuration
import PERMISSION_MODULES from '../frontend/src/config/permissions.js';

// Generate full access permissions for ALL modules dynamically
function generateFullAccessPermissions() {
    const fullAccess = {};

    Object.keys(PERMISSION_MODULES).forEach(moduleKey => {
        const moduleData = PERMISSION_MODULES[moduleKey];
        fullAccess[moduleKey] = {};

        Object.keys(moduleData.sections).forEach(sectionKey => {
            const sectionData = moduleData.sections[sectionKey];
            fullAccess[moduleKey][sectionKey] = {};

            // Grant all available operations for this section
            sectionData.operations.forEach(operation => {
                fullAccess[moduleKey][sectionKey][operation] = true;
            });
        });
    });

    return fullAccess;
}

const FULL_ACCESS_PERMISSIONS = generateFullAccessPermissions();

async function updateUserPermissions() {
    try {
        await connectDB();
        console.log('✅ Connected to database');

        // Read Excel file
        const file = 'c:/Users/USER/erp_1/uploads/leads/CI_ZM_Migrated.xlsx';
        const workbook = XLSX.readFile(file);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const excelData = XLSX.utils.sheet_to_json(sheet);

        console.log(`📊 Found ${excelData.length} users in Excel`);

        const exportData = [];
        let updatedCount = 0;
        let notFoundCount = 0;

        for (const row of excelData) {
            const email = row['Email']?.trim();
            const mobile = row['Mobile Number']?.toString().trim();
            const centerNamesStr = row['Center Name']?.trim();
            const empId = row['Password (Emp ID)']?.trim();
            const name = row['Name']?.trim();

            if (!email) {
                console.log(`⚠️  Skipping row with no email: ${name}`);
                continue;
            }

            // Find user by email or mobile
            const user = await User.findOne({
                $or: [
                    { email: email },
                    { mobNum: mobile }
                ]
            }).populate('centres');

            if (!user) {
                console.log(`❌ User not found: ${email}`);
                notFoundCount++;
                exportData.push({
                    'Name': name,
                    'Email': email,
                    'Password': empId,
                    'Mobile': mobile,
                    'Centers': centerNamesStr || 'NOT FOUND IN DB',
                    'Status': 'NOT FOUND'
                });
                continue;
            }

            // Parse center names from Excel
            let centerIds = [];
            let centerNamesResolved = [];

            if (centerNamesStr && centerNamesStr !== '') {
                const centerNames = centerNamesStr.split(',').map(c => c.trim().toUpperCase());

                for (const centerName of centerNames) {
                    const center = await CentreSchema.findOne({
                        centreName: { $regex: new RegExp(`^${centerName}$`, 'i') }
                    });

                    if (center) {
                        centerIds.push(center._id);
                        centerNamesResolved.push(center.centreName);
                    } else {
                        console.log(`⚠️  Center not found in DB: ${centerName} for user ${email}`);
                    }
                }
            } else {
                // Use existing centers from user
                centerIds = user.centres.map(c => c._id);
                centerNamesResolved = user.centres.map(c => c.centreName);
            }

            // Update user
            user.centres = centerIds;
            user.granularPermissions = FULL_ACCESS_PERMISSIONS;
            user.canEditUsers = true;
            user.canDeleteUsers = true;

            await user.save();
            updatedCount++;

            console.log(`✅ Updated: ${user.name} (${user.email}) - Centers: ${centerNamesResolved.join(', ')}`);

            exportData.push({
                'Name': user.name,
                'Email': user.email,
                'Password': empId,
                'Mobile': user.mobNum,
                'Centers': centerNamesResolved.join(', '),
                'Role': user.role,
                'Status': 'UPDATED'
            });
        }

        // Generate export Excel
        const exportWorkbook = XLSX.utils.book_new();
        const exportSheet = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(exportWorkbook, exportSheet, 'User Credentials');

        const exportPath = `c:/Users/USER/erp_1/exports_data/user_credentials_full_access_${Date.now()}.xlsx`;
        XLSX.writeFile(exportWorkbook, exportPath);

        console.log('\n📊 Summary:');
        console.log(`✅ Updated: ${updatedCount}`);
        console.log(`❌ Not Found: ${notFoundCount}`);
        console.log(`📁 Export file: ${exportPath}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

updateUserPermissions();
