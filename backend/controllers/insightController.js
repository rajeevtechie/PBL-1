// backend/controllers/insightController.js
const db = require('../config/db');

// ✅ 1. Import and setup Gemini AI at the top
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

// --- DASHBOARD ANALYTICS ---
exports.getDashboardAnalytics = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.userId;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // 1. Fetch all-time aggregates
        const [aggs] = await db.execute(
            'SELECT SUM(duration_minutes) as totalMins, AVG(focus_score) as avgFocus FROM study_sessions WHERE user_id = ?',
            [userId]
        );
        
        const totalMinutes = aggs[0].totalMins || 0;
        const avgFocus = aggs[0].avgFocus ? Math.round(aggs[0].avgFocus) : 0;

        // 2. Fetch last 7 days for the Heatmap & Peak Productivity
        const [recentSessions] = await db.execute(
            'SELECT start_time, duration_minutes, focus_score FROM study_sessions WHERE user_id = ? AND start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
            [userId]
        );

        // --- CALCULATE CONSISTENCY HEATMAP (Last 7 Days) ---
        // Initialize array for the last 7 days with 0 minutes
        const dailyMinutes = [0, 0, 0, 0, 0, 0, 0]; 
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        recentSessions.forEach(session => {
            const sessionDate = new Date(session.start_time);
            sessionDate.setHours(0, 0, 0, 0);
            
            // Calculate how many days ago this session was (0 = today, 6 = 6 days ago)
            const diffTime = Math.abs(today - sessionDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            
            if (diffDays >= 0 && diffDays <= 6) {
                // Map to our array (index 6 is today, index 0 is 6 days ago)
                const index = 6 - diffDays;
                dailyMinutes[index] += session.duration_minutes;
            }
        });

        // Convert minutes into a 0-4 scale for the UI Heatmap blocks
        const consistencyData = dailyMinutes.map(mins => {
            if (mins === 0) return 0;
            if (mins < 30) return 1;
            if (mins < 60) return 2;
            if (mins < 120) return 3;
            return 4; // 2+ hours is max intensity
        });

        // --- CALCULATE PEAK PRODUCTIVITY WINDOW ---
        let peakTime = "Not enough data";
        let peakDesc = "Study more to unlock AI timing insights.";
        
        if (recentSessions.length > 0) {
            const hourCounts = new Array(24).fill(0);
            
            recentSessions.forEach(session => {
                const hour = new Date(session.start_time).getHours();
                // Weight the hour by both duration and how focused you were
                hourCounts[hour] += (session.duration_minutes * (session.focus_score / 100));
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
            
            if (bestHour >= 5 && bestHour < 12) peakDesc = "Your brain is highly active in the morning.";
            else if (bestHour >= 12 && bestHour < 17) peakDesc = "You hit deep flow during the afternoon.";
            else if (bestHour >= 17 && bestHour < 21) peakDesc = "Evening sessions yield your highest focus.";
            else peakDesc = "Your brain is most active at night.";
        }

        res.status(200).json({
            success: true,
            data: {
                totalMinutes,
                avgFocus,
                consistencyData,
                peakTime,
                peakDesc
            }
        });

    } catch (error) {
        console.error("Analytics Error:", error);
        res.status(500).json({ message: "Failed to generate insights." });
    }
};

/// ✅ 2. NEW: GOD-MODE AI MENTOR CHAT
exports.chatWithMentor = async (req, res, next) => {
  try {
    // Catch the new context variables from the frontend!
    const { message, userName, currentFocus } = req.body;
    
    // Inject the real data into the AI's brain
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