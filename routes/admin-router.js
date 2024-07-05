const express = require('express')
const router = express.Router()
const admin = require('../controller/admin/admin-controller')
const product = require('../controller/admin/product-controller')
const category = require('../controller/admin/category-controller')
const {AdminLogSession} = require('../middlewares/auth')
const { productUpload, categoryUpload } = require('../config/multerConfig')

router.get('/admin',AdminLogSession,(req,res) => {
    res.render('admin/admin-index')
})

// router.get('/admin/signup',(req,res)=> {
//     res.render('admin-register')
// })
router.post('/admin/signup',admin.postAdminRegister)

//admin login
router.get('/admin/login',admin.adminlogin)
router.post('/admin/login',admin.adminloginpost)

//admin logout
router.get('/admin/logout',admin.adminlogout)

//admin user management
router.get('/admin/usermanagement',AdminLogSession,admin.usermanagement)
router.post('/admin/blockUser',AdminLogSession,admin.userblock)

//admin product management
router.get('/admin/product-management',AdminLogSession,product.productManagementGet)
router.get('/admin/product-management/getCategories',AdminLogSession,product.productCategories);
router.get('/admin/product-management/newProduct',product.addProduct)
router.post('/admin/product-management/newProduct',product.addProductPost)
router.get('/admin/product-management/editProduct/:Id',product.editProduct)
router.post('/admin/product-management/editProduct/:Id',product.editProductPost);
router.post('/upload-product-images', productUpload.array('images', 5),product.productImageUpload);
router.post('/admin/product-management/featuredProduct',product.productManagementPublish);


// admin categories 
router.get('/admin/category-management',AdminLogSession,category.categoryManagementGet);
router.post('/admin/category-management/newCategory',AdminLogSession, categoryUpload.single('image'),category.categoryManagementCreate)
router.post('/admin/category-management/edit-category/:categoryId',AdminLogSession,categoryUpload.single('editImage'),category.categoryManagementEdit)
// router.post('/admin/category-management/isFeatured',AdminLogSession,category.categoryManagementFeatured)

module.exports = router;