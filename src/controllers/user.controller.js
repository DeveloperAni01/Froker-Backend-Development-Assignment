import {AsyncHandler} from "../utils/AsyncHandler.js"
import {User} from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import { calculateAge, parseDate } from "../utils/AgeValidator.js";


const generateAcessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAcessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken
        await user.save({
            validateBeforeSave: false
        })
        return {accessToken, refreshToken}
    } catch (error) {
       throw new ApiError(500, "Something went wrong in generating token")
    }
};


const registerUser = AsyncHandler(async (req, res) => {
    const {phoneNumber, email, name, password, dateOfBirth, monthlySalary} = req.body

    if(
        [phoneNumber, email, name, password, dateOfBirth, monthlySalary].some((field) => 
            field?.trim() === "")
        ){
            throw new ApiError(400, "All Fields are Required")
        }

    if(! email.includes("@")) throw new ApiError(400, "Email Must be Conatain @")
    if(! (phoneNumber.length === 10)) throw new ApiError(400, "PhoneNumber must be 10 digits")
    
    const existedUser = await User.findOne({
        $or: [{name}, {email}]
    })

    if(existedUser) throw new ApiError(409, "User Already Exists")
    

    //age and salary validation
    //Parse the date string to an object
    const parseDateOfBirth = parseDate(dateOfBirth)
    const age = calculateAge(parseDateOfBirth)
    let status = "pending";

    if (age <= process.env.MIN_AGE) {
        status = "Rejected"
        throw new ApiError(400, "Your Age Must Be Above 20 years ")
    } else if (monthlySalary < process.env.MIN_SALARY) {
        status = "Rejected"
        throw new ApiError(400, "Your Salary Must Be Greater Than 25k")
    } else {
        status = "Approved"
    }

    const user = await User.create({
        phoneNumber,
        email,
        name,
        password,
        dateOfBirth,
        monthlySalary,
        status
    })

  

    
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    
    if (! createdUser) {
        throw new ApiError(500, "Something Went Wrong While Creating User")
    }

    return res.status(201)
        .json(
            new ApiResponse(200, `status: ${createdUser.status}`, "User Successfully Created !!")
        )
    
})

const loginUser

export {
    registerUser
}