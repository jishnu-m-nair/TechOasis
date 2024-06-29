const mongoose = require('mongoose')
const ObjectID = mongoose.Schema.Types.ObjectId;

const addressSchema = new mongoose.Schema({
   user:{
       type:ObjectID,
       ref:'User',
       required:true
   },
   addresses:[{
       addressType: {
           type: String, // This will store the address type, e.g., 'home' or 'work'
           required: true,
           enum: ['home', 'work','temp'], // Define the allowed values for address type
       },
       houseNo:{
           type:String,
           required:true
       },
       street:{
           type:String,
       },
       landmark:{
           type:String,
       },
       pincode:{
           type:Number,
           required:true
       },
       city:{
           type:String,
           required:true
       },
       district:{
           type:String,
           required:true
       },
       state:{
           type:String,
           required:true
       },
       country:{
           type:String,
           required:true
       }

   }],

})

// // Add a custom validation function to limit the number of addresses
// addressSchema.path('addresses').validate(function (value) {
//    return value.length <= 3;
// }, 'You can have a maximum of 3 addresses.');


const AddressModel = mongoose.model('Address',addressSchema);
module.exports = AddressModel;