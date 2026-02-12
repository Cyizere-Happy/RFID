# RFID System Frontend Integration Guide

This document describes how to integrate the frontend dashboard with the RFID backend.

## Connection Details

- **REST API Base URL:** `http://localhost:3000/api`
- **WebSocket URL:** `http://localhost:3000`

## REST API

### Top-up Card

Submit a top-up request for a specific RFID card.

- **Endpoint:** `POST /topup`
- **Body:**
  ```json
  {
    "uid": "CARD_UID_HERE",
    "amount": 100
  }
  ```
- **Response:**
  ```json
  {
    "status": "Top-up sent",
    "uid": "CARD_UID_HERE",
    "amount": 100
  }
  ```

## WebSocket Events

The backend uses [Socket.io](https://socket.io/) to push real-time updates to the dashboard.

### 1. `balance_update`
Emitted when a card's balance is updated after a transaction or top-up.

- **Data structure:**
  ```json
  {
    "uid": "STRING",
    "balance": NUMBER,
    "timestamp": "ISO_DATE_STRING"
  }
  ```

### 2. `card_status`
Emitted when a card is scanned or its status changes.

- **Data structure:**
  ```json
  {
    "uid": "STRING",
    "status": "authorized" | "unauthorized" | "invalid",
    "message": "STRING"
  }
  ```

## Frontend Example (JavaScript/Socket.io)

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("Connected to RFID Backend WebSocket");
});

socket.on("balance_update", (data) => {
  console.log("New balance:", data.balance, "for UID:", data.uid);
  // Update UI accordingly
});

socket.on("card_status", (data) => {
  console.log("Card status update:", data.status, "-", data.message);
  // Show notification or update access log
});

socket.on("disconnect", () => {
  console.log("Disconnected from WebSocket");
});
```
