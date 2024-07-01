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
           type: String,
           required: true,
           enum: ['home', 'work'], // Define the allowed values for address type
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

// // Pre-save middleware to capitalize fields
// addressSchema.pre('save', function(next) {
//     // Iterate over each address in the addresses array
//     this.addresses.forEach(address => {
//         // if (address.landmark) {
//         //     address.landmark = capitalizeEachWord(address.landmark);
//         // }
//         if (address.city) {
//             address.city = capitalize(address.city);
//         }
//         if (address.district) {
//             address.district = capitalize(address.district);
//         }
//         if (address.state) {
//             address.state = capitalize(address.state);
//         }
//         if (address.country) {
//             address.country = capitalize(address.country);
//         }
//     });
//     next();
// });

// // Capitalize helper function
// function capitalize(value) {
//     if (typeof value !== 'string') return value;
//     return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
// }

// function capitalizeEachWord(value) {
//     if (typeof value !== 'string') return value;
//     return value.replace(/\b\w/g, char => char.toUpperCase());
// }



const AddressModel = mongoose.model('Address',addressSchema);
module.exports = AddressModel;