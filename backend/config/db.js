const mysql = require('mysql2');
require('dotenv').config();

// Create a connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 4000, // TiDB uses port 4000 by default
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // 👇 THE FIX: SSL Configuration required for TiDB Cloud Serverless 👇
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    }
});

// Convert pool to promise-based (easier to use with async/await)
const promisePool = pool.promise();

// Test the connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Database Connection Failed:', err.code);
        console.error('Check your .env file credentials!');
    } else {
        console.log('Connected to TiDB Cloud Database successfully!');
        connection.release();
    }
});

module.exports = promisePool;