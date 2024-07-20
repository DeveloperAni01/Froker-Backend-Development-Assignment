import { Router } from "express";
import { borrowingLimitsRecommendation, changeCurrenPassword,
        currentUserData,
        loginUser,
        logoutUser,
        refreshAccessToken, 
        registerUser, 
        userBorrowMoney} from "../controllers/user.controller.js";
import verifyJWT from "../middlewares/auth-middleware.js";

const router = Router();


//route for user signup
router.route("/user/signup")
    .post(registerUser)

//route for user login
router.route("/user/login")
    .post(loginUser)

//protected routes

//route for user logout
router.route("/user/logout")
    .get(verifyJWT, logoutUser)


//route for getting user data
router.route("/user")
    .get(verifyJWT, currentUserData)

//route for refreshing accessToken
router.route("/user/refreshAccessToken")
    .post(verifyJWT, refreshAccessToken)

//route for change user current password
router.route("/user/changeCurrentPassword")
    .post(verifyJWT, changeCurrenPassword)

//route for user borrow amount
router.route("/user/borrow")
    .post(verifyJWT, userBorrowMoney)

//route for borrowing limit recommendation
router.route("/user/recommendation")
    .post(verifyJWT, borrowingLimitsRecommendation)


export default router