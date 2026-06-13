import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function main() {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected to DB");

    const targetId = "69ca7b353305ab324cd4c578";
    const collections = await mongoose.connection.db.collections();
    
    console.log(`Searching for ID: ${targetId} across ${collections.length} collections...`);
    for (const coll of collections) {
        try {
            const doc = await coll.findOne({ _id: new mongoose.Types.ObjectId(targetId) });
            if (doc) {
                console.log(`Found match in collection: "${coll.collectionName}"`);
                console.log("Document details:", JSON.stringify(doc, null, 2));
            }
        } catch (err) {
            // Some collections might have different key types, ignore
        }
    }

    await mongoose.disconnect();
}

main().catch(console.error);
