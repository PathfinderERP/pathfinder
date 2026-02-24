import nodemailer from 'nodemailer';

class EmailService {
    constructor() {
        this.transporter = null;
    }

    getTransporter() {
        if (!this.transporter) {
            const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
            const user = (process.env.SMTP_USER || 'demo@example.com').trim();
            console.log(`EmailService: Initializing transporter for host: ${host}, user: ${user}`);

            this.transporter = nodemailer.createTransport({
                host: host,
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: false, // true for 465, false for other ports
                auth: {
                    user: user,
                    pass: (process.env.SMTP_PASS || 'demo_password').trim()
                }
            });
        }
        return this.transporter;
    }

    async sendEmail(mailOptions) {
        try {
            console.log(`EmailService: Sending email to ${mailOptions.to} with subject "${mailOptions.subject}"`);
            if (mailOptions.attachments) {
                console.log(`EmailService: Accessing attachment at: ${mailOptions.attachments[0].path}`);
            }
            const info = await this.getTransporter().sendMail(mailOptions);
            console.log(`EmailService: Email sent: ${info.messageId}`);
            return info;
        } catch (error) {
            console.error("EmailService: Error sending email:", error);
            throw error;
        }
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

        return await this.sendEmail(mailOptions);
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

        return await this.sendEmail(mailOptions);
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

        return await this.sendEmail(mailOptions);
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

        return await this.sendEmail(mailOptions);
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

        return await this.sendEmail(mailOptions);
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

        return await this.sendEmail(mailOptions);
    }

    /**
     * Sends a letter with custom subject, body and additional attachments
     */
    async sendCustomLetter(employee, { subject, body, mainAttachment, additionalAttachments = [] }) {
        const createAttachment = (attr) => {
            if (!attr) return null;
            const attachment = { filename: attr.filename || 'attachment.pdf' };

            // Strictly check for path (string) or content (Buffer/string)
            if (typeof attr.path === 'string' && attr.path) {
                attachment.path = attr.path;
            } else if (attr.content && (Buffer.isBuffer(attr.content) || typeof attr.content === 'string')) {
                attachment.content = attr.content;
            } else if (attr.path && Buffer.isBuffer(attr.path)) {
                // If path was mistakenly passed as Buffer
                attachment.content = attr.path;
            }

            return (attachment.path || attachment.content) ? attachment : null;
        };

        const attachments = [
            createAttachment(mainAttachment),
            ...additionalAttachments.map(attr => createAttachment(attr))
        ].filter(Boolean);

        const mailOptions = {
            from: process.env.SMTP_FROM || '"HR Department" <hr@company.com>',
            to: employee.email,
            subject: typeof subject === 'string' ? subject : 'Document from HR',
            html: typeof body === 'string' ? body : `<p>Dear ${employee.name}, Please find the attached document.</p>`,
            attachments
        };

        return await this.sendEmail(mailOptions);
    }

    async sendBirthdayWish(employee) {
        const mailOptions = {
            from: process.env.SMTP_FROM || '"HR Department" <hr@company.com>',
            to: employee.email,
            subject: `🎉 Happy Birthday, ${employee.name}! 🎂✨`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); background-color: #ffffff;">
                    <!-- Festive Header -->
                    <div style="background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%); padding: 50px 20px; text-align: center; color: white; position: relative; overflow: hidden;">
                        <div style="font-size: 60px; margin-bottom: 10px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));">🥳 🎂 🎈</div>
                        <h1 style="margin: 0; font-size: 32px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">Happy Birthday!</h1>
                        <p style="font-size: 20px; font-weight: 500; opacity: 0.95; margin-top: 10px;">Celebrate Big, ${employee.name}! ✨</p>
                    </div>

                    <!-- Card Body -->
                    <div style="padding: 40px 30px; color: #1f2937; line-height: 1.8; position: relative;">
                        <!-- Floating Emojis -->
                        <div style="font-size: 24px; margin-bottom: 25px;">🎊 Dear <span style="color: #6366f1; font-weight: 800;">${employee.name}</span>, 🎁</div>
                        
                        <p style="font-size: 16px;">The whole team at <strong style="color: #a855f7;">Pathfinder</strong> is sending you the warmest wishes on your special day! 🌟</p>
                        
                        <p style="font-size: 16px;">You are an invaluable part of our family, and we truly appreciate the incredible energy and dedication you bring to work every single day. 🚀</p>
                        
                        <div style="background-color: #fef2f2; border-left: 4px solid #f43f5e; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                            <p style="margin: 0; font-style: italic; color: #9f1239; font-size: 16px;">
                                "May your year be filled with success, laughter, and beautiful moments that turn into lasting memories." 🌈✨
                            </p>
                        </div>
                        
                        <p style="font-size: 16px; margin-bottom: 35px;">Enjoy your cake, spend time with loved ones, and have the most fantastic celebration! You deserve it! 🥂🍦🍰</p>
                        
                        <!-- Signature -->
                        <div style="border-top: 2px dashed #f3f4f6; padding-top: 25px; display: flex; align-items: center;">
                            <div>
                                <p style="margin: 0; font-size: 15px; color: #6b7280;">With much appreciation, ❤️</p>
                                <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: 800; background: linear-gradient(to right, #6366f1, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Human Resources Team</p>
                                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #9ca3af;">Pathfinder</p>
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
                        <p style="margin: 0;">Sent with ❤️ from Pathfinder</p>
                        <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} Pathfinder. All rights reserved.</p>
                    </div>
                </div>
            `
        };

        return await this.sendEmail(mailOptions);
    }

    async sendStudentBirthdayWish(student) {
        const mailOptions = {
            from: process.env.SMTP_FROM || '"Pathfinder" <info@pathfinder.com>',
            to: student.email,
            subject: `🎉 Happy Birthday, ${student.name}! 🎂✨`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); background-color: #ffffff;">
                    <!-- Festive Header -->
                    <div style="background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%); padding: 50px 20px; text-align: center; color: white; position: relative; overflow: hidden;">
                        <div style="font-size: 60px; margin-bottom: 10px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));">🥳 🎂 🎈</div>
                        <h1 style="margin: 0; font-size: 32px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">Happy Birthday!</h1>
                        <p style="font-size: 20px; font-weight: 500; opacity: 0.95; margin-top: 10px;">Wishing you a great year ahead, ${student.name}! ✨</p>
                    </div>

                    <!-- Card Body -->
                    <div style="padding: 40px 30px; color: #1f2937; line-height: 1.8; position: relative;">
                        <!-- Floating Emojis -->
                        <div style="font-size: 24px; margin-bottom: 25px;">🎊 Dear <span style="color: #6366f1; font-weight: 800;">${student.name}</span>, 🎁</div>
                        
                        <p style="font-size: 16px;">The whole team at <strong style="color: #a855f7;">Pathfinder</strong> is sending you the warmest wishes on your special day! 🌟</p>
                        
                        <p style="font-size: 16px;">We are so proud to have you as our student! May this year bring you closer to your dreams and goals, and may your path be filled with learning and success. 🚀</p>
                        
                        <div style="background-color: #fef2f2; border-left: 4px solid #f43f5e; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                            <p style="margin: 0; font-style: italic; color: #9f1239; font-size: 16px;">
                                "Success is not final, failure is not fatal: it is the courage to continue that counts. Keep shining!" 🌈✨
                            </p>
                        </div>
                        
                        <p style="font-size: 16px; margin-bottom: 35px;">Enjoy your day with friends and family! Have a fantastic celebration! 🥂🍦🍰</p>
                        
                        <!-- Signature -->
                        <div style="border-top: 2px dashed #f3f4f6; padding-top: 25px; display: flex; align-items: center;">
                            <div>
                                <p style="margin: 0; font-size: 15px; color: #6b7280;">Best wishes, ❤️</p>
                                <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: 800; background: linear-gradient(to right, #6366f1, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Pathfinder Team</p>
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
                        <p style="margin: 0;">Sent with ❤️ from Pathfinder</p>
                        <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} Pathfinder. All rights reserved.</p>
                    </div>
                </div>
            `
        };

        return await this.sendEmail(mailOptions);
    }
}

const emailServiceInstance = new EmailService();
export default emailServiceInstance;
