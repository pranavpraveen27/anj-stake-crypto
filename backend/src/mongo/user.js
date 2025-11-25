import {Schema,model} from "mongoose"

const userSchema=new Schema({
    userId:String,
    balance:Number,
    locked:Number
})

const User=model("User", userSchema);
export default User;