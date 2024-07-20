import dotenv from "dotenv"
import debug from "debug"
import {app} from "./app.js"
import { connectToDB } from "./db/db.js"

const debuger = debug("development: index")

dotenv.config({
    path: "./env"
})

connectToDB()
    .then(() =>{
        app.on("error", (err) => {
                debuger("error: ", err)
                throw err
            })
            app.listen(process.env.PORT || 8000, () => debuger("server listening on PORT: ", process.env.PORT) )
    })
    .catch((err) => debuger("mongoDB on Error"))