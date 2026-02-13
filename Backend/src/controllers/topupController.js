const fs = require('fs');
const path = require('path');

class TopupController {
  constructor(mqttService, io) {
    this.mqttService = mqttService;
    this.io = io;
    this.dbPath = path.join(__dirname, '../../data/balances.json');
    this.balances = this.loadBalances();

    // Ensure data directory exists
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }

    // Listen to MQTT events
    this.mqttService.on(this.mqttService.TOPIC_BALANCE, (msg) => {
      console.log(`\x1b[36m[MQTT -> Socket] TOPIC_BALANCE received:\x1b[0m`, JSON.stringify(msg, null, 2));

      const { uid } = msg;
      if (!uid) return;

      // Update backend truth if message has new_balance (from topup confirmation)
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

      // Ensure UID exists in our database, otherwise init to 0
      if (this.balances[uid] === undefined) {
        this.balances[uid] = 0;
        this.saveBalances();
      }

      // We IGNORE the balance sent in status because the hardware (ESP) 
      // is currently bugged and sends stale global values. 
      // We send the BACKEND'S truth instead.
      const syncMsg = { uid, balance: this.balances[uid] };

      console.log(`[Socket] Emitting card_status for UID: ${uid} | Backend Balance: ${syncMsg.balance}`);
      this.io.emit("card_status", syncMsg);
    });
  }

  loadBalances() {
    try {
      if (fs.existsSync(this.dbPath)) {
        return JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
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

module.exports = TopupController;
