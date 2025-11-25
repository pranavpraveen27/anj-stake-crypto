import {Schema, model} from "mongoose";

const offerSchema = new Schema({
  marketId: String,
  layerId: String,
  stake: Number,
  odds: Number,
  remaining: Number
});

const Offer=model("Offer", offerSchema);
export default Offer;