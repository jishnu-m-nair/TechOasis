const express = require('express');
const fs = require('fs');
const path = require('path');

const ProductModel = require('../../model/product-model');
const CategoryModel = require('../../model/category-model')
const UserModel = require('../../model/user-model');
const { log } = require('console');

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
        res.status(500).json({
            message: error.message || 'Internal Server Error'
        });
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


const productManagementCreate = async (req, res) => {
    try {
        console.log(req.body);
        if (!req.files['images'] || req.files['images'].length === 0) {
            return res.status(400).json({
                error: 'Bad Request',
                errorMessage: 'Image data is missing or invalid'
            });
        }
        const allImages = req.files['images'];
        allImages.reverse();
        const mainImage = allImages[0];
        
        // const additionalImages = allImages.slice(1);
        // Check for existing product name
        // const existingProduct = await ProductModel.findOne({ productName: req.body.productName });
        const existingProduct = await ProductModel.findOne({
            productName: { $regex: new RegExp('^' + req.body.productName + '$', 'i') }
        });

        if (existingProduct) {
            // Path to be used for deleting files
            const basePath = path.join(__dirname, '..',);
            
            // Delete uploaded images if product already exists
            await Promise.all(allImages.map(async file => {
                const filePath = path.join(basePath, file.path);
                try {
                    await fs.promises.unlink(filePath);
                    console.log(`Deleted file: ${filePath}`);
                } catch (unlinkError) {
                    console.error(`Error deleting file ${filePath}:`, unlinkError);
                }
            }));

            return res.status(400).json({
                error: 'Bad Request',
                errorMessage: 'Product name already exists'
            });
        }
        // Create new product
            const product = new ProductModel({
                productName: req.body.productName,
                description: req.body.description,
                image: mainImage.path.replace(/\\/g, '/').replace('public/', ''),
                images: allImages.map(file => file.path.replace(/\\/g, '/').replace('public/', '')),
                brand: req.body.brand,
                countInStock: req.body.countInStock,
                category: req.body.category,
                price: req.body.price,
                discountPrice: 0,
                afterDiscount: Math.floor(parseInt(req.body.price))
            });
            console.log(product.images);
            console.log(product);

            // Save product to database
            await product.save();
            console.log('Product saved successfully.');
            return res.status(201).json({ success: true, message: 'Product added successfully' });

        // Further validation and saving logic...
    } catch (error) {
        console.error('Error adding product:', error);
        // Delete uploaded images if an error occurs
        if (req.files['images']) {
            // Path to be used for deleting files
            const basePath = path.join(__dirname, '..',);
            
            // Delete uploaded images if product already exists
            await Promise.all(allImages.map(async file => {
                const filePath = path.join(basePath, file.path);
                try {
                    await fs.promises.unlink(filePath);
                    console.log(`Deleted file: ${filePath}`);
                } catch (unlinkError) {
                    console.error(`Error deleting file ${filePath}:`, unlinkError);
                }
            }));
        }

        return res.status(500).json({
            error: 'Internal Server Error',
            errorMessage: error.message
        });
    }
};


// const productManagementEdit = async (req, res) => {
//     try {
//         // Check if the product with the specified ID exists in the database
//         const productId = req.params.Id;
//         const existingProduct = await ProductModel.findById(productId);
//         if (!existingProduct) {
//             return res.status(404).json({
//                 error: 'Product not found'
//             });
//         }

//         // Extract product details from the request body
//         const {
//             productName,
//             description,
//             brand,
//             countInStock,
//             category,
//             price,
//             discountPrice
//         } = req.body;


//         // Initialize image and images variables
//         let image = existingProduct.image;
//         let images = existingProduct.images;

//         // Check if files are provided in the request
//         if (req.files) {
//             // Process the main image
//             if (req.files['image']) {
//                 image = req.files['image'][0].path.replace(/\\/g, '/').replace('public/', '')
//             }

//             // Process additional images (if any)
//             if (req.files['images']) {
//                 images = req.files['images'].map((file) =>
//                     file.path.replace(/\\/g, '/').replace('public/', '')
//                 );
//             }
//         }

//         // Convert price and discountPrice to numbers
//         const parsedPrice = parseInt(price);
//         const parsedDiscountPrice = parseInt(discountPrice);

//         // Update the product in the database
//         const updatedProduct = await ProductModel.findByIdAndUpdate(
//             productId, {
//                 productName,
//                 description,
//                 brand,
//                 countInStock,
//                 category,
//                 price: parsedPrice,
//                 discountPrice: parsedDiscountPrice,
//                 image,
//                 afterDiscount: Math.floor(parseInt(req.body.price) - (parseInt(req.body.price) * (parseInt(req.body.discountPrice) / 100)))
//             }, {
//                 new: true,
//             }

//         );

//         images.forEach((item,index)=>{
//             let isThere = existingProduct.images.find((image)=>{
//                 if(image!=item) {
//                     return false
//                 } else {
//                     return true
//                 }
//             })
//             if(!isThere) {
//                 log('work aaye')
//                 updatedProduct.images[index] = item
//             }
//         })
//         console.log(updatedProduct.images)
//         await updatedProduct.save();

//         // const updatedCategory = await CategoryModel.findById(updatedProduct.category);
//         // if (updatedCategory) {
//         //     updatedCategory.products.push(updatedProduct._id);
//         //     await updatedCategory.save();
//         // }
//         if (!updatedProduct) {
//             return res.status(404).json({
//                 message: 'Product not found'
//             });
//         }


//         res.status(200).redirect('/admin/product-management');
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({
//             error: 'Internal Server Error',
//             errorMessage: error.message
//         });
//     }
// };

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
	console.log(typeof parsedPrice)
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




const productManagementDelete = async (req, res) => {
    const {
        productId
    } = req.params;

    try {
        // Find the product by ID and delete it
        const deletedProduct = await ProductModel.findOneAndDelete({
            _id: productId
        });

        if (!deletedProduct) {
            return res.status(404).json({
                error: 'Product not found'
            });
        }

        res.status(200).json({
            message: 'Product deleted successfully'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Internal Server Error'
        });
    }
};


const productManagementPublish = async (req, res) => {
    try {
        let {
            id
        } = req.body
        let productDetails = await ProductModel.findById(id)
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

const removeProductImg = async (req, res) => {
    try {
        // Extract index and productId from the request query

        const { index, updateproductId: productId } = req.body;
        console.log(productId,index);
        console.log("recieved to controller");

        // // Validate index and productId
        // if (isNaN(index) || !productId) {
        //     return res.status(400).json({
        //         error: "Invalid index or product ID."
        //     });
        // }
         // Validate productId and imagePath
         if (!productId) {
            return res.status(400).json({
                error: "Invalid product ID or image path."
            });
        }

        // Fetch the product by ID
        const product = await ProductModel.findById(productId);

        // Check if the product exists
        if (!product) {
            return res.status(404).json({
                error: "Product not found."
            });
        }

        // Find the index of the image to remove
        // const index = product.images.indexOf(imagePath);

        if (index >= 0 && index < product.images.length) {
            // Log index and productId for debugging
            console.log("Removing image at index:", index, "from product with ID:", productId);

            product.images.splice(index, 1);
            await product.save();

            // Log success message for debugging
            console.log("Image removed successfully from product with ID:", productId);

            // Send a success response
            res.status(200).json({ success: true, message: "Image removed successfully" ,images: product.images});
        } else {
            res.status(400).json({ error: "Invalid image index" });
        }
        // if (index !== -1) {
        //     // Log imagePath and productId for debugging
        //     console.log("Removing image:", imagePath, "from product with ID:", productId);
        //     product.images.splice(index, 1);
        //     await product.save();

        //     // Log success message for debugging
        //     console.log("Image removed successfully from product with ID:", productId);

        //     // Send a success response with updated images
        //     res.status(200).json({ 
        //         success: true, 
        //         message: "Image removed successfully",
        //         images: product.images
        //     });
        // } else {
        //     res.status(400).json({ error: "Image not found" });
        // }
    } catch (error) {
        // Log the error for debugging
        console.error("Error removing image:", error);

        // Send an error response
        return res.status(500).json({
            error: "Server error while removing image."
        });
    }
}

const getProductDetails = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await ProductModel.findById(productId);

        if (!product) {
            return res.status(404).send('Product not found');
        }

        res.render('admin-partials/product-modal-content', { item: product });
    } catch (error) {
        console.error('Error fetching product details:', error);
        res.status(500).send('Server error while fetching product details');
    }
};


let productSearch = async (req, res) => {
    try {
        let search = req.query.search || ''; // Get the search term from the query parameters
        const perPage = 10; // Define how many products you want per page
        const page = parseInt(req.query.page) || 1; // Get the page number from the request query parameters
        let query = {};
        // Check if a category is selected for filtering
        const selectedCategory = req.query.category || ''; // Default to empty string if not provided
        if (selectedCategory) {
            query.category = selectedCategory;
        }

        const totalProducts = await ProductModel.countDocuments(query);

        const products = await ProductModel.find({
            productName: { $regex: new RegExp(search, 'i') },
        })
            .populate('category') // Populate the 'category' field
            .lean();

        const categories = await CategoryModel.find().lean();

        // Calculate the total number of pages
        const totalPages = Math.ceil(totalProducts / perPage);
        
        res.render('admin/products', { products,categories,selectedCategory, pagetitle: 'Products',currentPage: page,perPage,totalPages });
     
    } catch (error) {
        console.log(error.message);
    }
  };














const addProduct = async (req,res)=>{
    const categories = await CategoryModel.find().lean();
    res.render('admin/add-product',{categories,pagetitle:"Add Product Page"});
}



  const addProductPost = async (req, res) => {
    try {
        console.log(req.body);
        // if (!req.files['images'] || req.files['images'].length === 0) {
        //     return res.status(400).json({
        //         error: 'Bad Request',
        //         errorMessage: 'Image data is missing or invalid'
        //     });
        // }
        // const allImages = req.files['images'];
		const {
			productName,
			description,
			brand,
			countInStock,
			category,
			price,
			images,
		} = req.body;
        // images.reverse();
        const image = images[0];
        
        // const additionalImages = allImages.slice(1);
        // Check for existing product name
        // const existingProduct = await ProductModel.findOne({ productName: req.body.productName });
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

            // Save product to database
            await product.save();
            console.log('Product saved successfully.');
            return res.status(201).json({ success: true, message: 'Product added successfully', redirectUrl: "/admin/product-management" });

        // Further validation and saving logic...
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
    const product = await ProductModel.findById(productId)
                .populate('category')
                .lean() // Populate the 'category' field
    const categories = await CategoryModel.find().lean();
    res.render('admin/edit-product',{categories,product,pagetitle:"Edit Product Page"});
}

const productImageUpload =  (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded.' });
        }

        // Get the file paths
        const filePaths = req.files.map(file => file.path.replace('public/', '')); // Remove 'public/' from the path

        res.json({ success: true, imagePaths: filePaths });
    } catch (error) {
        console.error('Error uploading product images:', error);
        res.status(500).json({ success: false, message: 'Error uploading images.' });
    }
}

module.exports = {
    productManagementGet,
    productManagementCreate,
    productCategories,
    productManagementDelete,
    productManagementPublish,
    removeProductImg,
    productSearch,
    getProductDetails,
    addProductPost,
    addProduct,
    editProduct,
	editProductPost,
	productImageUpload
}