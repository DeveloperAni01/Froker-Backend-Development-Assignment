import express from "express"
import cors from "cors"
import userRouter from "./routes/user.routes.js"
import cookieParser from "cookie-parser";



const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: `${process.env.JSON_LIMIT}kb`}))
app.use(express.urlencoded({
    extended:true,
    limit: `${process.env.JSON_LIMIT}kb`
}))
app.use(cookieParser())

app.use("/froker-backend-development/api/v1", userRouter)

export {app}
