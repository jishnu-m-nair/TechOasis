const WishlistModel = require("../../model/wishlist-model");
const UserModel = require("../../model/user-model");
const ProductModel = require("../../model/product-model");

const addToWishlist = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { productId } = req.body;

        const product = await ProductModel.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        let userWishlist = await WishlistModel.findOne({ user: userId }).populate('products');
        if (!userWishlist) {
            userWishlist = new WishlistModel({
                user: userId,
                products: [],
            });
        }

        const existingWishlistItemIndex = userWishlist.products.findIndex(item => item._id.toString() === productId);
        
        if (existingWishlistItemIndex !== -1) {
            // Product is already in the wishlist
            return res.status(400).json({ message: 'Product is already in the wishlist' });
        } else {
            userWishlist.products.push(productId);
        }
        
        await userWishlist.save();
        return res.status(200).json({ message: 'Item added to wishlist successfully' });
        
    } catch (err) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};


const loadWishlist = async (req, res) => {
    try {
        const userId = req.session.userId;

        let wishlist = await WishlistModel.findOne({ user: userId }).populate('products');

        if (!wishlist) {
            wishlist = null;
        }

        res.status(200).render("user/wishlist", { wishlist, pageTitle: "Wishlist" });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load wishlist' });
    }
};

const removeWishlist = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { productId } = req.body;

        const wishlist = await WishlistModel.findOne({ user: userId });

        if (!wishlist) {
            return res.status(404).json({ error: 'Wishlist not found' });
        }

        wishlist.products = wishlist.products.filter(id => id.toString() !== productId);
        await wishlist.save();

        res.status(200).json({ message: 'Product removed from wishlist successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove product from wishlist' });
    }
};

module.exports = {
    addToWishlist,
    loadWishlist,
    removeWishlist
}