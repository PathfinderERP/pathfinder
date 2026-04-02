import mongoose from "mongoose";
import dotenv from "dotenv";
import Course from "../models/Master_data/Courses.js";

dotenv.config();

const missingCourses = [
  { 
      name: 'NCRP H.S. CLASS XII  TEST- SERIES (UNIT+2 SETS OF MOCK) 2024-2025', 
      templateSearch: 'NCRP Class XII Mock', 
      session: '2024-2025' 
  },
  { 
      name: 'NCRP WBJEE 2Years W/O-SM 2023-2026', 
      templateSearch: 'NCRP WBJEE', 
      session: '2023-2026' 
  },
  { 
      name: 'CBSE X CRP online (Sci + Maths+ Lit+ Lan)', 
      templateSearch: 'CBSE X CRP online', 
      session: '2024-2025' 
  },
  { 
      name: 'HS NCRP Class XII Combined(Unit+2 Sets of Mock) 6 Sub. 2024-2025', 
      templateSearch: 'NCRP Class XII Mock', 
      session: '2024-2025' 
  },
  { 
      name: 'WBJEE MOCK 2024-2025', 
      templateSearch: 'WBJEE MOCK', 
      session: '2024-2025' 
  },
  { 
      name: 'CBSE CLASS - XII 1 SET MOCK TEST', 
      templateSearch: 'CBSE XII MOCK', 
      session: '2024-2025' 
  },
  { 
      name: 'NEET MOCK 2024-2025', 
      templateSearch: 'NEET MOCK', 
      session: '2024-2025' 
  },
  { 
      name: 'CBSE Online CRP Class-X (Mathemetics) T 2024-2025', 
      templateSearch: 'CBSE Online Class-X', 
      session: '2024-2025' 
  },
  { 
      name: 'CBSE Online CRP Class-X (Bengali) T 2024-2025', 
      templateSearch: 'CBSE Online Class-X', 
      session: '2024-2025' 
  },
  { 
      name: 'HS NCRP Class XII 1 Sets of Mock Tests  All 6 Sub.', 
      templateSearch: 'NCRP Class XII Mock', 
      session: '2024-2025' 
  }
];

async function create() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected.");

    for (const item of missingCourses) {
      console.log(`\nCreating Course: ${item.name}`);
      
      // Check if it already exists
      const exists = await Course.findOne({ courseName: item.name });
      if (exists) {
        console.log(`Skipping - already exists.`);
        continue;
      }

      // Find template
      let template = await Course.findOne({ courseName: new RegExp(item.templateSearch, 'i') }).lean();
      if (!template) {
         // Fallback template (just search for keyword)
         const keyword = item.templateSearch.split(' ')[0];
         template = await Course.findOne({ courseName: new RegExp(keyword, 'i') }).lean();
      }

      if (!template) {
        console.error(`ERROR: Could not find template for ${item.name} (Search: ${item.templateSearch})`);
        continue;
      }

      console.log(`Using Template: ${template.courseName}`);

      const newCourseData = {
        courseName: item.name,
        examTag: template.examTag,
        courseDuration: template.courseDuration || "12 months",
        coursePeriod: template.coursePeriod || "Yearly",
        class: template.class,
        department: template.department,
        courseSession: item.session || template.courseSession,
        feesStructure: template.feesStructure.map(f => {
            const { _id, ...rest } = f;
            return rest;
        }),
        mode: template.mode || "OFFLINE",
        courseType: template.courseType || "INSTATION",
        programme: template.programme || "CRP",
      };

      const newCourse = new Course(newCourseData);
      await newCourse.save();
      console.log(`SUCCESS: Created ${item.name}`);
    }

    console.log("\nFinished creating all missing courses.");
    process.exit(0);
  } catch (err) {
    console.error("Creation failed:", err);
    process.exit(1);
  }
}

create();
