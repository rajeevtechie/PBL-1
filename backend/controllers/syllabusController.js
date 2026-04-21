const crypto = require('crypto'); 
const db = require('../config/db');
const { aiQueue } = require('../config/queue');
// 🛡️ NEW: Importing your centralized model!
const { model } = require('../config/geminiConfig'); 

// --- 1. UPLOAD & ANALYZE SYLLABUS (QUEUE ARCHITECTURE) ---
exports.uploadSyllabus = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });

        const userId = req.user.id;
        console.log(`Processing file: ${req.file.originalname} for User ID: ${userId}`);

        const fileHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
        const cacheKey = `pdf_${fileHash}`;

        // ⚡ 1. CHECK THE CACHE (INSTANT DELIVERY)
        const [cachedData] = await db.execute('SELECT response_data FROM ai_cache WHERE cache_key = ?', [cacheKey]);

        if (cachedData.length > 0) {
            console.log(` CACHE HIT! Loading PDF instantly.`);
            const syllabusJson = JSON.parse(cachedData[0].response_data);
            const courseTitle = syllabusJson.courseTitle || "Untitled Course";
            
            const [existing] = await db.execute('SELECT id FROM syllabuses WHERE user_id = ? AND course_title = ?', [userId, courseTitle]);
            if (existing.length > 0) {
                return res.status(200).json({ status: 'conflict', parsedData: syllabusJson, existingId: existing[0].id });
            }

            const [resultDb] = await db.execute('INSERT INTO syllabuses (user_id, course_title, structure) VALUES (?, ?, ?)', [userId, courseTitle, JSON.stringify(syllabusJson)]);
            try { await db.execute('INSERT INTO library_items (user_id, title, type, category) VALUES (?, ?, ?, ?)', [userId, courseTitle, 'folder', 'uploaded']); } catch(e){}
            return res.status(200).json({ status: 'success', syllabusId: resultDb.insertId, data: syllabusJson });
        }

        // 🐢 2. CACHE MISS: ADD TO QUEUE
        console.log(`CACHE MISS. Adding PDF to background queue...`);
        const base64Data = req.file.buffer.toString("base64");
        const mimeType = req.file.mimetype;

        const job = await aiQueue.add('generate-roadmap', {
            base64Data, mimeType, cacheKey, userId
        });

        res.status(202).json({ message: "Added to queue", jobId: job.id });
    } catch (error) { 
        console.error("Upload Error:", error);
        res.status(500).json({ message: "AI Processing Failed", error: error.message }); 
    }
};

// --- 1.5 CHECK UPLOAD STATUS (Frontend Polling) ---
exports.checkUploadJobStatus = async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = await aiQueue.getJob(jobId);
        
        if (!job) return res.status(404).json({ message: "Job not found" });

        const state = await job.getState();

        if (state === 'completed') {
            return res.status(200).json({ status: 'completed', result: job.returnvalue });
        } else if (state === 'failed') {
            return res.status(500).json({ status: 'failed', message: "AI Generation Failed." });
        } else {
            return res.status(202).json({ status: state }); // processing
        }
    } catch (error) { res.status(500).json({ message: "Failed to check status" }); }
};

// --- 2. CONFIRM OVERWRITE EXISTING SYLLABUS ---
exports.confirmUpload = async (req, res) => {
    try {
        const { parsedData, existingId } = req.body;
        if (!existingId) return res.status(400).json({ message: "Missing ID." });
        await db.execute('UPDATE syllabuses SET structure = ?, created_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?', [JSON.stringify(parsedData), existingId, req.user.id]);
        res.status(200).json({ message: "Updated", syllabusId: existingId, data: parsedData });
    } catch (error) { res.status(500).json({ message: "Save Failed", error: error.message }); }
};

// --- 3. GET AGGREGATE PROGRESS ---
exports.getAggregateProgress = async (req, res) => {
    try {
        const userId = req.user.id;
        const [syllabuses] = await db.execute('SELECT id, course_title, structure FROM syllabuses WHERE user_id = ?', [userId]);

        let totalAcademicUnits = 0; let completedAcademicUnits = 0;
        let totalCareerRecs = 0; let completedCareerRecs = 0;
        const details = [];

        const [recs] = await db.execute('SELECT syllabus_id, is_completed FROM roadmap_recommendations WHERE user_id = ?', [userId]);

        for (const syl of syllabuses) {
            const structure = typeof syl.structure === 'string' ? JSON.parse(syl.structure) : syl.structure;
            let subjTotalUnits = 0; let subjCompletedUnits = 0;
            if (structure && structure.units) {
                subjTotalUnits = structure.units.length;
                subjCompletedUnits = structure.units.filter(u => u.is_completed === true || u.completed === true || u.is_completed === 1).length;
            }
            const subjAcademicProg = subjTotalUnits === 0 ? 0 : Math.round((subjCompletedUnits / subjTotalUnits) * 100);

            totalAcademicUnits += subjTotalUnits; completedAcademicUnits += subjCompletedUnits;

            const subjRecs = recs.filter(r => r.syllabus_id === syl.id);
            const subjTotalRecs = subjRecs.length;
            const subjCompletedRecs = subjRecs.filter(r => r.is_completed === true || r.is_completed === 1).length;
            const subjCareerProg = subjTotalRecs === 0 ? 0 : Math.round((subjCompletedRecs / subjTotalRecs) * 100);

            totalCareerRecs += subjTotalRecs; completedCareerRecs += subjCompletedRecs;
            details.push({ id: syl.id, courseTitle: syl.course_title, academicProgress: subjAcademicProg, careerProgress: subjCareerProg });
        }

        const academicAvg = totalAcademicUnits === 0 ? 0 : Math.round((completedAcademicUnits / totalAcademicUnits) * 100);
        const careerAvg = totalCareerRecs === 0 ? 0 : Math.round((completedCareerRecs / totalCareerRecs) * 100);

        res.status(200).json({ academicProgress: academicAvg, careerProgress: careerAvg, details: details });
    } catch (error) { res.status(500).json({ message: "Failed to calculate aggregate progress" }); }
};

// --- 4. LIST ALL SUBJECTS ---
exports.listAllSyllabuses = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT id, course_title, created_at FROM syllabuses WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.status(200).json(rows);
    } catch (error) { res.status(500).json({ message: "Failed" }); }
};

// --- 5. GET SPECIFIC SYLLABUS ---
exports.getSyllabusById = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM syllabuses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (rows.length === 0) return res.status(404).json({ message: "Subject not found." });
        let data = typeof rows[0].structure === 'string' ? JSON.parse(rows[0].structure) : rows[0].structure;
        data.id = rows[0].id;
        res.status(200).json(data);
    } catch (error) { res.status(500).json({ message: "Failed" }); }
};

// --- 6. GET LATEST SYLLABUS ---
exports.getLatestSyllabus = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM syllabuses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ message: "No roadmap found." });
        let data = typeof rows[0].structure === 'string' ? JSON.parse(rows[0].structure) : rows[0].structure;
        data.id = rows[0].id;
        res.status(200).json(data);
    } catch (error) { res.status(500).json({ message: "Failed" }); }
};

// --- 7. GET CAREER INSIGHTS BY CONTEXT ---
exports.getCareerInsights = async (req, res) => {
    try {
        const userId = req.user.id;
        let syllabusId = req.query.syllabusId;

        if (!syllabusId || syllabusId === 'latest' || syllabusId === 'undefined') {
            const [syl] = await db.execute('SELECT id FROM syllabuses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [userId]);
            if (syl.length === 0) return res.status(200).json({ targetRole: null, recommendations: [] });
            syllabusId = syl[0].id;
        }

        const [localGoal] = await db.execute('SELECT target_role FROM career_goals WHERE user_id = ? AND syllabus_id = ?', [userId, syllabusId]);
        const [globalGoal] = await db.execute('SELECT target_role FROM career_goals WHERE user_id = ? AND syllabus_id IS NULL', [userId]);
        
        const activeRole = localGoal.length > 0 ? localGoal[0].target_role : (globalGoal.length > 0 ? globalGoal[0].target_role : null);
        const [recs] = await db.execute('SELECT * FROM roadmap_recommendations WHERE user_id = ? AND syllabus_id = ?', [userId, syllabusId]);

        res.status(200).json({ targetRole: activeRole, recommendations: recs });
    } catch (error) { res.status(500).json({ message: "Failed" }); }
};

// --- 8. GENERATE CAREER INSIGHTS (QUEUE ARCHITECTURE) ---
exports.generateCareerInsights = async (req, res) => {
    try {
        const userId = req.user.id;
        let syllabusId = req.params.id || req.body.syllabusId;
        const { targetRole, isGlobal } = req.body; 

        if (!targetRole) return res.status(400).json({ message: "Please provide a target role." });

        if (!syllabusId || syllabusId === 'latest' || syllabusId === 'undefined') {
            const [rows] = await db.execute('SELECT id FROM syllabuses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [userId]);
            if (rows.length === 0) return res.status(404).json({ message: "No syllabus found." });
            syllabusId = rows[0].id;
        }

        const [rows] = await db.execute('SELECT course_title, structure FROM syllabuses WHERE id = ? AND user_id = ?', [syllabusId, userId]);
        if (rows.length === 0) return res.status(404).json({ message: "Syllabus not found." });
        
        const courseTitle = rows[0].course_title;
        const academicStructure = rows[0].structure;
        const isAcademicMode = /academic|exam|examination|university|pass|score|college|grade/i.test(targetRole);
        
        const rawKey = `insights_${courseTitle}_${targetRole}`;
        const cacheKey = rawKey.toLowerCase().replace(/[^a-z0-9]/g, '_'); 

        // 1. Check Cache
        const [cachedData] = await db.execute('SELECT response_data FROM ai_cache WHERE cache_key = ?', [cacheKey]);
        if (cachedData.length > 0) {
            console.log(`⚡ CACHE HIT! Returning instantly.`);
            // Fetch existing recs from DB to ensure IDs are correct
            const [existingRecs] = await db.execute('SELECT * FROM roadmap_recommendations WHERE user_id = ? AND syllabus_id = ?', [userId, syllabusId]);
            return res.status(200).json({ message: "Loaded from cache", recommendations: existingRecs });
        }

        // 2. Add to Queue
        console.log(`CACHE MISS. Adding Career generation to queue...`);
        const job = await aiQueue.add('generate-career', {
            courseTitle, academicStructure, targetRole, isAcademicMode, userId, syllabusId, isGlobal, cacheKey
        });

        res.status(202).json({ message: "Added to queue", jobId: job.id });
    } catch (error) { res.status(500).json({ message: "AI Error", error: error.message }); }
};

// --- 8.5 CHECK CAREER JOB STATUS (Frontend Polling) ---
exports.checkCareerJobStatus = async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = await aiQueue.getJob(jobId);
        if (!job) return res.status(404).json({ message: "Job not found" });

        const state = await job.getState();
        if (state === 'completed') {
            return res.status(200).json({ status: 'completed', recommendations: job.returnvalue });
        } else if (state === 'failed') {
            return res.status(500).json({ status: 'failed', message: "AI Generation Failed." });
        } else {
            return res.status(202).json({ status: state }); // Still processing
        }
    } catch (error) { res.status(500).json({ message: "Failed to check status" }); }
};

// --- 9. TOGGLE RECOMMENDATION COMPLETION ---
exports.toggleRecommendation = async (req, res) => {
    try {
        const { isCompleted } = req.body; 
        await db.execute('UPDATE roadmap_recommendations SET is_completed = ? WHERE id = ? AND user_id = ?', [isCompleted ? 1 : 0, req.params.recId, req.user.id]);
        res.status(200).json({ message: "Updated" });
    } catch (error) { res.status(500).json({ message: "Failed" }); }
};

// --- 10. UPDATE ACADEMIC SYLLABUS STRUCTURE ---
exports.updateSyllabusStructure = async (req, res) => {
    try {
        const userId = req.user.id;
        let syllabusId = req.params.id;
        const { structure } = req.body;

        if (syllabusId === 'latest' || syllabusId === 'undefined') {
            const [rows] = await db.execute('SELECT id FROM syllabuses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [userId]);
            if (rows.length === 0) return res.status(404).json({ message: "No syllabus found." });
            syllabusId = rows[0].id;
        }

        await db.execute('UPDATE syllabuses SET structure = ? WHERE id = ? AND user_id = ?', [JSON.stringify(structure), syllabusId, userId]);
        res.status(200).json({ message: "Progress saved" });
    } catch (error) { res.status(500).json({ message: "Failed" }); }
};