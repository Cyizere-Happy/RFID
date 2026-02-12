const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const bodyParser = require("body-parser");
const cors = require("cors");

function createServer() {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json());

  const server = http.createServer(app);
  const io = socketio(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  return { app, server, io };
}

module.exports = createServer;
