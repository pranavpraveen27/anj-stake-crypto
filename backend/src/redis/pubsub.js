import { createClient } from "redis";
import config from "../config/config.js";
import { clients } from "../index.js";


export const sub=await createClient({url:config.REDIS_URL})
    .on("error", (err)=>console.log("redis pub error",err))
    .connect();


export const pub=await createClient({url:config.REDIS_URL})
    .on("error", err=>console.log("pub redis error", err))
    .connect();


sub.subscribe("event", (message)=>{
    for(const ws of clients){
        if(ws.readyState==ws.OPEN){
            ws.send(message)
        }
    }
    console.log(message)
})
