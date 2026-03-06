import "dotenv/config";
import XLSX from "xlsx";
import connectDB from "./db/connect.js";
import User from "./models/User.js";
import Centre from "./models/Master_data/Centre.js";

const EXCEL_PATH = "c:\\Users\\MALAY\\erp_1\\exports_data\\Latest mapping 2026-27.xlsx";

// Map Excel centre names → DB centre names (case-insensitive fallback with explicit overrides)
const CENTRE_NAME_MAP = {
    "BAGNAN": "BAGNAN",
    "BALLY": "BALLY",
    "BARUIPUR": "BARUIPUR",
    "BERHAMPORE": "BERHAMPUR",
    "BURDWAN": "BURDWAN",
    "CHANDANNAGAR": "CHANDANNAGAR",
    "DUMDUM": "DUMDUM",
    "HOWRAH": "HOWRAH_FRANCHISE",
    "JODHPUR PARK": "JODHPUR PARK",
    "KHARAGPORE": "KHARAGPUR",
    "HAZRA-A(ENG MED)": "HAZRA H.O",
    "HAZRA-B(BNG MED)": "HAZRA H.O",
    "ONLINE(VI)": "HAZRA H.O",
    "OFFLINE (VI)(HAZRA)": "HAZRA H.O",
    "ONLINE(VII TO X)": "HAZRA H.O",
    "ARAMBAGH": "ARAMBAGH",
    "BALURGHAT": "BALURGHAT",
    "BARASAT": "BARASAT",
    "BEHALA": "BEHALA",
    "CONTAI": "CONTAI",
    "COOCHBEHAR": "COOCHBEHAR",
    "DIAMOND HERBOUR": "DIAMOND HARBOUR",
    "HABRA": "HABRA",
    "KALYANI": "KALYANI",
    "KATWA": "KATWA",
    "KTPP": "KTPP TOWNSHIP",
    "MALDA": "MALDA",
    "MIDNAPORE": "MIDNAPORE",
    "RAIGANJ": "RAIGANJ",
    "SHYAMBAZAR": "SHYAMBAZAR",   // exact trimmed match
    "TAMLUK": "TAMLUK",
    "TARAKESHWAR": "TARAKESWAR",
};

// Is this string a real name (not a phone number)?
const isNameNotPhone = (str) => {
    if (!str || typeof str !== 'string') return false;
    const cleaned = str.trim();
    if (!cleaned) return false;
    // Skip phone numbers and header rows
    if (/^\d[\d\s\/\-\(\)]+$/.test(cleaned)) return false;
    if (cleaned.toUpperCase() === 'BIOLOGY') return false;
    if (cleaned.toUpperCase() === 'CENTER NAME') return false;
    return true;
};

// Normalize teacher name for matching: uppercase, remove suffixes like (FT), -4, etc.
const normalizeName = (name) => {
    return name
        .replace(/\(FT\)/gi, '')
        .replace(/\s*-\s*\d+\s*$/g, '')  // Remove trailing -4, -2 etc
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
};

const run = async () => {
    await connectDB();
    console.log("Connected to DB.\n");

    // Load all centres from DB
    const allCentres = await Centre.find({});
    const centreNameToId = {};
    allCentres.forEach(c => {
        centreNameToId[c.centreName.trim().toUpperCase()] = c._id;
    });

    // Parse Excel
    const workbook = XLSX.readFile(EXCEL_PATH);
    const ws = workbook.Sheets['2026-27'];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

    // Collect all biology teacher → centre mappings
    // Structure: Map of normalizedName -> Set of centreIds
    const biologyMap = new Map(); // normalizedName -> { originalNames: [], centreIds: Set }

    let currentCentre = '';
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const centreCell = row[1];
        const biologyCell = row[7];

        // Track current centre (it appears in first data row, subsequent rows for same centre are blank)
        if (centreCell && typeof centreCell === 'string' && centreCell.trim()) {
            currentCentre = centreCell.trim().toUpperCase();
        }

        if (!isNameNotPhone(biologyCell)) continue;

        const excelCentreName = currentCentre;
        const dbCentreName = CENTRE_NAME_MAP[excelCentreName] || excelCentreName;
        const centreId = centreNameToId[dbCentreName.trim().toUpperCase()];

        // Handle "(FT)" annotation in teacher name — multiple teachers can be on one row
        const teacherNames = biologyCell.split('/').map(s => s.trim()).filter(isNameNotPhone);

        for (const rawName of teacherNames) {
            const normalized = normalizeName(rawName);
            if (!biologyMap.has(normalized)) {
                biologyMap.set(normalized, { originalNames: new Set(), centreIds: new Set() });
            }
            biologyMap.get(normalized).originalNames.add(rawName);
            if (centreId) {
                biologyMap.get(normalized).centreIds.add(centreId.toString());
            } else {
                console.warn(`  ⚠️  Centre not found in DB: "${excelCentreName}" → "${dbCentreName}"`);
            }
        }
    }

    console.log(`Found ${biologyMap.size} unique biology teachers from Excel:\n`);
    biologyMap.forEach((val, key) => {
        console.log(`  "${key}" → centres: ${val.centreIds.size}`);
    });
    console.log();

    const stats = { updated: 0, notFound: 0, noChange: 0 };

    for (const [normalizedName, { originalNames, centreIds }] of biologyMap) {
        // Build name variants to search
        const nameVariants = [...originalNames].map(n => normalizeName(n));

        // Search DB: case-insensitive match on name field (role=teacher)
        // Try each name variant
        let user = null;
        for (const variant of [...new Set([normalizedName, ...nameVariants])]) {
            user = await User.findOne({
                name: { $regex: new RegExp(`^${variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
                role: 'teacher'
            });
            if (user) break;
        }

        // If no exact match, try partial match (name contains the teacher's name)
        if (!user) {
            const parts = normalizedName.split(' ');
            if (parts.length >= 2) {
                user = await User.findOne({
                    name: { $regex: new RegExp(parts.join('.*'), 'i') },
                    role: 'teacher'
                });
            }
        }

        if (!user) {
            console.log(`  ❌ NOT FOUND: "${normalizedName}" | Tried: ${[...originalNames].join(', ')}`);
            stats.notFound++;
            continue;
        }

        // Build update payload - ONLY touch subject and centres
        const updateFields = {};
        let changeDescription = [];

        // 1. Update subject to Biology
        if (user.subject !== 'Biology') {
            updateFields.subject = 'Biology';
            changeDescription.push(`subject: "${user.subject || '(none)'}" → "Biology"`);
        }

        // 2. Merge new centreIds into existing centres (add, don't remove existing)
        const existingCentreStrs = (user.centres || []).map(id => id.toString());
        const newCentreIds = [...centreIds].filter(id => !existingCentreStrs.includes(id));

        if (newCentreIds.length > 0) {
            updateFields.centres = [...new Set([...existingCentreStrs, ...newCentreIds])];
            const addedNames = newCentreIds.map(id => {
                const c = allCentres.find(c => c._id.toString() === id);
                return c ? c.centreName : id;
            });
            changeDescription.push(`centres: +[${addedNames.join(', ')}]`);
        }

        if (Object.keys(updateFields).length === 0) {
            console.log(`  ✅ NO CHANGE: "${user.name}" — already Biology with correct centres`);
            stats.noChange++;
            continue;
        }

        // Apply update — ONLY the fields we built above
        await User.findByIdAndUpdate(user._id, { $set: updateFields });
        console.log(`  ✅ UPDATED: "${user.name}" | ${changeDescription.join(' | ')}`);
        stats.updated++;
    }

    console.log("\n==========================================");
    console.log("Update Summary:");
    console.log(`  ✅ Updated:    ${stats.updated}`);
    console.log(`  ⏭️  No change: ${stats.noChange}`);
    console.log(`  ❌ Not found: ${stats.notFound}`);
    console.log("==========================================");

    process.exit(0);
};

run().catch(e => { console.error("Script failed:", e); process.exit(1); });
