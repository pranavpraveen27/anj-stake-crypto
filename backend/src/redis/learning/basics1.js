import config from "../../config/config.js";
import {createClient} from "redis"


const client=await createClient({url:config.REDIS_URL})
    .on("error", (err)=>console.log("red-client-err", err))
    .connect();

await client.set("user:1:name","pranav")
console.log(await client.get("user:1:name"))

client.destroy()

/*
A) Strings (with patterns like rate-limiter, caching, locking)
B) Hashes (full patterns for storing user profiles, sessions, carts)
C) Lists (queue worker example + blocking operations)
D) Sets/ZSets (leaderboards, tags, recommendations)
E) Streams (real job queue with consumer groups)
F) Pub/Sub (realtime chat example)
*/
