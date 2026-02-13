# RFID Top-Up System

A real-time RFID-based balance management system featuring an ESP8266 reader, a Node.js backend, and a live web dashboard.

## 🚀 Overview

This project enables real-time interaction with RFID cards. Users can scan cards at a terminal (ESP8266), view their balance on a sleek web dashboard, and perform top-ups instantly.

## 🏗️ Architecture

The system consists of three main components:

1.  **ESP8266 (Firmware/Hardware)**: 
    - Scans RFID cards using an MFRC522 reader.
    - Communicates with the backend via MQTT.
    - Updates local balance upon receiving top-up commands.
2.  **Node.js Backend**:
    - Acts as a bridge between the hardware and the web dashboard.
    - Uses **MQTT** for low-latency communication with the ESP module.
    - Uses **Socket.io** to push real-time updates to the dashboard.
    - Manages persistent balance data in `balances.json`.
3.  **Astrum Dashboard (Frontend)**:
    - A premium, responsive web interface built with Vanilla JS.
    - Displays a live feed of card scans.
    - Allows admins to "Verify & Credit" accounts instantly.

---

## 📂 Project Structure

-   `Backend/`: Node.js server, API routes, and Socket.io logic.
-   `Frontend/`: The `Dashboard.html` interface.
-   `ESP8266/`: Arduino source code (`RFDI.ino`) for the hardware reader.

---

## 🛠️ Setup & Installation

### 1. Backend Setup
1. Navigate to the `Backend/` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
   *The server runs on `http://localhost:3000` by default.*

### 2. ESP8266 Configuration
1. Open `ESP8266/RFDI.ino` in the Arduino IDE.
2. Update the WiFi credentials:
   ```cpp
   #define WIFI_SSID "Your_SSID"
   #define WIFI_PASS "Your_Password"
   ```
3. Flash the code to your ESP8266 board.

---

## 🔌 Hardware Wiring (MFRC522 ↔ ESP8266)

| MFRC522 Pin | ESP8266 Pin (NodeMCU/Wemos) | Notes |
| :--- | :--- | :--- |
| **VCC** | 3.3V | **Do not use 5V**, ESP8266 is 3.3V logic |
| **GND** | GND | Ground reference |
| **RST** | GPIO 0 (D3) | Reset pin (matches `#define RST_PIN 0`) |
| **NSS/CS** | GPIO 2 (D4) | SPI Slave Select (matches `#define SS_PIN 2`) |
| **MOSI** | GPIO 13 (D7) | SPI Master Out Slave In |
| **MISO** | GPIO 12 (D6) | SPI Master In Slave Out |
| **SCK** | GPIO 14 (D5) | SPI Clock |

> [!TIP]
> On NodeMCU/Wemos boards, the D# pins map to GPIO numbers:
> - **D5** = GPIO14
> - **D6** = GPIO12
> - **D7** = GPIO13
> - **D3** = GPIO0
> - **D4** = GPIO2

---

## 📡 Technical Details

### MQTT Topics
- `rfid/y2c_team0125/card/status`: Pushed by ESP when a card is scanned.
- `rfid/y2c_team0125/card/topup`: Pushed by Backend to trigger a balance increase.
- `rfid/y2c_team0125/card/balance`: Pushed by ESP to confirm the new balance.

### WebSocket Events
- `card_status`: Triggered on every scan.
- `balance_update`: Triggered when a top-up is processed.

---

## 📜 License
This project is licensed under the ISC License.
