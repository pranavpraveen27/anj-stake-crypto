// src/index.js
import config from "./config/config.js";
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import cookieParser from "cookie-parser";
import cors from "cors";
import { connect } from "mongoose";
import marketRoutes from "./routes/marketRoutes.js";
import infoRouter from "./routes/info.routes.js";
import { connectRedis } from "./redis/redis.js";
import { hydrateMarkets } from "./engine/hydrate.js";
import { startSubscriber } from "./redis/subscriber.js";

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);

await connect(config.MONGO_URI);

const server = http.createServer(app);

export const clients = new Set();

export function broadcastFun(data) {
  const json = JSON.stringify({ data });

  for (const ws of clients) {
    try {
      if (ws.readyState === ws.OPEN) ws.send(json);
    } catch (e) {
      console.error("WS broadcast error:", e);
    }
  }
}

/* ----------------------------------------
      WEBSOCKET
----------------------------------------- */
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  clients.add(ws);
  console.log("a client connected")
  ws.send(JSON.stringify({ type: "welcome", msg: "connected" }));

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      // If needed you can handle client commands here
    } catch (e) {
      console.error("WS invalid JSON:", e);
    }
  });

  ws.on("close", () => clients.delete(ws));
});

/* ----------------------------------------
      ROUTES
----------------------------------------- */
app.use("/markets", marketRoutes);
app.use("/api", infoRouter);

/* ----------------------------------------
      REDIS + ENGINE
----------------------------------------- */
await connectRedis();
await hydrateMarkets(["m1"]);
await startSubscriber();

/* ----------------------------------------
      START SERVER
----------------------------------------- */
server.listen(config.PORT, () =>
  console.log(`Backend running at http://localhost:${config.PORT}`)
);
