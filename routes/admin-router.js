const express = require('express')
const router = express.Router()
const admin = require('../controller/admin/admin-controller')
const product = require('../controller/admin/product-controller')
const category = require('../controller/admin/category-controller')
const order = require('../controller/admin/order-controller')
const coupon = require('../controller/admin/coupon-controller')
const { isAdmin } = require('../middlewares/auth')
const { productUpload, categoryUpload } = require('../config/multerConfig')

router.get('/admin',isAdmin,(req,res) => {
    res.render('admin/admin-index')
})

// router.get('/admin/signup',(req,res)=> {
//     res.render('admin-register')
// })
router.post('/admin/signup',admin.postAdminRegister)

//admin login
router.get('/admin/login',admin.adminLogin)
router.post('/admin/login',admin.adminLoginPost)

//admin logout
router.get('/admin/logout',admin.adminLogout)

//admin user management
router.get('/admin/usermanagement',isAdmin,admin.userManagement)
router.post('/api/block-user',isAdmin,admin.blockUser)
router.post('/api/user-filter',isAdmin, admin.filterUsers);

//admin product management
router.get('/admin/product-management',isAdmin,product.productManagementGet)
router.get('/admin/product-management/getCategories',isAdmin,product.productCategories);
router.get('/admin/product-management/newProduct', isAdmin,product.addProduct)
router.post('/admin/product-management/newProduct', isAdmin,product.addProductPost)
router.get('/admin/product-management/editProduct/:Id',isAdmin,product.editProduct)
router.post('/admin/product-management/editProduct/:Id', isAdmin,product.editProductPost);
router.post('/upload-product-images', isAdmin, productUpload.array('images', 5),product.productImageUpload);
router.post('/admin/product-management/featuredProduct', isAdmin,product.productManagementPublish);


// admin categories 
router.get('/admin/category-management',isAdmin,category.categoryManagementGet);
router.post('/admin/category-management/newCategory',isAdmin, categoryUpload.single('image'),category.categoryManagementCreate)
router.post('/admin/category-management/edit-category/:categoryId',isAdmin,categoryUpload.single('editImage'),category.categoryManagementEdit)
router.post('/admin/category-management/isFeatured',isAdmin,category.categoryManagementFeatured)
router.post('/api/category-filter', isAdmin, category.getCategoryList);

// order details
router.get('/admin/order-management',isAdmin,order.orderManagement);
router.get('/admin/order-management/order-detailed/:orderId',isAdmin,order.orderDetailed);
router.post('/api/update-order-status',isAdmin,order.updateOrderStatus);
router.post('/api/update-cancel-req',isAdmin, order.updateCancelStatus);
router.post('/api/update-return-req',isAdmin, order.updateReturnStatus);

router.get('/error',(req,res)=>{
    res.render('admin-error')
})
router.get('/admin-404',(req,res)=>{
    res.render('admin-404')
})

router.get("/admin/coupon-management", isAdmin,coupon.couponManagement);
router.post('/api/admin/add-coupon', isAdmin, coupon.addCoupon);
router.delete('/api/admin/delete-coupon/:id', coupon.deleteCoupon);

router.get("/admin/sales-report", isAdmin,admin.getSalesReportPage);
router.post('/api/admin/generate-sales-report',isAdmin, admin.generateSalesReport);

module.exports = router;