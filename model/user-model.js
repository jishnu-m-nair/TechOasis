const mongoose = require('mongoose')
// const bcrypt = require('bcrypt')

const userSchema = new mongoose.Schema({
   //signup format//
   fullname: {
      type: String,
      required: true
   },
   email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
   },
   phone: {
      type: Number,
      unique: true,
      sparse: true
   },
   password: {
      type: String
   },
   // google signin
   googleId: {
      type: String,
   },

   //Timestamps//
   createdAt: {
      type: Date,
      default: Date.now,
   },
   updatedAt: {
      type: Date,
      default: Date.now,
   },


   isVerified: {
      type: Boolean,
      default: false
   },
   isBlocked: {
      type: Boolean,
      default: false
   },
   token:{
      type:String,
      default:null
  }

});


const UserModel = mongoose.model('users', userSchema)

module.exports = UserModel;