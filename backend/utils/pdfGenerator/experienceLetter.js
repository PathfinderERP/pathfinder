import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getUploadDir } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateExperienceLetter = async (employee, data) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const fileName = `experience_letter_${employee.employeeId}_${Date.now()}.pdf`;
            const filePath = path.join(getUploadDir(), fileName);
            const stream = fs.createWriteStream(filePath);

            doc.pipe(stream);

            const logoPath = path.join(__dirname, '../../assets/logo.png');
            // --- Header (Consistent Styles) ---
            const pageWidth = 595.28;
            const logoWidth = 120;
            const logoX = (pageWidth - logoWidth) / 2;

            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, logoX, 40, { width: logoWidth });
            }

            const textY = 90;
            doc.fillColor('#800000').fontSize(16).font('Helvetica-Bold')
                .text('PATHFINDER EDUCATIONAL CENTRE', 0, textY, { align: 'center', width: pageWidth });

            doc.fontSize(9).font('Helvetica').fillColor('#333')
                .text('(UNIT OF PATHFINDER EDUCATIONAL CENTRE LLP)', 0, textY + 20, { align: 'center', width: pageWidth });

            // Line separator
            const lineY = textY + 45;
            doc.moveTo(50, lineY).lineTo(545, lineY).lineWidth(1).strokeColor('#808080').stroke();

            // Ref and Date Row
            const metaY = lineY + 15;
            doc.fillColor('black').fontSize(10).font('Helvetica-Bold');
            doc.text('Ref. No :- ............', 50, metaY); // Left aligned
            doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 430, metaY); // Right aligned

            // --- Body Content ---
            doc.moveDown(8);

            // Centered Title
            doc.fontSize(12).font('Helvetica-Bold').text('To whom it may concern', 0, doc.y, { align: 'center', width: pageWidth, underline: true });

            doc.moveDown(3);
            doc.fontSize(11).font('Helvetica').lineGap(8);

            const relievingDate = data.relievingDate ? new Date(data.relievingDate).toLocaleDateString('en-GB') : '........';
            const joiningDate = new Date(employee.dateOfJoining).toLocaleDateString('en-GB');

            // Body Text
            doc.text(`This is to certify that Mr/Mrs. `, 50, doc.y, { align: 'justify', continued: true, width: 495 })
                .font('Helvetica-Bold').text(`${employee.name.toUpperCase()}`)
                .font('Helvetica').text(` was associated with Pathfinder Educational Centre from `, { continued: true })
                .font('Helvetica-Bold').text(`${joiningDate}`)
                .font('Helvetica').text(` to `, { continued: true })
                .font('Helvetica-Bold').text(`${relievingDate} `, { continued: true })
                .font('Helvetica').text(` as `, { continued: true })
                .font('Helvetica-Bold').text(`${employee.designation?.name || '..........'} .`);

            doc.moveDown(1);
            doc.font('Helvetica').text(`He/She was part of the `, 50, doc.y, { align: 'justify', continued: true, width: 495 })
                .font('Helvetica-Bold').text(`${employee.department?.departmentName || employee.department?.name || '..........'}`, { continued: true })
                .font('Helvetica').text(` Department.`);

            doc.moveDown(1);
            doc.text(`He/She was sincere towards his/her work and exhibited fair/good/excellent conduct & approach.`, 50, doc.y, { align: 'justify', width: 495 });

            doc.moveDown(1);
            doc.text(`We wish him/her the very best for all his/her future endeavors.`, 50, doc.y, { align: 'justify', width: 495 });

            // --- Footer / Signature ---
            doc.moveDown(6);
            doc.text('..........................', 50, doc.y, { width: 495 });
            doc.font('Helvetica-Bold').text('Deputy Manager HR', 50, doc.y, { width: 495 });
            doc.text('Pathfinder Educational Centre', 50, doc.y, { width: 495 });

            // Bottom Footer
            doc.moveTo(50, 750).lineTo(545, 750).lineWidth(1).strokeColor('#808080').stroke();
            doc.fontSize(8).font('Helvetica').fillColor('#666')
                .text('Corporate Office: 47, Kalidasa Patitundi Lane, Kalighat, Kolkata-700026. Ph.: 033 2455 1840', 0, 760, { align: 'center', width: pageWidth });
            doc.text('e-mail: pathfinderllp@pathfinder.edu.in | website: www.pathfinder.edu.in', 0, 775, { align: 'center', width: pageWidth });

            doc.end();
            stream.on('finish', () => resolve({ filePath, fileName }));
            stream.on('error', (err) => reject(err));
        } catch (error) {
            reject(error);
        }
    });
};
