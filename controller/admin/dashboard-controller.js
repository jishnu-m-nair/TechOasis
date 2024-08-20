const UserModel = require("../../model/user-model");
const OrderModel = require("../../model/order-model");
const ProductModel = require('../../model/product-model');
const CategoryModel = require('../../model/category-model');
const { formatToIndianCurrency } = require('../../utils/helpers');

// Dashboard
const getAdminDashboard = async (req, res) => {
    try {
        
        const { orderCount, productCount, categoryCount, salesAmount, userCount } = await dashboardOverview();
        const totalSalesAmount = await formatToIndianCurrency(salesAmount);
        const bestSellingProducts = await getBestSellingProducts(10);
        const bestSellingCategories = await getBestSellingCategories(5);
        const bestSellingBrands = await getBestSellingBrands(5);
        res.render('admin/dashboard', {
            page: "dashboard",
            pagetitle: "DashBoard",
            orderCount,
            productCount,
            categoryCount,
            userCount,
            totalSalesAmount,
            bestSellingProducts,
            bestSellingCategories,
            bestSellingBrands,
            
        });
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};

// dashboard overview
const dashboardOverview = async (req,res) => {
    try {
        const orderCount = await OrderModel.countDocuments();
        const productCount = await ProductModel.countDocuments();
        const categoryCount = await CategoryModel.countDocuments();
        const userCount = await UserModel.countDocuments();
        const salesAmount = await totalSalesAmount();

        return { orderCount, productCount, categoryCount, salesAmount, userCount }
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
}

const totalSalesAmount = async () => {
    try {
        const totalSales = await OrderModel.aggregate([
            {
                $match: {
                    status: { $nin: ["Pending", "Cancelled", "Returned"] }
                }
            },
            
            {
                $group: {
                    _id: null,
                    totalSalesAmount: { $sum: "$billTotal" }
                }
            },
            
            {
                $project: {
                    _id: 0,
                    totalSalesAmount: 1
                }
            }
        ]);

        return totalSales.length > 0 ? totalSales[0].totalSalesAmount : 0;
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};

const getBestSellingProducts = async (limit = 10) => {
    try {
        const bestSellingProducts = await OrderModel.aggregate([
            
            { $unwind: "$items" },
            
            {
                $group: {
                    _id: "$items.productId",
                    totalSold: { $sum: "$items.quantity" }
                }
            },
            
            { $sort: { totalSold: -1 } },
            
            { $limit: limit },
            
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            
            { $unwind: "$productDetails" },
            
            {
                $lookup: {
                    from: "categories",
                    localField: "productDetails.category",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },
            
            { $unwind: "$categoryDetails" },
            
            {
                $project: {
                    _id: 0,
                    productId: "$_id",
                    totalSold: 1,
                    productName: "$productDetails.productName",
                    description: "$productDetails.description",
                    price: "$productDetails.price",
                    brand: "$productDetails.brand",
                    countInStock: "$productDetails.countInStock",
                    image: "$productDetails.image",
                    categoryName: "$categoryDetails.name"
                }
            }
        ]);

        return bestSellingProducts;
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};

const getBestSellingCategories = async (limit = 5) => {
    try {
        const bestSellingCategories = await OrderModel.aggregate([
            
            { $unwind: "$items" },
            
            {
                $lookup: {
                    from: "products",
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            
            { $unwind: "$productDetails" },
            
            {
                $group: {
                    _id: "$productDetails.category",
                    totalSold: { $sum: "$items.quantity" }
                }
            },
            
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },
            
            { $unwind: "$categoryDetails" },
            
            { $sort: { totalSold: -1 } },
            
            { $limit: limit },
            
            {
                $project: {
                    _id: 0,
                    categoryId: "$_id",
                    categoryName: "$categoryDetails.name",
                    totalSold: 1
                }
            }
        ]);

        return bestSellingCategories;
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};

const getBestSellingBrands = async (limit = 5) => {
    try {
        const bestSellingBrands = await OrderModel.aggregate([

            { $unwind: "$items" },
            
            {
                $lookup: {
                    from: "products",
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            
            { $unwind: "$productDetails" },
            
            {
                $group: {
                    _id: { $toLower: "$productDetails.brand" },
                    totalSold: { $sum: "$items.quantity" }
                }
            },
            
            { $sort: { totalSold: -1 } },
            
            { $limit: limit },
            
            {
                $project: {
                    _id: 0,
                    brandName: "$_id",
                    totalSold: 1
                }
            }
        ]);

        return bestSellingBrands;
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};


const getOrdersByRange = async (req, res) => {
    try {
        const { range } = req.query;
        const now = new Date();
        let startDate;

        switch (range) {
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - now.getDay()));
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            case 'month':
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
        }

        const orders = await OrderModel.find({ createdAt: { $gte: startDate } });

        const { barChartData, monthYear } = processOrdersByDay(orders, range);

        res.json({ barChartData, monthYear });
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};

const processOrdersByDay = (orders, range) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];

    let labels, dailyCounts;

    if (range === 'week') {
        labels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        dailyCounts = Array(7).fill(0);

        orders.forEach(order => {
            const orderDate = new Date(order.createdAt);
            dailyCounts[orderDate.getDay()]++;
        });
    } else {
        const daysInRange = range === 'year' ? 12 : new Date(currentYear, currentMonth + 1, 0).getDate();
        dailyCounts = Array(daysInRange).fill(0);

        orders.forEach(order => {
            const orderDate = new Date(order.createdAt);
            if (range === 'year') {
                dailyCounts[orderDate.getMonth()]++;
            } else {
                dailyCounts[orderDate.getDate() - 1]++;
            }
        });

        labels = Array.from({ length: daysInRange }, (_, i) => i + 1);
    }

    const monthYear = range === 'year' ? currentYear : `${monthNames[currentMonth]} ${currentYear}`;
    return {
        barChartData: {
            labels: labels,
            datasets: [{
                label: 'Number of Orders',
                data: dailyCounts,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgb(54, 162, 235)',
                borderWidth: 1
            }]
        },
        monthYear: monthYear
    };
};

const getOrdersStatus = async (req, res) => {
    try {
        const { range } = req.query;
        const now = new Date();
        let startDate;

        switch (range) {
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - now.getDay()));
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            case 'month':
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
        }

        const orders = await OrderModel.find({ updatedAt: { $gte: startDate } });

        const chartData = processOrderData(orders);

        res.json(chartData);
    } catch (error) {
        res.render('500', { errorMessage: 'Internal Server Error' })
    }
};

const processOrderData = (orders) => {
    const statusCounts = {
        Pending: 0,
        Processing: 0,
        Shipped: 0,
        Delivered: 0,
        Cancelled: 0,
        Returned: 0
    };

    orders.forEach(order => {
        const status = order.status.charAt(0).toUpperCase() + order.status.slice(1).toLowerCase();
        if (statusCounts.hasOwnProperty(status)) {
            statusCounts[status]++;
        }
    });

    return {
        labels: Object.keys(statusCounts),
        datasets: [{
            data: Object.values(statusCounts),
            backgroundColor: [
                '#FFA500', // Pending
                '#4169E1', // Processing
                '#32CD32', // Shipped
                '#008000', // Delivered
                '#FF0000', // Cancelled
                '#8B4513'  // Returned
            ]
        }]
    };
};

module.exports = {
    getAdminDashboard,
    getOrdersByRange,
    getOrdersStatus,
}