import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

const router = Router();


router.route("/main")
    .get((req, res) => {
        res.send("Works Fine !!")
    })

router.route("/user/signup")
    .post(registerUser)



export default router