const ProductModel = require("../../model/product-model");
const UserModel = require("../../model/user-model");
const CartModel = require("../../model/cart-model");


const addTocart = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await UserModel.findById( userId );
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { productId, quantity = 1 } = req.body;

        if (quantity < 1 || quantity > 5) {
            return res.status(400).json({ message: 'Invalid quantity. Must be between 1 and 5' });
        }

        const product = await ProductModel.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (quantity > product.countInStock) {
            return res.status(400).json({ message: 'Not enough stock available' });
        }

        let userCart = await CartModel.findOne({ owner: userId }).populate({path:'items.productId',model:'Products'});
        if (!userCart) {
            userCart = new CartModel({
                owner: userId,
                items: [],
                billTotal: 0,
            });
        }

        const existingCartItemIndex = userCart.items.findIndex(item => item.productId._id.toString() === productId);
        
        if (existingCartItemIndex !== -1) {
            // Product is already in the cart, do not update the quantity
            return res.status(400).json({ message: 'Product is already in the cart' });
        } else {
            
            if (quantity <= product.countInStock) {
                const itemPrice = product.discountPrice > 0 ? product.afterDiscount : product.price;
                userCart.items.push({
                    productId: productId,
                    quantity: quantity,
                    price: itemPrice * quantity,
                });
            } else {
                return res.status(400).json({ message: 'Not enough stock available' });
            }
          
        }

        userCart.billTotal = userCart.items.reduce((total, item) => total + item.price, 0);

        await userCart.save();
        return res.status(200).json({ message: 'Item added to cart successfully' });

        
    } catch (err) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};

const showcart = async (req, res) => {
    try {
        const userId = req.session.userId;
        
        let userCart = await CartModel.findOne({ owner: userId }).populate({ path: 'items.productId', model: 'Products' });

        if (userCart && userCart.items.length > 0) {
            res.render('user/cart', {
                cart: userCart,
                pageTitle: "Cart Page"
            });
        } else {
            res.render('user/empty-cart', {
                pageTitle: "Cart Page"
            });
        }
    } catch (err) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};


const deleteCart = async (req, res) => {
    try {
        const user = await UserModel.findOne({ email: req.session.email });
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { productId } = req.body;
        let userCart = await CartModel.findOne({ owner: user._id }).populate({ path: 'items.productId', model: 'Products' });
        
        if (!userCart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const productIndex = userCart.items.findIndex(item => item.productId._id.toString() === productId);

        if (productIndex !== -1) {
            const [productItem] = userCart.items.splice(productIndex, 1);

            const itemPrice = productItem.productId.discountPrice > 0 ? productItem.productId.afterDiscount : productItem.productId.price;
            userCart.billTotal -= (productItem.quantity * itemPrice); 

            await userCart.save();
            res.status(200).json({ success: true, message: 'Item removed from cart' });
        } else {
            return res.status(404).json({ message: 'Item not found in cart' });
        }
    } catch (err) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};


const updateCart = async (req, res) => {
    try {
        const user = await UserModel.findOne({ email: req.session.email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        const userId = user._id;

        let cart = await CartModel.findOne({ owner: userId }).populate({ path: 'items.productId', model: 'Products' });
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        const { productId, need } = req.body;
        const cartItem = cart.items.find(item => item.productId._id.toString() === productId);
        if (!cartItem) {
            return res.status(404).json({ success: false, message: "Cart item not found" });
        }

        const maxPerPerson = 5;
        if (cartItem.quantity >= maxPerPerson && need !== "sub") {
            return res.status(400).json({ success: false, message: "Maximum quantity per person for this product has been reached" });
        }

        if (need === "sub") {
            cartItem.quantity = Math.max(1, cartItem.quantity - 1);
        } else if (need === "sum") {
            const maxQuantity = Math.min(cartItem.productId.countInStock, maxPerPerson);
            cartItem.quantity = Math.min(cartItem.quantity + 1, maxQuantity);
        } else {
            return res.status(404).json({ success: false, message: "Invalid operation" });
        }
        const itemPrice = cartItem.productId.discountPrice > 0 ? cartItem.productId.afterDiscount : cartItem.productId.price;
        cartItem.price = cartItem.quantity * itemPrice;
        cart.billTotal = cart.items.reduce((total, item) => total + item.price, 0);

        await cart.save();
        return res.status(200).json({ success: true, cart });
    } catch (err) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};

const latestCart =  async (req, res) => {
    try {
        const userId = req.session.userId;
        const cart = await CartModel.findOne({ owner: userId }).populate({ path: 'items.productId', model: 'Products' });
        
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        // Return the cart data
        res.status(200).json(cart);
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};

module.exports={
    addTocart,
    showcart,
    deleteCart,
    updateCart,
    latestCart
};