import bcrypt from "bcryptjs";
import User from "../../../models/User.js";
import { generateToken } from "../../../middleware/auth.js";

export default async function adminTeacherLogin (req,res) {
    try{
        const {
            email,password
        } = req.body;

        const user = await User.findOne({email});

        if(!user){
            return res.status(400).json({message:"User doesnot exists"});
        }

        const isMatch = await bcrypt.compare(password,user.password);
        if(!isMatch){
            return res.status(400).json({message:"Invalid credentials"});
        }

        const token = generateToken(user);

        res.status(200).json({message:"Login succesfully",
            token,
            user:{
                id:user._id,
                name:user.name,
                employeeId:user.employeeId,
                role:user.role,
            }
        });
    } catch (error) {
        console.log("Error in login");
        res.status(500).json({message:"Error in login"});
    }
}