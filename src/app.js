import express from "express"
import cors from "cors"
import userRouter from "./routes/user.routes.js"
import cookieParser from "cookie-parser";


const app = express();

//use cors middleware for overcome the cors error during deployment
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: `${process.env.JSON_LIMIT}kb`})) //middleware for handling JSON data
//middleware for handling request date come from body
app.use(express.urlencoded({
    extended:true,
    limit: `${process.env.JSON_LIMIT}kb`
}))
//middleware for handling cookies
app.use(cookieParser())

//define my server's main API route (this is the base path for my API)
app.use("/froker-backend-development/api/v1", userRouter)

export {app}
