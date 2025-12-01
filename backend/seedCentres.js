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
        phoneNumber: "9876543210",
        salesPassword: "password123",
        location: "Kolkata",
        address: "123, Park Street, Kolkata",
        locationPreview: "https://maps.google.com/?q=Kolkata",
        enterGstNo: "19ABCDE1234F1Z5",
        enterCorporateOfficeAddress: "456, Camac Street, Kolkata",
        enterCorporateOfficePhoneNumber: "033-12345678"
    },
    {
        centreName: "Mumbai Andheri Branch",
        enterCode: "MUM001",
        state: "Maharashtra",
        email: "mumbai.andheri@pathfinder.com",
        phoneNumber: "9876543211",
        salesPassword: "password123",
        location: "Mumbai",
        address: "Andheri West, Mumbai",
        locationPreview: "https://maps.google.com/?q=Mumbai",
        enterGstNo: "27ABCDE1234F1Z5",
        enterCorporateOfficeAddress: "Bandra Kurla Complex, Mumbai",
        enterCorporateOfficePhoneNumber: "022-12345678"
    },
    {
        centreName: "Delhi CP Branch",
        enterCode: "DEL001",
        state: "Delhi",
        email: "delhi.cp@pathfinder.com",
        phoneNumber: "9876543212",
        salesPassword: "password123",
        location: "Delhi",
        address: "Connaught Place, Delhi",
        locationPreview: "https://maps.google.com/?q=Delhi",
        enterGstNo: "07ABCDE1234F1Z5",
        enterCorporateOfficeAddress: "Nehru Place, Delhi",
        enterCorporateOfficePhoneNumber: "011-12345678"
    },
    {
        centreName: "Bangalore Koramangala",
        enterCode: "BLR001",
        state: "Karnataka",
        email: "bangalore.kora@pathfinder.com",
        phoneNumber: "9876543213",
        salesPassword: "password123",
        location: "Bangalore",
        address: "Koramangala 5th Block, Bangalore",
        locationPreview: "https://maps.google.com/?q=Bangalore",
        enterGstNo: "29ABCDE1234F1Z5",
        enterCorporateOfficeAddress: "MG Road, Bangalore",
        enterCorporateOfficePhoneNumber: "080-12345678"
    },
    {
        centreName: "Chennai Anna Nagar",
        enterCode: "CHN001",
        state: "Tamil Nadu",
        email: "chennai.anna@pathfinder.com",
        phoneNumber: "9876543214",
        salesPassword: "password123",
        location: "Chennai",
        address: "Anna Nagar, Chennai",
        locationPreview: "https://maps.google.com/?q=Chennai",
        enterGstNo: "33ABCDE1234F1Z5",
        enterCorporateOfficeAddress: "T Nagar, Chennai",
        enterCorporateOfficePhoneNumber: "044-12345678"
    },
    {
        centreName: "Hyderabad Jubilee Hills",
        enterCode: "HYD001",
        state: "Telangana",
        email: "hyd.jubilee@pathfinder.com",
        phoneNumber: "9876543215",
        salesPassword: "password123",
        location: "Hyderabad",
        address: "Jubilee Hills, Hyderabad",
        locationPreview: "https://maps.google.com/?q=Hyderabad",
        enterGstNo: "36ABCDE1234F1Z5",
        enterCorporateOfficeAddress: "Hitech City, Hyderabad",
        enterCorporateOfficePhoneNumber: "040-12345678"
    },
    {
        centreName: "Pune Viman Nagar",
        enterCode: "PUN001",
        state: "Maharashtra",
        email: "pune.viman@pathfinder.com",
        phoneNumber: "9876543216",
        salesPassword: "password123",
        location: "Pune",
        address: "Viman Nagar, Pune",
        locationPreview: "https://maps.google.com/?q=Pune",
        enterGstNo: "27ABCDE1234F1Z6",
        enterCorporateOfficeAddress: "Shivaji Nagar, Pune",
        enterCorporateOfficePhoneNumber: "020-12345678"
    },
    {
        centreName: "Ahmedabad Satellite",
        enterCode: "AHM001",
        state: "Gujarat",
        email: "ahmedabad.sat@pathfinder.com",
        phoneNumber: "9876543217",
        salesPassword: "password123",
        location: "Ahmedabad",
        address: "Satellite Road, Ahmedabad",
        locationPreview: "https://maps.google.com/?q=Ahmedabad",
        enterGstNo: "24ABCDE1234F1Z5",
        enterCorporateOfficeAddress: "CG Road, Ahmedabad",
        enterCorporateOfficePhoneNumber: "079-12345678"
    },
    {
        centreName: "Jaipur Malviya Nagar",
        enterCode: "JAI001",
        state: "Rajasthan",
        email: "jaipur.malviya@pathfinder.com",
        phoneNumber: "9876543218",
        salesPassword: "password123",
        location: "Jaipur",
        address: "Malviya Nagar, Jaipur",
        locationPreview: "https://maps.google.com/?q=Jaipur",
        enterGstNo: "08ABCDE1234F1Z5",
        enterCorporateOfficeAddress: "C Scheme, Jaipur",
        enterCorporateOfficePhoneNumber: "0141-12345678"
    },
    {
        centreName: "Lucknow Gomti Nagar",
        enterCode: "LKO001",
        state: "Uttar Pradesh",
        email: "lucknow.gomti@pathfinder.com",
        phoneNumber: "9876543219",
        salesPassword: "password123",
        location: "Lucknow",
        address: "Gomti Nagar, Lucknow",
        locationPreview: "https://maps.google.com/?q=Lucknow",
        enterGstNo: "09ABCDE1234F1Z5",
        enterCorporateOfficeAddress: "Hazratganj, Lucknow",
        enterCorporateOfficePhoneNumber: "0522-12345678"
    }
];

const seedDB = async () => {
    try {
        await connectDB();
        await CentreSchema.deleteMany({}); // Clear existing data
        await CentreSchema.insertMany(centres);
        console.log("Database seeded with 10 centres!");
        process.exit();
    } catch (err) {
        console.error("Error seeding database:", err);
        process.exit(1);
    }
};

seedDB();
