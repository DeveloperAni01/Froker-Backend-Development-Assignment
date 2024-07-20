import { Router } from "express";
import { currentUserData, loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = Router();


router.route("/main")
    .get((req, res) => {
        res.send("Works Fine !!")
    })

router.route("/user/signup")
    .post(registerUser)

router.route("/user/login")
    .post(loginUser)

//protected routes
router.route("/user/logout")
    .get(verifyJWT, logoutUser)

router.route("/user")
    .get(verifyJWT, currentUserData)



export default router