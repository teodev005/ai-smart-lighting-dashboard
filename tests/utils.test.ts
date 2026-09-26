import { describe, it, expect } from 'vitest';
import {
  validatePairingCode,
  validateDeviceId,
  percentToPwm,
  pwmToPercent,
  parseTelemetry,
  calculateConnectionState,
  formatUptime
} from '../shared/utils/converters.js';

describe('Pairing Code Validation', () => {
  it('should accept valid 6-digit codes', () => {
    expect(validatePairingCode('123456').valid).toBe(true);
    expect(validatePairingCode('000000').valid).toBe(true);
    expect(validatePairingCode('987654').valid).toBe(true);
  });

  it('should reject codes with non-digit or wrong length', () => {
    expect(validatePairingCode('12345').valid).toBe(false);
    expect(validatePairingCode('1234567').valid).toBe(false);
    expect(validatePairingCode('12345a').valid).toBe(false);
    expect(validatePairingCode('').valid).toBe(false);
    expect(validatePairingCode(null).valid).toBe(false);
    expect(validatePairingCode(123456).valid).toBe(false);
  });
});

describe('Device ID Validation', () => {
  it('should accept valid deviceIds', () => {
    expect(validateDeviceId('esp32-1234abcd')).toBe(true);
    expect(validateDeviceId('esp32_demo_1')).toBe(true);
    expect(validateDeviceId('ESP32-DEV')).toBe(true);
  });

  it('should reject invalid deviceIds', () => {
    expect(validateDeviceId('ab')).toBe(false); // too short
    expect(validateDeviceId('esp32/invalid')).toBe(false);
    expect(validateDeviceId('')).toBe(false);
    expect(validateDeviceId(undefined)).toBe(false);
  });
});

describe('Percentage to PWM conversion', () => {
  it('should correctly map specified percentage anchors to PWM values', () => {
    expect(percentToPwm(0)).toBe(0);
    expect(percentToPwm(25)).toBe(64);
    expect(percentToPwm(50)).toBe(128);
    expect(percentToPwm(75)).toBe(191);
    expect(percentToPwm(100)).toBe(255);
  });

  it('should clamp out-of-range values', () => {
    expect(percentToPwm(-10)).toBe(0);
    expect(percentToPwm(150)).toBe(255);
  });

  it('should reverse PWM to percentage accurately', () => {
    expect(pwmToPercent(0)).toBe(0);
    expect(pwmToPercent(64)).toBe(25);
    expect(pwmToPercent(128)).toBe(50);
    expect(pwmToPercent(191)).toBe(75);
    expect(pwmToPercent(255)).toBe(100);
  });
});

describe('Telemetry Parser', () => {
  const validSample = {
    deviceId: 'esp32-1234abcd',
    mode: 'AUTO',
    adc: 2048,
    darkness: 50,
    motion: true,
    presence: true,
    temperature: 28.5,
    humidity: 70,
    pwmCurrent: 128,
    pwmTarget: 128,
    manualPwm: 128,
    brightness: 50,
    aiSamples: 15,
    aiClasses: 5,
    uptimeMs: 123456
  };

  it('should parse valid telemetry json string', () => {
    const parsed = parseTelemetry(JSON.stringify(validSample));
    expect(parsed).not.toBeNull();
    expect(parsed?.deviceId).toBe('esp32-1234abcd');
    expect(parsed?.mode).toBe('AUTO');
    expect(parsed?.deskLampPwm).toBe(90); // 128 * 0.7 = 89.6 -> 90
    expect(parsed?.motion).toBe(true);
    expect(parsed?.presence).toBe(true);
  });

  it('should reject malformed or missing fields', () => {
    expect(parseTelemetry('{ invalid json')).toBeNull();
    expect(parseTelemetry({ ...validSample, mode: 'INVALID_MODE' })).toBeNull();
    expect(parseTelemetry({ ...validSample, adc: 99999 })).toBeNull();
    expect(parseTelemetry({ ...validSample, brightness: -5 })).toBeNull();
    expect(parseTelemetry(null)).toBeNull();
  });
});

describe('Connection & Timeout Status Calculation', () => {
  const now = 1000000;

  it('should return disconnected_server if client is not connected to server', () => {
    expect(calculateConnectionState(false, true, 'online', now, now)).toBe('disconnected_server');
  });

  it('should return connecting_broker if backend is disconnected from MQTT', () => {
    expect(calculateConnectionState(true, false, 'online', now, now)).toBe('connecting_broker');
  });

  it('should return offline if availability is offline', () => {
    expect(calculateConnectionState(true, true, 'offline', now, now)).toBe('offline');
  });

  it('should return waiting_esp32 if availability online but no telemetry yet', () => {
    expect(calculateConnectionState(true, true, 'online', undefined, now)).toBe('waiting_esp32');
  });

  it('should return online if telemetry received within 10s', () => {
    expect(calculateConnectionState(true, true, 'online', now - 5000, now)).toBe('online');
    expect(calculateConnectionState(true, true, 'online', now - 10000, now)).toBe('online');
  });

  it('should return stale_data if telemetry older than 10s', () => {
    expect(calculateConnectionState(true, true, 'online', now - 10001, now)).toBe('stale_data');
    expect(calculateConnectionState(true, true, 'online', now - 20000, now)).toBe('stale_data');
  });
});

describe('Format Uptime', () => {
  it('formats ms to Vietnamese time string', () => {
    expect(formatUptime(45000)).toBe('45 giây');
    expect(formatUptime(125000)).toBe('2 phút 5 giây');
    expect(formatUptime(3665000)).toBe('1 giờ 1 phút 5 giây');
  });
});
