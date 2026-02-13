#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>

// ---------------- WIFI ----------------
#define WIFI_SSID "EdNet"
#define WIFI_PASS "Huawei@123"

// ---------------- MQTT ----------------
#define MQTT_HOST "broker.benax.rw"
#define MQTT_PORT 1883

#define TEAM_ID "y2c_team0125"

#define TOPIC_STATUS   "rfid/y2c_team0125/card/status"
#define TOPIC_TOPUP    "rfid/y2c_team0125/card/topup"
#define TOPIC_BALANCE  "rfid/y2c_team0125/card/balance"

// ---------------- RFID ----------------
#define SS_PIN 2
#define RST_PIN 0

MFRC522 rfid(SS_PIN, RST_PIN);

// ---------------- GLOBALS ----------------
WiFiClient espClient;
PubSubClient client(espClient);

String lastUID = "";
int balance = 0;

// ---------------- WIFI ----------------
void connectWiFi() {
  Serial.print("Connecting WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected");
}

// ---------------- MQTT CALLBACK ----------------
void mqttCallback(char* topic, byte* payload, unsigned int length) {

  String message;
  for (unsigned int i = 0; i < length; i++)
    message += (char)payload[i];

  StaticJsonDocument<200> doc;
  deserializeJson(doc, message);

  String uid = doc["uid"];
  int amount = doc["amount"];

  if (uid == lastUID) {
    balance += amount;

    StaticJsonDocument<200> out;
    out["uid"] = uid;
    out["new_balance"] = balance;

    char buffer[256];
    serializeJson(out, buffer);

    client.publish(TOPIC_BALANCE, buffer);
    Serial.println("Balance updated via topup");
  }
}

// ---------------- MQTT ----------------
void connectMQTT() {

  client.setServer(MQTT_HOST, MQTT_PORT);
  client.setCallback(mqttCallback);

  while (!client.connected()) {

    Serial.print("Connecting MQTT...");

    if (client.connect("rfid_device_y2c_team0125")) {
      Serial.println("connected");

      client.subscribe(TOPIC_TOPUP);

    } else {
      Serial.println("retry...");
      delay(2000);
    }
  }
}

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);

  SPI.begin();
  rfid.PCD_Init();

  connectWiFi();
  connectMQTT();
}

// ---------------- LOOP ----------------
void loop() {

  if (!client.connected())
    connectMQTT();

  client.loop();

  if (!rfid.PICC_IsNewCardPresent())
    return;

  if (!rfid.PICC_ReadCardSerial())
    return;

  String uid = "";

  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10)
      uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }

  uid.toUpperCase();
  lastUID = uid;

  StaticJsonDocument<200> doc;
  doc["uid"] = uid;
  doc["balance"] = balance;

  char buffer[256];
  serializeJson(doc, buffer);

  client.publish(TOPIC_STATUS, buffer);

  Serial.print("Card detected: ");
  Serial.println(uid);

  delay(2000);
}
