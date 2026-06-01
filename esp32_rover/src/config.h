#ifndef CONFIG_H
#define CONFIG_H

// Blynk Credentials
#define BLYNK_TEMPLATE_ID   "TMPL3p-g0Zu0R"
#define BLYNK_TEMPLATE_NAME "EL ROVER"
#define BLYNK_AUTH_TOKEN    "GqAdo3IkAUkp46L-0_kNr2vZpdBsulkX"

// WiFi Credentials
#define WIFI_SSID "ESP_TEST"
#define WIFI_PASS "12345678"
#define AP_MODE false // Set to false to connect to WIFI_SSID, true to create softAP

// Motor Control Pins (L298N)
#define IN1 26
#define IN2 27
#define IN3 14
#define IN4 12
#define ENA 25
#define ENB 33

// Linear Actuator Probe Pins
#define AIN1 18
#define AIN2 19

// LED Pin
#define LED_PIN 2

// Ultrasonic Sensor Pins
#define RADAR_TRIG_PIN 23
#define RADAR_ECHO_PIN 34

// Buzzer Pin
#define BUZZER_PIN 22

// Servo Pin
#define RADAR_SERVO_PIN 13

// GPS Hardware Serial Pins (HardwareSerial 1)
#define GPS_RX_PIN 4
#define GPS_TX_PIN 5
#define GPS_BAUD 9600

// Web Server Ports
#define HTTP_PORT 80
#define WS_PORT 81

#endif // CONFIG_H
