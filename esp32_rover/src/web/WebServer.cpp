#include "WebServer.h"
#include "../config.h"
#include <ArduinoJson.h>

WebServerManager::WebServerManager(RadarSensor& radar, MotorControl& motors)
    : server(HTTP_PORT), ws("/"), radarSensor(radar), motorControl(motors) {}

void WebServerManager::init() {
    if (AP_MODE) {
        WiFi.softAP(WIFI_SSID, WIFI_PASS);
        Serial.print("AP IP Address: ");
        Serial.println(WiFi.softAPIP());
    } else {
        WiFi.begin(WIFI_SSID, WIFI_PASS);
        unsigned long startConnect = millis();
        while (WiFi.status() != WL_CONNECTED && millis() - startConnect < 10000) {
            delay(500);
            Serial.println("Connecting to WiFi...");
        }
        if (WiFi.status() == WL_CONNECTED) {
            Serial.print("Connected! IP Address: ");
            Serial.println(WiFi.localIP());
        } else {
            Serial.println("Failed to connect to WiFi! Starting AP fallback...");
            WiFi.softAP("AgriSync-Rover-AP", "password123");
            Serial.print("AP IP Address: ");
            Serial.println(WiFi.softAPIP());
        }
    }

    setupRoutes();

    ws.onEvent([this](AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type,
                      void *arg, uint8_t *data, size_t len) {
        this->onEvent(server, client, type, arg, data, len);
    });
    server.addHandler(&ws);
    
    // Enable CORS
    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Headers", "Content-Type");

    server.begin();
}

void WebServerManager::setupRoutes() {
    server.on("/api/control", HTTP_OPTIONS, [](AsyncWebServerRequest *request) {
        request->send(200);
    });

    server.on("/api/control", HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL,
        [this](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
            
            StaticJsonDocument<200> doc;
            DeserializationError error = deserializeJson(doc, data);
            
            if (error) {
                request->send(400, "application/json", "{\"status\":\"error\"}");
                return;
            }

            const char* moveCmd = doc["move"];
            
            if (strcmp(moveCmd, "forward") == 0) this->motorControl.moveForward();
            else if (strcmp(moveCmd, "backward") == 0) this->motorControl.moveBackward();
            else if (strcmp(moveCmd, "left") == 0) this->motorControl.turnLeft();
            else if (strcmp(moveCmd, "right") == 0) this->motorControl.turnRight();
            else if (strcmp(moveCmd, "stop") == 0) this->motorControl.stop();

            request->send(200, "application/json", "{\"status\":\"success\"}");
        });
}

void WebServerManager::onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type,
             void *arg, uint8_t *data, size_t len) {
    if (type == WS_EVT_CONNECT) {
        Serial.println("WebSocket client connected");
    } else if (type == WS_EVT_DISCONNECT) {
        Serial.println("WebSocket client disconnected");
    } else if (type == WS_EVT_DATA) {
        handleWebSocketMessage(arg, data, len, client);
    }
}

void WebServerManager::handleWebSocketMessage(void *arg, uint8_t *data, size_t len, AsyncWebSocketClient *client) {
    AwsFrameInfo *info = (AwsFrameInfo*)arg;
    if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
        StaticJsonDocument<300> doc;
        DeserializationError error = deserializeJson(doc, data, len);
        if (error) {
            Serial.print("JSON Deserialization failed: ");
            Serial.println(error.c_str());
            return;
        }

        const char* type = doc["type"];
        if (!type) return;

        if (strcmp(type, "CONTROL") == 0) {
            const char* moveCmd = doc["move"];
            if (strcmp(moveCmd, "forward") == 0) motorControl.moveForward();
            else if (strcmp(moveCmd, "backward") == 0) motorControl.moveBackward();
            else if (strcmp(moveCmd, "left") == 0) motorControl.turnLeft();
            else if (strcmp(moveCmd, "right") == 0) motorControl.turnRight();
            else if (strcmp(moveCmd, "stop") == 0) motorControl.stop();
        } 
        else if (strcmp(type, "PROBE") == 0) {
            const char* action = doc["action"];
            if (strcmp(action, "deploy") == 0) {
                motorControl.deployProbe();
                probeState = "deploying";
            } else if (strcmp(action, "retract") == 0) {
                motorControl.retractProbe();
                probeState = "retracting";
            } else if (strcmp(action, "stop") == 0) {
                motorControl.stopProbe();
                probeState = "stopped";
            }
        }
        else if (strcmp(type, "TOGGLE_AUTO") == 0) {
            autoMode = doc["enabled"];
            if (autoMode) {
                Serial.println("Auto mode enabled via Web");
                digitalWrite(LED_PIN, HIGH);
                if (!homeSaved) {
                    homeLat = currentLat;
                    homeLon = currentLon;
                    homeSaved = true;
                }
            } else {
                Serial.println("Manual mode enabled via Web");
                digitalWrite(LED_PIN, LOW);
                motorControl.stop();
            }
            returnHome = false;
        }
        else if (strcmp(type, "SET_TARGET") == 0) {
            targetLat = doc["lat"];
            targetLon = doc["lon"];
            Serial.print("Target set via Web: ");
            Serial.print(targetLat, 6);
            Serial.print(", ");
            Serial.println(targetLon, 6);
        }
        else if (strcmp(type, "RETURN_HOME") == 0) {
            if (homeSaved) {
                returnHome = true;
                autoMode = true;
                digitalWrite(LED_PIN, HIGH);
                Serial.println("Return home enabled via Web");
            } else {
                Serial.println("Return home failed: Home not saved!");
            }
        }
    }
}

void WebServerManager::broadcastTelemetry() {
    if (ws.count() > 0) {
        StaticJsonDocument<512> doc;
        doc["angle"] = radarSensor.getCurrentAngle();
        doc["distance"] = radarSensor.getCurrentDistance();
        doc["obstacle"] = obstacleDetected;
        doc["lat"] = currentLat;
        doc["lon"] = currentLon;
        doc["homeLat"] = homeLat;
        doc["homeLon"] = homeLon;
        doc["targetLat"] = targetLat;
        doc["targetLon"] = targetLon;
        doc["autoMode"] = autoMode;
        doc["returnHome"] = returnHome;
        doc["satellites"] = gpsSatellites;
        doc["speed"] = gpsSpeed;
        doc["log"] = lastLogMsg;
        doc["probeState"] = probeState;
        
        // Add NPK Modbus values
        doc["soil_moisture"] = soilMoisture;
        doc["soil_temp"] = soilTemp;
        doc["soil_ec"] = soilEC;
        doc["soil_ph"] = soilPH;
        doc["soil_n"] = soilN;
        doc["soil_p"] = soilP;
        doc["soil_k"] = soilK;
        doc["battery"] = batteryLevel;

        char buffer[512];
        serializeJson(doc, buffer);
        ws.textAll(buffer);
    }
}

void WebServerManager::loop() {
    ws.cleanupClients();
}
