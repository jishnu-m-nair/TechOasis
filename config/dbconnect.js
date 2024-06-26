const mongoose = require('mongoose');
require('dotenv').config();

const databaseURI = process.env.MONGO_URI

async function connectToDatabase() {
   try {
      await mongoose.connect(databaseURI);
      console.log('MongoDB Connected');
   } catch (err) {
      console.error('Error connecting to MongoDB: ' + err);
   }
}
 
module.exports = connectToDatabase;