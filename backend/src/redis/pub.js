import config from "../config/config";


export const pub=await createClient({url:config.REDIS_URL})
    .on("error", err=>console.log("pub redis error", err))
    .connect();


async function sendMess(msg){
    await pub.publish("stream-update", msg);
    console.log("message sent", msg);
}

setInterval(()=>{
    sendMess("hello from publisher");
},3000)