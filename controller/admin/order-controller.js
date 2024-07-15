const OrderModel = require("../../model/order-model");
const UserModel = require("../../model/user-model");
const ProductModel = require("../../model/product-model");
const CategoryModel = require("../../model/category-model");

const orderManagement = async (req,res) =>{
    const allOrders = await OrderModel.find({}).populate("user",'fullname email').limit(8);
    res.render("admin/order",{pagetitle:"Order Management",allOrders})
}

const orderDetailed = async (req,res) =>{
    const { orderId } = req.params;
    const orderDetail = await OrderModel.findOne({oId:orderId}).populate("user",'fullname email phone');
    const orderAddress = `${orderDetail.deliveryAddress.houseNo},${orderDetail.deliveryAddress.street},${orderDetail.deliveryAddress.landmark},
    ${orderDetail.deliveryAddress.city},${orderDetail.deliveryAddress.district},${orderDetail.deliveryAddress.state},
    ${orderDetail.deliveryAddress.country},Pincode: ${orderDetail.deliveryAddress.pincode}`
    res.render("admin/order-detailed",{pagetitle:"Order Detailed",orderDetail,orderAddress})
}

const updateOrderStatus = async (req, res) => {
    const { orderId, newStatus } = req.body;

    try {
        const order = await OrderModel.findByIdAndUpdate(orderId, { status: newStatus }, { new: true });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.status(200).json({ message: 'Order status updated successfully', order });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateCancelStatus = async (req, res) => {
    const { orderId, requestId, status } = req.body;

    try {
        const order = await OrderModel.findOneAndUpdate(
            { _id: orderId, 'requests._id': requestId },
            { $set: { 'requests.$.status': status } },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ message: 'Order or request not found' });
        }

        if (status === 'Accepted') {
            order.status = 'Cancelled';

            for (const item of order.items) {
                await ProductModel.findByIdAndUpdate(
                    item.productId,
                    { $inc: { countInStock: item.quantity } },
                    { new: true }
                );
            }

            await order.save();
        }

        res.status(200).json({ message: 'Request status updated successfully', order });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    orderManagement,
    orderDetailed,
    updateOrderStatus,
    updateCancelStatus
}