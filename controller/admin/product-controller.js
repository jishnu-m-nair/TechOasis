const ProductModel = require('../../model/product-model');
const CategoryModel = require('../../model/category-model')

const productManagementGet = async (req, res) => {
    try {
        const perPage = 5;
        const page = parseInt(req.query.page) || 1;

        let query = {};

        const selectedCategory = req.query.category || '';
        if (selectedCategory) {
            query.category = selectedCategory;
        }

        const totalProducts = await ProductModel.countDocuments(query);

        const products = await ProductModel.find(query)
            .populate('category')
            .skip(perPage * (page - 1))
            .limit(perPage)
            .sort({ createdAt: -1 })
            .lean()



        const categories = await CategoryModel.find().lean();

        const totalPages = Math.ceil(totalProducts / perPage);

        res.render('admin/products', {
            products,
            categories,
            selectedCategory,
            currentPage: page,
            totalPages,
            pagetitle: 'Products',
            perPage
        });
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};

const productCategories = async (req, res) => {
    try {
        const categories = await CategoryModel.find({}, 'name');
        res.status(200).json(categories);
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
}

const addProduct = async (req, res) => {
    try {
        const categories = await CategoryModel.find().lean();
        res.render('admin/add-product', { categories, pagetitle: "Add Product Page" });
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
}

const addProductPost = async (req, res) => {
    try {
        const {
            productName,
            description,
            brand,
            countInStock,
            category,
            price,
            images,
        } = req.body;
        const image = images[0];

        const existingProduct = await ProductModel.findOne({
            productName: { $regex: new RegExp('^' + req.body.productName + '$', 'i') }
        });

        if (existingProduct) {
            return res.status(400).json({
                error: 'Bad Request',
                errorMessage: 'Product name already exists'
            });
        }
        const parsedPrice = parseFloat(price);
        // Create new product
        const product = new ProductModel({
            productName,
            description,
            image,
            images,
            brand,
            countInStock,
            category,
            price: parsedPrice,
            discountPrice: 0,
            afterDiscount: Math.floor(parsedPrice)
        });

        await product.save();

        return res.status(201).json({ success: true, message: 'Product added successfully', redirectUrl: "/admin/product-management" });

    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};

const editProduct = async (req, res) => {
    const productId = req.params.Id
    try {
        const product = await ProductModel.findById(productId)
            .populate('category')
            .lean();

        const categories = await CategoryModel.find().lean();

        delete req.session.imagePaths;
        res.render('admin/edit-product', { categories, product, pagetitle: "Edit Product Page" });
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
}

const editProductPost = async (req, res) => {
    try {
        const productId = req.params.Id;
        const existingProduct = await ProductModel.findById(productId);
        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        const {
            productName,
            description,
            brand,
            countInStock,
            category,
            price,
            discountPrice,
            newImages,
        } = req.body;

        let image = existingProduct.image;
        let images = existingProduct.images || [];
        let deletedImages = req.session.imagePaths || []
        if(deletedImages.length > 0) {
            images = images.filter(image => !deletedImages.includes(image))
        }
        if (newImages && newImages.length > 0) {
            images = [...existingProduct.images, ...newImages];
        }

        if (images && images.length == 0) {
            return res.status(400).json({
                success: false,
                error: 'Select atleast 1 image'
            })
        }

        if (images && images.length > 5) {
            return res.status(400).json({
                success: false,
                error: 'Total images must be 5 or below'
            })
        }

        const parsedPrice = parseFloat(price);
        const parsedDiscountPrice = parseFloat(discountPrice);
        const afterDiscount = Math.floor(parsedPrice - (parsedPrice * (parsedDiscountPrice / 100)));

        const updatedProduct = await ProductModel.findByIdAndUpdate(
            productId,
            {
                productName,
                description,
                brand,
                countInStock,
                category,
                price: parsedPrice,
                discountPrice: parsedDiscountPrice,
                image,
                images,
                afterDiscount
            },
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        delete req.session.imagePaths;
        return res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            product: updatedProduct,
            redirectUrl: '/admin/product-management'
        });
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};


const productManagementPublish = async (req, res) => {
    try {
        let { id } = req.body;
        let productDetails = await ProductModel.findById(id);

        if (productDetails.isFeatured) {
            productDetails.isFeatured = false
            await productDetails.save()
            res.status(200).json({
                status: true
            })
        } else if (!productDetails.isFeatured) {
            productDetails.isFeatured = true
            await productDetails.save()
            res.status(201).json({
                status: true
            })
        }

    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
}

const productImageUpload = (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded.' });
        }

        // Get the file paths
        const filePaths = req.files.map(file => file.path.replace('public/', ''));

        res.json({ success: true, imagePaths: filePaths });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error uploading images.' });
    }
}

const removeImage = async (req,res) => {
    const { imagePath } = req.body;

    try {
        let imagePaths = req.session.imagePaths;

        if(!imagePaths) {
            imagePaths = [];
        }

        imagePaths.push(imagePath);
        req.session.imagePaths = imagePaths;
        res.status(200).json({ success : true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error uploading images.' });
    }

}

module.exports = {
    productManagementGet,
    productCategories,
    addProductPost,
    addProduct,
    editProduct,
    editProductPost,
    productManagementPublish,
    productImageUpload,
    removeImage
}