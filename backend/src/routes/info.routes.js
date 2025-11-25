// src/routes/info.routes.js
import { Router } from "express";
import {
  getMatches,
  getOrderbook,
  getSummary,
  settleMarket,
  getOpenOrders,
  getWallet,
  deposit,
} from "../controllers/info.controller.js"; // ensure exact controller file name

const router = Router();

router.get("/:marketId/orderbook", getOrderbook);
router.get("/:marketId/matches", getMatches);
router.get("/:marketId/summary", getSummary);
router.post("/:marketId/settle", settleMarket);
router.get("/:marketId/open-orders/:userId", getOpenOrders);
router.get("/wallet/:userId", getWallet);
router.post("/wallet/deposit", deposit);

export default router;
