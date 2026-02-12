require("dotenv").config();
const createServer = require("./config/server");
const MQTTService = require("./services/mqttService");
const TopupController = require("./controllers/topupController");
const topupRoutes = require("./routes/topupRoutes");

const PORT = process.env.PORT || 3000;

const { app, server, io } = createServer();

// Initialize MQTT service
const mqttService = new MQTTService({
  host: process.env.MQTT_HOST,
  port: process.env.MQTT_PORT,
  clientId: process.env.MQTT_CLIENT_ID,
  teamId: process.env.TEAM_ID
});

// Initialize controller
const topupController = new TopupController(mqttService, io);

// Setup routes
app.use("/api", topupRoutes(topupController));

// Socket.io connection logging
io.on("connection", (socket) => {
  console.log("Dashboard connected:", socket.id);
  socket.on("disconnect", () => console.log("Dashboard disconnected:", socket.id));
});

// Start server
server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
