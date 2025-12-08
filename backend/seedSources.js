import mongoose from "mongoose";
import dotenv from "dotenv";
import Sources from "./models/Master_data/Sources.js";
import connectDB from "./db/connect.js";

dotenv.config();

const sourcesData = [
    {
        sourceName: "Facebook",
        source: "Social Media",
        subSource: "Facebook Ads",
        sourceType: "Online"
    },
    {
        sourceName: "Instagram",
        source: "Social Media",
        subSource: "Instagram Ads",
        sourceType: "Online"
    },
    {
        sourceName: "Website",
        source: "Direct",
        subSource: "Organic Search",
        sourceType: "Online"
    },
    {
        sourceName: "Walk-in",
        source: "Direct",
        subSource: "Physical Visit",
        sourceType: "Offline"
    },
    {
        sourceName: "Google Ads",
        source: "Paid Advertising",
        subSource: "Google Search",
        sourceType: "Online"
    },
    {
        sourceName: "YouTube",
        source: "Social Media",
        subSource: "YouTube Ads",
        sourceType: "Online"
    },
    {
        sourceName: "Referral",
        source: "Word of Mouth",
        subSource: "Student Referral",
        sourceType: "Offline"
    },
    {
        sourceName: "WhatsApp",
        source: "Direct",
        subSource: "WhatsApp Business",
        sourceType: "Online"
    },
    {
        sourceName: "Email Campaign",
        source: "Email Marketing",
        subSource: "Newsletter",
        sourceType: "Online"
    },
    {
        sourceName: "School Visit",
        source: "Direct",
        subSource: "School Outreach",
        sourceType: "Offline"
    },
    {
        sourceName: "LinkedIn",
        source: "Social Media",
        subSource: "LinkedIn Ads",
        sourceType: "Online"
    },
    {
        sourceName: "Banner/Hoarding",
        source: "Outdoor Advertising",
        subSource: "Billboard",
        sourceType: "Offline"
    },
    {
        sourceName: "Newspaper Ad",
        source: "Print Media",
        subSource: "Classified",
        sourceType: "Offline"
    },
    {
        sourceName: "SMS Campaign",
        source: "Direct Marketing",
        subSource: "Bulk SMS",
        sourceType: "Online"
    },
    {
        sourceName: "Education Fair",
        source: "Events",
        subSource: "Exhibition",
        sourceType: "Offline"
    }
];

const seedSources = async () => {
    try {
        await connectDB();

        // Clear existing sources
        await Sources.deleteMany({});
        console.log("Cleared existing sources");

        // Insert new sources
        const createdSources = await Sources.insertMany(sourcesData);
        console.log(`✅ Successfully seeded ${createdSources.length} sources`);

        console.log("\nSeeded Sources:");
        createdSources.forEach((source, index) => {
            console.log(`${index + 1}. ${source.sourceName} (${source.sourceType})`);
        });

        process.exit(0);
    } catch (error) {
        console.error("Error seeding sources:", error);
        process.exit(1);
    }
};

seedSources();
