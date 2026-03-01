require("dotenv").config();
const path = require("path");
const createServer = require("./config/server");
const connectDB = require("./config/database");
const MQTTService = require("./services/mqttService");

// Controllers
const TopupController = require("./controllers/topupController");
const CardController = require("./controllers/cardController");
const WalletController = require("./controllers/walletController");
const ProductController = require("./controllers/productController");
const TransactionController = require("./controllers/transactionController");
const PaymentController = require("./controllers/paymentController");

// Routes
const topupRoutes = require("./routes/topupRoutes");
const cardRoutes = require("./routes/cardRoutes");
const walletRoutes = require("./routes/walletRoutes");
const productRoutes = require("./routes/productRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const PORT = process.env.PORT || 3000;

const { app, server, io, express } = createServer();

// Serve static files – Frontend folder is one level up
app.use(express.static(path.join(__dirname, "..", "..", "Frontend")));
// Also serve Backend root for any other static assets
app.use(express.static(path.join(__dirname, "..")));

// ─── MQTT Service ───────────────────────────────────────────────
const mqttService = new MQTTService({
  host: process.env.MQTT_HOST,
  port: process.env.MQTT_PORT,
  clientId: process.env.MQTT_CLIENT_ID,
  teamId: process.env.TEAM_ID
});

// ─── Controllers ────────────────────────────────────────────────
const topupController = new TopupController(mqttService, io);
const cardController = new CardController();
const walletController = new WalletController();
const productController = new ProductController();
const transactionController = new TransactionController();
const paymentController = new PaymentController(topupController, io);

// ─── Routes ─────────────────────────────────────────────────────
app.use("/api", topupRoutes(topupController));
app.use("/api/cards", cardRoutes(cardController));
app.use("/api/wallets", walletRoutes(walletController));
app.use("/api/products", productRoutes(productController));
app.use("/api/transactions", transactionRoutes(transactionController));
app.use("/api/payment", paymentRoutes(paymentController));

// Root → Dashboard
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "..", "Frontend", "Dashboard.html"));
});

// ─── Socket.io ──────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log("Dashboard connected:", socket.id);
  socket.on("disconnect", () => console.log("Dashboard disconnected:", socket.id));
});

// ─── Start ──────────────────────────────────────────────────────
async function start() {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`\n\x1b[32m[SUCCESS]\x1b[0m Backend running on port ${PORT}`);
    console.log(`[INFO] Dashboard: http://localhost:${PORT}`);
  });
}

start();
