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
        throw new ApiError(404, "User Not Found Please Register First !!")
    }

    const isPasswordValid =  await user.isPasswordCorrected(password)

    if (! isPasswordValid) {
        throw new ApiError (40, "invalid credinantial ")
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

//controller for refresh accessToken
const refreshAccessToken = AsyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshAccessToken // here I use req.body because of if some cases cookie comes from body then it will handle that

    if(!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request !")
    }

    try {
        const decodedToken = JWT.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "invalid request token")
        }
    
        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "refresh token used or expired")
        }
    
        options = {
            httpOnly: true,
            secure: true
        }
        const {accessToken, newRefreshToken} = await  generateAcessAndRefreshTokens(user._id)
    
        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(200, {accessToken,refreshToken: newRefreshToken},"refreshed syccessfully")
            )
    } catch (error) {
        throw new ApiError (401, error?.message, "invalid request token ")
    }
}) 

//controller for changeCurrentPassword
const changeCurrenPassword = AsyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body
    if ([oldPassword, newPassword].some((field) => 
        field?.trim() === "")
    ) {
        throw new ApiError(400, "Please Give the necessary credentials")
    }
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrected(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid Old Password")
    };

    user.password = newPassword
    await user.save({validateBeforeSave: false})
    
    return res.status(200)
        .json(
            new ApiResponse(200, {}, "Passoword Successfully Changed")
        )
})

//controller for handle user borrow money
const userBorrowMoney = AsyncHandler(async(req, res) => {
    const currentUser = req.user
    
    if (! currentUser) {
        throw new ApiError(500, "something went wrong !")
    }
    const {borrowAmount, tenureMonths} = req.body
    
    if(borrowAmount > currentUser.purchasePower) {
        throw new ApiError(400, `Borrow Amount Must be Lesser than purchasePower, your purchase power = Rs. ${ currentUser.purchasePower}`)
    }
    
    if(
        [borrowAmount, tenureMonths].some((field) => 
            field?.trim() === "")
    ){
        throw new ApiError(400, "Required All Fields !!")
    }

    const parsedBorrowAmount = parseFloat(borrowAmount);
    const parsedTenureMonths = parseInt(tenureMonths, 10);

    if (isNaN(parsedBorrowAmount) || isNaN(parsedTenureMonths)) {
        throw new ApiError(400, "Invalid borrow amount or tenure months!");
    }

    //update borrowed ammount
    currentUser.borrowedAmount += parsedBorrowAmount

    //calculate monthly repayment ammount with 8% annual interest rate
    const monthlyInterestRate = process.env.ANNUAL_INTEREST_RATE / 12
    const monthlyRepayment = (borrowAmount * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -parsedBorrowAmount))

    try {
        await currentUser.save({
            validateBeforeSave: false
        })
    } catch (error) {
        throw new ApiError(500, "Something Went Wrong !!")
    }

    const response = {
        "Purchase Power amount": `Rs. ${currentUser.purchasePower}`,
        "Monthly Repayment Amount": `Rs. ${monthlyRepayment?.toFixed(2)}`
    }

    return res.status(200)
        .json(new ApiResponse(200,response, "Data Successfully Fetched " ))
})

//controller for borrowing limit recomdation feature
const borrowingLimitsRecommendation = AsyncHandler(async(req, res) => {
    const currentUser = req.user
    const {monthlyExpenses} = req.body

    if (! currentUser) {
        throw new ApiError(500, "Something Went Wrong")
    }

    if (! monthlyExpenses) {
        throw new ApiError(400, "required monthlyExpenses")
    }

    if (monthlyExpenses > currentUser.monthlySalary) {
        throw new ApiError(400, "maximum monthly repayment exceed monthly salary")
    }

    //my recommendation logic
    const monthlyIncome = currentUser.monthlySalary
    const currentDebt = currentUser.borrowedAmount
    const safePercentage = process.env.SAFE_PERCENTAGE / 100
    
    const maxMonthlyRepayment = (monthlyIncome - monthlyExpenses) * safePercentage
    const annualInterestRate = process.env.ANNUAL_INTEREST_RATE / 100
    const tenureMonths = 12 //Assuming that 1 year tenure for simplicity
    const monthlyInterestRate = annualInterestRate / tenureMonths
    const maxLoanAmount = (maxMonthlyRepayment * (1 - Math.pow(1 + monthlyInterestRate, -tenureMonths)) / monthlyInterestRate) - currentDebt

    try {
        const recommendation = {
            "Your Existing Debt": `Rs. ${currentDebt}`,
            "Your Monthly Salary": `Rs. ${monthlyIncome}`,
            "Recommendation": `Based on yur financial data, you can afford loan amount upto Rs. ${maxLoanAmount.toFixed(2)} to ensure your monthly repayments do not exceed Rs. ${maxMonthlyRepayment.toFixed(2)}.`
        }

        return res.status(200)
            .json(new ApiResponse(200, recommendation, "Recommendation Successfully Fetched"))
    } catch (error) {
        throw new ApiError(500, error)
    }
})

export {
    registerUser,
    loginUser,
    logoutUser,
    currentUserData,
    refreshAccessToken,
    changeCurrenPassword,
    userBorrowMoney,
    borrowingLimitsRecommendation
}