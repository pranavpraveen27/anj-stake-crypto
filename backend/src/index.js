import config from "./config/config.js";

import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import cookieParser from "cookie-parser";
import cors from "cors";
import { pub } from "./redis/pubsub.js";

const app = express();
app.use(express.json());
app.use(cookieParser());
const allowedOrigins = ["http://localhost:5173"];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
const server = http.createServer(app);

const wss = new WebSocketServer({ server });

let data2 = {
  name: "pranav",
  age: 34,
};


export const clients=new Set();

function streamFun(ws, val) {
  let i = 0;
  let timer=setInterval(() => {
    if (ws.readyState !== ws.OPEN) return clearInterval(timer);
    ws.send(JSON.stringify({ ...data2}));
    i++;
    if (i == 7) clearInterval(timer);
  }, 2500);
}


function broadcastFun(ws, val){
    for(const client of clients){
        if(client.readyState===client.OPEN){
            client.send(JSON.stringify({type:"echo", data:val}));
        }
    }
}
wss.on("connection", (ws) => {
  console.log("client conneted");
  clients.add(ws);

  ws.send(JSON.stringify({ type: "welcome", msg: "connected to ws" }));

  ws.on("message", async (raw) => {
    let data=JSON.parse(raw.toString());
    console.log(data);
    if (data.type === "stream") {
    pub.publish("event", JSON.stringify(data))
    broadcastFun(clients, data);
    }
  });

  ws.on("close", ()=>clients.delete(ws));
});



app.get("/data", (req, res) => {});

server.listen(config.PORT, (err) => {
  if (err) console.log(err);
  console.log(`listening @${config.PORT}`);
});
