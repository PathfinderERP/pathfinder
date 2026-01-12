import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const search = 'Malay Maity';
const csvPath = path.join(__dirname, '../../uploads/test.employees.csv');

fs.createReadStream(csvPath)
    .pipe(csv())
    .on('data', (row) => {
        if (row.name && row.name.includes(search)) {
            console.log(JSON.stringify(row, null, 2));
        }
    })
    .on('end', () => console.log('End Search'));
