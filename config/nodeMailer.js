const nodemailer = require('nodemailer');
const randomstring = require('randomstring');
require('dotenv').config()

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.USER_EMAIL, // Your Gmail email address
    pass: process.env.USER_PASSWORD, // Your Gmail app password
  },
});

function sentOtp(email) {
  const otp = randomstring.generate({
    length: 6,
    charset: 'numeric',
  });

  // const mailOptions = {
  //   from: {
  //     name:"TechOasis International",
  //     address:process.env.USER_EMAIL
  //   },
  //   to: email,
  //   subject: 'Your OTP Code for verification',
  //   text: `Your OTP code is: ${otp}`,
  //   html: ""
  // };
  const mailOptions = {
    from: {
      name: "TechOasis International",
      address: process.env.USER_EMAIL
    },
    to: email,
    subject: 'TechOasis International: Verify Your Account',
    text: `
    Hello,
  
    Thank you for using TechOasis International. To verify your account, please enter the following One-Time Password (OTP):
  
    **${otp}**  This code is valid for 10 minutes. Please do not share this code with anyone.
  
    If you did not request this verification code, please ignore this email.
  
    Sincerely,
  
    The TechOasis International Team
    `,
    html: `
    <p>Hello,</p>
  
    <p>Thank you for using TechOasis International. To verify your account, please enter the following One-Time Password (OTP):</p>
  
    <p><strong>${otp}</strong></p> <p>This code is valid for 10 minutes. Please do not share this code with anyone.</p>
  
    <p>If you did not request this verification code, please ignore this email.</p>
  
    <p>Sincerely,</p>
  
    <p>The TechOasis International Team</p>
    `,
  };
  
  

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      res.status(500).send('Error sending OTP');
    } else {
      console.log('Email sent:', info.response);
      console.log('OTP:', otp);
    }
  });
  console.log('email:', email);
  console.log('OTP:', otp);
  return otp;
}


module.exports = {
  sentOtp,
  transporter
}




// const resetPasswordGet = async (req, res) => {
//   try {
//     let user = req.session.userId ? true : false;

//     const Token = req.params.tokenId;
//     console.log(Token);
//     if (!Token) {
//       return res.status(404).json({ message: "token not found" });
//     }

//     log(req.session.token);
//     log(Token);
//     log(req.session.token === Token);

//     if (req.session.token) {
//       const User = req.session.token === Token ? true : false;
//       if (!User) {
//         return res.status(404).json({ message: "error handler" });
//       } else {
//         return res.render("user-change-new-password", { user, Token });
//       }
//     } else {
//       returnres.redirect('/profile')
//     }
//     // if (User.resetTokenExpiration && User.resetTokenExpiration > new Date()) {
//     //   // The token is still valid
//     //   // Perform your reset password logic
//     //   // const category = await Category.find({status:'active'});

//     // } else {
//     //   // The token has expired
//     //   // Handle the case where the token has expired
//     //  return res.status(410).json({message:'The token is expired'})
//     // }
//   } catch (error) {
//     console.error(error);
//     res.status(500).render("500error", { message: "Error Occured" + error });
//   }
// };

// const resetPasswordPost = async (req, res) => {
//   try {
//     console.log(req.body);
//     const token = req.body.token;
//     const password = req.body.newPassword;
//     const confirm_password = req.body.confirmnewPassword;
//     if (password !== confirm_password) {
//       return res
//         .status(400)
//         .json({ message: "The confirm password and  password must be same" });
//     }
//     const user = await UserModel.findOne({ resetToken: token });
//     console.log(user);
//     if (!user) {
//       // return res.status(404).render('errorHandler')
//       return res.status(404).json({ message: "error handler" });
//     }
//     user.password = password;
//     user.resetToken = null; // Optionally, clear the reset token
//     user.resetTokenExpiration = null;
//     await user.save();
//     // return res.status(200).json({status:true,message: 'Password reset successful' });
//     return res
//       .status(200)
//       .json({ success: true, message: "Sucesfully Password Changed" });
//   } catch (error) {
//     console.error(error);
//     return res
//       .status(500)
//       .render("500error", { message: "Error saving the new password" });
//   }
// };