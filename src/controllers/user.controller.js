import {AsyncHandler} from "../utils/AsyncHandler.js"
import {User} from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import { calculateAge, parseDate } from "../utils/AgeValidator.js";
import moment from "moment";


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

//controller for user registration
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

//controller for user login
const loginUser = AsyncHandler (async (req, res) => {
    //receive mail and password from user's request
    const {email, password} = req.body

    if(
        [email, password].some((field) => 
            field?.trim() === "")
        ){
            throw new ApiError(400, "All Fields are Required")
        }


    if(! email.includes("@")) throw new ApiError(400, "Email Must be Conatain @")
     
    const user = await User.findOne({email})

    if (! user) {
        throw new ApiError(404, "User Not Founf Please Register First !!")
    }

    const isPasswordValid =  await user.isPasswordCorrected(password)

    if (! isPasswordValid) {
        throw new ApiError (40, "invalid credinantial incorrect")
    }
    
    const {accessToken, refreshToken} = await generateAcessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select
    ("-refreshToken -password")

    if (! loggedInUser) {
        new ApiError(500, "something went wrong while loggedin")
    }

    const options = { //for security purpose cookie change only by server
        httpOnly: true,
        secure: true
       }

       return res.status(200)
       .cookie("accessToken", accessToken, options)
       .cookie("refreshToken", refreshToken, options)
       .json(
           new ApiResponse(200, {
               user: user.name
           },
           "user successfully loggedIn"
       )
       )
})

//controller for user logout
const logoutUser = AsyncHandler (async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, 
         {
             $unset: {
                 refreshToken: 1 // this removes the field from document
             }
         },
         {
             new : true
         }
     )
 
     const options = { //for security purpose cookie change only by server
         httpOnly: true,
         secure: true
     }
 
     return res  
         .status(200)
         .clearCookie("accessToken", options)
         .clearCookie("refreshToken", options)
         .json(new ApiResponse(200, {}, "User Logged Out Successfully"))
 })

//controller for get user data
const currentUserData = AsyncHandler(async(req, res) => {
    const currentUser = req.user;
    if (!currentUser) {
        throw new ApiError(500, "Something Went Wrong")
    }
    const currentUserData = {
        "Purchase Power amount": `Rs. ${currentUser.purchasePower}`,
        "Phone number": `${currentUser.phoneNumber}`,
        "Email ": currentUser.email,
        "Date of user registration": moment(currentUser.dateOfRegistration).format('DD.MM.YYYY'),
        "DOB ": currentUser.dateOfBirth,
        "Monthly salary": `Rs. ${currentUser.monthlySalary}`
    }

    return res.status(200)
        .json(new ApiResponse(200, currentUserData, "User Data Successfully Displayed"))
    
})

export {
    registerUser,
    loginUser,
    logoutUser,
    currentUserData
}