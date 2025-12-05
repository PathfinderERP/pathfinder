import mongoose from "mongoose";
import dotenv from "dotenv";
import CentreSchema from "./models/Master_data/Centre.js";
import connectDB from "./db/connect.js";

dotenv.config();

const centres = [
    {
        centreName: "Kolkata Main Campus",
        enterCode: "KOL001",
        state: "West Bengal",
        email: "kolkata.main@pathfinder.com",
        phoneNumber: "9830012345",
        salesPassword: "password123",
        location: "Kolkata",
        address: "12B, Park Street, Mullick Bazar, Park Street area, Kolkata, West Bengal 700017",
        locationPreview: "https://maps.google.com/?q=Park+Street+Kolkata",
        enterGstNo: "19AAACP1234A1Z5",
        enterCorporateOfficeAddress: "12B, Park Street, Kolkata, West Bengal 700017",
        enterCorporateOfficePhoneNumber: "033-22223333"
    },
    {
        centreName: "Kolkata Salt Lake",
        enterCode: "KOL002",
        state: "West Bengal",
        email: "kolkata.saltlake@pathfinder.com",
        phoneNumber: "9830012346",
        salesPassword: "password123",
        location: "Kolkata",
        address: "DN-12, Sector V, Salt Lake City, Kolkata, West Bengal 700091",
        locationPreview: "https://maps.google.com/?q=Salt+Lake+Sector+V+Kolkata",
        enterGstNo: "19AAACP1234A1Z5",
        enterCorporateOfficeAddress: "12B, Park Street, Kolkata, West Bengal 700017",
        enterCorporateOfficePhoneNumber: "033-22223333"
    },
    {
        centreName: "Kolkata Gariahat",
        enterCode: "KOL003",
        state: "West Bengal",
        email: "kolkata.gariahat@pathfinder.com",
        phoneNumber: "9830012347",
        salesPassword: "password123",
        location: "Kolkata",
        address: "21/1, Gariahat Road, Ballygunge, Kolkata, West Bengal 700019",
        locationPreview: "https://maps.google.com/?q=Gariahat+Kolkata",
        enterGstNo: "19AAACP1234A1Z5",
        enterCorporateOfficeAddress: "12B, Park Street, Kolkata, West Bengal 700017",
        enterCorporateOfficePhoneNumber: "033-22223333"
    },
    {
        centreName: "Siliguri Hill Cart Road",
        enterCode: "SIL001",
        state: "West Bengal",
        email: "siliguri.main@pathfinder.com",
        phoneNumber: "9832012345",
        salesPassword: "password123",
        location: "Siliguri",
        address: "Sevoke Road, Ward 10, Janta Nagar, Siliguri, West Bengal 734001",
        locationPreview: "https://maps.google.com/?q=Siliguri",
        enterGstNo: "19AAACP1234A1Z5",
        enterCorporateOfficeAddress: "12B, Park Street, Kolkata, West Bengal 700017",
        enterCorporateOfficePhoneNumber: "033-22223333"
    },
    {
        centreName: "Durgapur City Centre",
        enterCode: "DGP001",
        state: "West Bengal",
        email: "durgapur.citycentre@pathfinder.com",
        phoneNumber: "9434012345",
        salesPassword: "password123",
        location: "Durgapur",
        address: "A-4, City Centre, Durgapur, West Bengal 713216",
        locationPreview: "https://maps.google.com/?q=Durgapur+City+Centre",
        enterGstNo: "19AAACP1234A1Z5",
        enterCorporateOfficeAddress: "12B, Park Street, Kolkata, West Bengal 700017",
        enterCorporateOfficePhoneNumber: "033-22223333"
    },
    {
        centreName: "Asansol GT Road",
        enterCode: "ASN001",
        state: "West Bengal",
        email: "asansol.gtroad@pathfinder.com",
        phoneNumber: "9434012346",
        salesPassword: "password123",
        location: "Asansol",
        address: "GT Road, Murgisol, Asansol, West Bengal 713303",
        locationPreview: "https://maps.google.com/?q=Asansol",
        enterGstNo: "19AAACP1234A1Z5",
        enterCorporateOfficeAddress: "12B, Park Street, Kolkata, West Bengal 700017",
        enterCorporateOfficePhoneNumber: "033-22223333"
    },
    {
        centreName: "Howrah Maidan",
        enterCode: "HWH001",
        state: "West Bengal",
        email: "howrah.maidan@pathfinder.com",
        phoneNumber: "9831012345",
        salesPassword: "password123",
        location: "Howrah",
        address: "45, GT Road, Howrah Maidan, Howrah, West Bengal 711101",
        locationPreview: "https://maps.google.com/?q=Howrah+Maidan",
        enterGstNo: "19AAACP1234A1Z5",
        enterCorporateOfficeAddress: "12B, Park Street, Kolkata, West Bengal 700017",
        enterCorporateOfficePhoneNumber: "033-22223333"
    },
    {
        centreName: "Kharagpur Inda",
        enterCode: "KGP001",
        state: "West Bengal",
        email: "kharagpur.inda@pathfinder.com",
        phoneNumber: "9933012345",
        salesPassword: "password123",
        location: "Kharagpur",
        address: "Inda, Kharagpur, West Bengal 721305",
        locationPreview: "https://maps.google.com/?q=Kharagpur",
        enterGstNo: "19AAACP1234A1Z5",
        enterCorporateOfficeAddress: "12B, Park Street, Kolkata, West Bengal 700017",
        enterCorporateOfficePhoneNumber: "033-22223333"
    },
    {
        centreName: "Bardhaman Curzon Gate",
        enterCode: "BDN001",
        state: "West Bengal",
        email: "bardhaman.curzon@pathfinder.com",
        phoneNumber: "9433012345",
        salesPassword: "password123",
        location: "Bardhaman",
        address: "BC Road, Near Curzon Gate, Bardhaman, West Bengal 713101",
        locationPreview: "https://maps.google.com/?q=Bardhaman",
        enterGstNo: "19AAACP1234A1Z5",
        enterCorporateOfficeAddress: "12B, Park Street, Kolkata, West Bengal 700017",
        enterCorporateOfficePhoneNumber: "033-22223333"
    },
    {
        centreName: "Malda English Bazar",
        enterCode: "MLD001",
        state: "West Bengal",
        email: "malda.englishbazar@pathfinder.com",
        phoneNumber: "9733012345",
        salesPassword: "password123",
        location: "Malda",
        address: "NH12, English Bazar, Malda, West Bengal 732101",
        locationPreview: "https://maps.google.com/?q=Malda",
        enterGstNo: "19AAACP1234A1Z5",
        enterCorporateOfficeAddress: "12B, Park Street, Kolkata, West Bengal 700017",
        enterCorporateOfficePhoneNumber: "033-22223333"
    }
];

const seedDB = async () => {
    try {
        await connectDB();
        await CentreSchema.deleteMany({}); // Clear existing data
        await CentreSchema.insertMany(centres);
        console.log("Database seeded with 10 West Bengal centres!");
        process.exit();
    } catch (err) {
        console.error("Error seeding database:", err);
        process.exit(1);
    }
};

seedDB();
