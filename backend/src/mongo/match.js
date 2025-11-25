import { Schema, model } from "mongoose";

const matchSchema = new Schema({
  marketId: String,
  backerId: String,
  layerId: String,
  stake: Number,
  odds: Number
});

const Match=model("Match", matchSchema)
export default Match;