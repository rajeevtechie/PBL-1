# PBL-1


# 🎓 InsightED: AI-Driven Curriculum Synchronization Platform

InsightED is a context-aware, cloud-native learning platform designed to bridge the gap between static academic curricula and hyper-accelerated industry skill demands. By leveraging Generative AI, decoupled microservices, and asynchronous background processing, InsightED dynamically synchronizes student learning paths with real-world technology requirements.

-----

## 📑 Table of Contents

1.  [About the Project](https://www.google.com/search?q=%23-about-the-project)
2.  [Key Features](https://www.google.com/search?q=%23-key-features)
3.  [System Architecture](https://www.google.com/search?q=%23-system-architecture)
4.  [Technology Stack](https://www.google.com/search?q=%23-technology-stack)
5.  [Workflow & Data Pipeline](https://www.google.com/search?q=%23-workflow--data-pipeline)
6.  [Getting Started](https://www.google.com/search?q=%23-getting-started)
7.  [Team & Contributors](https://www.google.com/search?q=%23-team--contributors)

-----

## 🚀 About the Project

The contemporary landscape of higher education is navigating a period of unprecedented structural friction. InsightED solves this by processing static academic syllabi through an AI pipeline, mapping traditional coursework against real-time industry demands, and generating highly personalized, interactive study roadmaps.

Designed with a production-grade architecture, InsightED utilizes cryptographic caching, distributed job queues, and a serverless SQL database to guarantee high availability and low latency during heavy generative AI workloads.

-----

## ✨ Key Features

  * **AI-Generated Learning Roadmaps:** Transforms static university syllabi into dynamic, step-by-step industry-aligned roadmaps.
  * **Asynchronous AI Processing:** Utilizes a Redis-backed BullMQ message queue to handle long-running LLM tasks without blocking the main server thread.
  * **Advanced Focus Mode:** A globally accessible, floating study timer that tracks deep-work sessions across different modules of the app.
  * **Practice Lab & Quizzes:** Dynamic assessment modules that test students on specific curriculum topics.
  * **Smart Notification Engine:** A `node-cron` automated engine that scans the database and alerts users of upcoming schedule events.
  * **Cryptographic Caching:** Implements SHA-256 hash caching to prevent redundant API calls for previously processed syllabi, dramatically reducing AI token costs and latency.
  * **Premium UI/UX:** Features a custom-built, "hover-to-expand" sidebar and a fully themeable Light/Dark mode interface using CSS modules.

-----

## 🏗️ System Architecture

InsightED is built on a decoupled, multi-tier microservices architecture:

1.  **Tier 1 - Client (React.js):** A lightweight, highly responsive frontend built with Vite. It handles complex state management for the timers, interactive calendars, and AI insights.
2.  **Tier 2 - API Gateway (Express.js):** Acts as the primary entry point, handling JWT authentication, request validation, and routing.
3.  **Tier 3 - Message Broker & Cache (Redis + BullMQ):** Offloads heavy AI operations. The API server instantly returns a "Job ID" to the client, while a separate Worker instance safely processes the prompt in the background.
4.  **Tier 4 - AI Engine (Google Gemini):** Generates structured JSON responses to build assessments and roadmaps.
5.  **Tier 5 - Cloud Database (TiDB Serverless):** A highly scalable, MySQL-compatible cloud database secured via mandatory TLSv1.2 handshakes.

-----

## 💻 Technology Stack

**Frontend:**

  * React.js (Vite)
  * React Router DOM
  * CSS Modules (Custom Theming)
  * Lucide React (Iconography)

**Backend:**

  * Node.js & Express.js
  * `mysql2` (Promise-based connection pooling)
  * `bullmq` (Redis job queues)
  * `node-cron` (Automated scheduling)
  * `nodemailer` (Email services)

**Infrastructure & Cloud:**

  * TiDB Serverless (Cloud Database)
  * Upstash Redis (Cloud Message Broker)
  * Google Gemini API (LLM Engine)

-----

## 🔄 Workflow & Data Pipeline

**Example: The Syllabus Processing Pipeline**

1.  **Upload:** A user requests a roadmap for a specific university syllabus.
2.  **Cache Check:** The backend generates a SHA-256 hash of the request. If a roadmap for this exact syllabus already exists in the cache, it is returned instantly (Cache Hit).
3.  **Queue Assignment:** If not found (Cache Miss), the Express API pushes the task to the Redis Queue and immediately responds to the frontend with a `jobId` so the UI doesn't freeze.
4.  **Worker Execution:** A background AI Worker picks up the job from Redis, formats a strict prompt, and sends it to the Gemini API.
5.  **Database Storage:** The AI returns structured JSON, which the worker parses and securely injects into the TiDB Serverless database.
6.  **Client Polling:** The React frontend polls the backend using the `jobId`. Once marked "completed," the UI seamlessly renders the new roadmap.

-----

## 🛠️ Getting Started

### Prerequisites

  * Node.js (v18 or higher)
  * A TiDB Cloud Serverless account
  * A Redis instance (Local or Upstash)
  * A Gemini API Key

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/yourusername/InsightED.git
cd InsightED
```

**2. Setup Backend**

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory. *Note: TiDB Serverless requires Port 4000 and an SSL connection.*

```env
# Server
PORT=5000
JWT_SECRET=your_jwt_secret

# TiDB Cloud Serverless Connection
DB_HOST=gateway01.ap-southeast-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=insighted
DB_SSL=true

# Redis & AI
REDIS_URL=your_redis_url
GEMINI_API_KEY=your_gemini_api_key

# Notifications
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

Start the backend server:

```bash
npm run dev
```

**3. Setup Frontend**

```bash
cd ../frontend
npm install
```

Create a `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:5000/api
VITE_DISABLE_TOURS=false
```

Start the frontend development server:

```bash
npm run dev
```

-----

## 👥 Team & Contributors

InsightED was conceptualized, engineered, and developed by:

  * **Poshak**
  * **Rajeev Kumar Gupta**
  * **Rajesh**
  * **Swaransh**

*Department of Computer Science and Engineering, Symbiosis Institute of Technology (SIT), Pune.*