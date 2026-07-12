import CentreSchema from "../models/Master_data/Centre.js";

export const migrateCentres = async () => {
    try {
        const centres = await CentreSchema.find({});
        console.log(`[Migration] Found ${centres.length} centres in database.`);
        
        // Find existing codes
        const existingCodes = new Set(
            centres
                .map(c => c.centreCode)
                .filter(code => code && /^\d+$/.test(code))
        );
        
        // Sort centres by name or _id to be deterministic
        const sortedCentres = [...centres].sort((a, b) => {
            return (a.centreName || "").localeCompare(b.centreName || "") || a._id.toString().localeCompare(b._id.toString());
        });
        
        let currentCodeNum = 1;
        let migrationCount = 0;
        for (const centre of sortedCentres) {
            if (!centre.centreCode) {
                // Generate a code that is unique and not already taken
                let codeStr = currentCodeNum < 10 ? `0${currentCodeNum}` : `${currentCodeNum}`;
                while (existingCodes.has(codeStr)) {
                    currentCodeNum++;
                    codeStr = currentCodeNum < 10 ? `0${currentCodeNum}` : `${currentCodeNum}`;
                }
                
                centre.centreCode = codeStr;
                await centre.save();
                existingCodes.add(codeStr);
                migrationCount++;
                console.log(`[Migration] Assigned code ${codeStr} to centre ${centre.centreName}`);
            }
        }
        console.log(`[Migration] Centre codes migration completed. Assigned codes to ${migrationCount} centres.`);
    } catch (error) {
        console.error("[Migration] Error during centre codes migration:", error);
    }
};
