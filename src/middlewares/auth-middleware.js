import { ApiError } from "../utils/ApiError.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";
import JWT from "jsonwebtoken"
import {User} from "../models/user.model.js"


const verifyJWT = AsyncHandler(async(req, res, next) => {
    try {
        //receive the cookie
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "") //if cookie isn't present , token come from header file 

        if(! token) {
            throw  new ApiError(401, "Unauthorized Request !!")
        }

        const decodedToken = JWT.verify(token, process.env.ACCESS_TOKEN_SECRET); //decode the token using JWT verify 

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken") //password and refreshToken field removed from response 

        if(! user) {
            throw new ApiError(401, "Invalid Access Token")
        }

    req.user = user; //send user through request 
    next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token" )
    }
})

export default verifyJWT