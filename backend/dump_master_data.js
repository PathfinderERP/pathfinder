import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Class from './models/Master_data/Class.js';
import CentreSchema from './models/Master_data/Centre.js';
import Boards from './models/Master_data/Boards.js';
import Department from './models/Master_data/Department.js';
import ExamTag from './models/Master_data/ExamTag.js';
import Session from './models/Master_data/Session.js';

dotenv.config();

const dumpMasterData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB');

        const classes = await Class.find({}, 'name').lean();
        const centres = await CentreSchema.find({}, 'centreName enterCode').lean();
        const boards = await Boards.find({}, 'boardCourse').lean();
        const departments = await Department.find({}, 'departmentName').lean();
        const examTags = await ExamTag.find({}, 'name').lean();
        const sessions = await Session.find({}, 'sessionName').lean();

        console.log('--- CLASSES ---');
        console.log(JSON.stringify(classes, null, 2));

        console.log('--- CENTRES ---');
        console.log(JSON.stringify(centres, null, 2));

        console.log('--- BOARDS ---');
        console.log(JSON.stringify(boards, null, 2));

        console.log('--- DEPARTMENTS ---');
        console.log(JSON.stringify(departments, null, 2));

        console.log('--- EXAM TAGS ---');
        console.log(JSON.stringify(examTags, null, 2));

        console.log('--- SESSIONS ---');
        console.log(JSON.stringify(sessions, null, 2));

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

dumpMasterData();
