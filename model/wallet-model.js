const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
	amount: {
		type: Number,
		required: true,
	},
	type: {
		type: String,
		enum: ['credit', 'debit'],
		required: true,
	},
	reason: {
		type: String
	},

}, {
	timestamps: true,
});

const walletSchema = new mongoose.Schema({
	owner: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
		unique: true,
	},
	balance: {
		type: Number,
		default: 0,
		min: 0,
	},
	transactions: [transactionSchema],
}, {
	timestamps: true,
});

const WalletModel = mongoose.model('Wallet', walletSchema);
module.exports = WalletModel;