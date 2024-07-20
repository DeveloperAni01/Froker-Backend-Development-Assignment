import { Router } from "express";
import { changeCurrenPassword,
        currentUserData,
        loginUser,
        logoutUser,
        refreshAccessToken, 
        registerUser, 
        userBorrowMoney} from "../controllers/user.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = Router();


router.route("/main")
    .get((req, res) => {
        res.send("Works Fine !!")
    })

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



export default router