import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getUploadDir } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateReleaseLetter = async (employee, data) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const fileName = `release_letter_${employee.employeeId}_${Date.now()}.pdf`;
            const filePath = path.join(getUploadDir(), fileName);
            const stream = fs.createWriteStream(filePath);

            doc.pipe(stream);

            const logoPath = path.join(__dirname, '../../assets/logo.png');
            // --- Header ---
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

            // --- To Section ---
            doc.moveDown(5);
            doc.font('Helvetica-Bold').fontSize(10).text('To,', 50);
            doc.text(`Mr./Ms. ${employee.name.toUpperCase()}`, 50);
            doc.text(`ADD - ${employee.address || 'N/A'}`, { width: 300 });
            doc.text(`Cont. : ${employee.phoneNumber || ''}`);

            // --- Subject ---
            doc.moveDown(4);
            doc.fontSize(12).font('Helvetica-Bold').text('SUB- Relieving Letter', 0, doc.y, { align: 'center', width: pageWidth, underline: true });

            // --- Body ---
            doc.moveDown(3);
            doc.fontSize(11).font('Helvetica');

            doc.text(`This is in reference to the end of your term, wherein you are relieved from the services of the company. We have received confirmation from your department about the completion of formal handover process of all files/documents & stationery.`, 50, doc.y, { align: 'justify', width: 495 });

            doc.moveDown(1);
            doc.text(`Your contributions to the organization and its success will always be appreciated. We at `, 50, doc.y, { align: 'justify', width: 495, continued: true })
                .font('Helvetica-Bold').text('Pathfinder Educational Centre', { continued: true })
                .font('Helvetica').text(' wish you all the best in your future endeavors.');

            // --- Signature ---
            doc.moveDown(4);
            doc.text('Yours Sincerely,', 50, doc.y, { width: 495 });

            doc.moveDown(4);
            doc.text('..........................', 50, doc.y, { width: 495 });
            doc.font('Helvetica-Bold').text('Deputy Manager HR', 50, doc.y, { width: 495 });
            doc.text('Pathfinder Educational Centre', 50, doc.y, { width: 495 });

            // --- Footer ---
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
