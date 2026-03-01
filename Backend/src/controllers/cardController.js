const Card = require("../models/Card");
const Wallet = require("../models/Wallet");

class CardController {
    // GET /api/cards
    getAll = async (req, res) => {
        try {
            const cards = await Card.find().sort({ createdAt: -1 });
            res.json(cards);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };

    // GET /api/cards/:uid
    getByUid = async (req, res) => {
        try {
            const card = await Card.findOne({ uid: req.params.uid.toUpperCase() });
            if (!card) return res.status(404).json({ error: "Card not found" });
            res.json(card);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };

    // POST /api/cards
    create = async (req, res) => {
        try {
            const { uid, name } = req.body;
            if (!uid) return res.status(400).json({ error: "uid is required" });

            let card = await Card.findOne({ uid: uid.toUpperCase() });
            if (card) return res.status(409).json({ error: "Card already exists", card });

            card = await Card.create({ uid, name });

            // Also create a wallet for this card
            await Wallet.findOneAndUpdate(
                { uid: uid.toUpperCase() },
                { uid: uid.toUpperCase(), balance: 0 },
                { upsert: true, new: true }
            );

            res.status(201).json(card);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };

    // PUT /api/cards/:uid
    update = async (req, res) => {
        try {
            const card = await Card.findOneAndUpdate(
                { uid: req.params.uid.toUpperCase() },
                { name: req.body.name },
                { new: true }
            );
            if (!card) return res.status(404).json({ error: "Card not found" });
            res.json(card);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };

    // DELETE /api/cards/:uid
    delete = async (req, res) => {
        try {
            const uid = req.params.uid.toUpperCase();
            await Card.findOneAndDelete({ uid });
            await Wallet.findOneAndDelete({ uid });
            res.json({ message: "Card and wallet deleted", uid });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };
}

module.exports = CardController;
