import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = Router();


router.route("/main")
    .get((req, res) => {
        res.send("Works Fine !!")
    })

router.route("/signup")
    .post(registerUser)

router.route("/login")
    .post(loginUser)

//protected routes
router.route("/logout")
    .post(verifyJWT, logoutUser)



export default router