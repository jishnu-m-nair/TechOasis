const nodemailer = require("nodemailer");
const randomstring = require("randomstring");
require("dotenv").config();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.USER_EMAIL, // Your Gmail email address
        pass: process.env.USER_PASSWORD, // Your Gmail app password
    },
});

function sentOtp(email) {
    const otp = randomstring.generate({
        length: 6,
        charset: "numeric",
    });

    const mailOptions = {
        from: {
            name: "TechOasis",
            address: process.env.USER_EMAIL,
        },
        to: email,
        subject: "TechOasis: Verify Your Account",
        text: `
                Hello,
            
                Thank you for using TechOasis. To verify your account, please enter the following One-Time Password (OTP):
            
                **${otp}**  This code is valid for 2 minutes. Please do not share this code with anyone.
            
                If you did not request this verification code, please ignore this email.
            
                Sincerely,
            
                The TechOasis Team
            `,
        html: `
                <p>Hello,</p>
            
                <p>Thank you for using TechOasis. To verify your account, please enter the following One-Time Password (OTP):</p>
            
                <p><strong>${otp}</strong></p> <p>This code is valid for 2 minutes. Please do not share this code with anyone.</p>
            
                <p>If you did not request this verification code, please ignore this email.</p>
            
                <p>Sincerely,</p>
            
                <p>The TechOasis Team</p>
            `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            res.status(500).send("Error sending OTP");
        }
    });
    return otp;
}


module.exports = {
    sentOtp,
    transporter,
};
