const db = require('../config/db');
// 🛡️ THE FIX: Import our centralized model instead of creating a new one!
const { model } = require('../config/geminiConfig');

// --- 1. DASHBOARD & ANALYTICS DATA ---
exports.getDashboardAnalytics = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.userId;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // A. Fetch all completed study sessions for this user
        const [sessions] = await db.execute(
            'SELECT start_time, duration_minutes, focus_score FROM study_sessions WHERE user_id = ? ORDER BY start_time DESC',
            [userId]
        );

        const totalSessions = sessions.length;

        // THE COLD START: If they have no data, send the defaults
        if (totalSessions === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    totalSessions: 0,
                    avgFocus: 0,
                    consistencyData: [0, 0, 0, 0, 0, 0, 0],
                    peakTime: "Analyzing...",
                    peakDesc: "Log a focus session to unlock AI timing insights.",
                    studyVelocity: 1.0 // Default velocity
                }
            });
        }

        // CALCULATE AGGREGATES
        const totalFocusScore = sessions.reduce((acc, curr) => acc + (curr.focus_score || 0), 0);
        const avgFocus = Math.round(totalFocusScore / totalSessions);

        // CALCULATE CONSISTENCY HEATMAP (Last 7 Days)
        const dailySessions = [0, 0, 0, 0, 0, 0, 0]; // Index 6 is Today, Index 0 is 6 days ago
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        sessions.forEach(session => {
            const sessionDate = new Date(session.start_time);
            const diffTime = Math.abs(today - sessionDate);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
            
            if (diffDays >= 0 && diffDays <= 6) {
                const index = 6 - diffDays;
                dailySessions[index] += 1; 
            }
        });

        const maxSessionsInADay = Math.max(...dailySessions, 1);
        const consistencyData = dailySessions.map(count => {
            if (count === 0) return 0;
            return Math.ceil((count / maxSessionsInADay) * 4); 
        });

        // CALCULATE PEAK PRODUCTIVITY WINDOW
        let peakTime = "Analyzing...";
        let peakDesc = "Study more to unlock AI timing insights.";
        
        if (totalSessions >= 4) {
            const hourCounts = new Array(24).fill(0);
            
            sessions.forEach(session => {
                const hour = new Date(session.start_time).getHours();
                hourCounts[hour] += (session.duration_minutes * ((session.focus_score || 50) / 100));
            });

            let bestHour = 0;
            let maxScore = 0;
            for (let i = 0; i < 24; i++) {
                if (hourCounts[i] > maxScore) {
                    maxScore = hourCounts[i];
                    bestHour = i;
                }
            }

            const formatHour = (h) => {
                const ampm = h >= 12 ? 'PM' : 'AM';
                let formatted = h % 12;
                if (formatted === 0) formatted = 12;
                return `${formatted} ${ampm}`;
            };

            const endHour = (bestHour + 3) % 24; 
            peakTime = `${formatHour(bestHour)} - ${formatHour(endHour)}`;
            
            if (bestHour >= 5 && bestHour < 12) peakDesc = "Your brain is highly active in the morning. Schedule hard subjects here!";
            else if (bestHour >= 12 && bestHour < 17) peakDesc = "You hit deep flow during the afternoon. Great for creative problem solving.";
            else if (bestHour >= 17 && bestHour < 21) peakDesc = "Evening sessions yield your highest focus. Perfect for review.";
            else peakDesc = "Your brain is most active at night. Avoid distractions and dive deep.";
        }

        // ✅ B. CALCULATE ACTUAL STUDY VELOCITY FROM TASKS
        const [completedTasks] = await db.execute(
            'SELECT estimated_minutes, actual_minutes FROM tasks WHERE user_id = ? AND status = "completed" AND actual_minutes > 0',
            [userId]
        );
        
        let studyVelocity = 1.0; 
        if (completedTasks.length > 0) {
            let totalEst = 0;
            let totalAct = 0;
            completedTasks.forEach(t => {
                totalEst += t.estimated_minutes;
                totalAct += t.actual_minutes;
            });
            
            // If estimated was 60 and actual was 50 -> 60/50 = 1.2x velocity!
            // We cap it at 3.0x so the UI doesn't break if they finish a 60 min task in 1 min.
            let rawVelocity = totalEst / totalAct;
            if (rawVelocity > 3.0) rawVelocity = 3.0; 
            
            studyVelocity = parseFloat(rawVelocity.toFixed(1));
        }

        res.status(200).json({
            success: true,
            data: {
                totalSessions,
                avgFocus,
                consistencyData,
                peakTime,
                peakDesc,
                studyVelocity // 👈 Velocity is now sent to the frontend!
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


// --- 3. ACTIVITY HEATMAP (GITHUB/LEETCODE STYLE) ---
exports.getActivityHeatmap = async (req, res) => {
    try {
        const userId = req.user?.id || req.userId;

        // 🛡️ THE FIX: Use DATE_FORMAT to force MySQL to return a raw string (YYYY-MM-DD)
        const [sessions] = await db.execute(`
            SELECT 
                DATE_FORMAT(start_time, '%Y-%m-%d') as active_date, 
                COUNT(*) as total_sessions, 
                SUM(duration_minutes) as total_minutes
            FROM study_sessions 
            WHERE user_id = ? 
            GROUP BY active_date
            ORDER BY active_date ASC
        `, [userId]);

        // Format the data for the react-activity-calendar
        const heatmapData = sessions.map(row => {
            const totalMins = parseInt(row.total_minutes) || 0;
            
            // Determine how "bright" the green square should be (Scale 1-4)
            let intensityLevel = 1; // Light green (Under 30 mins)
            if (totalMins >= 30) intensityLevel = 2; // Medium (30-60 mins)
            if (totalMins >= 60) intensityLevel = 3; // High (1-2 hours)
            if (totalMins >= 120) intensityLevel = 4; // Intense (2+ hours)

            return {
                date: row.active_date, // 👈 Clean string, no shifting!
                count: totalMins, // Used for the hover tooltip 
                level: intensityLevel
            };
        });

        res.status(200).json({ success: true, data: heatmapData });
    } catch (error) {
        console.error("Heatmap Error:", error);
        res.status(500).json({ success: false, message: "Failed to load heatmap data" });
    }
};

// --- 4. GENERATE WEEKLY AI SUMMARY ---
exports.generateWeeklySummary = async (req, res) => {
    try {
        const userId = req.user?.id || req.userId;
        
        // 1. Calculate the date range (Last 7 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);

        // 2. Fetch the student's raw data for the week
        const [sessions] = await db.execute(`
            SELECT subject_name, duration_minutes, focus_score 
            FROM study_sessions 
            WHERE user_id = ? AND start_time BETWEEN ? AND ?
        `, [userId, startDate.toISOString(), endDate.toISOString()]);

        if (sessions.length === 0) {
            return res.status(200).json({ 
                success: true, 
                message: "Not enough data yet.",
                insight: "You haven't logged any study sessions this week! Start a focus timer to get your AI summary." 
            });
        }

        // 3. Crunch the numbers
        let totalMinutes = 0;
        let totalFocus = 0;
        const subjectTally = {};

        sessions.forEach(s => {
            totalMinutes += s.duration_minutes;
            totalFocus += s.focus_score;
            subjectTally[s.subject_name] = (subjectTally[s.subject_name] || 0) + s.duration_minutes;
        });

        const avgFocus = Math.round(totalFocus / sessions.length);
        const topSubject = Object.keys(subjectTally).reduce((a, b) => subjectTally[a] > subjectTally[b] ? a : b);
        const hours = (totalMinutes / 60).toFixed(1);

        const statsJson = { totalMinutes, avgFocus, topSubject, sessionCount: sessions.length };

        // 4. Ask Gemini to act as the Mentor
        const prompt = `You are the InsightED AI Mentor, an encouraging academic coach.
        Analyze this student's weekly study data:
        - Total Study Time: ${hours} hours
        - Average Focus Score: ${avgFocus}% (100% is perfect deep work, below 60% means they were highly distracted)
        - Most Studied Subject: ${topSubject}
        
        Write a short, highly personalized, 3-sentence summary of their week. 
        Acknowledge their hard work, gently point out if their focus was low, and offer ONE specific piece of advice for next week. Keep it conversational and inspiring.`;

        const result = await model.generateContent(prompt);
        let insightText = await result.response.text();
        
        // Clean up markdown just in case
        insightText = insightText.replace(/\*\*/g, '').trim();

        // 5. Save it to the database
        await db.execute(`
            INSERT INTO weekly_insights (user_id, week_start_date, week_end_date, insight_text, stats_json)
            VALUES (?, ?, ?, ?, ?)
        `, [userId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], insightText, JSON.stringify(statsJson)]);

        res.status(200).json({ success: true, insight: insightText, stats: statsJson });

    } catch (error) {
        console.error("Weekly Summary Error:", error);
        res.status(500).json({ success: false, message: "Failed to generate AI summary." });
    }
};

// --- 5. FETCH SAVED WEEKLY INSIGHTS ---
exports.getWeeklyInsights = async (req, res) => {
    try {
        const userId = req.user?.id || req.userId;
        const [insights] = await db.execute(`
            SELECT insight_text, stats_json, week_end_date 
            FROM weekly_insights 
            WHERE user_id = ? 
            ORDER BY week_end_date DESC LIMIT 5
        `, [userId]);

        res.status(200).json({ success: true, data: insights });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch insights." });
    }
};