import mongoose from "mongoose";
import Student from "./models/Students.js";
import dotenv from "dotenv";

import dns from "dns";

dotenv.config();

// Force Node.js to use Google DNS servers instead of system DNS
// ONLY if not running on Render (Render has its own DNS)
if (!process.env.RENDER) {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
}

// Sample student data - 20 students total
const sampleStudents = [
    // {
    //     studentsDetails: [{
    //         studentName: "Arjun Mukherjee",
    //         dateOfBirth: "2006-04-10",
    //         gender: "Male",
    //         centre: "Siliguri",
    //         board: "CBSE",
    //         state: "West Bengal",
    //         studentEmail: "arjun.mukherjee@example.com",
    //         mobileNum: "9123456701",
    //         whatsappNumber: "9123456701",
    //         schoolName: "Delhi Public School",
    //         pincode: "734001",
    //         source: "Online",
    //         address: "Burdwan Road, Siliguri",
    //         guardians: [{
    //             guardianName: "Mr. Mukherjee",
    //             qualification: "MBA",
    //             guardianEmail: "guardian.arjun@example.com",
    //             guardianMobile: "9876500001",
    //             occupation: "Bank Manager",
    //             annualIncome: "14 LPA",
    //             organizationName: "HDFC Bank",
    //             designation: "Branch Manager",
    //             officeAddress: "Sevoke Road, Siliguri"
    //         }],
    //         examSchema: [{
    //             examName: "Class 10 Final",
    //             class: "10",
    //             examStatus: "Passed",
    //             markAgregate: "96",
    //             scienceMathParcent: "95"
    //         }]
    //     }],
    //     guardians: [{
    //         guardianName: "Mr. Mukherjee",
    //         qualification: "MBA",
    //         guardianEmail: "guardian.arjun@example.com",
    //         guardianMobile: "9876500001",
    //         occupation: "Bank Manager",
    //         annualIncome: "14 LPA",
    //         organizationName: "HDFC Bank",
    //         designation: "Branch Manager",
    //         officeAddress: "Sevoke Road, Siliguri"
    //     }],
    //     examSchema: [{
    //         examName: "Class 10 Final",
    //         class: "10",
    //         examStatus: "Passed",
    //         markAgregate: "96",
    //         scienceMathParcent: "95"
    //     }],
    //     section: [],
    //     sessionExamCourse: [{
    //         session: "2024-25",
    //         examTag: "JEE",
    //         targetExams: "JEE Main"
    //     }],
    //     studentStatus: [{
    //         status: "Hot",
    //         enrolledStatus: "Enrolled"
    //     }]
    // },

    // {
    //     studentsDetails: [{
    //         studentName: "Priya Banerjee",
    //         dateOfBirth: "2007-01-21",
    //         gender: "Female",
    //         centre: "Durgapur",
    //         board: "ICSE",
    //         state: "West Bengal",
    //         studentEmail: "priya.banerjee@example.com",
    //         mobileNum: "9123456702",
    //         whatsappNumber: "9123456702",
    //         schoolName: "Hem Sheela Model School",
    //         pincode: "713216",
    //         source: "Walk-in",
    //         address: "Benachity Market, Durgapur",
    //         guardians: [{
    //             guardianName: "Mrs. Banerjee",
    //             qualification: "M.Sc",
    //             guardianEmail: "guardian.priya@example.com",
    //             guardianMobile: "9876500002",
    //             occupation: "Teacher",
    //             annualIncome: "6 LPA",
    //             organizationName: "Govt. School",
    //             designation: "Teacher",
    //             officeAddress: "City Center, Durgapur"
    //         }],
    //         examSchema: [{
    //             examName: "Class 10 Final",
    //             class: "10",
    //             examStatus: "Passed",
    //             markAgregate: "94",
    //             scienceMathParcent: "93"
    //         }]
    //     }],
    //     guardians: [{
    //         guardianName: "Mrs. Banerjee",
    //         qualification: "M.Sc",
    //         guardianEmail: "guardian.priya@example.com",
    //         guardianMobile: "9876500002",
    //         occupation: "Teacher",
    //         annualIncome: "6 LPA",
    //         organizationName: "Govt. School",
    //         designation: "Teacher",
    //         officeAddress: "City Center, Durgapur"
    //     }],
    //     examSchema: [{
    //         examName: "Class 10 Final",
    //         class: "10",
    //         examStatus: "Passed",
    //         markAgregate: "94",
    //         scienceMathParcent: "93"
    //     }],
    //     section: [],
    //     sessionExamCourse: [{
    //         session: "2024-25",
    //         examTag: "NEET",
    //         targetExams: "NEET"
    //     }],
    //     studentStatus: [{
    //         status: "Cold",
    //         enrolledStatus: "Not Enrolled"
    //     }]
    // },

    // {
    //     studentsDetails: [{
    //         studentName: "Rahul Sharma",
    //         dateOfBirth: "2005-12-11",
    //         gender: "Male",
    //         centre: "Asansol",
    //         board: "CBSE",
    //         state: "West Bengal",
    //         studentEmail: "rahul.sharma@example.com",
    //         mobileNum: "9123456703",
    //         whatsappNumber: "9123456703",
    //         schoolName: "St. Vincent School",
    //         pincode: "713301",
    //         source: "Referral",
    //         address: "Hutton Road, Asansol",
    //         guardians: [{
    //             guardianName: "Mr. Sharma",
    //             qualification: "B.Tech",
    //             guardianEmail: "guardian.rahul@example.com",
    //             guardianMobile: "9876500003",
    //             occupation: "Engineer",
    //             annualIncome: "9 LPA",
    //             organizationName: "Tata Steel",
    //             designation: "Supervisor",
    //             officeAddress: "Burna Road, Asansol"
    //         }],
    //         examSchema: [{
    //             examName: "Class 12 Final",
    //             class: "12",
    //             examStatus: "Passed",
    //             markAgregate: "91",
    //             scienceMathParcent: "92"
    //         }]
    //     }],
    //     guardians: [{
    //         guardianName: "Mr. Sharma",
    //         qualification: "B.Tech",
    //         guardianEmail: "guardian.rahul@example.com",
    //         guardianMobile: "9876500003",
    //         occupation: "Engineer",
    //         annualIncome: "9 LPA",
    //         organizationName: "Tata Steel",
    //         designation: "Supervisor",
    //         officeAddress: "Burna Road, Asansol"
    //     }],
    //     examSchema: [{
    //         examName: "Class 12 Final",
    //         class: "12",
    //         examStatus: "Passed",
    //         markAgregate: "91",
    //         scienceMathParcent: "92"
    //     }],
    //     section: [],
    //     sessionExamCourse: [{
    //         session: "2024-25",
    //         examTag: "wbjee",
    //         targetExams: "WBJEE"
    //     }],
    //     studentStatus: [{
    //         status: "Negative",
    //         enrolledStatus: "Not Enrolled"
    //     }]
    // },

    // {
    //     studentsDetails: [{
    //         studentName: "Sneha Ghosh",
    //         dateOfBirth: "2006-09-02",
    //         gender: "Female",
    //         centre: "Kharagpur",
    //         board: "CBSE",
    //         state: "West Bengal",
    //         studentEmail: "sneha.ghosh@example.com",
    //         mobileNum: "9123456704",
    //         whatsappNumber: "9123456704",
    //         schoolName: "Kendriya Vidyalaya",
    //         pincode: "721301",
    //         source: "Online",
    //         address: "Inda, Kharagpur",
    //         guardians: [{
    //             guardianName: "Mr. Ghosh",
    //             qualification: "M.Tech",
    //             guardianEmail: "guardian.sneha@example.com",
    //             guardianMobile: "9876500004",
    //             occupation: "Professor",
    //             annualIncome: "11 LPA",
    //             organizationName: "IIT Kharagpur",
    //             designation: "Assistant Professor",
    //             officeAddress: "IIT Campus, Kharagpur"
    //         }],
    //         examSchema: [{
    //             examName: "Class 11 Final",
    //             class: "11",
    //             examStatus: "Passed",
    //             markAgregate: "95",
    //             scienceMathParcent: "94"
    //         }]
    //     }],
    //     guardians: [{
    //         guardianName: "Mr. Ghosh",
    //         qualification: "M.Tech",
    //         guardianEmail: "guardian.sneha@example.com",
    //         guardianMobile: "9876500004",
    //         occupation: "Professor",
    //         annualIncome: "11 LPA",
    //         organizationName: "IIT Kharagpur",
    //         designation: "Assistant Professor",
    //         officeAddress: "IIT Campus, Kharagpur"
    //     }],
    //     examSchema: [{
    //         examName: "Class 11 Final",
    //         class: "11",
    //         examStatus: "Passed",
    //         markAgregate: "95",
    //         scienceMathParcent: "94"
    //     }],
    //     section: [],
    //     sessionExamCourse: [{
    //         session: "2024-25",
    //         examTag: "NEET",
    //         targetExams: "NEET"
    //     }],
    //     studentStatus: [{
    //         status: "Hot",
    //         enrolledStatus: "Enrolled"
    //     }]
    // },

    // {
    //     studentsDetails: [{
    //         studentName: "Ritwick Roy",
    //         dateOfBirth: "2005-08-14",
    //         gender: "Male",
    //         centre: "Kolkata",
    //         board: "ICSE",
    //         state: "West Bengal",
    //         studentEmail: "ritwick.roy@example.com",
    //         mobileNum: "9123456705",
    //         whatsappNumber: "9123456705",
    //         schoolName: "South Point High School",
    //         pincode: "700068",
    //         source: "Walk-in",
    //         address: "Gariahat, Kolkata",
    //         guardians: [{
    //             guardianName: "Mr. Roy",
    //             qualification: "MBA",
    //             guardianEmail: "guardian.ritwick@example.com",
    //             guardianMobile: "9876500005",
    //             occupation: "Businessman",
    //             annualIncome: "25 LPA",
    //             organizationName: "Roy Group",
    //             designation: "Owner",
    //             officeAddress: "Park Street, Kolkata"
    //         }],
    //         examSchema: [{
    //             examName: "Class 12 Final",
    //             class: "12",
    //             examStatus: "Passed",
    //             markAgregate: "93",
    //             scienceMathParcent: "94"
    //         }]
    //     }],
    //     guardians: [{
    //         guardianName: "Mr. Roy",
    //         qualification: "MBA",
    //         guardianEmail: "guardian.ritwick@example.com",
    //         guardianMobile: "9876500005",
    //         occupation: "Businessman",
    //         annualIncome: "25 LPA",
    //         organizationName: "Roy Group",
    //         designation: "Owner",
    //         officeAddress: "Park Street, Kolkata"
    //     }],
    //     examSchema: [{
    //         examName: "Class 12 Final",
    //         class: "12",
    //         examStatus: "Passed",
    //         markAgregate: "93",
    //         scienceMathParcent: "94"
    //     }],
    //     section: [],
    //     sessionExamCourse: [{
    //         session: "2024-25",
    //         examTag: "JEE",
    //         targetExams: "JEE Main"
    //     }],
    //     studentStatus: [{
    //         status: "Hot",
    //         enrolledStatus: "Enrolled"
    //     }]
    // },

    // {
    //     studentsDetails: [{
    //         studentName: "Tanmoy Dutta",
    //         dateOfBirth: "2007-02-09",
    //         gender: "Male",
    //         centre: "Howrah",
    //         board: "CBSE",
    //         state: "West Bengal",
    //         studentEmail: "tanmoy.dutta@example.com",
    //         mobileNum: "9123456706",
    //         whatsappNumber: "9123456706",
    //         schoolName: "Don Bosco School",
    //         pincode: "711101",
    //         source: "Referral",
    //         address: "Shibpur, Howrah",
    //         guardians: [{
    //             guardianName: "Mr. Dutta",
    //             qualification: "CA",
    //             guardianEmail: "guardian.tanmoy@example.com",
    //             guardianMobile: "9876500006",
    //             occupation: "Chartered Accountant",
    //             annualIncome: "18 LPA",
    //             organizationName: "Dutta & Co.",
    //             designation: "Partner",
    //             officeAddress: "Howrah Maidan"
    //         }],
    //         examSchema: [{
    //             examName: "Class 10 Final",
    //             class: "10",
    //             examStatus: "Passed",
    //             markAgregate: "97",
    //             scienceMathParcent: "98"
    //         }]
    //     }],
    //     guardians: [{
    //         guardianName: "Mr. Dutta",
    //         qualification: "CA",
    //         guardianEmail: "guardian.tanmoy@example.com",
    //         guardianMobile: "9876500006",
    //         occupation: "Chartered Accountant",
    //         annualIncome: "18 LPA",
    //         organizationName: "Dutta & Co.",
    //         designation: "Partner",
    //         officeAddress: "Howrah Maidan"
    //     }],
    //     examSchema: [{
    //         examName: "Class 10 Final",
    //         class: "10",
    //         examStatus: "Passed",
    //         markAgregate: "97",
    //         scienceMathParcent: "98"
    //     }],
    //     section: [],
    //     sessionExamCourse: [{
    //         session: "2024-25",
    //         examTag: "NEET",
    //         targetExams: "NEET"
    //     }],
    //     studentStatus: [{
    //         status: "Cold",
    //         enrolledStatus: "Not Enrolled"
    //     }]
    // }


    {
    studentsDetails: [{
        studentName: "Aditya Chatterjee",
        dateOfBirth: "2006-07-14",
        gender: "Male",
        centre: "Siliguri",
        board: "CBSE",
        state: "West Bengal",
        studentEmail: "aditya.chatterjee@example.com",
        mobileNum: "9123456710",
        whatsappNumber: "9123456710",
        schoolName: "Delhi Public School",
        pincode: "734001",
        source: "Online",
        address: "Sevoke Road, Siliguri",
        guardians: [{
            guardianName: "Mr. Chatterjee",
            qualification: "B.Com",
            guardianEmail: "guardian.aditya@example.com",
            guardianMobile: "9876500010",
            occupation: "Accountant",
            annualIncome: "7 LPA",
            organizationName: "Tata Consultancy",
            designation: "Senior Accountant",
            officeAddress: "Siliguri Junction"
        }],
        examSchema: [{
            examName: "Class 10 Final",
            class: "10",
            examStatus: "Passed",
            markAgregate: "92",
            scienceMathParcent: "91"
        }]
    }],
    guardians: [{
        guardianName: "Mr. Chatterjee",
        qualification: "B.Com",
        guardianEmail: "guardian.aditya@example.com",
        guardianMobile: "9876500010",
        occupation: "Accountant",
        annualIncome: "7 LPA",
        organizationName: "Tata Consultancy",
        designation: "Senior Accountant",
        officeAddress: "Siliguri Junction"
    }],
    examSchema: [{
        examName: "Class 10 Final",
        class: "10",
        examStatus: "Passed",
        markAgregate: "92",
        scienceMathParcent: "91"
    }],
    section: [],
    sessionExamCourse: [{
        session: "2024-25",
        examTag: "JEE",
        targetExams: "JEE Main"
    }],
    studentStatus: [{
        status: "Hot",
        enrolledStatus: "Not Enrolled"
    }]
},
{
    studentsDetails: [{
        studentName: "Megha Sen",
        dateOfBirth: "2007-11-20",
        gender: "Female",
        centre: "Durgapur",
        board: "ICSE",
        state: "West Bengal",
        studentEmail: "megha.sen@example.com",
        mobileNum: "9123456711",
        whatsappNumber: "9123456711",
        schoolName: "Hem Sheela Model School",
        pincode: "713216",
        source: "Walk-in",
        address: "City Center, Durgapur",
        guardians: [{
            guardianName: "Mrs. Sen",
            qualification: "M.A",
            guardianEmail: "guardian.megha@example.com",
            guardianMobile: "9876500011",
            occupation: "Teacher",
            annualIncome: "5 LPA",
            organizationName: "Sail School",
            designation: "Teacher",
            officeAddress: "Durgapur Steel Township"
        }],
        examSchema: [{
            examName: "Class 10 Final",
            class: "10",
            examStatus: "Passed",
            markAgregate: "89",
            scienceMathParcent: "88"
        }]
    }],
    guardians: [{
        guardianName: "Mrs. Sen",
        qualification: "M.A",
        guardianEmail: "guardian.megha@example.com",
        guardianMobile: "9876500011",
        occupation: "Teacher",
        annualIncome: "5 LPA",
        organizationName: "Sail School",
        designation: "Teacher",
        officeAddress: "Durgapur Steel Township"
    }],
    examSchema: [{
        examName: "Class 10 Final",
        class: "10",
        examStatus: "Passed",
        markAgregate: "89",
        scienceMathParcent: "88"
    }],
    section: [],
    sessionExamCourse: [{
        session: "2024-25",
        examTag: "NEET",
        targetExams: "NEET"
    }],
    studentStatus: [{
        status: "Cold",
        enrolledStatus: "Not Enrolled"
    }]
},
{
    studentsDetails: [{
        studentName: "Rohan Sarkar",
        dateOfBirth: "2005-03-18",
        gender: "Male",
        centre: "Asansol",
        board: "CBSE",
        state: "West Bengal",
        studentEmail: "rohan.sarkar@example.com",
        mobileNum: "9123456712",
        whatsappNumber: "9123456712",
        schoolName: "St. Patrick School",
        pincode: "713303",
        source: "Referral",
        address: "Court Road, Asansol",
        guardians: [{
            guardianName: "Mr. Sarkar",
            qualification: "B.Tech",
            guardianEmail: "guardian.rohan@example.com",
            guardianMobile: "9876500012",
            occupation: "Engineer",
            annualIncome: "9 LPA",
            organizationName: "Tata Steel",
            designation: "Junior Engineer",
            officeAddress: "Burnpur Road"
        }],
        examSchema: [{
            examName: "Class 12 Final",
            class: "12",
            examStatus: "Passed",
            markAgregate: "90",
            scienceMathParcent: "89"
        }]
    }],
    guardians: [{
        guardianName: "Mr. Sarkar",
        qualification: "B.Tech",
        guardianEmail: "guardian.rohan@example.com",
        guardianMobile: "9876500012",
        occupation: "Engineer",
        annualIncome: "9 LPA",
        organizationName: "Tata Steel",
        designation: "Junior Engineer",
        officeAddress: "Burnpur Road"
    }],
    examSchema: [{
        examName: "Class 12 Final",
        class: "12",
        examStatus: "Passed",
        markAgregate: "90",
        scienceMathParcent: "89"
    }],
    section: [],
    sessionExamCourse: [{
        session: "2024-25",
        examTag: "WBJEE",
        targetExams: "WBJEE"
    }],
    studentStatus: [{
        status: "Negative",
        enrolledStatus: "Not Enrolled"
    }]
},
{
    studentsDetails: [{
        studentName: "Shreya Das",
        dateOfBirth: "2006-10-05",
        gender: "Female",
        centre: "Kharagpur",
        board: "CBSE",
        state: "West Bengal",
        studentEmail: "shreya.das@example.com",
        mobileNum: "9123456713",
        whatsappNumber: "9123456713",
        schoolName: "Kendriya Vidyalaya",
        pincode: "721301",
        source: "Online",
        address: "Prembazar, Kharagpur",
        guardians: [{
            guardianName: "Mr. Das",
            qualification: "PhD",
            guardianEmail: "guardian.shreya@example.com",
            guardianMobile: "9876500013",
            occupation: "Professor",
            annualIncome: "15 LPA",
            organizationName: "IIT Kharagpur",
            designation: "Professor",
            officeAddress: "IIT KGP Campus"
        }],
        examSchema: [{
            examName: "Class 11 Final",
            class: "11",
            examStatus: "Passed",
            markAgregate: "93",
            scienceMathParcent: "92"
        }]
    }],
    guardians: [{
        guardianName: "Mr. Das",
        qualification: "PhD",
        guardianEmail: "guardian.shreya@example.com",
        guardianMobile: "9876500013",
        occupation: "Professor",
        annualIncome: "15 LPA",
        organizationName: "IIT Kharagpur",
        designation: "Professor",
        officeAddress: "IIT KGP Campus"
    }],
    examSchema: [{
        examName: "Class 11 Final",
        class: "11",
        examStatus: "Passed",
        markAgregate: "93",
        scienceMathParcent: "92"
    }],
    section: [],
    sessionExamCourse: [{
        session: "2024-25",
        examTag: "NEET",
        targetExams: "NEET"
    }],
    studentStatus: [{
        status: "Hot",
        enrolledStatus: "Enrolled"
    }]
},
{
    studentsDetails: [{
        studentName: "Arindam Paul",
        dateOfBirth: "2007-04-09",
        gender: "Male",
        centre: "Kolkata",
        board: "ICSE",
        state: "West Bengal",
        studentEmail: "arindam.paul@example.com",
        mobileNum: "9123456714",
        whatsappNumber: "9123456714",
        schoolName: "South Point School",
        pincode: "700068",
        source: "Walk-in",
        address: "Ballygunge, Kolkata",
        guardians: [{
            guardianName: "Mrs. Paul",
            qualification: "MBA",
            guardianEmail: "guardian.arindam@example.com",
            guardianMobile: "9876500014",
            occupation: "HR Manager",
            annualIncome: "12 LPA",
            organizationName: "Wipro",
            designation: "HR Manager",
            officeAddress: "Salt Lake, Sector V"
        }],
        examSchema: [{
            examName: "Class 10 Final",
            class: "10",
            examStatus: "Passed",
            markAgregate: "96",
            scienceMathParcent: "97"
        }]
    }],
    guardians: [{
        guardianName: "Mrs. Paul",
        qualification: "MBA",
        guardianEmail: "guardian.arindam@example.com",
        guardianMobile: "9876500014",
        occupation: "HR Manager",
        annualIncome: "12 LPA",
        organizationName: "Wipro",
        designation: "HR Manager",
        officeAddress: "Salt Lake, Sector V"
    }],
    examSchema: [{
        examName: "Class 10 Final",
        class: "10",
        examStatus: "Passed",
        markAgregate: "96",
        scienceMathParcent: "97"
    }],
    section: [],
    sessionExamCourse: [{
        session: "2024-25",
        examTag: "JEE",
        targetExams: "JEE Main"
    }],
    studentStatus: [{
        status: "Cold",
        enrolledStatus: "Not Enrolled"
    }]
},

];

// Connect to MongoDB and seed data
const seedDatabase = async () => {
    try {
        const mongoUri = process.env.MONGO_URL;
        
        if (!mongoUri) {
            console.error("❌ MONGO_URL not found in .env file");
            process.exit(1);
        }

        // Connection options to handle DNS issues
        const options = {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            family: 4,
        };

        if (mongoUri.startsWith('mongodb+srv://')) {
            options.directConnection = false;
            options.retryWrites = true;
            options.w = 'majority';
        }

        // Connect to MongoDB
        await mongoose.connect(mongoUri, options);
        console.log("✅ Connected to MongoDB");

        // Clear existing students (optional - comment out if you want to keep existing data)
        // await Student.deleteMany({});
        // console.log("🗑️  Cleared existing students");

        // Insert sample students
        const insertedStudents = await Student.insertMany(sampleStudents);
        console.log(`✅ Successfully inserted ${insertedStudents.length} students`);

        // Display inserted students
        insertedStudents.forEach((student, index) => {
            console.log(`\n📝 Student ${index + 1}:`);
            console.log(`   Name: ${student.studentsDetails[0].studentName}`);
            console.log(`   Email: ${student.studentsDetails[0].studentEmail}`);
            console.log(`   Centre: ${student.studentsDetails[0].centre}`);
            console.log(`   Status: ${student.studentStatus[0].status}`);
            console.log(`   Enrolled: ${student.studentStatus[0].enrolledStatus}`);
        });

        console.log("\n✅ Database seeding completed successfully!");
        
    } catch (error) {
        console.error("❌ Error seeding database:", error);
    } finally {
        // Close the connection
        await mongoose.connection.close();
        console.log("\n🔌 Database connection closed");
        process.exit(0);
    }
};

// Run the seed function
seedDatabase();
