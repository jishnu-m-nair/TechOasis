const mongoose = require('mongoose');
const OrderModel = require("../../model/order-model");

const orderManagement = async (req,res) =>{
    const perPage = 8;
    const page = parseInt(req.query.page) || 1;
    try {
        const allOrders = await OrderModel.find({})
            .populate("user",'fullname email')
            .skip(perPage * (page - 1))
            .limit(perPage)
            .sort({createdAt:-1});

        if(!allOrders) {
            return res.status(400).render('admin-404',{ errorMessage : "Order data does not exists" });
        }
        const totalOrders = await OrderModel.countDocuments();
        const totalPages = Math.ceil(totalOrders / perPage);

        res.render("admin/order",{
            allOrders,
            perPage,
            currentPage: page,
            totalPages,
            pagetitle:"Order Management",
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

const orderDetailed = async (req,res) =>{
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).render('admin-error',{ errorMessage : "Order ObjectId Invalid" });
    }
    
    try {
        const orderDetail = await OrderModel.findById(orderId).populate("user",'fullname email phone');
        
        const orderAddress = `${orderDetail.deliveryAddress.houseNo},${orderDetail.deliveryAddress.street},${orderDetail.deliveryAddress.landmark},
        ${orderDetail.deliveryAddress.city},${orderDetail.deliveryAddress.district},${orderDetail.deliveryAddress.state},
        ${orderDetail.deliveryAddress.country},Pincode: ${orderDetail.deliveryAddress.pincode}`;

        res.render("admin/order-detailed",{pagetitle:"Order Detailed",orderDetail,orderAddress})
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

const updateOrderStatus = async (req, res) => {
    const { orderId, newStatus } = req.body;

    try {
        const order = await OrderModel.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.paymentStatus === 'Failed') {
            return res.status(400).json({ 
                message: 'Cannot update status for orders with failed payment',
                currentStatus: order.status,
                paymentStatus: order.paymentStatus
            });
        }

        order.status = newStatus;
        if(order.paymentMethod === "COD") {
            order.paymentStatus = "Success";
        }
        await order.save();

        res.status(200).json({ 
            message: 'Order status updated successfully', 
            order: {
                _id: order._id,
                status: order.status,
                paymentStatus: order.paymentStatus
            } 
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    orderManagement,
    orderDetailed,
    updateOrderStatus
}