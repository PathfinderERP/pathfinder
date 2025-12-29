import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getUploadDir } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateContractLetter = async (employee, data) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
            const fileName = `contract_letter_${employee.employeeId}_${Date.now()}.pdf`;
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
            doc.fillColor('#b80e0eff').fontSize(16).font('Helvetica-Bold')
                .text('PATHFINDER EDUCATIONAL CENTRE', 0, textY, { align: 'center', width: pageWidth });

            doc.fontSize(9).font('Helvetica').fillColor('#333')
                .text('(UNIT OF PATHFINDER EDUCATIONAL CENTRE LLP)', 0, textY + 20, { align: 'center', width: pageWidth });

            // Line separator
            const lineY = textY + 45;
            doc.moveTo(50, lineY).lineTo(545, lineY).lineWidth(1).strokeColor('#808080').stroke();

            // Ref and Date Row (Like Offer/Appointment Letters)
            const metaY = lineY + 15;
            doc.fillColor('black').fontSize(10).font('Helvetica-Bold');
            doc.text('Ref. No :- ............', 50, metaY); // Left aligned
            doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 430, metaY); // Right aligned

            // --- Title & Parties ---
            // --- Title & Parties ---
            doc.moveDown(3);
            doc.fontSize(14).font('Helvetica-Bold').text('EMPLOYMENT CONTRACT', 0, doc.y, { align: 'center', width: pageWidth, underline: true });

            doc.moveDown(2);
            doc.fontSize(12).font('Helvetica-Bold').text('Between', 0, doc.y, { align: 'center', width: pageWidth });
            doc.moveDown(0.5);
            doc.fontSize(12).text('Pathfinder Educational Center', 0, doc.y, { align: 'center', width: pageWidth });
            doc.fontSize(9).font('Helvetica').text('47, Kalidas Patitundi Lane, Kalighat, Kolkata - 700026', 0, doc.y, { align: 'center', width: pageWidth });
            doc.text('(In the following referred to as "The Company")', 0, doc.y, { align: 'center', width: pageWidth });

            doc.moveDown(1);
            doc.fontSize(12).font('Helvetica-Bold').text('And', 0, doc.y, { align: 'center', width: pageWidth });

            const dob = employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString('en-CA') : 'N/A';
            const pan = employee.panNumber || 'N/A';

            doc.moveDown(0.5);
            doc.fontSize(11).text(`${employee.name.toUpperCase()}`, 0, doc.y, { align: 'center', width: pageWidth });
            doc.fontSize(10).text(`Address: ${employee.address || 'N/A'}`, 0, doc.y, { align: 'center', width: pageWidth });
            doc.text(`D.O.B : ${dob}, PAN : ${pan}`, 0, doc.y, { align: 'center', width: pageWidth });
            doc.font('Helvetica').fontSize(9).text('(In the following referred to as "The Employee")', 0, doc.y, { align: 'center', width: pageWidth });

            doc.moveDown(2);
            doc.fontSize(10).text('When duly signed by The Employee and an authorized representative of The Company, this document constitutes a binding employment contract effective from the date stated below.', 50, doc.y, { align: 'justify', width: 495 });

            // --- Clauses ---
            const joiningDateValue = data.joiningDate || employee.dateOfJoining;
            const joiningDate = joiningDateValue ? new Date(joiningDateValue).toLocaleDateString('en-GB') : '_______';

            const addClause = (number, title, text) => {
                doc.moveDown(1);
                // Standard left alignment for clause titles
                doc.font('Helvetica-Bold').text(`${number}. ${title}`, 50, doc.y, { align: 'left', width: 495 });
                if (text) {
                    doc.font('Helvetica').text(text, 50, doc.y + 5, { align: 'justify', width: 495 });
                }
            };

            const addBullets = (bullets) => {
                const bulletIndent = 20;
                bullets.forEach(bullet => {
                    doc.font('Helvetica').text(`•`, 65, doc.y + 2, { continued: true });
                    doc.text(`  ${bullet}`, 80, doc.y, { align: 'justify', width: 465 });
                });
            };

            // 1. Duration
            addClause('1', 'Duration', `This contract comes into effect on the ${joiningDate}. The contract will continue unless terminated as per clauses 11 or 12.`);

            // 2. Duties
            addClause('2', 'Duties');
            doc.font('Helvetica').text(`The Employee will hold the position of " ${employee.designation?.name || '............'} " of The Company, and will report to the CEO’s office and the Supervisory Board of Pathfinder Educational Center who shall lay down the directives for The Employee's responsibilities, functions and authority. The details of duties and responsibilities will be documented in the Job Description of the position which will be delivered to The Employee. These duties shall also include, but not be limited to The Employee:`, { align: 'justify', width: 495 });
            addBullets([
                'Devoting the whole of his/her time, attention and skills to the duties of his/her position.',
                'Working only for The Company and for the PEC Group.',
                'Safeguarding the assets of The Company and the PEC Group.',
                'Ensuring that the standard PEC Administration System is used.',
                'Ensuring that he/she and The Company comply with all applicable laws and regulations.',
                'Ensuring that the Code of Ethics of the PEC Group is always applied.',
                'Company shall have right to take legal steps against the employee in case of any violation of these clauses.'
            ]);

            // 3. Location
            addClause('3', 'Location and Working Hours', 'The Employee will initially carry out his/her duties with a work base in The Company’s HQ at Kolkata. Working hours formally follow the rules of the working place but considering the senior nature and the character of the assignment, there are no fixed working hours. The Employee is not entitled to any overtime payment.');

            // 4. Personal Tax
            addClause('4', 'Personal Tax and Social Security', 'The Company shall deduct Tax at Source on the taxable salary of the Employee. The Employee will himself/ herself be responsible for filing the income tax return on his/ her income and benefits as per this Contract. The company shall provide a TDS certificate on the amount of tax that it deducts.');

            // 5. Business Expenses
            addClause('5', 'Business Expenses', 'A monthly expense report including Travel or Outstation expenses must be submitted to The Company’s Finance Department before the Second day of the following month.');

            // 6. Inventions
            addClause('6', 'Inventions', 'Subject to any relevant legislation, any invention made by The Employee (by himself /herself or jointly with others) which in any way is connected with The Company\'s products or activities belongs to The Company. This also applies to products or activities of other companies within the PEC Group, inventions include improvements, designs techniques, and know-how, whether or not capable of being patented or registered. The Employee must disclose details of any such inventions to The Company without delay and take all appropriate steps to facilitate that The Company may obtain maximum benefit from such inventions.');

            // 7. Ownership
            addClause('7', 'Ownership of Documents', 'Any documents, computer programs or other materials prepared by The Employee, alone or with others, in the course of providing the service will be the Company\'s property. The Employee agrees that the copyright and all other intellectual property rights of whatever nature developed in the course of service to The Company shall become and remain the property of The Company. Upon termination of the Contract, The Employee shall forthwith surrender to The Company all originals and copies of the documents, samples or other items relating to any matter aforesaid, otherwise Pathfinder Educational Centre shall have every right to take legal steps against the employee according to Law.');

            // 8. Non-Remuneration
            addClause('8', 'Non-Remuneration', 'Except as specified in this Contract or as provided for in writing through any other agreement between The Employee and The Company or another company fully or partly owned by The Company - any income, benefit and/or present solicited and/or received by The Employee from any third party associated with or in business with The Company or another company fully or partly owned by The Company - shall belong to The Company and as such be declared and handed over to The Company forthwith without delay. Any evasion by The Employee of these conditions will result in The Company evoking a Summary Termination of this contract.');

            // 9. Non-Competition
            addClause('9', 'Non-Competition');
            doc.font('Helvetica').text('During the employment under this Contract, The Employee shall not directly or indirectly have any fiscal interest or association with any company, firm or person engaged in the production, distribution, or sale of any product or services similar to those offered by the PEC Group. This condition does not apply to The Employee\'s work in the normal course of The Company\'s business. At the expiry of this Contract, The Employee may not directly or indirectly:', { align: 'justify' });
            addBullets([
                'Approach or solicit any customer of The Company and the PEC Group.',
                'Try to divert any customer away from the Company and the PEC Group.',
                'Attempt to obtain the withdrawal of any of employees of The Company and the PEC Group.'
            ]);

            // 10. Confidentiality
            addClause('10', 'Confidentiality', 'Except with the written consent of The Employee\'s superior or as required in the normal course of his duties, The Employee may not disclose to any third party any confidential information about The Company\'s business or products or those of any other company in the PEC Group. This condition also applies after this Contract has expired and The Employee has left The Company. On leaving The Company for whatever reason, The Employee undertakes to return to The Company all items and documents (including copies thereof) in his possession belonging or relating to The Company or to any other company in the PEC Group.');

            // 11. Termination by Notice
            addClause('11', 'Termination by Notice');
            doc.font('Helvetica').text('The Company may terminate this Contract by giving The Employee one months\' notice in writing to the end of a calendar month. The Employee may terminate this Contract by giving The Company one months\' notice in writing to the end of a calendar month. After notice has been given by either party and until this Contract expires, The Company may at its sole discretion:', { align: 'justify' });
            addBullets([
                'Continue to let The Employee work without any change, or',
                'Release The Employee from any duties but retain his/her services in full or in part, or',
                'Release The Employee from all duties and services'
            ]);
            doc.text('In any event, income and benefits will continue until the termination become effective, except:', { align: 'justify' });
            addBullets([
                'That any bonus agreement if entered into between The Employee and The Company will only be applicable as long as the Employee performs services and provided that neither The Company nor The Employee has given notice of termination by the 1st March of every financial year.',
                'Where certain other benefits will be withdrawn or restructured as per Appendix A to this Contract.'
            ]);

            // 12. Summary Termination
            addClause('12', 'Summary Termination');
            doc.font('Helvetica').text('The Company and The Employee may terminate this Contract and the employment immediately at any time for the following reasons :-', { align: 'justify' });
            addBullets([
                'Any reason which would justify immediate termination by law,',
                'Willful breach of any of the provisions of the Contract,',
                'Gross negligence in conducting The Company\'s affairs,',
                'Absence from duty without reasonable course,',
                'Gross misconduct including insobriety and bankruptcy.'
            ]);

            // 13. Law
            addClause('13', 'Law', 'Any dispute or claim arising out of or in connection with this Contract, or the breach, termination or invalidity thereof, shall be settled as per the laws of India and by the Courts of Kolkata.');

            // --- Signature ---
            doc.addPage(); // Force new page for signature to ensure it's clean, or just move down if space? User prompt implies it might be at bottom. 
            // Better to keep it flow if space permits, but explicit "Date" block usually fits best with some space.
            // I'll check Y. If Y > 600, add page.
            if (doc.y > 600) doc.addPage();
            else doc.moveDown(4);

            const signatureY = doc.y;

            doc.font('Helvetica-Bold').text('Date : _________________________', 50, signatureY);
            doc.text('Signed : _______________________', 50, signatureY + 25);

            // CEO Signature block on the right or below? User text:
            // "Pathfinder Logo
            // _________________________
            // Madhuparna Sreemany
            // (CEO)"
            // I'll place this on the right side or centered below? User image shows it likely on the right or bottom left? The text shows "Signed: ... " then a logo block. I'll put the CEO block on the right side to balance "Date/Signed".

            const ceoX = 350;
            const ceoY = signatureY;

            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, ceoX, ceoY, { width: 100 });
            }

            doc.text('_________________________', ceoX, ceoY + 40);
            doc.text('Madhuparna Sreemany', ceoX, ceoY + 55);
            doc.text('(CEO)', ceoX, ceoY + 70);

            doc.end();
            stream.on('finish', () => resolve({ filePath, fileName }));
            stream.on('error', (err) => reject(err));
        } catch (error) {
            reject(error);
        }
    });
};
