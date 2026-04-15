-- 1. Wipe the slate clean and start fresh
DROP DATABASE IF EXISTS insighted;
CREATE DATABASE insighted;
USE insighted;

-- 2. Core Users Table 
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'student',
    
    -- 🛡️ VERIFICATION COLUMNS
    is_verified BOOLEAN DEFAULT FALSE,
    verification_otp VARCHAR(6) NULL,
    otp_expires_at DATETIME NULL,
    
    -- 🛡️ APP PREFERENCES & STATE
    email_notifications BOOLEAN DEFAULT TRUE,
    parent_email VARCHAR(255) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    tour_flags JSON DEFAULT ('{}'), -- 🌟 The Enterprise Hybrid Sync Data
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Syllabuses Table
CREATE TABLE IF NOT EXISTS syllabuses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_title VARCHAR(255) NOT NULL,
    structure JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Career Goals Table 
CREATE TABLE IF NOT EXISTS career_goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL, 
    syllabus_id INT NULL, 
    target_role VARCHAR(100) NOT NULL, 
    target_company_tier VARCHAR(50), 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (syllabus_id) REFERENCES syllabuses(id) ON DELETE CASCADE
);

-- 5. Roadmap Recommendations Table
CREATE TABLE IF NOT EXISTS roadmap_recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    syllabus_id INT NOT NULL,
    topic_name VARCHAR(100) NOT NULL, 
    category VARCHAR(50), 
    importance_level ENUM('Critical', 'High', 'Medium') DEFAULT 'High',
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (syllabus_id) REFERENCES syllabuses(id) ON DELETE CASCADE
);

-- 6. Quizzes Table
CREATE TABLE IF NOT EXISTS quizzes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    syllabus_id INT NOT NULL,
    topic_name VARCHAR(100) NOT NULL,
    questions_data JSON NOT NULL,
    score INT DEFAULT 0, 
    status ENUM('pending', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (syllabus_id) REFERENCES syllabuses(id) ON DELETE CASCADE
);

-- 7. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    deadline DATETIME NOT NULL,
    estimated_minutes INT NOT NULL,
    actual_minutes INT NULL, 
    importance_level INT DEFAULT 3, 
    is_industry_track BOOLEAN DEFAULT FALSE, 
    status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Study Sessions Table 
CREATE TABLE IF NOT EXISTS study_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subject_name VARCHAR(100) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    duration_minutes INT NOT NULL,
    focus_score INT NOT NULL CHECK (focus_score BETWEEN 0 AND 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. Weekly Insights Table
CREATE TABLE IF NOT EXISTS weekly_insights (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    insight_text TEXT NOT NULL,
    stats_json JSON NOT NULL, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 10. Library Items Table
CREATE TABLE IF NOT EXISTS library_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL,
    category VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NULL,
    file_data LONGBLOB NULL,
    content JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 11. AI Cache Table
CREATE TABLE IF NOT EXISTS ai_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    response_data LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Run this in your MySQL client/terminal
CREATE TABLE IF NOT EXISTS scheduled_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    event_type ENUM('focus', 'quiz', 'task', 'custom') DEFAULT 'custom',
    reference_url VARCHAR(255) NULL, -- Where to redirect them when they click the event/notification
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    is_notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subscription_data JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 12. Indexes for Performance 
CREATE INDEX idx_library_user_category ON library_items(user_id, category);
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);
CREATE INDEX idx_sessions_user_time ON study_sessions(user_id, start_time);
CREATE INDEX idx_quizzes_user_syllabus ON quizzes(user_id, syllabus_id);