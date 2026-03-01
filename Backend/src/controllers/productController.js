const Product = require("../models/Product");

class ProductController {
    // GET /api/products
    getAll = async (req, res) => {
        try {
            const products = await Product.find().sort({ name: 1 });
            res.json(products);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };

    // GET /api/products/:id
    getById = async (req, res) => {
        try {
            const product = await Product.findById(req.params.id);
            if (!product) return res.status(404).json({ error: "Product not found" });
            res.json(product);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };

    // POST /api/products
    create = async (req, res) => {
        try {
            const { name, price, category, image } = req.body;
            if (!name || price === undefined) {
                return res.status(400).json({ error: "name and price are required" });
            }
            const product = await Product.create({ name, price, category, image });
            res.status(201).json(product);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };

    // PUT /api/products/:id
    update = async (req, res) => {
        try {
            const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (!product) return res.status(404).json({ error: "Product not found" });
            res.json(product);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };

    // DELETE /api/products/:id
    delete = async (req, res) => {
        try {
            await Product.findByIdAndDelete(req.params.id);
            res.json({ message: "Product deleted" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };
}

module.exports = ProductController;
