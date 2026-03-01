# RFID Wallet Transaction System

A real-time RFID-based wallet system featuring an ESP8266 reader, a Node.js backend, SQLite database integration, and a live web dashboard with separate Admin (Top-Up) and Cashier (Payment) interfaces.

🔗 **Live Dashboard:** http://157.173.101.159:8021/

---

## 🚀 Overview

This project implements a complete RFID Wallet Transaction System that enables:

- Card Top-Up (Credit)
- Product Payment (Debit)
- Real-time balance updates
- Safe wallet updates (atomic transactions)
- Strict MQTT topic isolation

Users scan RFID cards using an ESP8266 terminal. The backend processes transactions securely and updates the web dashboard instantly via WebSocket.

---

## 🏗️ Architecture

The system consists of three main components:

### 1️⃣ ESP8266 (Firmware / Hardware)

- Scans RFID cards using an MFRC522 reader
- Publishes card UID and balance via MQTT
- Subscribes to:
  - Top-Up commands
  - Payment commands
- Updates local balance
- Publishes updated balance confirmation

**Important:**
- Does NOT use HTTP  
- Does NOT use WebSocket  

---

### 2️⃣ Node.js Backend (API + MQTT Bridge)

- Express.js REST API
- MQTT client (Publish–Subscribe communication)
- Socket.io for real-time updates
- SQLite database for transaction integrity

#### API Endpoints

- `POST /topup`
- `POST /pay`

#### Responsibilities

- Business logic processing
- Balance validation
- Safe wallet update (atomic database transaction)
- MQTT message translation
- Real-time WebSocket updates to dashboard

---

### 3️⃣ Web Dashboard (Frontend)

Responsive web interface built with Vanilla JS.

#### 🟢 Admin Interface (Top-Up)

- Auto-detected Card UID
- Previous balance display
- Top-up amount input
- “TOP UP” button
- Success/Fail response
- Real-time updated balance

#### 🔵 Cashier Interface (Payment)

- Auto-detected Card UID
- Previous balance display
- Product dropdown selection
- Quantity input
- Auto-calculated total cost
- “PAY” button
- Approved/Declined result with reason
- Real-time updated balance

---

## 📂 Project Structure

- `Backend/` – Node.js server, API routes, MQTT logic, database integration
- `Frontend/` – Web dashboard interface
- `ESP8266/` – Arduino source code (`RFDI.ino`)
- `database/` – SQLite database file

---

## 🛠️ Setup & Installation

### Backend Setup

```bash
cd Backend
npm install
npm start
```

Server runs on:

```
http://localhost:3000
```

---

### ESP8266 Configuration

Open `ESP8266/RFDI.ino` in Arduino IDE and update:

```cpp
#define WIFI_SSID "Your_SSID"
#define WIFI_PASS "Your_Password"
```

Flash the code to your ESP8266 board.

---

## 🔌 Hardware Wiring (MFRC522 ↔ ESP8266 NodeMCU)

| MFRC522 Pin | ESP8266 Pin | Notes |
|-------------|------------|-------|
| VCC | 3.3V | Do NOT use 5V |
| GND | GND | Ground reference |
| RST | GPIO0 (D3) | Reset pin |
| NSS/CS | GPIO2 (D4) | SPI Select |
| MOSI | GPIO13 (D7) | SPI MOSI |
| MISO | GPIO12 (D6) | SPI MISO |
| SCK | GPIO14 (D5) | SPI Clock |

---

## 📡 MQTT Topic Namespace

Base topic:

```
rfid/y2c_team0125/
```

### Topics Used

- `rfid/y2c_team0125/card/status`
- `rfid/y2c_team0125/card/topup`
- `rfid/y2c_team0125/card/pay`
- `rfid/y2c_team0125/card/balance`

No wildcard subscriptions.  
No generic topics.  
Strict team isolation enforced.

---

## 🗄️ Database Design (SQLite)

The system uses SQLite to ensure safe and atomic wallet operations.

### Tables

- **Cards**
- **Wallet**
- **Products**
- **Transactions (Ledger)**

Each transaction stores:
- Transaction type (TOPUP / PAYMENT)
- Previous balance
- New balance
- Timestamp

---

## 🔒 Safe Wallet Update (Atomic Transaction)

All wallet operations follow:

1. BEGIN TRANSACTION  
2. Validate balance (for payments)  
3. Update wallet balance  
4. Insert transaction record  
5. COMMIT  

If any step fails:

ROLLBACK

This guarantees:

- No partial updates  
- No double spending  
- No inconsistent balances  
- Full transaction integrity  

---

## 🔁 Communication Flow

### Card Scan
ESP → MQTT → Backend → WebSocket → Dashboard  

### Top-Up
Dashboard → HTTP → Backend → MQTT → ESP  
ESP → MQTT → Backend → WebSocket → Dashboard  

### Payment
Dashboard → HTTP → Backend  
Backend validates balance → Safe DB update → MQTT command to ESP  
ESP confirms → WebSocket update to dashboard  

---

## 🌍 Deployment

- Backend deployed on VPS
- Public dashboard accessible online
- Repository is public and structured

---

## 📜 License

Licensed under the ISC License.
