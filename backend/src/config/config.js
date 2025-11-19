import dotenv from "dotenv"
import path from "path"

import { fileURLToPath } from "url";

const __filename=fileURLToPath(import.meta.url)
const __dirname=path.dirname(__filename)

dotenv.config({path:path.resolve(__dirname, "./../../.env")});

export default {
    REDIS_URL:process.env.REDIS_URL,
    PORT:process.env.PORT,
    
}
