
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = __dirname;

const pages = [
    { name: 'TeacherList', title: 'Teacher List' },
    { name: 'StudentTeacherReview', title: 'Student Teacher Review' },
    { name: 'LiveClassReview', title: 'Live Class Review' },
    { name: 'CCTeacherReview', title: 'CC Teacher Review' },
    { name: 'HodList', title: 'HoD List' },
    { name: 'CentreManagement', title: 'Centre Management' },
    { name: 'RMList', title: 'RM List' },
    { name: 'ClassCoordinator', title: 'Class Coordinator' },
    { name: 'Classes', title: 'Classes' },
    { name: 'MentalSessionTable', title: 'Mental Session Table' },
    { name: 'ClassManagement', title: 'Class Management' },
    { name: 'SectionLeaderBoard', title: 'Section Leader Board' },
    { name: 'ExamLeaderBoard', title: 'Exam Leader Board' }
];

pages.forEach(page => {
    let newContent = `import React from 'react';
import Layout from '../../components/Layout';

const ${page.name} = () => {
    return (
        <Layout activePage="Academics">
            <div className="p-6 text-white text-left">
                <h1 className="text-2xl font-bold mb-4">${page.title}</h1>
                <div className="bg-[#1a1f24] p-6 rounded-lg border border-gray-800">
                    <p>Welcome to the ${page.title} page.</p>
                    <p className="text-gray-500 mt-2">This feature is coming soon.</p>
                </div>
            </div>
        </Layout>
    );
};

export default ${page.name};`;

    fs.writeFileSync(path.join(targetDir, `${page.name}.jsx`), newContent);
    console.log(`Created ${page.name}.jsx`);
});
