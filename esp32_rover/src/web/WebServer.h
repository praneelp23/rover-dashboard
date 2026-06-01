#ifndef WEB_SERVER_H
#define WEB_SERVER_H

#include <Arduino.h>
#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include "../radar/RadarSensor.h"
#include "../motors/MotorControl.h"

// Shared global state variables from esp32_rover.ino
extern double currentLat;
extern double currentLon;
extern double targetLat;
extern double targetLon;
extern double homeLat;
extern double homeLon;
extern bool homeSaved;
extern bool autoMode;
extern bool returnHome;
extern bool obstacleDetected;
extern String lastLogMsg;
extern int gpsSatellites;
extern double gpsSpeed;
extern String probeState;

// Shared live sensor values (NPK + Battery)
extern double soilMoisture;
extern double soilTemp;
extern int    soilEC;
extern double soilPH;
extern int    soilN;
extern int    soilP;
extern int    soilK;
extern int    batteryLevel;

class WebServerManager {
public:
    WebServerManager(RadarSensor& radar, MotorControl& motors);
    void init();
    void loop(); // For WS cleanup
    void broadcastTelemetry();

private:
    AsyncWebServer server;
    AsyncWebSocket ws;
    RadarSensor& radarSensor;
    MotorControl& motorControl;

    void setupRoutes();
    void handleWebSocketMessage(void *arg, uint8_t *data, size_t len, AsyncWebSocketClient *client);
    void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type,
                 void *arg, uint8_t *data, size_t len);
};

#endif // WEB_SERVER_H
