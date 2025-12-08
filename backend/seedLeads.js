import mongoose from "mongoose";
import dotenv from "dotenv";
import LeadManagement from "./models/LeadManagement.js";
import Class from "./models/Master_data/Class.js";
import CentreSchema from "./models/Master_data/Centre.js";
import Course from "./models/Master_data/Courses.js";
import Sources from "./models/Master_data/Sources.js";
import connectDB from "./db/connect.js";

dotenv.config();

const seedLeads = async () => {
    try {
        await connectDB();

        // Fetch existing data
        const classes = await Class.find();
        const centres = await CentreSchema.find();
        const courses = await Course.find();
        const sources = await Sources.find();

        if (classes.length === 0 || centres.length === 0) {
            console.log("❌ Please seed classes and centres first!");
            process.exit(1);
        }

        // Clear existing leads
        await LeadManagement.deleteMany({});
        console.log("Cleared existing leads");

        // Sample lead data
        const leadsData = [
            {
                name: "Rohan Sharma",
                email: "rohan.sharma@gmail.com",
                phoneNumber: "9876543210",
                schoolName: "Delhi Public School",
                className: classes[0]?._id,
                centre: centres[0]?._id,
                course: courses[0]?._id,
                source: sources.find(s => s.sourceName === "Facebook")?.sourceName || "Facebook",
                targetExam: "JEE",
                leadType: "HOT LEAD",
                leadResponsibility: "John Doe"
            },
            {
                name: "Priya Patel",
                email: "priya.patel@gmail.com",
                phoneNumber: "9876543211",
                schoolName: "Ryan International School",
                className: classes[1]?._id || classes[0]?._id,
                centre: centres[0]?._id,
                course: courses[1]?._id || courses[0]?._id,
                source: sources.find(s => s.sourceName === "Instagram")?.sourceName || "Instagram",
                targetExam: "NEET",
                leadType: "HOT LEAD",
                leadResponsibility: "Jane Smith"
            },
            {
                name: "Amit Kumar",
                email: "amit.kumar@gmail.com",
                phoneNumber: "9876543212",
                schoolName: "St. Xavier's School",
                className: classes[0]?._id,
                centre: centres[1]?._id || centres[0]?._id,
                course: courses[0]?._id,
                source: sources.find(s => s.sourceName === "Walk-in")?.sourceName || "Walk-in",
                targetExam: "JEE",
                leadType: "COLD LEAD",
                leadResponsibility: "John Doe"
            },
            {
                name: "Sneha Reddy",
                email: "sneha.reddy@gmail.com",
                phoneNumber: "9876543213",
                schoolName: "Kendriya Vidyalaya",
                className: classes[1]?._id || classes[0]?._id,
                centre: centres[0]?._id,
                course: courses[1]?._id || courses[0]?._id,
                source: sources.find(s => s.sourceName === "Website")?.sourceName || "Website",
                targetExam: "NEET",
                leadType: "HOT LEAD",
                leadResponsibility: "Jane Smith"
            },
            {
                name: "Vikram Singh",
                email: "vikram.singh@gmail.com",
                phoneNumber: "9876543214",
                schoolName: "DAV Public School",
                className: classes[0]?._id,
                centre: centres[1]?._id || centres[0]?._id,
                course: courses[0]?._id,
                source: sources.find(s => s.sourceName === "Google Ads")?.sourceName || "Google Ads",
                targetExam: "JEE",
                leadType: "HOT LEAD",
                leadResponsibility: "John Doe"
            },
            {
                name: "Ananya Gupta",
                email: "ananya.gupta@gmail.com",
                phoneNumber: "9876543215",
                schoolName: "Modern School",
                className: classes[1]?._id || classes[0]?._id,
                centre: centres[0]?._id,
                course: courses[1]?._id || courses[0]?._id,
                source: sources.find(s => s.sourceName === "Referral")?.sourceName || "Referral",
                targetExam: "NEET",
                leadType: "COLD LEAD",
                leadResponsibility: "Jane Smith"
            },
            {
                name: "Rahul Verma",
                email: "rahul.verma@gmail.com",
                phoneNumber: "9876543216",
                schoolName: "Amity International",
                className: classes[0]?._id,
                centre: centres[0]?._id,
                course: courses[0]?._id,
                source: sources.find(s => s.sourceName === "WhatsApp")?.sourceName || "WhatsApp",
                targetExam: "JEE",
                leadType: "HOT LEAD",
                leadResponsibility: "John Doe"
            },
            {
                name: "Kavya Iyer",
                email: "kavya.iyer@gmail.com",
                phoneNumber: "9876543217",
                schoolName: "Vidya Mandir",
                className: classes[1]?._id || classes[0]?._id,
                centre: centres[1]?._id || centres[0]?._id,
                course: courses[1]?._id || courses[0]?._id,
                source: sources.find(s => s.sourceName === "YouTube")?.sourceName || "YouTube",
                targetExam: "NEET",
                leadType: "NEGATIVE",
                leadResponsibility: "Jane Smith"
            },
            {
                name: "Arjun Nair",
                email: "arjun.nair@gmail.com",
                phoneNumber: "9876543218",
                schoolName: "Bal Bharati Public School",
                className: classes[0]?._id,
                centre: centres[0]?._id,
                course: courses[0]?._id,
                source: sources.find(s => s.sourceName === "School Visit")?.sourceName || "School Visit",
                targetExam: "JEE",
                leadType: "COLD LEAD",
                leadResponsibility: "John Doe"
            },
            {
                name: "Meera Joshi",
                email: "meera.joshi@gmail.com",
                phoneNumber: "9876543219",
                schoolName: "Springdales School",
                className: classes[1]?._id || classes[0]?._id,
                centre: centres[0]?._id,
                course: courses[1]?._id || courses[0]?._id,
                source: sources.find(s => s.sourceName === "Email Campaign")?.sourceName || "Email Campaign",
                targetExam: "NEET",
                leadType: "HOT LEAD",
                leadResponsibility: "Jane Smith"
            },
            {
                name: "Karthik Menon",
                email: "karthik.menon@gmail.com",
                phoneNumber: "9876543220",
                schoolName: "The Heritage School",
                className: classes[0]?._id,
                centre: centres[1]?._id || centres[0]?._id,
                course: courses[0]?._id,
                source: sources.find(s => s.sourceName === "LinkedIn")?.sourceName || "LinkedIn",
                targetExam: "JEE",
                leadType: "COLD LEAD",
                leadResponsibility: "John Doe"
            },
            {
                name: "Divya Krishnan",
                email: "divya.krishnan@gmail.com",
                phoneNumber: "9876543221",
                schoolName: "Lotus Valley International",
                className: classes[1]?._id || classes[0]?._id,
                centre: centres[0]?._id,
                course: courses[1]?._id || courses[0]?._id,
                source: sources.find(s => s.sourceName === "Education Fair")?.sourceName || "Education Fair",
                targetExam: "NEET",
                leadType: "HOT LEAD",
                leadResponsibility: "Jane Smith"
            },
            {
                name: "Siddharth Rao",
                email: "siddharth.rao@gmail.com",
                phoneNumber: "9876543222",
                schoolName: "GD Goenka Public School",
                className: classes[0]?._id,
                centre: centres[0]?._id,
                course: courses[0]?._id,
                source: sources.find(s => s.sourceName === "Banner/Hoarding")?.sourceName || "Banner/Hoarding",
                targetExam: "JEE",
                leadType: "NEGATIVE",
                leadResponsibility: "John Doe"
            },
            {
                name: "Aishwarya Desai",
                email: "aishwarya.desai@gmail.com",
                phoneNumber: "9876543223",
                schoolName: "Sanskriti School",
                className: classes[1]?._id || classes[0]?._id,
                centre: centres[1]?._id || centres[0]?._id,
                course: courses[1]?._id || courses[0]?._id,
                source: sources.find(s => s.sourceName === "SMS Campaign")?.sourceName || "SMS Campaign",
                targetExam: "NEET",
                leadType: "COLD LEAD",
                leadResponsibility: "Jane Smith"
            },
            {
                name: "Nikhil Agarwal",
                email: "nikhil.agarwal@gmail.com",
                phoneNumber: "9876543224",
                schoolName: "Vasant Valley School",
                className: classes[0]?._id,
                centre: centres[0]?._id,
                course: courses[0]?._id,
                source: sources.find(s => s.sourceName === "Newspaper Ad")?.sourceName || "Newspaper Ad",
                targetExam: "JEE",
                leadType: "HOT LEAD",
                leadResponsibility: "John Doe"
            }
        ];

        // Insert leads
        const createdLeads = await LeadManagement.insertMany(leadsData);
        console.log(`✅ Successfully seeded ${createdLeads.length} leads`);

        console.log("\nSeeded Leads Summary:");
        const hotLeads = createdLeads.filter(l => l.leadType === "HOT LEAD").length;
        const coldLeads = createdLeads.filter(l => l.leadType === "COLD LEAD").length;
        const negativeLeads = createdLeads.filter(l => l.leadType === "NEGATIVE").length;

        console.log(`🔴 HOT LEADS: ${hotLeads}`);
        console.log(`🔵 COLD LEADS: ${coldLeads}`);
        console.log(`⚫ NEGATIVE: ${negativeLeads}`);

        process.exit(0);
    } catch (error) {
        console.error("Error seeding leads:", error);
        process.exit(1);
    }
};

seedLeads();
