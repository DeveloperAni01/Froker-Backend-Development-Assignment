import mongoose from "mongoose"
import { DB_NAME } from "../utils/Constant.js"
import debug from "debug"

const debuger = debug("development:mongoose")

//helper function to mongoDB connection 
const connectToDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        debuger("mongoDB Connected !! Host: ", connectionInstance.connection.host);
    } catch (error) {
        debuger("mongoDB Connection Error", error)
        process.exit(1);
    }
}

export {connectToDB}