const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const mqtt = require("mqtt");
const EventEmitter = require("events");
const mongoose = require("mongoose");

// ═══════════════════════════════════════════════════════════════
//  CONFIGURATION (Inlined — no .env needed)
// ═══════════════════════════════════════════════════════════════
const CONFIG = {
    PORT: 3000,
    MQTT_HOST: "mqtt://broker.benax.rw",
    MQTT_PORT: 1883,
    TEAM_ID: "y2c_team0125",
    MQTT_CLIENT_ID: "rfid_backend_y2c_team0125",
    MONGO_URI: "mongodb://localhost:27017/rfid_wallet"
};

// ═══════════════════════════════════════════════════════════════
//  DATABASE
// ═══════════════════════════════════════════════════════════════
async function connectDB() {
    try {
        await mongoose.connect(CONFIG.MONGO_URI);
        console.log("\x1b[32m[DB]\x1b[0m MongoDB connected");
    } catch (err) {
        console.error("\x1b[31m[DB]\x1b[0m MongoDB connection error:", err.message);
        process.exit(1);
    }
}

// ═══════════════════════════════════════════════════════════════
//  MONGOOSE MODELS
// ═══════════════════════════════════════════════════════════════

// --- Card ---
const cardSchema = new mongoose.Schema({
    uid: { type: String, required: true, unique: true, uppercase: true },
    name: { type: String, default: "Unknown Card" }
}, { timestamps: true });
const Card = mongoose.model("Card", cardSchema);

// --- Wallet ---
const walletSchema = new mongoose.Schema({
    uid: { type: String, required: true, unique: true, uppercase: true, ref: "Card" },
    balance: { type: Number, default: 0, min: 0 }
}, { timestamps: true });
const Wallet = mongoose.model("Wallet", walletSchema);

// --- Product ---
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, default: "General" },
    image: { type: String, default: "" }
}, { timestamps: true });
const Product = mongoose.model("Product", productSchema);

// --- Transaction ---
const transactionSchema = new mongoose.Schema({
    uid: { type: String, required: true, uppercase: true, ref: "Card" },
    type: { type: String, enum: ["TOPUP", "PAYMENT"], required: true },
    amount: { type: Number, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    quantity: { type: Number, default: null },
    description: { type: String, default: "" }
}, { timestamps: true });
const Transaction = mongoose.model("Transaction", transactionSchema);

// ═══════════════════════════════════════════════════════════════
//  MQTT SERVICE
// ═══════════════════════════════════════════════════════════════
class MQTTService extends EventEmitter {
    constructor({ host, port, clientId, teamId }) {
        super();
        this.teamId = teamId;
        this.TOPIC_STATUS = `rfid/${teamId}/card/status`;
        this.TOPIC_TOPUP = `rfid/${teamId}/card/topup`;
        this.TOPIC_BALANCE = `rfid/${teamId}/card/balance`;

        this.client = mqtt.connect(`${host}:${port}`, { clientId });

        this.client.on("connect", () => {
            console.log("\x1b[32m[MQTT]\x1b[0m Connected to broker");
            this.client.subscribe([this.TOPIC_STATUS, this.TOPIC_BALANCE], (err) => {
                if (err) console.error("[MQTT] Subscribe error:", err);
            });
        });

        this.client.on("message", (topic, payload) => {
            try {
                const payloadStr = payload.toString();
                console.log(`\x1b[32m[MQTT Raw] Topic: ${topic} | Payload:\x1b[0m ${payloadStr}`);
                const msg = JSON.parse(payloadStr);
                this.emit(topic, msg);
            } catch (e) {
                console.error("[MQTT] Invalid message:", e);
            }
        });
    }

    publishTopup(uid, amount) {
        const message = JSON.stringify({ uid, amount });
        this.client.publish(this.TOPIC_TOPUP, message, { qos: 1 }, (err) => {
            if (err) console.error("[MQTT] Publish error:", err);
        });
    }
}

// ═══════════════════════════════════════════════════════════════
//  TOPUP CONTROLLER
// ═══════════════════════════════════════════════════════════════
class TopupController {
    constructor(mqttService, io) {
        this.mqttService = mqttService;
        this.io = io;
        this.dbPath = path.join(__dirname, "data", "balances.json");
        this.balances = this.loadBalances();

        // Ensure data directory exists
        const dataDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // --- MQTT → Socket.io bridge ---
        this.mqttService.on(this.mqttService.TOPIC_BALANCE, (msg) => {
            console.log(`\x1b[36m[MQTT -> Socket] TOPIC_BALANCE received:\x1b[0m`, JSON.stringify(msg, null, 2));
            const { uid } = msg;
            if (!uid) return;

            const balanceFromMsg = msg.balance !== undefined ? msg.balance : msg.new_balance;
            if (balanceFromMsg !== undefined) {
                this.balances[uid] = Number(balanceFromMsg);
                this.saveBalances();
            }

            const syncMsg = { uid, balance: this.balances[uid] || 0 };
            console.log(`[Socket] Emitting balance_update for UID: ${uid} | Value: ${syncMsg.balance}`);
            this.io.emit("balance_update", syncMsg);
        });

        this.mqttService.on(this.mqttService.TOPIC_STATUS, (msg) => {
            console.log(`\x1b[36m[MQTT -> Socket] TOPIC_STATUS received:\x1b[0m`, JSON.stringify(msg, null, 2));
            const { uid } = msg;
            if (!uid) return;

            if (this.balances[uid] === undefined) {
                this.balances[uid] = 0;
                this.saveBalances();
            }

            // Backend is the source of truth (ESP sends stale values)
            const syncMsg = { uid, balance: this.balances[uid] };
            console.log(`[Socket] Emitting card_status for UID: ${uid} | Backend Balance: ${syncMsg.balance}`);
            this.io.emit("card_status", syncMsg);
        });
    }

    loadBalances() {
        try {
            if (fs.existsSync(this.dbPath)) {
                return JSON.parse(fs.readFileSync(this.dbPath, "utf8"));
            }
        } catch (err) {
            console.error("Error loading balances:", err);
        }
        return {};
    }

    saveBalances() {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(this.balances, null, 2));
        } catch (err) {
            console.error("Error saving balances:", err);
        }
    }

    topup = (req, res) => {
        const { uid, amount } = req.body;
        if (!uid || !amount) {
            return res.status(400).json({ error: "uid and amount are required" });
        }

        // Update backend balance immediately
        if (this.balances[uid] === undefined) this.balances[uid] = 0;
        this.balances[uid] += Number(amount);
        this.saveBalances();

        this.mqttService.publishTopup(uid, amount);
        console.log(`\x1b[33m[API -> MQTT] Top-up request:\x1b[0m UID=${uid}, New Backend Balance=${this.balances[uid]}`);

        // Notify frontend immediately of our new truth
        this.io.emit("balance_update", { uid, balance: this.balances[uid] });

        res.json({ status: "Top-up sent", uid, balance: this.balances[uid] });
    };
}

// ═══════════════════════════════════════════════════════════════
//  SERVER SETUP
// ═══════════════════════════════════════════════════════════════
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve static files (Frontend) from parent Frontend folder
app.use(express.static(path.join(__dirname, "..", "Frontend")));
// Also serve Backend's own static files (data, etc.)
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = socketio(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// ═══════════════════════════════════════════════════════════════
//  INITIALIZE SERVICES & CONTROLLERS
// ═══════════════════════════════════════════════════════════════
const mqttService = new MQTTService({
    host: CONFIG.MQTT_HOST,
    port: CONFIG.MQTT_PORT,
    clientId: CONFIG.MQTT_CLIENT_ID,
    teamId: CONFIG.TEAM_ID
});

const topupController = new TopupController(mqttService, io);

// ═══════════════════════════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════════════════════════

// --- Topup (existing) ---
app.post("/api/topup", (req, res) => topupController.topup(req, res));

// ───────────────────────────────────────────────────────────────
//  CARD ROUTES
// ───────────────────────────────────────────────────────────────

// GET all cards
app.get("/api/cards", async (req, res) => {
    try {
        const cards = await Card.find().sort({ createdAt: -1 });
        res.json(cards);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single card by UID
app.get("/api/cards/:uid", async (req, res) => {
    try {
        const card = await Card.findOne({ uid: req.params.uid.toUpperCase() });
        if (!card) return res.status(404).json({ error: "Card not found" });
        res.json(card);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create/register a card
app.post("/api/cards", async (req, res) => {
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
});

// PUT update card name
app.put("/api/cards/:uid", async (req, res) => {
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
});

// DELETE a card (and its wallet)
app.delete("/api/cards/:uid", async (req, res) => {
    try {
        const uid = req.params.uid.toUpperCase();
        await Card.findOneAndDelete({ uid });
        await Wallet.findOneAndDelete({ uid });
        res.json({ message: "Card and wallet deleted", uid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ───────────────────────────────────────────────────────────────
//  WALLET ROUTES
// ───────────────────────────────────────────────────────────────

// GET all wallets
app.get("/api/wallets", async (req, res) => {
    try {
        const wallets = await Wallet.find().sort({ updatedAt: -1 });
        res.json(wallets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET wallet by UID
app.get("/api/wallets/:uid", async (req, res) => {
    try {
        const wallet = await Wallet.findOne({ uid: req.params.uid.toUpperCase() });
        if (!wallet) return res.status(404).json({ error: "Wallet not found" });
        res.json(wallet);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ───────────────────────────────────────────────────────────────
//  PRODUCT ROUTES
// ───────────────────────────────────────────────────────────────

// GET all products
app.get("/api/products", async (req, res) => {
    try {
        const products = await Product.find().sort({ name: 1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single product
app.get("/api/products/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: "Product not found" });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create product
app.post("/api/products", async (req, res) => {
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
});

// PUT update product
app.put("/api/products/:id", async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!product) return res.status(404).json({ error: "Product not found" });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE product
app.delete("/api/products/:id", async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: "Product deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ───────────────────────────────────────────────────────────────
//  TRANSACTION ROUTES
// ───────────────────────────────────────────────────────────────

// GET all transactions (with optional ?uid= and ?type= filters)
app.get("/api/transactions", async (req, res) => {
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
});

// GET transactions for a specific card UID
app.get("/api/transactions/:uid", async (req, res) => {
    try {
        const transactions = await Transaction.find({ uid: req.params.uid.toUpperCase() })
            .populate("productId")
            .sort({ createdAt: -1 });
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ───────────────────────────────────────────────────────────────
//  PAYMENT ROUTE (buy a product using card balance)
// ───────────────────────────────────────────────────────────────
app.post("/api/payment", async (req, res) => {
    try {
        const { uid, productId, quantity } = req.body;
        if (!uid || !productId) {
            return res.status(400).json({ error: "uid and productId are required" });
        }
        const qty = quantity || 1;

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ error: "Product not found" });

        const totalCost = product.price * qty;

        let wallet = await Wallet.findOne({ uid: uid.toUpperCase() });
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

        // Update local JSON balance too (keep in sync)
        topupController.balances[uid.toUpperCase()] = wallet.balance;
        topupController.saveBalances();

        // Notify dashboard
        io.emit("balance_update", { uid: uid.toUpperCase(), balance: wallet.balance });

        console.log(`\x1b[35m[PAYMENT]\x1b[0m UID=${uid} bought ${qty}x ${product.name} for ${totalCost}. Balance: ${balanceBefore} → ${wallet.balance}`);

        res.json({
            status: "Payment successful",
            transaction,
            newBalance: wallet.balance
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ───────────────────────────────────────────────────────────────
//  ROOT → Dashboard
// ───────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "Frontend", "Dashboard.html"));
});

// ═══════════════════════════════════════════════════════════════
//  SOCKET.IO
// ═══════════════════════════════════════════════════════════════
io.on("connection", (socket) => {
    console.log("Dashboard connected:", socket.id);
    socket.on("disconnect", () => console.log("Dashboard disconnected:", socket.id));
});

// ═══════════════════════════════════════════════════════════════
//  START
// ═══════════════════════════════════════════════════════════════
async function start() {
    await connectDB();

    const PORT = CONFIG.PORT;
    server.listen(PORT, () => {
        console.log(`\n\x1b[32m[SUCCESS]\x1b[0m RFID Consolidated Backend running on port ${PORT}`);
        console.log(`[INFO] Dashboard: http://localhost:${PORT}`);
        console.log(`[INFO] MQTT Broker: ${CONFIG.MQTT_HOST}:${CONFIG.MQTT_PORT}`);
        console.log(`[INFO] MongoDB: ${CONFIG.MONGO_URI}`);
    });
}

start();
