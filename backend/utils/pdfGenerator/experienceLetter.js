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

            const pageWidth = doc.page.width;
            const contentWidth = 450;
            const centerX = (pageWidth - contentWidth) / 2;

            const logoPath = path.join(__dirname, '../../assets/logo.png');

            // ---------------- HEADER ----------------
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, pageWidth / 2 - 60, 40, { width: 120 });
            }

            doc.moveDown(3);

            doc.fillColor('#800000')
                .fontSize(16)
                .font('Helvetica-Bold')
                .text('PATHFINDER EDUCATIONAL CENTRE', centerX, doc.y, {
                    width: contentWidth,
                    align: 'center'
                });

            doc.moveDown(0.5);

            doc.fontSize(9)
                .font('Helvetica')
                .fillColor('#333')
                .text('(UNIT OF PATHFINDER EDUCATIONAL CENTRE LLP)', centerX, doc.y, {
                    width: contentWidth,
                    align: 'center'
                });

            doc.moveDown(1);
            doc.moveTo(50, doc.y).lineTo(pageWidth - 50, doc.y).stroke();

            // ---------------- META ----------------
            doc.moveDown(1);

            doc.fontSize(10).font('Helvetica-Bold');
            doc.text('Ref. No :- ............', 50);
            doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - 150);

            // ---------------- BODY ----------------
            doc.moveDown(4);

            doc.fontSize(12)
                .font('Helvetica-Bold')
                .text('TO WHOM IT MAY CONCERN', centerX, doc.y, {
                    width: contentWidth,
                    align: 'center',
                    underline: true
                });

            doc.moveDown(2);

            const startDate = employee.dateOfJoining
                ? new Date(employee.dateOfJoining).toLocaleDateString('en-GB')
                : 'N/A';

            const endDate = (data.endDate || data.relievingDate)
                ? new Date(data.endDate || data.relievingDate).toLocaleDateString('en-GB')
                : 'N/A';

            const jobTitle = employee.designation?.name || 'Employee';

            const salutation =
                employee.gender === 'Male'
                    ? 'Mr. '
                    : employee.gender === 'Female'
                        ? 'Ms. '
                        : 'Mr./Ms. ';

            const options = {
                width: contentWidth,
                align: 'left', // ✅ FIXED
                lineGap: 4
            };

            // -------- Paragraph 1 --------
            doc.font('Helvetica')
                .text('This is to certify that ', centerX, doc.y, { ...options, continued: true })
                .font('Helvetica-Bold').text(`${salutation}${employee.name}`, { continued: true })
                .font('Helvetica').text(' was employed with Pathfinder Educational Institute from ', { continued: true })
                .font('Helvetica-Bold').text(startDate, { continued: true })
                .font('Helvetica').text(' to ', { continued: true })
                .font('Helvetica-Bold').text(endDate, { continued: true })
                .font('Helvetica').text(' in the position of ', { continued: true })
                .font('Helvetica-Bold').text(jobTitle + '.', options);

            // -------- Paragraph 2 --------
            doc.moveDown(1.5);

            doc.font('Helvetica').text(
                'During the said period, the individual was engaged as per the terms of employment and was assigned duties relevant to the designated role. The responsibilities undertaken were in line with the operational requirement of the organization and were performed in accordance with applicable internal processes and instructions issued from time to time.',
                centerX,
                doc.y,
                options
            );

            // -------- Paragraph 3 --------
            doc.moveDown(1.5);

            doc.text(
                'The employment records pertaining to the above-mentioned period are duly maintained in the official records of the organization. Their conduct was good during their association with the organization.',
                centerX,
                doc.y,
                options
            );

            // -------- Paragraph 4 --------
            doc.moveDown(1.5);

            doc.text(
                'This certificate is being issued at the request of the employee for the purpose of official documentation.',
                centerX,
                doc.y,
                options
            );

            // ---------------- SIGNATURE ----------------
            doc.moveDown(3);

            doc.text('Yours Sincerely,', centerX, doc.y, {
                width: contentWidth,
                align: 'left'
            });

            doc.moveDown(1);

            if (data.signatureImage) {
                try {
                    doc.image(data.signatureImage, centerX, doc.y, { width: 100 });
                    doc.y += 50;
                } catch {
                    doc.text('..........................', centerX, doc.y);
                }
            } else {
                doc.text('..........................', centerX, doc.y);
            }

            doc.moveDown(1);

            doc.font('Helvetica-Bold')
                .text('Sanchita Dutta', centerX, doc.y, { width: contentWidth });

            doc.text('Head HR', centerX, doc.y, { width: contentWidth });

            doc.text('Pathfinder Educational Centre', centerX, doc.y, {
                width: contentWidth
            });

            // ---------------- FOOTER ----------------
            doc.moveTo(50, 750).lineTo(pageWidth - 50, 750).stroke();

            doc.fontSize(8)
                .fillColor('#666')
                .text(
                    'Corporate Office: 47, Kalidasa Patitundi Lane, Kalighat, Kolkata-700026. Ph.: 033 2455 1840',
                    centerX,
                    760,
                    { width: contentWidth, align: 'center' }
                );

            doc.text(
                'e-mail: pathfinderllp@pathfinder.edu.in | website: www.pathfinder.edu.in',
                centerX,
                775,
                { width: contentWidth, align: 'center' }
            );

            doc.end();

            stream.on('finish', () => resolve({ filePath, fileName }));
            stream.on('error', reject);

        } catch (error) {
            reject(error);
        }
    });
};