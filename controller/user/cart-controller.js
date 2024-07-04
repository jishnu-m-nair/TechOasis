const ProductModel = require("../../model/product-model");
const UserModel = require("../../model/user-model");
const CartModel = require("../../model/cart-model");


const addTocart = async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await UserModel.findById( userId );
        if (!user) {
            console.log('User not found');
            return res.status(404).json({ message: 'User not found' });
        }

        // const userId = user._id;
        const { productId, quantity = 1 } = req.body; // Default quantity to 1 if not provided

        if (quantity < 1 || quantity > 5) {
            console.log('Invalid quantity requested');
            return res.status(400).json({ message: 'Invalid quantity. Must be between 1 and 5' });
        }

        const product = await ProductModel.findById(productId);
        if (!product) {
            console.log('Product not found');
            return res.status(404).json({ message: 'Product not found' });
        }

        if (quantity > product.countInStock) {
            console.log('Not enough stock');
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
                userCart.items.push({
                    productId: productId,
                    quantity: quantity,
                    price: product.price * quantity,
                });
            } else {
                return res.status(400).json({ message: 'Not enough stock available' });
            }
          
        }
            userCart.billTotal = userCart.items.reduce((total, item) => total + item.price, 0);

         
          await userCart.save();
          console.log('Item added to cart successfully');
          return res.status(200).json({ message: 'Item added to cart successfully' });

        
    } catch (err) {
        console.log('Error adding to cart:', err.message);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// const addTocart = async (req, res) => {
//     try {
//         const user = await UserModel.findOne({ email: req.session.email });
//         if (!user) {
//             console.log('User is not found');
//             return res.status(404).json({ message: 'User not found' });
//         }

//         const userId = user._id;
//         const {productId} = req.body;

//         const product = await ProductModel.findById(productId);
    
//         if (!product) {
//             console.log('Product is not found');
//             return res.status(404).json({ message: 'Product not found' });
//         }

//         let userCart = await CartModel.findOne({ owner: userId });
//         if (!userCart) {
//             userCart = new CartModel({
//                 owner: userId,
//                 items: [],
//                 billTotal: 0,
//             });
//         }
        
//         const existingCartItem = userCart.items.find(item => item.productId.toString() === productId);

//         if (existingCartItem) {
//             if (existingCartItem.quantity < product.countInStock && existingCartItem.quantity < 5) {
//                 existingCartItem.quantity += 1;
//                 existingCartItem.price = existingCartItem.quantity * product.price;
//             } else {
//                 return res.status(400).json({ message: 'Maximum quantity per person reached' });
//             }
//         } else {
            
//             userCart.items.push({
//                 productId: productId,
              
//                 quantity: 1,
                
//                 price: product.price,
                
//             });
//         }

//         userCart.billTotal = userCart.items.reduce((total, item) => total + item.price, 0);

//         await userCart.save();
//         return res.redirect('/cart');
//     } catch (err) {
//         console.log('Error adding to cart:', err.message);
//         return res.status(500).json({ message: 'Internal server error' });
//     }
// };

const showcart = async (req, res) => {
    try {
        const userId = req.session.userId;
        
        // Find the user's cart, if it exists
        let userCart = await CartModel.findOne({ owner: userId }).populate({ path: 'items.productId', model: 'Products' });

        if (userCart && userCart.items.length > 0) {
            // If the cart is not empty, render the cart page with the user's cart
            res.render('user/cart', {
                cart: userCart,
                pageTitle: "Cart Page"
            });
        } else {
            // If the cart is empty or doesn't exist, render the empty cart page
            res.render('user/empty-cart', {
                pageTitle: "Cart Page"
            });
        }
    } catch (err) {
        console.log('Error displaying cart:', err.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};


const deleteCart = async (req, res) => {
    try {
        const user = await UserModel.findOne({ email: req.session.email });
        
        if (!user) {
            console.log('User is not found');
            return res.status(404).json({ message: 'User not found' });
        }

        const { productId } = req.body;
        let userCart = await CartModel.findOne({ owner: user._id }).populate({ path: 'items.productId', model: 'Products' });
        
        if (!userCart) {
            console.log('Cart not found');
            return res.status(404).json({ message: 'Cart not found' });
        }

        const productIndex = userCart.items.findIndex(item => item.productId._id.toString() === productId);

        if (productIndex !== -1) {
            const [productItem] = userCart.items.splice(productIndex, 1); 
            userCart.billTotal -= (productItem.quantity * productItem.productId.price); 

            if (userCart.isApplied) {
                
                userCart.billTotal = userCart.items.reduce((total, item) => total + (item.quantity * item.productId.price), 0); 
                userCart.isApplied = false;
                userCart.coupon = 'nil';
                userCart.discountPrice = 0;

                const coupon = await couponModel.findOne({ usersUsed: user._id }); 
                if (coupon) {
                    coupon.usersUsed.pull(user._id); 
                    coupon.maxUsers++;
                    await coupon.save();
                }
            }

            await userCart.save();
            res.status(200).json({ success: true, message: 'Item removed from cart' });
        } else {
            console.log('Item not found in cart');
            return res.status(404).json({ message: 'Item not found in cart' });
        }
    } catch (err) {
        console.log('Error deleting from cart:', err.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};


const updateCart = async (req, res) => {
    try {
        const user = await UserModel.findOne({ email: req.session.email });
        if (!user) {
            console.log('User not found in update cart');
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
            console.log('Cart item not found in update cart');
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

        cartItem.price = cartItem.quantity * cartItem.productId.price;
        cart.billTotal = cart.items.reduce((total, item) => total + (item.quantity * item.productId.price), 0);

        await cart.save();
        return res.status(200).json({ success: true, cart });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Internal server error" });
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
        res.json(cart);
    } catch (error) {
        console.error('Error fetching latest cart data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};



module.exports={
    addTocart,
    showcart,
    deleteCart,
    updateCart,
    latestCart
};