import mongoose from 'mongoose';
import 'dotenv/config';

const checkAdmissions = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const Admission = mongoose.model('Admission', new mongoose.Schema({ centre: mongoose.Schema.Types.Mixed }));
        const centers = await Admission.aggregate([
            { $group: { _id: '$centre', count: { $sum: 1 } } }
        ]);
        console.log("Distinct centre values in Admission:");
        console.log(centers);

        const CentreSchema = mongoose.model('CentreSchema', new mongoose.Schema({ centreName: String }));
        const actualCentres = await CentreSchema.find({}, 'centreName');
        console.log("\nActual centre names in CentreSchema:");
        console.log(actualCentres.map(c => c.centreName));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkAdmissions();
