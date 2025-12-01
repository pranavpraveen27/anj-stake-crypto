
import { createClient } from "redis";
import config from "../config/config.js";

const redis = createClient({
  url: config.REDIS_URL || process.env.REDIS_URL || "redis://localhost:6379",
});

redis.on("error", (err) => console.error("redis client error", err));

async function connectRedis() {
  if (!redis.isOpen) {
    await redis.connect();
    console.log("Redis client connected");
  }
}

export { redis, connectRedis };
