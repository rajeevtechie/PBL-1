const { Queue } = require('bullmq');
const Redis = require('ioredis');
require('dotenv').config();

console.log("Attempting to connect to Redis...");

// The most resilient connection configuration for Upstash
const redisConnection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  family: 4, // Force IPv4
  enableAutoPipelining: true,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  tls: {
      rejectUnauthorized: false
  }
});

redisConnection.on('connect', () => console.log('Successfully connected to Redis'));
redisConnection.on('error', (err) => console.error('Redis connection error:', err.message));

const aiQueue = new Queue('ai-tasks', { 
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3, 
        backoff: {
            type: 'exponential',
            delay: 2000, 
        },
        removeOnComplete: { age: 3600 }, 
        removeOnFail: { age: 86400 } 
    }
});

console.log("Master AI Queue Initialized");

module.exports = {
  aiQueue,
  redisConnection
};