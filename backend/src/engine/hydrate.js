// src/engine/hydrate.js
import manager from "./manager.js";
import { redis } from "../redis/redis.js";

/**
 * Hydrates engine for provided market IDs from Redis state.
 * Should be called:
 * - server startup
 * - engine-cmd: hydrate
 * - after settlement
 */
export async function hydrateMarkets(marketIds = []) {
  if (!marketIds || marketIds.length === 0) return;

  for (const marketId of marketIds) {
    const market = manager.getMarket(marketId);

    /* -------------------------------
          LOAD ORDERBOOK
    -------------------------------- */
    const oddsList = await redis.zRange(`market:${marketId}:odds`, 0, -1, {
      REV: true,
    });

    market.orderbook = new Map();
    market.sortedOdds = [];

    for (const oddsStr of oddsList) {
      const odds = Number(oddsStr);

      const items = await redis.lRange(
        `market:${marketId}:bucket:${oddsStr}`,
        0,
        -1
      );

      const bucket = items.map((i) => {
        const o = JSON.parse(i);
        return {
          offerId: o.offerId,
          layerId: o.layerId,
          remaining: Number(o.remaining),
          odds: Number(o.odds),
        };
      });

      if (bucket.length > 0) {
        market.orderbook.set(odds, bucket);
        market.sortedOdds.push(odds);
      }
    }

    market.sortedOdds.sort((a, b) => b - a);

    /* -------------------------------
          LOAD LIABILITY
    -------------------------------- */
    const liab = await redis.get(`market:${marketId}:liability`);
    if (liab !== null) {
      market.liability = Number(liab);
    }

    console.log(
      `Hydrated market ${marketId}: odds=[${market.sortedOdds.join(
        ", "
      )}], liability=${liab}`
    );
  }
}
