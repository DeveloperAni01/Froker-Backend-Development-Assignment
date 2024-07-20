import express from "express"
import cors from "cors"
import { registerUser } from "./controllers/user.controller.js";


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

app.get("/", (req, res) => {
    res.send("everything works fine")
})

app.post("/create", registerUser)

export {app}
