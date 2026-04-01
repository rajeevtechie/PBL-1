// backend/controllers/insightController.js
const db = require('../config/db');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// ✅ OPTIMIZATION: Pointing to the specific, stable 1.5-flash model to avoid 503 errors
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- 1. DASHBOARD ANALYTICS ---
exports.getDashboardAnalytics = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.userId;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // 1. Fetch all completed study sessions for this user
        const [sessions] = await db.execute(
            'SELECT start_time, duration_minutes, focus_score FROM study_sessions WHERE user_id = ? ORDER BY start_time DESC',
            [userId]
        );

        const totalSessions = sessions.length;

        // 2. THE COLD START: If they have no data, send the defaults!
        if (totalSessions === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    totalSessions: 0,
                    avgFocus: 0,
                    consistencyData: [0, 0, 0, 0, 0, 0, 0],
                    peakTime: "Analyzing...",
                    peakDesc: "Log a focus session to unlock AI timing insights."
                }
            });
        }

        // 3. CALCULATE AGGREGATES
        const totalFocusScore = sessions.reduce((acc, curr) => acc + (curr.focus_score || 0), 0);
        const avgFocus = Math.round(totalFocusScore / totalSessions);

        // 4. CALCULATE CONSISTENCY HEATMAP (Last 7 Days)
        const dailySessions = [0, 0, 0, 0, 0, 0, 0]; // Index 6 is Today, Index 0 is 6 days ago
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        sessions.forEach(session => {
            const sessionDate = new Date(session.start_time);
            const diffTime = Math.abs(today - sessionDate);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
            
            if (diffDays >= 0 && diffDays <= 6) {
                const index = 6 - diffDays;
                // Count the number of sessions per day
                dailySessions[index] += 1; 
            }
        });

        // Normalize the graph data so it looks good on the frontend (Scale 0 to 4)
        const maxSessionsInADay = Math.max(...dailySessions, 1);
        const consistencyData = dailySessions.map(count => {
            if (count === 0) return 0;
            // Spread the bar heights evenly based on their max day
            return Math.ceil((count / maxSessionsInADay) * 4); 
        });

        // 5. CALCULATE PEAK PRODUCTIVITY WINDOW
        let peakTime = "Analyzing...";
        let peakDesc = "Study more to unlock AI timing insights.";
        
        // We only calculate a peak window if they've done at least 4 sessions
        if (totalSessions >= 4) {
            const hourCounts = new Array(24).fill(0);
            
            sessions.forEach(session => {
                const hour = new Date(session.start_time).getHours();
                // Weight the hour by both duration and how focused you were
                hourCounts[hour] += (session.duration_minutes * ((session.focus_score || 50) / 100));
            });

            // Find the best hour
            let bestHour = 0;
            let maxScore = 0;
            for (let i = 0; i < 24; i++) {
                if (hourCounts[i] > maxScore) {
                    maxScore = hourCounts[i];
                    bestHour = i;
                }
            }

            // Format it nicely (e.g., "10 PM - 1 AM")
            const formatHour = (h) => {
                const ampm = h >= 12 ? 'PM' : 'AM';
                let formatted = h % 12;
                if (formatted === 0) formatted = 12;
                return `${formatted} ${ampm}`;
            };

            const endHour = (bestHour + 3) % 24; // 3 hour window
            peakTime = `${formatHour(bestHour)} - ${formatHour(endHour)}`;
            
            if (bestHour >= 5 && bestHour < 12) peakDesc = "Your brain is highly active in the morning. Schedule hard subjects here!";
            else if (bestHour >= 12 && bestHour < 17) peakDesc = "You hit deep flow during the afternoon. Great for creative problem solving.";
            else if (bestHour >= 17 && bestHour < 21) peakDesc = "Evening sessions yield your highest focus. Perfect for review.";
            else peakDesc = "Your brain is most active at night. Avoid distractions and dive deep.";
        }

        // 6. Send the Live Data to React!
        res.status(200).json({
            success: true,
            data: {
                totalSessions,
                avgFocus,
                consistencyData,
                peakTime,
                peakDesc
            }
        });

    } catch (error) {
        console.error("Analytics Error:", error);
        res.status(500).json({ success: false, message: "Failed to generate insights." });
    }
};

// --- 2. AI MENTOR CHAT ---
exports.chatWithMentor = async (req, res, next) => {
  try {
    const { message, userName, currentFocus } = req.body;
    
    const prompt = `You are the "InsightED AI Mentor", an elite, encouraging academic tutor. 
    
    Context about the student you are talking to:
    - Name: ${userName || "Student"}
    - Current Average Focus Score: ${currentFocus ? currentFocus + '%' : "Unknown"}
    
    Rules for your response:
    1. Reply directly to the student's message.
    2. Keep your response conversational, helpful, and strictly under 4 sentences.
    3. If they ask about their performance or focus, use their Focus Score to give personalized advice (e.g., if it's under 60%, suggest the Pomodoro technique or taking a walk; if it's over 80%, praise their deep work momentum).
    4. Speak like a human mentor, not an AI language model.

    Student says: "${message}"`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    res.status(200).json({ reply: text });
  } catch (error) {
    console.error("AI Chat Error:", error);
    res.status(500).json({ reply: "Sorry, my servers are taking a quick nap. Try again in a moment!" });
  }
};