# Student Database Seeder

This file (`seedStudents.js`) populates your MongoDB database with sample student data.

## Sample Data Included

The seed file contains **5 sample students** with complete information:

1. **Subhro Chowdhury** - Hot Lead, Not Enrolled, Centre: Sodexpur, Board: ICSE
2. **Debesh Das** - Negative Lead, Not Enrolled, Centre: Haldia, Board: ICSE
3. **Atanu Maity** - Hot Lead, Enrolled, Centre: Madhyamgram, Board: CBSE
4. **Aditya Saha** - Cold Lead, Not Enrolled, Centre: KOLKATA, Board: ICSE
5. **Alanu** - Cold Lead, Enrolled, Centre: KOLKATA, Board: CBSE

Each student record includes:
- Personal details (name, DOB, gender, contact info)
- Academic information (school, board, class, marks)
- Guardian information (name, contact, occupation, income)
- Exam details and target exams
- Student status (Hot/Cold/Negative)
- Enrollment status

## How to Run

### Method 1: Using npm script (Recommended)
```bash
cd backend
npm run seed
```

### Method 2: Using node directly
```bash
cd backend
node seedStudents.js
```

## What It Does

1. ✅ Connects to your MongoDB database using the `MONGO_URI` from your `.env` file
2. ✅ Inserts 5 sample student records
3. ✅ Displays confirmation with student details
4. ✅ Closes the database connection

## Important Notes

⚠️ **Clear Existing Data (Optional)**
- By default, the seed file will ADD students to your existing database
- If you want to clear all existing students first, uncomment these lines in `seedStudents.js`:
  ```javascript
  await Student.deleteMany({});
  console.log("🗑️  Cleared existing students");
  ```

⚠️ **Prerequisites**
- Make sure your `.env` file has the correct `MONGO_URI`
- Ensure MongoDB is running and accessible

## Expected Output

When you run the seed file, you should see:
```
✅ Connected to MongoDB
✅ Successfully inserted 5 students

📝 Student 1:
   Name: Subhro Chowdhury
   Email: subhro.chowdhury@example.com
   Centre: Sodexpur
   Status: Hot
   Enrolled: Not Enrolled

... (and so on for all 5 students)

✅ Database seeding completed successfully!
🔌 Database connection closed
```

## Customizing the Data

To add more students or modify existing ones:
1. Open `seedStudents.js`
2. Edit the `sampleStudents` array
3. Follow the same structure as the existing samples
4. Run the seed script again

## Schema Compliance

All sample data strictly follows your Student schema:
- ✅ All required fields are populated
- ✅ Phone numbers match the 10-digit pattern
- ✅ Status values are from the enum: ["Hot", "Cold", "Negative"]
- ✅ Enrolled status is from: ["Enrolled", "Not Enrolled"]
