import nodemailer from 'nodemailer';

class EmailService {
    constructor() {
        // Demo credentials - user will add real ones later
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER || 'demo@example.com',
                pass: process.env.SMTP_PASS || 'demo_password'
            }
        });
    }

    async sendOfferLetter(employee, pdfPath) {
        const mailOptions = {
            from: process.env.SMTP_FROM || '"HR Department" <hr@company.com>',
            to: employee.email,
            subject: 'Offer Letter - Welcome to Our Team!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">Congratulations ${employee.name}!</h2>
                    <p>We are delighted to extend this offer of employment to you.</p>
                    <p>Please find attached your official offer letter. We look forward to having you join our team.</p>
                    <p>If you have any questions, please don't hesitate to reach out to our HR department.</p>
                    <br>
                    <p>Best regards,<br>
                    <strong>HR Department</strong></p>
                </div>
            `,
            attachments: [
                {
                    filename: `Offer_Letter_${employee.employeeId}.pdf`,
                    path: pdfPath
                }
            ]
        };

        return await this.transporter.sendMail(mailOptions);
    }

    async sendAppointmentLetter(employee, pdfPath) {
        const mailOptions = {
            from: process.env.SMTP_FROM || '"HR Department" <hr@company.com>',
            to: employee.email,
            subject: 'Appointment Letter - Official Confirmation',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #10b981;">Welcome Aboard, ${employee.name}!</h2>
                    <p>We are pleased to confirm your appointment with our organization.</p>
                    <p>Please find attached your official appointment letter for your records.</p>
                    <p>We are excited to have you as part of our team!</p>
                    <br>
                    <p>Best regards,<br>
                    <strong>HR Department</strong></p>
                </div>
            `,
            attachments: [
                {
                    filename: `Appointment_Letter_${employee.employeeId}.pdf`,
                    path: pdfPath
                }
            ]
        };

        return await this.transporter.sendMail(mailOptions);
    }

    async sendContractLetter(employee, pdfPath) {
        const mailOptions = {
            from: process.env.SMTP_FROM || '"HR Department" <hr@company.com>',
            to: employee.email,
            subject: 'Employment Contract - Please Review',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #8b5cf6;">Employment Contract</h2>
                    <p>Dear ${employee.name},</p>
                    <p>Please find attached your employment contract for review and signature.</p>
                    <p>Kindly review the terms and conditions carefully. If you have any questions or concerns, please contact the HR department.</p>
                    <br>
                    <p>Best regards,<br>
                    <strong>HR Department</strong></p>
                </div>
            `,
            attachments: [
                {
                    filename: `Contract_${employee.employeeId}.pdf`,
                    path: pdfPath
                }
            ]
        };

        return await this.transporter.sendMail(mailOptions);
    }

    async sendExperienceLetter(employee, pdfPath) {
        const mailOptions = {
            from: process.env.SMTP_FROM || '"HR Department" <hr@company.com>',
            to: employee.email,
            subject: 'Experience Certificate',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #f59e0b;">Experience Certificate</h2>
                    <p>Dear ${employee.name},</p>
                    <p>Please find attached your experience certificate as requested.</p>
                    <p>We appreciate your contributions during your tenure with us and wish you all the best for your future endeavors.</p>
                    <br>
                    <p>Best regards,<br>
                    <strong>HR Department</strong></p>
                </div>
            `,
            attachments: [
                {
                    filename: `Experience_Certificate_${employee.employeeId}.pdf`,
                    path: pdfPath
                }
            ]
        };

        return await this.transporter.sendMail(mailOptions);
    }

    async sendReleaseLetter(employee, pdfPath) {
        const mailOptions = {
            from: process.env.SMTP_FROM || '"HR Department" <hr@company.com>',
            to: employee.email,
            subject: 'Relieving Letter',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #ef4444;">Relieving Letter</h2>
                    <p>Dear ${employee.name},</p>
                    <p>Please find attached your relieving letter confirming your separation from the organization.</p>
                    <p>We thank you for your service and wish you success in your future career.</p>
                    <br>
                    <p>Best regards,<br>
                    <strong>HR Department</strong></p>
                </div>
            `,
            attachments: [
                {
                    filename: `Relieving_Letter_${employee.employeeId}.pdf`,
                    path: pdfPath
                }
            ]
        };

        return await this.transporter.sendMail(mailOptions);
    }

    async sendVirtualId(employee, pdfPath) {
        const mailOptions = {
            from: process.env.SMTP_FROM || '"HR Department" <hr@company.com>',
            to: employee.email,
            subject: 'Virtual ID Card',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #6366f1;">Virtual ID Card</h2>
                    <p>Dear ${employee.name},</p>
                    <p>Please find attached your virtual ID card.</p>
                    <p>You can use this for identification purposes within the organization.</p>
                    <br>
                    <p>Best regards,<br>
                    <strong>HR Department</strong></p>
                </div>
            `,
            attachments: [
                {
                    filename: `Virtual_ID_${employee.employeeId}.pdf`,
                    path: pdfPath
                }
            ]
        };

        return await this.transporter.sendMail(mailOptions);
    }
}

const emailServiceInstance = new EmailService();
export default emailServiceInstance;
