import connectDB from '../db/connect.js';
import User from '../models/User.js';

async function main() {
    await connectDB();
    
    const roleDBMapping = {
        admin: ["admin"],
        superadmin: ["superAdmin"],
        coordinator: ["coordinator", "Class_Coordinator"],
        accounts: ["accounts"],
        hr: ["hr"],
        digital: ["digital"],
        marketing: ["marketing"],
        telecaller: ["telecaller", "centralizedTelecaller"],
        counsellor: ["counsellor"],
        teacher: ["teacher"]
    };

    const roles = ["All", "admin", "superadmin", "coordinator"];
    
    for (const role of roles) {
        const userQuery = { isActive: true };
        if (role && role !== "All") {
            const dbRoles = roleDBMapping[role.toLowerCase()];
            if (dbRoles) {
                userQuery.role = { $in: dbRoles };
            } else {
                userQuery.role = role;
            }
        } else {
            const allSupportedRoles = Object.values(roleDBMapping).flat();
            userQuery.role = { $in: allSupportedRoles };
        }
        
        const users = await User.find(userQuery).select("name role");
        console.log(`--- Role: ${role} ---`);
        console.log(`Users count: ${users.length}`);
        const rohan = users.find(u => u.name.toUpperCase().includes("ROHAN"));
        if (rohan) {
            console.log(`Rohan Singh found! Role in DB: ${rohan.role}`);
        } else {
            console.log("Rohan Singh NOT found under this role.");
        }
    }
    
    process.exit(0);
}

main();
