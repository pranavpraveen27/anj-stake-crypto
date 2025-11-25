// src/redis/subscriber.js
import { createClient } from "redis";
import { broadcastFun } from "../index.js";
import { hydrateMarkets } from "../engine/hydrate.js";

const sub = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

sub.on("error", (err) => console.error("Redis SUB error:", err));

export async function startSubscriber() {
  await sub.connect();

  /* ----------------------------------------
        ORDERBOOK UPDATES
  ----------------------------------------- */
  await sub.subscribe("orderbook-update", async (raw) => {
    try {
      const msg = JSON.parse(raw);
      broadcastFun(msg);
    } catch (e) {
      console.error("Invalid orderbook msg:", e);
    }
  });

  /* ----------------------------------------
        MATCH UPDATES
  ----------------------------------------- */
  await sub.subscribe("match-update", async (raw) => {
    try {
      const msg = JSON.parse(raw);
      broadcastFun(msg);
    } catch (e) {
      console.error("Invalid match msg:", e);
    }
  });

  /* ----------------------------------------
        WALLET UPDATES
  ----------------------------------------- */
  await sub.subscribe("wallet-update", async (raw) => {
    try {
      const msg = JSON.parse(raw);
      broadcastFun(msg);
    } catch (e) {
      console.error("Invalid wallet msg:", e);
    }
  });

  /* ----------------------------------------
        ENGINE COMMANDS (rehydrate)
  ----------------------------------------- */
  await sub.subscribe("engine-cmd", async (raw) => {
    try {
      const data = JSON.parse(raw);

      if (data.cmd === "hydrate" && data.marketId) {
        await hydrateMarkets([data.marketId]);
      }

      broadcastFun({
        type: "engine-cmd",
        data,
      });
    } catch (e) {
      console.error("Invalid engine-cmd msg:", e);
    }
  });

  console.log("Redis subscriber started 🚀");
}

export default sub;
