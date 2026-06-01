#include "MotorControl.h"
#include "../config.h"

void MotorControl::init() {
    pinMode(IN1, OUTPUT);
    pinMode(IN2, OUTPUT);
    pinMode(IN3, OUTPUT);
    pinMode(IN4, OUTPUT);
    pinMode(ENA, OUTPUT);
    pinMode(ENB, OUTPUT);
    
    pinMode(AIN1, OUTPUT);
    pinMode(AIN2, OUTPUT);
    
    stop();
    stopProbe();
}

void MotorControl::moveForward() {
    digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
    digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
    digitalWrite(ENA, HIGH); digitalWrite(ENB, HIGH);
    Serial.println("Moving Forward");
}

void MotorControl::moveBackward() {
    digitalWrite(IN1, LOW);  digitalWrite(IN2, HIGH);
    digitalWrite(IN3, LOW);  digitalWrite(IN4, HIGH);
    digitalWrite(ENA, HIGH); digitalWrite(ENB, HIGH);
    Serial.println("Moving Backward");
}

void MotorControl::turnLeft() {
    digitalWrite(IN1, LOW);  digitalWrite(IN2, LOW);
    digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
    digitalWrite(ENA, LOW);  digitalWrite(ENB, HIGH);
    Serial.println("Turning Left");
}

void MotorControl::turnRight() {
    digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
    digitalWrite(IN3, LOW);  digitalWrite(IN4, LOW);
    digitalWrite(ENA, HIGH); digitalWrite(ENB, LOW);
    Serial.println("Turning Right");
}

void MotorControl::stop() {
    digitalWrite(IN1, LOW); digitalWrite(IN2, LOW);
    digitalWrite(IN3, LOW); digitalWrite(IN4, LOW);
    digitalWrite(ENA, LOW); digitalWrite(ENB, LOW);
    Serial.println("Stopped");
}

void MotorControl::deployProbe() {
    digitalWrite(AIN1, HIGH); digitalWrite(AIN2, LOW);
    Serial.println("Probe Deploying");
}

void MotorControl::retractProbe() {
    digitalWrite(AIN1, LOW);  digitalWrite(AIN2, HIGH);
    Serial.println("Probe Retracting");
}

void MotorControl::stopProbe() {
    digitalWrite(AIN1, LOW);  digitalWrite(AIN2, LOW);
    Serial.println("Probe Stopped");
}
