const mongoose = require('mongoose')
const ObjectID = mongoose.Schema.Types.ObjectId;

const wishlistSchema = new mongoose.Schema({
   user: {
      type: ObjectID,
      ref: 'User',
      required: true
   },
   products: [{
      type: ObjectID,
      ref: 'Products'
   }]
})


const WishlistModel = mongoose.model('wishlist', wishlistSchema);
module.exports = WishlistModel;