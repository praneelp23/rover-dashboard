#ifndef RADAR_SENSOR_H
#define RADAR_SENSOR_H

#include <Arduino.h>
#include <ESP32Servo.h>

class RadarSensor {
public:
    void init();
    void update();
    int getCurrentAngle();
    int getCurrentDistance();
    bool isObstacleDetected();

private:
    int currentAngle;
    int direction;
    int currentDistance;
    unsigned long lastSweepTime;
    
    Servo scanServo;
    int measureDistance();
};

#endif // RADAR_SENSOR_H
