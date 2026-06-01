#include "RadarSensor.h"
#include "../config.h"

void RadarSensor::init() {
    pinMode(RADAR_TRIG_PIN, OUTPUT);
    pinMode(RADAR_ECHO_PIN, INPUT);
    
    scanServo.attach(RADAR_SERVO_PIN);
    delay(500);
    scanServo.write(90);
    delay(300);
    
    currentAngle = 90;
    direction = 1; // 1 = sweeping up, -1 = sweeping down
    currentDistance = 100;
    lastSweepTime = millis();
}

void RadarSensor::update() {
    if (millis() - lastSweepTime >= RADAR_SWEEP_SPEED) {
        lastSweepTime = millis();
        
        // Update angle using 2-degree increments matching user's sketch
        currentAngle += (direction * 2);
        
        if (currentAngle >= 145) {
            currentAngle = 145;
            direction = -1;
        } else if (currentAngle <= 30) {
            currentAngle = 30;
            direction = 1;
        }

        scanServo.write(currentAngle);
        currentDistance = measureDistance();
    }
}

int RadarSensor::measureDistance() {
    digitalWrite(RADAR_TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(RADAR_TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(RADAR_TRIG_PIN, LOW);
    
    long duration = pulseIn(RADAR_ECHO_PIN, HIGH, 30000); // 30ms timeout
    if (duration == 0) return -1;
    
    float distance = duration * 0.034 / 2;
    return (int)distance;
}

int RadarSensor::getCurrentAngle() {
    return currentAngle;
}

int RadarSensor::getCurrentDistance() {
    return currentDistance;
}

bool RadarSensor::isObstacleDetected() {
    // If distance is between 0 and 45cm (based on OBSTACLE_DISTANCE_CM = 45.0)
    return (currentDistance > 0 && currentDistance < 45);
}
