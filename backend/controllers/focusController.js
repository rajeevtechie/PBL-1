const db = require('../config/db');

// --- HELPER: Normalize Data ---
const normalize = (val, min, max) => (val - min) / (max - min);

// --- HELPER: Euclidean Distance ---
const getDistance = (point1, point2) => {
    return Math.sqrt(
        Math.pow(point1.normTime - point2.normTime, 2) + 
        Math.pow(point1.normFocus - point2.normFocus, 2)
    );
};

// --- ALGORITHM: Custom DBSCAN ---
const runDBSCAN = (points, epsilon, minPts) => {
    let clusterId = 0;
    
    // Initialize all points as unvisited (0), noise (-1), or part of a cluster (>0)
    points.forEach(p => p.cluster = 0); 

    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (p.cluster !== 0) continue; // Already visited

        // Find neighbors within the epsilon radius
        const neighbors = points.filter(q => getDistance(p, q) <= epsilon);

        if (neighbors.length < minPts) {
            p.cluster = -1; // Mark as noise (for now)
        } else {
            clusterId++;
            p.cluster = clusterId;

            // Expand cluster using a queue (Breadth-First Search approach)
            let queue = [...neighbors];
            while (queue.length > 0) {
                const q = queue.shift();
                
                if (q.cluster === -1) q.cluster = clusterId; // Change noise to border point
                if (q.cluster !== 0) continue; // Already processed
                
                q.cluster = clusterId;
                const qNeighbors = points.filter(n => getDistance(q, n) <= epsilon);
                
                if (qNeighbors.length >= minPts) {
                    queue.push(...qNeighbors);
                }
            }
        }
    }
    return points;
};

// --- MAIN CONTROLLER ---
exports.getFocusClusters = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.userId;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // 1. Fetch data from the database
        const [sessions] = await db.execute(
            'SELECT start_time, duration_minutes, focus_score FROM study_sessions WHERE user_id = ?',
            [userId]
        );

        if (sessions.length < 5) {
            return res.status(200).json({ 
                message: "Not enough data yet. Complete at least 5 study sessions to unlock AI Insights.",
                clusters: [] 
            });
        }

        // 2. Format and Normalize Data
        const dataset = sessions.map(session => {
            const date = new Date(session.start_time);
            const minutesSinceMidnight = (date.getHours() * 60) + date.getMinutes();
            
            return {
                originalTime: minutesSinceMidnight,
                originalFocus: session.focus_score,
                normTime: normalize(minutesSinceMidnight, 0, 1440),
                normFocus: normalize(session.focus_score, 0, 100),
                rawDate: session.start_time
            };
        });

        // 3. Execute DBSCAN
        // epsilon = 0.15 (approx 15% spatial distance tolerance), minPts = 2 (minimum sessions to form a pattern)
        const clusteredData = runDBSCAN(dataset, 0.15, 2);

        // 4. Analyze Results to find the "Peak Focus" cluster
        // Filter out noise (-1) and group by cluster ID
        const validClusters = clusteredData.filter(p => p.cluster > 0);
        
        res.status(200).json({
            success: true,
            totalSessionsAnalyzed: sessions.length,
            data: validClusters
        });

    } catch (error) {
        console.error("DBSCAN Error:", error);
        next(error);
    }
};