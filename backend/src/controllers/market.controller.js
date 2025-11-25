// src/controllers/market.controller.js
import { placeBack, placeLayer } from "../services/market.service.js";

export const placeLayerController = async (req, res) => {
  try {
    const { marketId } = req.params;
    const { layerId, stake, odds } = req.body;

    const result = await placeLayer(
      marketId,
      String(layerId),
      Number(stake),
      Number(odds)
    );

    res.json(result);
  } catch (e) {
    console.error("placeLayer error:", e);
    res.status(400).json({ error: e.message });
  }
};

export const placeBackController = async (req, res) => {
  try {
    const { marketId } = req.params;
    const { backerId, stake } = req.body;

    const result = await placeBack(
      marketId,
      String(backerId),
      Number(stake)
    );

    res.json(result);
  } catch (e) {
    console.error("placeBack error:", e);
    res.status(400).json({ error: e.message });
  }
};
