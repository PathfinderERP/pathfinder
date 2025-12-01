import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execPromise = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seeds = [
    { name: 'Exam Tags', path: 'seed/examTags.js' },
    { name: 'Departments', path: 'seed/departments.js' },
    { name: 'Classes', path: 'seed/classes.js' },
    { name: 'Courses', path: 'seed/courses.js' },
    { name: 'Students', path: 'seedStudents.js' }
];

async function runSeeds() {
    console.log('🌱 Starting Database Seeding Process...\n');

    for (const seed of seeds) {
        console.log(`Running ${seed.name} seed...`);
        try {
            const { stdout, stderr } = await execPromise(`node ${seed.path}`, { cwd: __dirname });
            console.log(stdout);
            if (stderr) console.error(stderr);
            console.log(`✅ ${seed.name} seeded successfully!\n`);
        } catch (error) {
            console.error(`❌ Error seeding ${seed.name}:`);
            console.error(error.message);
            if (error.stdout) console.log(error.stdout);
            if (error.stderr) console.error(error.stderr);
            process.exit(1);
        }
    }

    console.log('✨ All seeds completed successfully!');
}

runSeeds();
