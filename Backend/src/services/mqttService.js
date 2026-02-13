const mqtt = require("mqtt");
const EventEmitter = require("events");

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
        this.emit(topic, msg); // Emit events
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

module.exports = MQTTService;
