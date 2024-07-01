const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({

   adminEmail:{
      type:String,
      required: true,
      unique: true,
      lowercase: true
   },
   adminPassword:{
      type:String,
      required: true,
      minlength: 6
   }
})

const AdminModel = mongoose.model('admin',adminSchema)

module.exports = AdminModel;