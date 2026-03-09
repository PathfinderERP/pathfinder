import mongoose from "mongoose";
import "dotenv/config";

const mongoUrl = process.env.MONGO_URL;

async function findMoreInfo() {
    try {
        await mongoose.connect(mongoUrl);
        const leadSchema = new mongoose.Schema({}, { strict: false });
        const Lead = mongoose.model("Lead", leadSchema, "leads");

        const name = "MADHUMITA CHAKRABORTY";
        console.log(`Searching leads for additional info on ${name}...`);

        // Check if she was the creator of any leads, might find more info there
        const leadsCreatedByHer = await Lead.find({ leadResponsibility: name }).limit(5);
        console.log(`Found ${leadsCreatedByHer.length} leads assigned to her.`);
        
        // Sometimes email or phone of the responsibility is stored in a different collection or as a metadata
        // But here it seems she is just a string.

        // Is there a 'User' with a similar email but different name?
        const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }), "users");
        const similarEmail = await User.findOne({ email: /madhumita/i });
        if (similarEmail) {
            console.log("Similar email found in User collection:", similarEmail);
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.connection.close();
    }
}

findMoreInfo();
