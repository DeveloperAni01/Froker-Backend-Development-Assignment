import {AsyncHandler} from "../utils/AsyncHandler.js"
import {User} from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import { calculateAge, parseDate } from "../utils/AgeValidator.js";
import moment from "moment";
import JWT from "jsonwebtoken"

//helper function to generate the accessToken and refreshToken
const generateAcessAndRefreshTokens = async (userId) => {
//find user from database and then generate accessToken and refreshToken with the help of mongoose methods
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAcessToken(); //mongoose methods to generate accessToken
        const refreshToken = user.generateRefreshToken(); //mongoose methods to refreshToken
        user.refreshToken = refreshToken //add the refreshToken in the database
        //since I manually add the refreshToken in the database, then I have to use user.save
        await user.save({
            validateBeforeSave: false //validateBeforeFalse means validation doesn't run in the mongose middleware
        })
        return {accessToken, refreshToken}
    } catch (error) {
       throw new ApiError(500, "Something went wrong in generating token") //if any error occured in generating tokens, then I will be considered this as internal server error
    }
};

//controller for user registration
const registerUser = AsyncHandler(async (req, res) => {
    //collect the data from req.body
    const {phoneNumber, email, name, password, dateOfBirth, monthlySalary} = req.body

    //it is a validator to check that all the necessary data come correctly
    if(
        [phoneNumber, email, name, password, dateOfBirth, monthlySalary].some((field) => 
            field?.trim() === "")
        ){
            throw new ApiError(400, "All Fields are Required")
        }

    if(! email.includes("@")) throw new ApiError(400, "Email Must be Conatain @") //validator for check email
    if(! (phoneNumber.length === 10)) throw new ApiError(400, "PhoneNumber must be 10 digits") //validator for check number will be 10 digits 
    
    //check user already exist or not
    const existedUser = await User.findOne({
        $or: [{name}, {email}]
    })

    if(existedUser) throw new ApiError(409, "User Already Exists")
    

    //age and salary validation
    //Parse the date string to an object
    const parseDateOfBirth = parseDate(dateOfBirth)
    const age = calculateAge(parseDateOfBirth)
    let status = "pending";
    //age validator
    if (age <= process.env.MIN_AGE) {
        status = "Rejected"
        throw new ApiError(400, "Your Age Must Be Above 20 years ")
    } else if (monthlySalary < process.env.MIN_SALARY) {
        status = "Rejected"
        throw new ApiError(400, "Your Salary Must Be Greater Than 25k")
    } else {
        status = "Approved"
    }

    //after collecting and validating all the user data, now it's time to create the user and store this ub the DB
    const user = await User.create({
        phoneNumber,
        email,
        name,
        password,
        dateOfBirth,
        monthlySalary,
        status
    })

    //password and fefreshTAoken fields removed from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    
    if (! createdUser) {
        throw new ApiError(500, "Something Went Wrong While Creating User")
    }

    return res.status(201)
        .json(
            new ApiResponse(200, `status: ${createdUser.status}`, "User Successfully Created !!") //send created user's account status in the response
        )
    
})

//controller for user login
const loginUser = AsyncHandler (async (req, res) => {
    //receive mail and password from user's request
    const {email, password} = req.body

    //check all the fields 
    if(
        [email, password].some((field) => 
            field?.trim() === "")
        ){
            throw new ApiError(400, "All Fields are Required")
        }


    if(! email.includes("@")) throw new ApiError(400, "Email Must be Conatain @") //validator for check email
     
    const user = await User.findOne({email}) //find user by email

    if (! user) {
        throw new ApiError(404, "User Not Found Please Register First !!")
    }

    const isPasswordValid =  await user.isPasswordCorrected(password) //check the password is valid or not

    if (! isPasswordValid) {
        throw new ApiError (40, "invalid credinantial ")
    }
    
    const {accessToken, refreshToken} = await generateAcessAndRefreshTokens(user._id) // collect tokens from helper function

    const loggedInUser = await User.findById(user._id).select  //password and fefreshTAoken fields removed from response
    ("-refreshToken -password")

    if (! loggedInUser) {
        new ApiError(500, "something went wrong while loggedin")
    }

    const options = { //for security purpose cookie change only by server
        httpOnly: true,
        secure: true
       }

       return res.status(200)
       //set the cookies in response
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
    //since logout route will be proctected, then using auth middleware user was sent to the request
    await User.findByIdAndUpdate(req.user._id, 
         {
             $unset: { //use unset operator
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
         //clear cookies from user browser
         .clearCookie("accessToken", options)
         .clearCookie("refreshToken", options)
         .json(new ApiResponse(200, {}, "User Logged Out Successfully"))
 })

//controller for get user data
const currentUserData = AsyncHandler(async(req, res) => {
    //because of using proteted routes user also comes here
    const currentUser = req.user

    //if accidently currentuser not found then throw these error
    if (!currentUser) {
        throw new ApiError(500, "Something Went Wrong")
    }

    //set up a json payload for displaying user data in a very constructive way
    const currentUserData = {
        "Purchase Power amount": `Rs. ${currentUser.purchasePower}`,
        "Phone number": `${currentUser.phoneNumber}`,
        "Email ": currentUser.email,
        "Date of user registration": moment(currentUser.dateOfRegistration).format('DD.MM.YYYY'), //user moment package for displaying Date in DD.MM.YYYY format
        "DOB ": currentUser.dateOfBirth,
        "Monthly salary": `Rs. ${currentUser.monthlySalary}`
    }

    return res.status(200)
        .json(new ApiResponse(200, currentUserData, "User Data Successfully Displayed"))
    
})

//controller for refresh accessToken , I use two types of JWT token here one is refreshToken that I will use for long-term I will be saved in database and the another one is acessToken
//this will be used for short-term sessions acess only, suppose acessToken will be expired then user not need to log in instantly ,the acessToken will be re generated by refreshToken 
const refreshAccessToken = AsyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshAccessToken // here I use req.body because of if some cases cookie comes from body then it will handle that
    
    //if refreshToken Not Found Then this error will be thrown
    if(!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request !")
    }

    try {
        const decodedToken = JWT.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET) // decode the refreshToken and extract user_id
    
        const user = await User.findById(decodedToken?._id) // find user using this _id
    
        if (!user) {
            throw new ApiError(401, "invalid request token") //if user not found then this error will be throwen
        }
    
        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "refresh token used or expired") //if refreshToken also expired then user have to log in again
        }
    
       const  options = {  //for security purpose cookie change only by server
            httpOnly: true,
            secure: true
        }
        const {accessToken, refreshToken} = await  generateAcessAndRefreshTokens(user._id) // renew both acessTokent and refreshToken
        user.refreshToken = refreshToken

        await user.save({
            validateBeforeSave: false,  //save the new refreshToken in the DB
        })
    
        return res.status(200)
        //set as cookie again
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(200, "refreshed syccessfully")
            )
    } catch (error) {
        throw new ApiError (401, error?.message, "invalid request token ") //if error occured the it will be handled with 401 statuscode
    }
}) 

//controller for changeCurrentPassword, this a feature that user can change their password
const changeCurrenPassword = AsyncHandler(async (req, res) => {

    //receive the oldPassword and newPassword from req.body
    const {oldPassword, newPassword} = req.body

    //check if all the data come or not
    if ([oldPassword, newPassword].some((field) => 
        field?.trim() === "")
    ) {
        throw new ApiError(400, "Please Give the necessary credentials")
    }

    //find user by user._id, which one is comming from the req.user that is polluted through all the protected routes by auth-midlewire
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrected(oldPassword) //validate the oldPassword by mongoose isPasswordCorrected method

    //if password validation failed then throw new error og invalid password
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid Old Password")
    };

    user.password = newPassword //set the new password values instead of old password
    await user.save({validateBeforeSave: false}) //save the value in DB manually
    
    return res.status(200)
        .json(
            new ApiResponse(200, {}, "Passoword Successfully Changed") //send api response
        )
})

//controller for handle user borrow money
const userBorrowMoney = AsyncHandler(async(req, res) => {

    //because of a protected route user come here by req.user
    const currentUser = req.user
    
    //if user not found 
    if (! currentUser) {
        throw new ApiError(500, "something went wrong !") //throw server error with status code 500
    }
    //recieve data from req.body
    const {borrowAmount, tenureMonths} = req.body
    
    //borrowAmunt validation that borrowAmount never greater than purchase power
    if(borrowAmount > currentUser.purchasePower) {
        throw new ApiError(400, `Borrow Amount Must be Lesser than purchasePower, your purchase power = Rs. ${ currentUser.purchasePower}`)
    }
    
    if(
        [borrowAmount, tenureMonths].some((field) => 
            field?.trim() === "")
    ){
        throw new ApiError(400, "Required All Fields !!")
    }

    const parsedBorrowAmount = parseFloat(borrowAmount); //convert float from string
    const parsedTenureMonths = parseInt(tenureMonths, 10); //parse the months from string to number

    //validator that parsedBorrowAmount and parsedTenureMonths always a valid number
    if (isNaN(parsedBorrowAmount) || isNaN(parsedTenureMonths)) {
        throw new ApiError(400, "Invalid borrow amount or tenure months!");
    }

    //update borrowed ammount
    currentUser.borrowedAmount += parsedBorrowAmount

    //calculate monthly repayment ammount
    const monthlyInterestRate = process.env.ANNUAL_INTEREST_RATE / 12
    const monthlyRepayment = (borrowAmount * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -parsedBorrowAmount)) //calculate monthlyRepayment with the help of standard AMORTIZATION Formula 

    try {
        await currentUser.save({
            validateBeforeSave: false, //manually handle the DB
        })
    } catch (error) {
        throw new ApiError(500, "Something Went Wrong !!")
    }

    //response json create
    const response = {
        "Purchase Power amount": `Rs. ${currentUser.purchasePower}`,
        "Monthly Repayment Amount": `Rs. ${monthlyRepayment?.toFixed(2)}`
    }

    return res.status(200)
        .json(new ApiResponse(200,response, "Data Successfully Fetched " ))
})

//controller for borrowing limit recomdation feature, here I tried something new to add a recommendation system that calculate the borrowingLImits for user
const borrowingLimitsRecommendation = AsyncHandler(async(req, res) => {

    //beacue of protected route user come from req.user
    const currentUser = req.user
    const {monthlyExpenses} = req.body //collect data from request

    if (! currentUser) {
        throw new ApiError(500, "Something Went Wrong") //throw error for user not found
    }

    if (! monthlyExpenses) {
        throw new ApiError(400, "required monthlyExpenses") // throw error if monthlyExpenses not found
    }

    //validator for monthlyExpenses must greater than currentUser.monthlySalary
    if (monthlyExpenses > currentUser.monthlySalary) {
        throw new ApiError(400, "maximum monthly repayment exceed monthly salary")
    }

    //my recommendation logic
    //get monthlySalary, borrowedAmount from user and then calculate the safePercentage (assuming 35%)
    const monthlyIncome = currentUser.monthlySalary 
    const currentDebt = currentUser.borrowedAmount
    const safePercentage = process.env.SAFE_PERCENTAGE / 100
    
    const maxMonthlyRepayment = (monthlyIncome - monthlyExpenses) * safePercentage // calculate axMonthlyRepayment
    const annualInterestRate = process.env.ANNUAL_INTEREST_RATE / 100
    const tenureMonths = 12 //Assuming that 1 year tenure for simplicity
    const monthlyInterestRate = annualInterestRate / tenureMonths //calculate monthlyInterestRate
    const maxLoanAmount = (maxMonthlyRepayment * (1 - Math.pow(1 + monthlyInterestRate, -tenureMonths)) / monthlyInterestRate) - currentDebt //calculate maxLoanAmount by the formula

    try {
        //response json create
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