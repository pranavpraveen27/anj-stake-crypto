import { createClient } from "redis";
import config from "../config/config.js";


export const sub=await createClient({url:config.REDIS_URL})
    .on("error", (err)=>console.log("redis pub error",err))
    .connect();



await sub.subscribe("stream-update", (message)=>{
    console.log("received", message)
})
