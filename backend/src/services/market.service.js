// src/services/market.service.js
import Match from "../mongo/match.js";
import Offer from "../mongo/offer.js";
import manager from "../engine/manager.js";
import { redis } from "../redis/redis.js";
import { broadcastFun } from "../index.js";
import mongoose from "mongoose";

/* ----------------------------------------------------
   PLACE LAYER (LAY ORDER)
----------------------------------------------------- */
export const placeLayer = async (marketId, layerId, stake, odds) => {
  stake = Number(stake);
  odds = Number(odds);

  if (!stake || stake <= 0) throw new Error("Stake must be > 0");
  if (!odds || odds <= 1) throw new Error("Odds must be > 1");

  // wallet existence
  let balance = await redis.hGet(`user:${layerId}`, "balance");
  if (!balance) {
    balance = 1000;
    await redis.hSet(`user:${layerId}`, { balance, locked: 0 });
  }

  // engine user
  manager.addUserToMarket(marketId, layerId, Number(balance));
  const market = manager.getMarket(marketId);

  const offerDoc = await Offer.create({
    marketId,
    layerId,
    stake,
    odds,
    remaining: stake,
    createdAt: new Date(),
  });

  const offerId = offerDoc._id.toString();

  /* ------------------------------
        ENGINE ORDERBOOK
  ------------------------------- */
  if (!market.orderbook.has(odds)) {
    market.orderbook.set(odds, []);
    market.sortedOdds.push(odds);
    market.sortedOdds.sort((a, b) => b - a);
  }

  market.orderbook.get(odds).push({
    offerId,
    layerId,
    remaining: stake,
    odds,
  });

  const liability = (odds - 1) * stake;
  market.liability += liability;

  /* ------------------------------
        REDIS UPDATES
  ------------------------------- */
  await redis.zAdd(`market:${marketId}:odds`, [
    { score: odds, value: String(odds) },
  ]);

  await redis.rPush(
    `market:${marketId}:bucket:${odds}`,
    JSON.stringify({
      offerId,
      layerId,
      stake,
      remaining: stake,
      odds,
    })
  );

  await redis.hIncrByFloat(`user:${layerId}`, "balance", -liability);
  await redis.hIncrByFloat(`user:${layerId}`, "locked", liability);

  await redis.incrByFloat(`market:${marketId}:liability`, liability);

  /* ------------------------------
       BROADCAST TO FRONTEND
------------------------------- */
const obEv = {
  type: "orderbook:update",
  marketId,
};

const walletEv = {
  type: "wallet:update",
  userId: layerId,
};

await redis.publish("orderbook-update", JSON.stringify(obEv));
await redis.publish("wallet-update", JSON.stringify(walletEv));

broadcastFun(obEv);
broadcastFun(walletEv);

  return { message: "Layer placed", offerId };
};

/* ----------------------------------------------------
   PLACE BACK (BACK ORDER)
----------------------------------------------------- */
export const placeBack = async (marketId, backerId, stake) => {
  stake = Number(stake);
  if (!stake || stake <= 0) throw new Error("Stake must be > 0");

  /* ------------------------------
        Ensure wallet exists
  ------------------------------- */
  let wallet = await redis.hGetAll(`user:${backerId}`);
  if (!wallet || Object.keys(wallet).length === 0) {
    await redis.hSet(`user:${backerId}`, { balance: 1000, locked: 0 });
    wallet = { balance: "1000", locked: "0" };
  }

  manager.addUserToMarket(marketId, backerId, Number(wallet.balance));
  const market = manager.getMarket(marketId);

  /* ------------------------------
        REBUILD ORDERBOOK
  ------------------------------- */
  const sortedOdds = await redis.zRange(`market:${marketId}:odds`, 0, -1, {
    REV: true,
  });

  market.orderbook = new Map();
  market.sortedOdds = [];

  for (const oddsStr of sortedOdds) {
    const bucketKey = `market:${marketId}:bucket:${oddsStr}`;
    const raw = await redis.lRange(bucketKey, 0, -1);

    const bucket = raw.map((x) => {
      const j = JSON.parse(x);
      return {
        offerId: j.offerId,
        layerId: j.layerId,
        remaining: Number(j.remaining),
        odds: Number(j.odds),
      };
    });

    if (bucket.length > 0) {
      market.orderbook.set(Number(oddsStr), bucket);
      market.sortedOdds.push(Number(oddsStr));
    }
  }

  market.sortedOdds.sort((a, b) => b - a);

  /* ------------------------------
        ENSURE ALL LAYERS EXIST
  ------------------------------- */
  for (const bucket of market.orderbook.values()) {
    for (const o of bucket) {
      if (!market.users.has(o.layerId)) {
        const lu = await redis.hGetAll(`user:${o.layerId}`);
        const bal = lu?.balance ? Number(lu.balance) : 1000;
        manager.addUserToMarket(marketId, o.layerId, bal);
      }
    }
  }

  /* ------------------------------
        LOCK backer stake
  ------------------------------- */
  const backer = market.users.get(backerId);
  if (!backer) throw new Error("Backer not in market");

  backer.lock(stake);

  await redis.hSet(`user:${backerId}`, {
    balance: backer.balance,
    locked: backer.locked,
  });

  /* ------------------------------
        MATCHING LOOP
  ------------------------------- */
  let remaining = stake;
  const matches = [];
  const consumedIDs = new Set();

  for (const odds of market.sortedOdds) {
    if (remaining <= 0) break;

    const bucket = market.orderbook.get(odds);
    if (!bucket) continue;

    for (let i = 0; i < bucket.length && remaining > 0; i++) {
      const offer = bucket[i];
      const take = Math.min(offer.remaining, remaining);

      /* --------------------------
            RECORD MATCH
      --------------------------- */
      matches.push({
        backerId,
        layerId: offer.layerId,
        stake: take,
        odds,
      });

      /* --------------------------
            UPDATE OFFER
      --------------------------- */
      offer.remaining -= take;
      remaining -= take;

      /* --------------------------
            UPDATE LAYER LOCKED
      --------------------------- */
      const liabUsed = (odds - 1) * take;
      const layer = market.users.get(offer.layerId);
      layer.consume(liabUsed);

      await redis.hIncrByFloat(
        `user:${offer.layerId}`,
        "locked",
        -liabUsed
      );

      /* --------------------------
            MARKET LIABILITY
      --------------------------- */
      market.liability -= liabUsed;
      await redis.incrByFloat(
        `market:${marketId}:liability`,
        -liabUsed
      );

      if (offer.remaining <= 0) {
        consumedIDs.add(offer.offerId);
        bucket.splice(i, 1);
        i--;
      }
    }
  }

  /* ------------------------------
        IF NO MATCHES → Fail
  ------------------------------- */
  if (matches.length === 0) {
    backer.release(stake);
    await redis.hSet(`user:${backerId}`, {
      balance: backer.balance,
      locked: backer.locked,
    });
    throw new Error("No liquidity available");
  }

  /* ------------------------------
        SAVE MATCHES IN MONGO
  ------------------------------- */
  await Match.insertMany(
    matches.map((m) => ({
      marketId,
      ...m,
      createdAt: new Date(),
    }))
  );

  /* ------------------------------
        UPDATE REDIS ORDERBOOK
  ------------------------------- */
  for (const [odds, bucket] of market.orderbook.entries()) {
    const key = `market:${marketId}:bucket:${odds}`;
    await redis.del(key);

    if (bucket.length === 0) {
      await redis.zRem(`market:${marketId}:odds`, String(odds));
      continue;
    }

    await redis.rPush(
      key,
      ...bucket.map((o) =>
        JSON.stringify({
          offerId: o.offerId,
          layerId: o.layerId,
          remaining: o.remaining,
          odds: o.odds,
        })
      )
    );
  }

  /* ------------------------------
        UPDATE MONGO OFFER.remaining
  ------------------------------- */
  // present offers
  for (const bucket of market.orderbook.values()) {
    for (const o of bucket) {
      await Offer.updateOne(
        { _id: o.offerId },
        { $set: { remaining: o.remaining } }
      );
    }
  }

  // consumed offers set remaining:0
if (consumedIDs.size > 0) {
  const ids = Array.from(consumedIDs).map(id => new mongoose.Types.ObjectId(id));
  await Offer.updateMany({ _id: { $in: ids } }, { $set: { remaining: 0 } }).exec();
}


  /* ------------------------------
        SYNC BALANCES
  ------------------------------- */
  await redis.hSet(`user:${backerId}`, {
    balance: backer.balance,
    locked: backer.locked,
  });

  const changedLayers = new Set(
    matches.map((m) => m.layerId)
  );

  for (const id of changedLayers) {
    const u = market.users.get(id);
    if (u) {
      await redis.hSet(`user:${id}`, {
        balance: u.balance,
        locked: u.locked,
      });
    }
  }

  /* ------------------------------
        BROADCAST
  ------------------------------- */
  /* --------------------------------
   ORDERBOOK UPDATED
--------------------------------- */
const obEv = {
  type: "orderbook:update",
  marketId,
};

await redis.publish("orderbook-update", JSON.stringify(obEv));
broadcastFun(obEv);

/* --------------------------------
   WALLET UPDATES
--------------------------------- */
const changed = new Set(matches.map(m => m.backerId).concat(matches.map(m => m.layerId)));

for (const uid of changed) {
  const walletEv = {
    type: "wallet:update",
    userId: uid,
  };
  await redis.publish("wallet-update", JSON.stringify(walletEv));
  broadcastFun(walletEv);
}


  return { message: "Back placed", matches };
};
