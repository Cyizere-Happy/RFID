const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const mqtt = require("mqtt");
const EventEmitter = require("events");

// --- CONFIGURATION (Inlined from .env) ---
const CONFIG = {
    PORT: 3000,
    MQTT_HOST: "mqtt://broker.benax.rw",
    MQTT_PORT: 1883,
    TEAM_ID: "y2c_team0125",
    MQTT_CLIENT_ID: "rfid_backend_y2c_team0125"
};

// --- SERVICES ---
class MQTTService extends EventEmitter {
    constructor({ host, port, clientId, teamId }) {
        super();
        this.teamId = teamId;
        this.TOPIC_STATUS = `rfid/${teamId}/card/status`;
        this.TOPIC_TOPUP = `rfid/${teamId}/card/topup`;
        this.TOPIC_BALANCE = `rfid/${teamId}/card/balance`;

        this.client = mqtt.connect(`${host}:${port}`, { clientId });

        this.client.on("connect", () => {
            console.log("MQTT connected");
            this.client.subscribe([this.TOPIC_STATUS, this.TOPIC_BALANCE], (err) => {
                if (err) console.error("MQTT subscribe error:", err);
            });
        });

        this.client.on("message", (topic, payload) => {
            try {
                const payloadStr = payload.toString();
                console.log(`\x1b[32m[MQTT Raw] Topic: ${topic} | Payload:\x1b[0m ${payloadStr}`);
                const msg = JSON.parse(payloadStr);
                this.emit(topic, msg);
            } catch (e) {
                console.error("Invalid MQTT message:", e);
            }
        });
    }

    publishTopup(uid, amount) {
        const message = JSON.stringify({ uid, amount });
        this.client.publish(this.TOPIC_TOPUP, message, { qos: 1 }, (err) => {
            if (err) console.error("MQTT publish error:", err);
        });
    }
}

// --- CONTROLLERS ---
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

        // MQTT Subscriptions
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

            const syncMsg = { uid, balance: this.balances[uid] };
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

        if (this.balances[uid] === undefined) this.balances[uid] = 0;
        this.balances[uid] += Number(amount);
        this.saveBalances();

        this.mqttService.publishTopup(uid, amount);
        this.io.emit("balance_update", { uid, balance: this.balances[uid] });

        res.json({ status: "Top-up sent", uid, balance: this.balances[uid] });
    };
}

// --- SERVER INITIALIZATION ---
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = socketio(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Services & Controllers
const mqttService = new MQTTService({
    host: CONFIG.MQTT_HOST,
    port: CONFIG.MQTT_PORT,
    clientId: CONFIG.MQTT_CLIENT_ID,
    teamId: CONFIG.TEAM_ID
});

const topupController = new TopupController(mqttService, io);

// --- ROUTES ---
app.post("/api/topup", (req, res) => topupController.topup(req, res));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "Dashboard.html"));
});

// Socket.io
io.on("connection", (socket) => {
    console.log("Dashboard connected:", socket.id);
    socket.on("disconnect", () => console.log("Dashboard disconnected:", socket.id));
});

// --- START ---
const PORT = CONFIG.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\n\x1b[32m[SUCCESS]\x1b[0m RFID Consolidated Backend running on port ${PORT}`);
    console.log(`[INFO] Serving Dashboard from: ${path.join(__dirname, "Dashboard.html")}`);
});
