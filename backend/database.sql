-- database.sql
CREATE DATABASE IF NOT EXISTS insighted;
USE insighted;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS syllabuses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_title VARCHAR(255) NOT NULL,
    structure JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
USE insighted;

CREATE TABLE IF NOT EXISTS career_goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE, 
    target_role VARCHAR(100) NOT NULL, 
    target_company_tier VARCHAR(50), 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roadmap_recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    topic_name VARCHAR(100) NOT NULL, 
    category VARCHAR(50), 
    importance_level ENUM('Critical', 'High', 'Medium') DEFAULT 'High',
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

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

CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);
CREATE INDEX idx_sessions_user_time ON study_sessions(user_id, start_time);
CREATE INDEX idx_quizzes_user_syllabus ON quizzes(user_id, syllabus_id);