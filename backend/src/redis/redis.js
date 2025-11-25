// src/redis/redis.js
import { createClient } from "redis";
import config from "../config/config.js";

const redis = createClient({
  url: config.REDIS_URL || process.env.REDIS_URL || "redis://localhost:6379",
});

// attach error handler
redis.on("error", (err) => console.error("redis client error", err));

// connect right away (callers can await this if required)
async function connectRedis() {
  if (!redis.isOpen) {
    await redis.connect();
    console.log("Redis client connected");
  }
}

export { redis, connectRedis };
