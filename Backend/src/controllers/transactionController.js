const Transaction = require("../models/Transaction");

class TransactionController {
    // GET /api/transactions  (optional query: ?uid=XX&type=TOPUP|PAYMENT)
    getAll = async (req, res) => {
        try {
            const filter = {};
            if (req.query.uid) filter.uid = req.query.uid.toUpperCase();
            if (req.query.type) filter.type = req.query.type.toUpperCase();

            const transactions = await Transaction.find(filter)
                .populate("productId")
                .sort({ createdAt: -1 });
            res.json(transactions);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };

    // GET /api/transactions/:uid
    getByUid = async (req, res) => {
        try {
            const transactions = await Transaction.find({ uid: req.params.uid.toUpperCase() })
                .populate("productId")
                .sort({ createdAt: -1 });
            res.json(transactions);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };
}

module.exports = TransactionController;
