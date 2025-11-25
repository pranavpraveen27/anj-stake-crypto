// src/controllers/api.controller.js
import { redis } from "../redis/redis.js";
import Match from "../mongo/match.js";
import Offer from "../mongo/offer.js";
import manager from "../engine/manager.js";

/* -------------------------------------------
   GET ORDERBOOK
------------------------------------------- */
export const getOrderbook = async (req, res) => {
  try {
    const { marketId } = req.params;

    const odds = await redis.zRange(`market:${marketId}:odds`, 0, -1, {
      REV: true,
    });

    const buckets = [];
    for (const o of odds) {
      const items = await redis.lRange(
        `market:${marketId}:bucket:${o}`,
        0,
        -1
      );

      buckets.push({
        odds: Number(o),
        offers: items.map((i) => JSON.parse(i)),
      });
    }

    const liability =
      Number(await redis.get(`market:${marketId}:liability`)) || 0;

    res.json({ marketId, liability, orderbook: buckets });
  } catch (e) {
    console.error("getOrderbook error:", e);
    res.status(500).json({ error: e.message });
  }
};

/* -------------------------------------------
   GET MATCHES
------------------------------------------- */
export const getMatches = async (req, res) => {
  try {
    const { marketId } = req.params;
    const last = Number(req.query.limit || 50);

    const matches = await Match.find({ marketId })
      .sort({ _id: -1 })
      .limit(last)
      .lean();

    res.json(matches);
  } catch (e) {
    console.error("getMatches error:", e);
    res.status(500).json({ error: e.message });
  }
};

/* -------------------------------------------
   GET WALLET
------------------------------------------- */
export const getWallet = async (req, res) => {
  try {
    const { userId } = req.params;
    let hash = await redis.hGetAll(`user:${userId}`);

    if (!hash || Object.keys(hash).length === 0) {
      await redis.hSet(`user:${userId}`, { balance: 1000, locked: 0 });
      hash = await redis.hGetAll(`user:${userId}`);
    }

    const balance = Number(hash.balance);
    const locked = Number(hash.locked);

    const recentOffers = await Offer.find({ layerId: userId })
      .sort({ _id: -1 })
      .limit(10)
      .lean();

    const recentMatches = await Match.find({
      $or: [{ backerId: userId }, { layerId: userId }],
    })
      .sort({ _id: -1 })
      .limit(20)
      .lean();

    res.json({
      userId,
      balance,
      locked,
      netPL: balance - 1000,
      recentOffers,
      recentMatches,
    });
  } catch (e) {
    console.error("getWallet error:", e);
    res.status(500).json({ error: e.message });
  }
};

/* -------------------------------------------
   SETTLE MARKET
------------------------------------------- */
export const settleMarket = async (req, res) => {
  try {
    const { marketId } = req.params;
    const { backersWin } = req.body;

    // read all persisted matches
    const matches = await Match.find({
      marketId,
    }).lean();

    for (const m of matches) {
      const B = `user:${m.backerId}`;
      const L = `user:${m.layerId}`;

      const stake = Number(m.stake);
      const odds = Number(m.odds);
      const liab = (odds - 1) * stake;

      if (backersWin) {
        // backer: remove locked stake
        await redis.hIncrByFloat(B, "locked", -stake);
        // payout full stake*odds
        await redis.hIncrByFloat(B, "balance", stake * odds);

        // layer: remove locked liability
        await redis.hIncrByFloat(L, "locked", -liab);
      } else {
        // layers win
        await redis.hIncrByFloat(B, "locked", -stake);
        await redis.hIncrByFloat(L, "balance", stake);
      }

      await redis.publish(
        "wallet-update",
        JSON.stringify({ type: "wallet:update", userId: m.backerId })
      );
      await redis.publish(
        "wallet-update",
        JSON.stringify({ type: "wallet:update", userId: m.layerId })
      );
    }

    /* ---------------------------
         CLEAR MARKET DATA
    ---------------------------- */
    await redis.del(`market:${marketId}:liability`);
    const odds = await redis.zRange(`market:${marketId}:odds`, 0, -1);
    for (const o of odds) {
      await redis.del(`market:${marketId}:bucket:${o}`);
    }
    await redis.del(`market:${marketId}:odds`);

    await Offer.deleteMany({ marketId });
    await Match.deleteMany({ marketId });

    manager.markets.delete(marketId);

    await redis.publish(
      "match-update",
      JSON.stringify({
        type: "market:settled",
        marketId,
        backersWin,
      })
    );

    res.json({
      message: "Market settled successfully",
      backersWin,
    });
  } catch (e) {
    console.error("settleMarket error:", e);
    res.status(500).json({ error: e.message });
  }
};

/* -------------------------------------------
   DEPOSIT
------------------------------------------- */
export const deposit = async (req, res) => {
  try {
    const { userId, amount } = req.body;
    const val = Number(amount);

    if (!userId || !val || val <= 0)
      return res.status(400).json({ error: "Invalid input" });

    const exists = await redis.exists(`user:${userId}`);

    if (!exists) {
      await redis.hSet(`user:${userId}`, {
        balance: 1000 + val,
        locked: 0,
      });
    } else {
      await redis.hIncrByFloat(`user:${userId}`, "balance", val);
    }

    await redis.publish(
      "wallet-update",
      JSON.stringify({ type: "wallet:update", userId })
    );

    res.json({ message: "Deposit successful" });
  } catch (e) {
    console.error("deposit error:", e);
    res.status(500).json({ error: e.message });
  }
};


/* -------------------------------------------
   GET SUMMARY
------------------------------------------- */
export const getSummary = async (req, res) => {
  try {
    const { marketId } = req.params;

    const liability =
      Number(await redis.get(`market:${marketId}:liability`)) || 0;

    const odds = await redis.zRange(`market:${marketId}:odds`, 0, -1, {
      REV: true,
    });

    const totalOffers = await Offer.countDocuments({ marketId });
    const matchesCount = await Match.countDocuments({ marketId });

    res.json({
      marketId,
      liability,
      totalOffers,
      matchesCount,
      topOdds: odds.slice(0, 5).map(Number),
    });
  } catch (e) {
    console.error("getSummary error:", e);
    res.status(500).json({ error: e.message });
  }
};


/* -------------------------------------------
   GET OPEN ORDERS
------------------------------------------- */
export const getOpenOrders = async (req, res) => {
  try {
    const { marketId, userId } = req.params;

    const offers = await Offer.find({
      marketId,
      layerId: userId,
      remaining: { $gt: 0 },
    }).lean();

    res.json(offers);
  } catch (e) {
    console.error("getOpenOrders error:", e);
    res.status(500).json({ error: e.message });
  }
};
