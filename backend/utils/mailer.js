// backend/utils/mailer.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS  
  }
});

const sendOTP = async (toEmail, otp) => {
    const mailOptions = {
        from: `"InsightED Security" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'InsightED - Verify Your Email',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #0f172a;">Welcome to InsightED! 🚀</h2>
                <p style="color: #475569; line-height: 1.6;">Thank you for registering. To complete your account creation and ensure your security, please use the 6-digit verification code below:</p>
                <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
                    <h1 style="color: #6366f1; letter-spacing: 8px; margin: 0; font-size: 32px;">${otp}</h1>
                </div>
                <p style="color: #94a3b8; font-size: 12px; text-align: center;">This code will expire in 15 minutes. Please do not share it with anyone.</p>
            </div>
        `
    };

    return await transporter.sendMail(mailOptions);
};

// Export BOTH the transporter (for weekly summaries) and sendOTP (for auth)
module.exports = { transporter, sendOTP };