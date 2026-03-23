// backend/cron/weeklySummary.js
const cron = require('node-cron');
const db = require('../config/db');
const transporter = require('../utils/mailer');
const { GoogleGenerativeAI } = require("@google/generative-ai");

require("dotenv").config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

// The Cron Schedule: '0 9 * * 0' means Every Sunday at 9:00 AM
// FOR TESTING: Change to '* * * * *' to run EVERY MINUTE!
const startWeeklyEmailCron = () => {
  cron.schedule('0 9 * * 0', async () => {
    console.log("⏰ Running Weekly AI Study Summary Engine...");

    try {
      // 1. Find all users who have email_notifications turned ON
      const [users] = await db.execute('SELECT id, name, email FROM users WHERE email_notifications = 1');

      for (const user of users) {
        // 2. Get their stats for the last 7 days
        const [stats] = await db.execute(`
          SELECT 
            SUM(duration_minutes) as totalMins, 
            AVG(focus_score) as avgFocus 
          FROM study_sessions 
          WHERE user_id = ? AND start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `, [user.id]);

        const mins = stats[0].totalMins || 0;
        const focus = stats[0].avgFocus ? Math.round(stats[0].avgFocus) : 0;

        // Skip sending an email if they didn't study at all this week
        if (mins === 0) {
            console.log(`Skipping ${user.email} - no study sessions this week.`);
            continue; 
        }

        // 3. Ask Gemini to write a hyper-personalized summary
        const prompt = `You are the InsightED AI Mentor. Write a short, encouraging 2-sentence weekly study summary for a student named ${user.name}. 
        They studied for a total of ${mins} minutes this week, with an average focus score of ${focus}%. 
        Keep it warm, professional, and inspiring. Do not use hashtags.`;

        const result = await model.generateContent(prompt);
        const aiMessage = result.response.text();

        // 4. Construct the HTML Email
        const mailOptions = {
          from: `"InsightED AI Mentor" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: 'Your Weekly InsightED Study Summary 🚀',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #6366f1; margin-top: 0;">InsightED Weekly Review</h2>
              <p style="font-size: 16px; color: #334155;">Hi ${user.name.split(' ')[0]},</p>
              <p style="font-size: 16px; color: #334155; line-height: 1.5;">${aiMessage}</p>
              
              <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 25px 0; border: 1px solid #e2e8f0;">
                <h3 style="margin-top: 0; color: #0f172a; font-size: 16px;">This Week's Stats:</h3>
                <ul style="color: #475569; font-size: 15px; margin-bottom: 0;">
                  <li style="margin-bottom: 8px;"><strong>Total Focus Time:</strong> ${mins} minutes</li>
                  <li><strong>Average Focus Score:</strong> ${focus}%</li>
                </ul>
              </div>
              
              <p style="font-size: 14px; color: #94a3b8; text-align: center; margin-bottom: 0;">
                Keep up the great momentum! Log in to InsightED to view your full analytics.
              </p>
            </div>
          `
        };

        // 5. Send it!
        await transporter.sendMail(mailOptions);
        console.log(`✅ Weekly summary sent to ${user.email}`);
      }

    } catch (error) {
      console.error("❌ Error running Weekly Cron Job:", error);
    }
  });
};

module.exports = startWeeklyEmailCron;