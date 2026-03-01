const Wallet = require("../models/Wallet");

class WalletController {
    // GET /api/wallets
    getAll = async (req, res) => {
        try {
            const wallets = await Wallet.find().sort({ updatedAt: -1 });
            res.json(wallets);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };

    // GET /api/wallets/:uid
    getByUid = async (req, res) => {
        try {
            const wallet = await Wallet.findOne({ uid: req.params.uid.toUpperCase() });
            if (!wallet) return res.status(404).json({ error: "Wallet not found" });
            res.json(wallet);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };
}

module.exports = WalletController;
