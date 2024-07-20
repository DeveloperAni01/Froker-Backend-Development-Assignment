import dotenv from "dotenv" //use dotenv package for handle secret values through env variables
import debug from "debug"
import {app} from "./app.js"
import { connectToDB } from "./db/db.js"

//use debuger by the help of debug package to avoid unnecessary console.log in server
const debuger = debug("development: index")

//configuration of dotenv package
dotenv.config({
    path: "./env"
})

//DB function calls over here
connectToDB()
    .then(() =>{
        //if any error occured then it will be handled
        app.on("error", (err) => {
                debuger("error: ", err)
                throw err
            })
        app.listen(process.env.PORT || 8000, () => debuger("server listening on PORT: ", process.env.PORT) )
    })
    .catch((err) => debuger("mongoDB on Error")) 