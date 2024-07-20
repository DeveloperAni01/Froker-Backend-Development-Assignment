import { ApiError } from "../utils/ApiError.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";
import JWT from "jsonwebtoken"
import {User} from "../models/user.model.js"


const verifyJWT = AsyncHandler(async(req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

        if(! token) {
            throw  new ApiError(401, "Unauthorized Request !!")
        }

        const decodedToken = JWT.verify(token, process.env.ACCESS_TOKEN_SECRET);
        console.log(decodedToken);

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

        if(! user) {
            throw new ApiError(401, "Invalid Access Token")
        }

    req.user = user;
    next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token" )
    }
})

export default verifyJWT