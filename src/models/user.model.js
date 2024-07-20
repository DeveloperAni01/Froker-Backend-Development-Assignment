import {Schema} from "mongoose"
import bcrypt from "bcrypt"
import JWT from "jsonwebtoken"
import mongoose from "mongoose"

//create userSchema
const userSchema = new Schema ({
    phoneNumber: {
        type: Number,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        index: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    dateOfRegistration: {
        type: Date,
        default: Date.now
    },
    dateOfBirth: {
        type: String,
        required: true
    },
    monthlySalary: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ["Pending", "Rejected", "Approved"],
        default: "Pending"
    },
    purchasePower: {
        type: Number,
    },
    borrowedAmount: {
        type: Number,
        default: 0
    },
    refreshToken: {
        type: String
    }

}, {timestamps: true})


//create mongoose middlewares (mongoose.pre hooks)
userSchema.pre("save", async function(next){
    if(! this.isModified("password")) return next(); //is password not modified call next()

    this.password = await bcrypt.hash(this.password, 10) //save encrypted password using bcrypt
    next()
})

userSchema.pre("save", async function(next) {
     // Check if either 'monthlySalary' or 'borrowedAmount' has been modified
     if (this.isModified("monthlySalary") || this.isModified("borrowedAmount")) {
        // Update the 'purchasePower' based on the current values of 'monthlySalary' and 'borrowedAmount'
        this.purchasePower = this.monthlySalary * 0.5 - this.borrowedAmount;
    }
    next();
})

//define mongoose methods for check password
userSchema.methods.isPasswordCorrected = async function (password) {
    return  await bcrypt.compare(password, this.password)
}

//define mongoose methods for generateAcessToken
userSchema.methods.generateAcessToken = function() {
    //Use JWT authentication
    return JWT.sign(
        {
            _id: this._id,
            email: this.email,
            name: this.name
        }, 
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

//define mongoose methods for generateAcessToken
userSchema.methods.generateRefreshToken = function () {
    return  JWT.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}


export const User = mongoose.model("User", userSchema)
