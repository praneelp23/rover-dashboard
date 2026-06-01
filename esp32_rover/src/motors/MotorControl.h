#ifndef MOTOR_CONTROL_H
#define MOTOR_CONTROL_H

#include <Arduino.h>

class MotorControl {
public:
    void init();
    void moveForward();
    void moveBackward();
    void turnLeft();
    void turnRight();
    void stop();
    
    // Linear Probe Actuator Controls
    void deployProbe();
    void retractProbe();
    void stopProbe();
};

#endif // MOTOR_CONTROL_H
