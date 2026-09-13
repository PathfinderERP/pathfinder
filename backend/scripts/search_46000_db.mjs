import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB.");

        const mainDb = mongoose.connection.client.db("PATHFINDER_NEW");
        const collections = await mainDb.listCollections().toArray();

        console.log(`Searching across ${collections.length} collections for 46000 or Baruipur targets...`);

        for (const colInfo of collections) {
            const colName = colInfo.name;
            const col = mainDb.collection(colName);

            // Check for documents with 46000
            try {
                const docsWith46000 = await col.find({
                    $or: [
                        { target: 46000 },
                        { targetAmount: 46000 },
                        { amount: 46000 },
                        { totalTarget: 46000 },
                        { "weeklyTargetsOverride.1": 46000 },
                        { target: "46000" },
                        { targetAmount: "46000" }
                    ]
                }).limit(5).toArray();

                if (docsWith46000.length > 0) {
                    console.log(`Found in collection [${colName}]:`, JSON.stringify(docsWith46000));
                }
            } catch (err) {}
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
