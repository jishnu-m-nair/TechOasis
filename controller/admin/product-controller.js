// const express = require('express');
// const fs = require('fs');
// const path = require('path');

const ProductModel = require('../../model/product-model');
const CategoryModel = require('../../model/category-model')
// const UserModel = require('../../model/user-model');

const productManagementGet = async (req, res) => {
    try {
        if (req.session.admin) {
            const perPage = 5; // Define how many products you want per page
            const page = parseInt(req.query.page) || 1; // Get the page number from the request query parameters

            let query = {};

            // Check if a category is selected for filtering
            const selectedCategory = req.query.category || ''; // Default to empty string if not provided
            if (selectedCategory) {
                query.category = selectedCategory;
            }

            const totalProducts = await ProductModel.countDocuments(query);

            const products = await ProductModel.find(query)
                .populate('category') // Populate the 'category' field
                .skip(perPage * (page - 1))
                .limit(perPage)
                .sort({createdAt:-1})
                .lean()
                


            const categories = await CategoryModel.find().lean();

            // Calculate the total number of pages
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
        }
    } catch (error) {
        console.error(error);
        // res.status(500).json({
        //     message: error.message || 'Internal Server Error'
        // });
        return res.render('500');
    }
};

const productCategories = async (req, res) => {
    try {
        const categories = await CategoryModel.find({}, 'name'); // Only fetch category names
        res.status(200).json(categories);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Internal Server Error'
        });
    }
}

const addProduct = async (req,res)=>{
    try {
        const categories = await CategoryModel.find().lean();
        res.render('admin/add-product',{categories,pagetitle:"Add Product Page"});
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Internal Server Error'
        });
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
            // Path to be used for deleting files
            // const basePath = path.join(__dirname, '..',);
            
            // // Delete uploaded images if product already exists
            // await Promise.all(allImages.map(async file => {
            //     const filePath = path.join(basePath, file.path);
            //     try {
            //         await fs.promises.unlink(filePath);
            //         console.log(`Deleted file: ${filePath}`);
            //     } catch (unlinkError) {
            //         console.error(`Error deleting file ${filePath}:`, unlinkError);
            //     }
            // }));

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
                price : parsedPrice,
                discountPrice: 0,
                afterDiscount: Math.floor(parsedPrice)
            });
            console.log(product.images);
            console.log(product);

            await product.save();
            console.log('Product saved successfully.');
            return res.status(201).json({ success: true, message: 'Product added successfully', redirectUrl: "/admin/product-management" });

    } catch (error) {
        console.error('Error adding product:', error);
        // Delete uploaded images if an error occurs
        // if (req.files['images']) {
        //     // Path to be used for deleting files
        //     const basePath = path.join(__dirname, '..',);
            
        //     // Delete uploaded images if product already exists
        //     await Promise.all(allImages.map(async file => {
        //         const filePath = path.join(basePath, file.path);
        //         try {
        //             await fs.promises.unlink(filePath);
        //             console.log(`Deleted file: ${filePath}`);
        //         } catch (unlinkError) {
        //             console.error(`Error deleting file ${filePath}:`, unlinkError);
        //         }
        //     }));
        // }

        return res.status(500).json({
            error: 'Internal Server Error',
            errorMessage: error.message
        });
    }
};

const editProduct = async (req,res)=>{
    const productId = req.params.Id
    try {
        const product = await ProductModel.findById(productId)
            .populate('category')
            .lean();

        const categories = await CategoryModel.find().lean();
        res.render('admin/edit-product',{categories,product,pagetitle:"Edit Product Page"});
    } catch (error) {
        console.error(error);
		return res.status(500).json({
			success: false,
			error: 'Internal Server Error',
			errorMessage: error.message
		});
    }
}

const editProductPost = async (req, res) => {
    console.log("reached")
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
	if (newImages && newImages.length > 0){
		images = [...existingProduct.images, ...newImages];
	} else {
		console.log('no new images')
	}

	if(images && images.length > 5){
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

	console.log('Product updated successfully')
	return res.status(200).json({
		success: true,
		message: 'Product updated successfully',
		product: updatedProduct,
		redirectUrl: '/admin/product-management'
	});
    } catch (error) {
		console.error(error);
		return res.status(500).json({
			success: false,
			error: 'Internal Server Error',
			errorMessage: error.message
		});
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
        console.error(error);
        return res.status(500).json({
            error: 'Internal Server Error'
        });
    }
}

const productImageUpload =  (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded.' });
        }

        // Get the file paths
        const filePaths = req.files.map(file => file.path.replace('public/', ''));

        res.json({ success: true, imagePaths: filePaths });
    } catch (error) {
        console.error('Error uploading product images:', error);
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
}