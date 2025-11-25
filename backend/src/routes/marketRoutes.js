import { Router } from "express";
import { placeBackController, placeLayerController } from "../controllers/market.controller.js";

const router=Router();

router.post("/:marketId/layer", placeLayerController)
router.post("/:marketId/back", placeBackController)



export default router;