#include <Arduino.h>
#include "src/config.h"
#include "src/radar/RadarSensor.h"
#include "src/motors/MotorControl.h"
#include "src/web/WebServer.h"
#include <WiFi.h>
#include <BlynkSimpleEsp32.h>
#include <TinyGPS++.h>
#include <math.h>

// Shared global state variables (declared extern in WebServer.h)
double currentLat = 0.0;
double currentLon = 0.0;
double targetLat  = 0.0;
double targetLon  = 0.0;
double homeLat    = 0.0;
double homeLon    = 0.0;
bool   homeSaved  = false;
bool   autoMode   = false;
bool   returnHome = false;
bool   obstacleDetected = false;
String lastLogMsg = "";
int    gpsSatellites = 0;
double gpsSpeed = 0.0;
String probeState = "stopped";

// Shared live sensor values (declared extern in WebServer.h)
double soilMoisture = 0.0;
double soilTemp = 0.0;
int    soilEC = 0;
double soilPH = 0.0;
int    soilN = 0;
int    soilP = 0;
int    soilK = 0;
int    batteryLevel = 100;

// Hardware control instances
RadarSensor radar;
MotorControl motors;
WebServerManager webServer(radar, motors);

// Blynk Terminal Widget
WidgetTerminal terminal(V15);

// GPS Parsing instances
TinyGPSPlus gps;
HardwareSerial GPSserial(1);

// Throttling timer variables
unsigned long lastGPSSend = 0;
unsigned long lastRadarBroadcast = 0;
unsigned long lastBatteryRead = 0;
unsigned long lastNPKQuery = 0;

// 7-in-1 NPK RS485 Modbus holding register query frame
// Query holding registers: Address 01, Read 03, Start 0000, Count 0007, CRC 0408
const byte npkQueryFrame[] = {0x01, 0x03, 0x00, 0x00, 0x00, 0x07, 0x04, 0x08};

// Log function that bridges Blynk terminal, Serial, and Web dashboard logs!
void LOG(String msg) {
  Serial.println(msg);
  terminal.println(msg);
  terminal.flush();
  lastLogMsg = msg;
}

// =====================================================
// NPK 7-in-1 SENSOR MODBUS QUERY
// =====================================================

void queryNPKSensor() {
  // Clear any residual bytes in hardware serial RX buffer
  while(Serial2.available() > 0) {
    Serial2.read();
  }

  // Toggle MAX485 to TRANSMIT MODE
  digitalWrite(NPK_DERE_PIN, HIGH);
  delay(5);
  
  // Send 8-byte Modbus RTU query frame
  Serial2.write(npkQueryFrame, sizeof(npkQueryFrame));
  Serial2.flush(); // wait completely for transmitting serial bytes

  // Toggle MAX485 back to RECEIVE MODE
  digitalWrite(NPK_DERE_PIN, LOW);

  // Wait for 19-byte response (3 header bytes + 14 data registers + 2 CRC bytes)
  unsigned long startWait = millis();
  while (Serial2.available() < 19 && millis() - startWait < 200) {
    delay(1);
  }

  if (Serial2.available() >= 19) {
    byte response[19];
    for (int i = 0; i < 19; i++) {
      response[i] = Serial2.read();
    }

    // response[0] = Addr, response[1] = Fun, response[2] = Len (14 bytes)
    // Decode data from register offsets
    int rawMoisture = (response[3] << 8) | response[4];
    int rawTemp     = (response[5] << 8) | response[6];
    int rawEC       = (response[7] << 8) | response[8];
    int rawPH       = (response[9] << 8) | response[10];
    int rawN        = (response[11] << 8) | response[12];
    int rawP        = (response[13] << 8) | response[14];
    int rawK        = (response[15] << 8) | response[16];

    // Check for extreme or out-of-bounds reads to safeguard values
    if (rawMoisture < 1000 && rawTemp < 1000 && rawPH <= 140) {
      soilMoisture = rawMoisture * 0.1;
      soilTemp     = rawTemp * 0.1;
      soilEC       = rawEC;
      soilPH       = rawPH * 0.1;
      soilN        = rawN;
      soilP        = rawP;
      soilK        = rawK;

      LOG("NPK: N:" + String(soilN) + " P:" + String(soilP) + " K:" + String(soilK) + " pH:" + String(soilPH, 1));
      
      // Update Blynk Virtual Pins with real soil data
      Blynk.virtualWrite(V20, soilN);
      Blynk.virtualWrite(V21, soilP);
      Blynk.virtualWrite(V22, soilK);
      Blynk.virtualWrite(V23, soilPH);
      Blynk.virtualWrite(V24, soilMoisture);
      Blynk.virtualWrite(V25, soilTemp);
    }
  } else {
    // Debug log warning
    Serial.println("NPK: Sensor Offline / Timeout waiting for RS485 packet");
  }
}

// =====================================================
// ANALOG BATTERY VOLTAGE MONITOR
// =====================================================

void readBatteryLevel() {
  int rawADC = analogRead(BATTERY_ADC_PIN);
  
  if (rawADC == 0) {
    // If ADC pin reads 0 (no voltage divider wired), keep safe default
    batteryLevel = 100;
    return;
  }

  // Calculate real battery voltage
  // Conversion: rawADC (0-4095) mapped to 3.3V ADC reference.
  // Resistors: 10K/10K voltage divider splits voltage by 2.0.
  double measuredVoltage = (rawADC / 4095.0) * 3.3 * 2.0;

  // Scale measured voltage to standard 2S Lithium battery pack (6.4V discharged - 8.4V fully charged)
  double percentage = ((measuredVoltage - 6.4) / (8.4 - 6.4)) * 100.0;
  
  if (percentage > 100.0) percentage = 100.0;
  if (percentage < 0.0)   percentage = 0.0;

  batteryLevel = (int)percentage;
}

// =====================================================
// GPS MATH (Haversine Formula)
// =====================================================

double getDistanceM(double lat1, double lon1, double lat2, double lon2) {
  const double R = 6371000.0;
  double dLat = radians(lat2 - lat1);
  double dLon = radians(lon2 - lon1);
  double a = sin(dLat / 2) * sin(dLat / 2) +
             cos(radians(lat1)) * cos(radians(lat2)) *
             sin(dLon / 2) * sin(dLon / 2);
  return R * 2.0 * atan2(sqrt(a), sqrt(1.0 - a));
}

double getBearing(double lat1, double lon1, double lat2, double lon2) {
  double dLon = radians(lon2 - lon1);
  double y    = sin(dLon) * cos(radians(lat2));
  double x    = cos(radians(lat1)) * sin(radians(lat2)) -
                sin(radians(lat1)) * cos(radians(lat2)) * cos(dLon);
  return fmod((degrees(atan2(y, x)) + 360.0), 360.0);
}

// =====================================================
// GPS NAVIGATION ROUTINE
// =====================================================

void navigateTo(double tLat, double tLon) {
  const double ARRIVAL_THRESHOLD_M = 2.0;
  const double HEADING_TOLERANCE_DEG = 20.0;

  if (!gps.location.isValid()) {
    LOG("NAV: No GPS fix");
    motors.stop();
    return;
  }

  if (obstacleDetected) {
    motors.stop();
    return;
  }

  double distToTarget = getDistanceM(currentLat, currentLon, tLat, tLon);

  // ===== ARRIVAL =====
  if (distToTarget <= ARRIVAL_THRESHOLD_M) {
    LOG("NAV: *** TARGET REACHED ***");
    motors.stop();
    digitalWrite(BUZZER_PIN, HIGH); delay(400); digitalWrite(BUZZER_PIN, LOW);
    delay(200);
    digitalWrite(BUZZER_PIN, HIGH); delay(400); digitalWrite(BUZZER_PIN, LOW);

    if (returnHome) {
      returnHome = false;
      autoMode   = false;
      digitalWrite(LED_PIN, LOW);
      Blynk.virtualWrite(V10, 0);
      Blynk.virtualWrite(V14, 0);
      LOG("NAV: HOME REACHED. Auto OFF.");
    }
    return;
  }

  // ===== HEADING =====
  double required   = getBearing(currentLat, currentLon, tLat, tLon);
  bool   hasHeading = (gps.course.isValid() && gps.speed.kmph() > 0.3);

  if (!hasHeading) {
    motors.moveForward();
    return;
  }

  double error = required - gps.course.deg();
  if (error >  180.0) error -= 360.0;
  if (error < -180.0) error += 360.0;

  LOG("D:" + String(distToTarget, 1) + "m B:" + String(required, 1) +
      " H:" + String(gps.course.deg(), 1) + " E:" + String(error, 1));

  if (abs(error) <= HEADING_TOLERANCE_DEG) {
    motors.moveForward();
  } else if (error > 0) {
    motors.turnRight();
  } else {
    motors.turnLeft();
  }
}

// =====================================================
// BLYNK MANUAL CONTROL HANDLERS
// =====================================================

BLYNK_WRITE(V0) {
  if (!autoMode) { if (param.asInt()) motors.moveForward(); else motors.stop(); }
}
BLYNK_WRITE(V1) {
  if (!autoMode) { if (param.asInt()) motors.moveBackward(); else motors.stop(); }
}
BLYNK_WRITE(V2) {
  if (!autoMode) { if (param.asInt()) motors.turnLeft(); else motors.stop(); }
}
BLYNK_WRITE(V3) {
  if (!autoMode) { if (param.asInt()) motors.turnRight(); else motors.stop(); }
}
BLYNK_WRITE(V5) {
  if (param.asInt()) {
    motors.deployProbe();
    probeState = "deploying";
  } else {
    motors.stopProbe();
    probeState = "stopped";
  }
}
BLYNK_WRITE(V6) {
  if (param.asInt()) {
    motors.retractProbe();
    probeState = "retracting";
  } else {
    motors.stopProbe();
    probeState = "stopped";
  }
}

// =====================================================
// BLYNK AUTO CONTROL HANDLERS
// =====================================================

BLYNK_WRITE(V10) {
  autoMode = param.asInt();
  if (autoMode) {
    LOG("MODE: AUTO ON");
    digitalWrite(LED_PIN, HIGH);
    Blynk.virtualWrite(V14, 255);
    if (!homeSaved && gps.location.isValid()) {
      homeLat   = currentLat;
      homeLon   = currentLon;
      homeSaved = true;
      LOG("HOME: " + String(homeLat, 6) + ", " + String(homeLon, 6));
    }
    returnHome = false;
  } else {
    LOG("MODE: MANUAL");
    digitalWrite(LED_PIN, LOW);
    Blynk.virtualWrite(V14, 0);
    motors.stop();
    returnHome = false;
  }
}

BLYNK_WRITE(V11) {
  targetLat = atof(param.asStr());
  LOG("TARGET Lat: " + String(targetLat, 6));
}

BLYNK_WRITE(V12) {
  targetLon = atof(param.asStr());
  LOG("TARGET Lon: " + String(targetLon, 6));
}

BLYNK_WRITE(V13) {
  if (param.asInt()) {
    if (!homeSaved) { LOG("HOME: Not saved yet!"); return; }
    returnHome = true;
    autoMode   = true;
    digitalWrite(LED_PIN, HIGH);
    Blynk.virtualWrite(V14, 255);
    LOG("MODE: RETURN HOME");
  }
}

// =====================================================
// FIRMWARE SETUP
// =====================================================

void setup() {
  Serial.begin(115200);
  Serial.println("Starting AgriSync ESP32 Rover...");

  // Initialize LED & Buzzer
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // Initialize MAX485 Pin
  pinMode(NPK_DERE_PIN, OUTPUT);
  digitalWrite(NPK_DERE_PIN, LOW);

  // Initialize components
  radar.init();
  motors.init();
  
  // Set up GPS serial connection
  GPSserial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

  // Set up NPK Serial2 connection
  Serial2.begin(9600, SERIAL_8N1, NPK_RX_PIN, NPK_TX_PIN);

  // Set up 12-bit ADC battery analog resolution
  analogReadResolution(12);

  // Start HTTP / WebSocket servers
  webServer.init();

  // Initialize Blynk Connection
  Blynk.begin(BLYNK_AUTH_TOKEN, WIFI_SSID, WIFI_PASS);

  LOG("=== EL ROVER READY ===");
}

// =====================================================
// MAIN EVENT LOOP
// =====================================================

void loop() {
  // Process Blynk events
  Blynk.run();

  // Maintain WebSocket cleanup
  webServer.loop();

  // Continuously sweep servo & measure distance
  radar.update();

  // Parse GPS NMEA sentences
  while (GPSserial.available() > 0) {
    gps.encode(GPSserial.read());
  }

  // Update obstacle flag & trigger buzzer warning
  bool obstacleNow = radar.isObstacleDetected();
  if (obstacleNow) {
    if (!obstacleDetected) {
      LOG("OBSTACLE: " + String(radar.getCurrentDistance()) + " cm");
    }
    obstacleDetected = true;
    digitalWrite(BUZZER_PIN, HIGH);
  } else {
    obstacleDetected = false;
    digitalWrite(BUZZER_PIN, LOW);
  }

  // Query RS485 Modbus NPK sensor every 3 seconds
  unsigned long now = millis();
  if (now - lastNPKQuery >= 3000) {
    lastNPKQuery = now;
    queryNPKSensor();
  }

  // Monitor analog battery levels every 5 seconds
  if (now - lastBatteryRead >= 5000) {
    lastBatteryRead = now;
    readBatteryLevel();
  }

  // Handle GPS location tracking & autonomous navigation
  if (gps.location.isValid()) {
    currentLat = gps.location.lat();
    currentLon = gps.location.lng();
    gpsSatellites = gps.satellites.value();
    gpsSpeed = gps.speed.kmph();

    if (now - lastGPSSend >= 2000) {
      lastGPSSend = now;
      Blynk.virtualWrite(V8, currentLat);
      Blynk.virtualWrite(V9, currentLon);

      // GPS telemetry log
      LOG("GPS " + String(currentLat, 5) + "," + String(currentLon, 5) +
          " S:" + String(gpsSatellites) +
          " " + String(gpsSpeed, 1) + "kmh");

      if (autoMode) {
        if (returnHome)
          navigateTo(homeLat, homeLon);
        else if (targetLat != 0.0 && targetLon != 0.0)
          navigateTo(targetLat, targetLon);
        else {
          LOG("AUTO: No target set");
          motors.stop();
        }
      }
    }
  } else {
    static unsigned long lastWait = 0;
    if (now - lastWait > 3000) {
      lastWait = now;
      gpsSatellites = gps.satellites.value();
      gpsSpeed = 0.0;
      LOG("GPS: Waiting... Sats:" + String(gpsSatellites));
    }
    if (autoMode) motors.stop();
  }

  // Broadcast unified telemetry to Web Dashboard clients every 150ms
  if (now - lastRadarBroadcast > 150) {
    lastRadarBroadcast = now;
    webServer.broadcastTelemetry();
  }
}
