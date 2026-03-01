const Product = require("../models/Product");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

class PaymentController {
    constructor(topupController, io) {
        this.topupController = topupController;
        this.io = io;
    }

    // POST /api/payment  { uid, productId, quantity? }
    pay = async (req, res) => {
        try {
            const { uid, productId, quantity } = req.body;
            if (!uid || !productId) {
                return res.status(400).json({ error: "uid and productId are required" });
            }
            const qty = quantity || 1;

            const product = await Product.findById(productId);
            if (!product) return res.status(404).json({ error: "Product not found" });

            const totalCost = product.price * qty;

            const wallet = await Wallet.findOne({ uid: uid.toUpperCase() });
            if (!wallet) return res.status(404).json({ error: "Wallet not found for this UID" });

            if (wallet.balance < totalCost) {
                return res.status(400).json({
                    error: "Insufficient balance",
                    balance: wallet.balance,
                    required: totalCost
                });
            }

            const balanceBefore = wallet.balance;
            wallet.balance -= totalCost;
            await wallet.save();

            // Record transaction
            const transaction = await Transaction.create({
                uid: uid.toUpperCase(),
                type: "PAYMENT",
                amount: totalCost,
                balanceBefore,
                balanceAfter: wallet.balance,
                productId: product._id,
                quantity: qty,
                description: `Purchased ${qty}x ${product.name}`
            });

            // Keep local JSON in sync
            this.topupController.balances[uid.toUpperCase()] = wallet.balance;
            this.topupController.saveBalances();

            // Notify dashboard
            this.io.emit("balance_update", { uid: uid.toUpperCase(), balance: wallet.balance });

            console.log(`\x1b[35m[PAYMENT]\x1b[0m UID=${uid} bought ${qty}x ${product.name} for ${totalCost}. Balance: ${balanceBefore} → ${wallet.balance}`);

            res.json({
                status: "Payment successful",
                transaction,
                newBalance: wallet.balance
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };
}

module.exports = PaymentController;
