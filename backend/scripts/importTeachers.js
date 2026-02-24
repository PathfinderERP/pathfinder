/**
 * importTeachers.js
 * -----------------
 * Reads Teacher_List_2026-02-24.xlsx and for each row:
 *  - If Employee ID exists → find user by employeeId → update email + missing fields
 *  - If no Employee ID    → find by name → update OR create new user
 *  - After upserting the User, ensures a linked Employee record also exists
 *    (so the user appears in User Management AND Employee Center)
 *  - Role is always set to 'teacher'
 *  - Email conflicts are logged and skipped gracefully
 *  - Each row has its own try/catch so one bad row never aborts the whole import
 *
 * Usage:  node backend/scripts/importTeachers.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

import User from '../models/User.js';
import Employee from '../models/HR/Employee.js';
import CentreSchema from '../models/Master_data/Centre.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URL = process.env.MONGO_URL;
const EXCEL_PATH = path.join(__dirname, '../../exports_data/Teacher_List_2026-02-24.xlsx');

// ─── Helper: generate a unique TCH-prefixed user employeeId ──────────────────
const generateUserEmpId = async () => {
    const prefix = 'TCH';
    let id, exists = true;
    while (exists) {
        const rand = Math.floor(100000000 + Math.random() * 900000000);
        id = `${prefix}${rand}`;
        exists = !!(await User.findOne({ employeeId: id }));
    }
    return id;
};

// ─── Helper: check if email is free for a given userId ───────────────────────
const emailAvailableFor = async (email, userId) => {
    if (!email) return false;
    const owner = await User.findOne({ email });
    return !owner || owner._id.equals(userId);
};

// ─── Helper: ensure an Employee record exists for a User ─────────────────────
const ensureEmployeeRecord = async (userDoc, centreIds) => {
    const existing = await Employee.findOne({ user: userDoc._id });
    if (existing) {
        // Sync centre array if not already set
        const upd = {};
        if (centreIds.length > 0 && (!existing.centres || existing.centres.length === 0))
            upd.centres = centreIds;
        if (userDoc.email && (!existing.email || existing.email !== userDoc.email))
            upd.email = userDoc.email;
        if (userDoc.mobNum && !existing.phoneNumber)
            upd.phoneNumber = userDoc.mobNum;
        if (Object.keys(upd).length > 0)
            await Employee.findByIdAndUpdate(existing._id, { $set: upd });
        return { action: 'employee_synced' };
    }

    // Create a minimal Employee record linked to this User
    // Note: MUST NOT set email/phone to undefined/null as Employee has a unique index on email
    const hasRealEmail = userDoc.email && !userDoc.email.includes('@pathfinder.internal');
    const hasRealMobile = userDoc.mobNum && userDoc.mobNum !== '0000000000';

    const empData = {
        user: userDoc._id,
        name: userDoc.name,
        centres: centreIds,
        status: 'Active',
    };
    if (hasRealEmail) empData.email = userDoc.email;
    if (hasRealMobile) empData.phoneNumber = userDoc.mobNum;
    if (userDoc.teacherType) empData.typeOfEmployment = userDoc.teacherType;

    const emp = new Employee(empData);
    await emp.save();
    return { action: 'employee_created', empId: emp.employeeId };
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const run = async () => {
    await mongoose.connect(MONGO_URL);
    console.log('✅ Connected to MongoDB');

    // Load all centres into a map (normalised name → ObjectId)
    const allCentres = await CentreSchema.find({});
    const centreMap = {};
    allCentres.forEach(c => { centreMap[c.centreName.trim().toUpperCase()] = c._id; });
    console.log(`📍 Loaded ${allCentres.length} centres from DB`);

    // Read Excel
    const wb = XLSX.readFile(EXCEL_PATH);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    console.log(`📄 Found ${rows.length} rows in Excel\n`);

    const defaultPassword = await bcrypt.hash('Pathfinder@1234', 10);
    const results = { updated: [], created: [], skipped: [] };

    for (const row of rows) {
        try {
            const name = String(row['Name'] || '').trim();
            if (!name) { results.skipped.push({ name: '?', reason: 'Empty name' }); continue; }

            const employeeId = String(row['Employee ID'] || '').trim();
            const email = String(row['Email'] || '').trim().toLowerCase().replace(/\s/g, '');
            const mobile = String(row['Mobile'] || '').trim();
            const subject = String(row['Subject'] || '').trim();
            const department = String(row['Department'] || '').trim();
            const designation = String(row['Designation'] || '').trim();
            const type = String(row['Type'] || '').trim();
            const isDeptHod = String(row['Dept HOD'] || '').trim().toLowerCase() === 'yes';
            const isBoardHod = String(row['Board HOD'] || '').trim().toLowerCase() === 'yes';
            const isSubHod = String(row['Subject HOD'] || '').trim().toLowerCase() === 'yes';

            // Resolve centre ObjectIds
            const centreIds = [];
            if (row['Centre']) {
                for (const cn of String(row['Centre']).split(',').map(s => s.trim()).filter(Boolean)) {
                    const cid = centreMap[cn.toUpperCase()];
                    if (cid) centreIds.push(cid);
                    else console.log(`  ⚠️  Centre not in DB: "${cn}" (${name})`);
                }
            }

            let savedUser = null;

            // ── CASE 1: has Employee ID → lookup by empId ────────────────────
            if (employeeId) {
                const userByEmpId = await User.findOne({ employeeId });

                if (userByEmpId) {
                    const upd = { role: 'teacher', name };

                    if (email) {
                        const canUse = await emailAvailableFor(email, userByEmpId._id);
                        if (canUse) upd.email = email;
                        else console.log(`  ⚠️  Email ${email} taken by another user — email skipped for ${name}`);
                    }
                    if (mobile && !userByEmpId.mobNum) upd.mobNum = mobile;
                    if (subject) upd.subject = subject;
                    if (designation) upd.designation = designation;
                    if (centreIds.length > 0) upd.centres = centreIds;
                    if (['Foundation', 'All India', 'Board'].includes(department)) upd.teacherDepartment = department;
                    if (['Full Time', 'Part Time'].includes(type)) upd.teacherType = type;
                    upd.isDeptHod = isDeptHod; upd.isBoardHod = isBoardHod; upd.isSubjectHod = isSubHod;

                    await User.findByIdAndUpdate(userByEmpId._id, { $set: upd });
                    savedUser = await User.findById(userByEmpId._id);
                    console.log(`✏️  Updated  (by EmpID): ${name} [${employeeId}]`);
                    results.updated.push({ name, employeeId, action: 'by empId' });

                    const empResult = await ensureEmployeeRecord(savedUser, centreIds);
                    console.log(`   └─ Employee record: ${empResult.action}${empResult.empId ? ' → ' + empResult.empId : ''}`);
                    continue;
                }
                console.log(`  ℹ️  EmpID ${employeeId} not in DB → try name or create`);
            }

            // ── CASE 2: no empId match → lookup by name ──────────────────────
            const nameRx = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
            const userByName = await User.findOne({ name: nameRx });

            if (userByName) {
                const upd = { role: 'teacher' };
                if (email) {
                    const canUse = await emailAvailableFor(email, userByName._id);
                    if (canUse) upd.email = email;
                    else console.log(`  ⚠️  Email ${email} taken by another user — email skipped for ${name}`);
                }
                if (mobile && !userByName.mobNum) upd.mobNum = mobile;
                if (subject) upd.subject = subject;
                if (designation) upd.designation = designation;
                if (centreIds.length > 0) upd.centres = centreIds;
                if (employeeId && !userByName.employeeId) upd.employeeId = employeeId;
                if (['Foundation', 'All India', 'Board'].includes(department)) upd.teacherDepartment = department;
                if (['Full Time', 'Part Time'].includes(type)) upd.teacherType = type;
                upd.isDeptHod = isDeptHod; upd.isBoardHod = isBoardHod; upd.isSubjectHod = isSubHod;

                await User.findByIdAndUpdate(userByName._id, { $set: upd });
                savedUser = await User.findById(userByName._id);
                console.log(`✏️  Updated  (by Name): ${name}`);
                results.updated.push({ name, employeeId, action: 'by name' });

                const empResult = await ensureEmployeeRecord(savedUser, centreIds);
                console.log(`   └─ Employee record: ${empResult.action}${empResult.empId ? ' → ' + empResult.empId : ''}`);
                continue;
            }

            // ── CASE 3: brand new user → create ─────────────────────────────
            const newEmpId = employeeId || (await generateUserEmpId());
            const finalEmail = email || `${newEmpId.toLowerCase()}@pathfinder.internal`;
            const finalMobile = mobile || '0000000000';

            // Last-chance email uniqueness check
            if (await User.findOne({ email: finalEmail })) {
                console.log(`  ⚠️  Cannot create ${name} — email ${finalEmail} already in use`);
                results.skipped.push({ name, reason: `email conflict: ${finalEmail}` });
                continue;
            }

            const newUser = new User({
                name,
                employeeId: newEmpId,
                email: finalEmail,
                mobNum: finalMobile,
                password: defaultPassword,
                role: 'teacher',
                ...(subject && { subject }),
                ...(designation && { designation }),
                ...(centreIds.length > 0 && { centres: centreIds }),
                ...(['Foundation', 'All India', 'Board'].includes(department) && { teacherDepartment: department }),
                ...(['Full Time', 'Part Time'].includes(type) && { teacherType: type }),
                isDeptHod, isBoardHod, isSubjectHod: isSubHod,
                permissions: ['Dashboard'],
                isActive: true,
            });

            await newUser.save();
            savedUser = newUser;
            console.log(`➕ Created user: ${name} [${newEmpId}] — ${finalEmail}`);
            results.created.push({ name, employeeId: newEmpId, email: finalEmail });

            const empResult = await ensureEmployeeRecord(savedUser, centreIds);
            console.log(`   └─ Employee record: ${empResult.action}${empResult.empId ? ' → ' + empResult.empId : ''}`);

        } catch (err) {
            const rowName = String(row['Name'] || '?').trim();
            console.error(`❌ Error on row "${rowName}": ${err.message}`);
            results.skipped.push({ name: rowName, reason: err.message });
        }
    }

    // ─── Summary ──────────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════');
    console.log('           IMPORT SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`✏️  Updated : ${results.updated.length}`);
    results.updated.forEach(r => console.log(`     • ${r.name} (${r.action})`));
    console.log(`➕ Created : ${results.created.length}`);
    results.created.forEach(r => console.log(`     • ${r.name} [${r.employeeId}] → ${r.email}`));
    console.log(`⚠️  Skipped : ${results.skipped.length}`);
    results.skipped.forEach(r => console.log(`     • ${r.name || '?'} — ${r.reason}`));
    console.log('═══════════════════════════════════════\n');

    await mongoose.disconnect();
    console.log('✅ Done.');
};

run().catch(err => { console.error('❌ Fatal:', err); process.exit(1); });
