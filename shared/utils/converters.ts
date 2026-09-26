import {
  AvailabilityStatus,
  ConnectionStatus,
  ControlMode,
  TelemetryData,
} from '../types/index.js';

/**
 * Validates a 6-digit numeric pairing code.
 */
export function validatePairingCode(code: unknown): { valid: boolean; error?: string } {
  if (typeof code !== 'string') {
    return { valid: false, error: 'Mã ghép nối phải là chuỗi ký tự.' };
  }
  const trimmed = code.trim();
  if (!/^\d{6}$/.test(trimmed)) {
    return { valid: false, error: 'Mã ghép nối phải gồm đúng 6 chữ số (0-9).' };
  }
  return { valid: true };
}

/**
 * Validates device ID according to [A-Za-z0-9_-]{3,48}
 */
export function validateDeviceId(deviceId: unknown): boolean {
  if (typeof deviceId !== 'string') return false;
  return /^[A-Za-z0-9_-]{3,48}$/.test(deviceId.trim());
}

/**
 * Converts percentage (0-100) to PWM duty cycle integer (0-255).
 * Specific test points:
 * 0%   -> 0
 * 25%  -> 64
 * 50%  -> 128
 * 75%  -> 191
 * 100% -> 255
 */
export function percentToPwm(percent: number): number {
  if (typeof percent !== 'number' || isNaN(percent)) return 0;
  const clamped = Math.max(0, Math.min(100, percent));
  // Exact mapping for specified anchors
  if (clamped === 0) return 0;
  if (clamped === 25) return 64;
  if (clamped === 50) return 128;
  if (clamped === 75) return 191;
  if (clamped === 100) return 255;
  return Math.round((clamped / 100) * 255);
}

/**
 * Converts PWM duty cycle integer (0-255) to percentage (0-100).
 */
export function pwmToPercent(pwm: number): number {
  if (typeof pwm !== 'number' || isNaN(pwm)) return 0;
  const clamped = Math.max(0, Math.min(255, pwm));
  return Math.round((clamped / 255) * 100);
}

/**
 * Parses and strictly validates incoming ESP32 telemetry JSON payload.
 * Returns null if the payload is malformed or invalid.
 */
export function parseTelemetry(raw: unknown, isRetained: boolean = false): TelemetryData | null {
  if (!raw) return null;

  let obj: Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      return null;
    }
  } else if (typeof raw === 'object') {
    obj = raw as Record<string, unknown>;
  } else {
    return null;
  }

  // Validate deviceId
  if (!validateDeviceId(obj.deviceId)) {
    return null;
  }

  // Validate mode
  const validModes: ControlMode[] = ['AUTO', 'MANUAL', 'AI'];
  if (typeof obj.mode !== 'string' || !validModes.includes(obj.mode as ControlMode)) {
    return null;
  }

  // Validate numbers
  const adc = Number(obj.adc);
  const darkness = Number(obj.darkness);
  const temperature = Number(obj.temperature);
  const humidity = Number(obj.humidity);
  const pwmCurrent = Number(obj.pwmCurrent);
  const pwmTarget = Number(obj.pwmTarget);
  const manualPwm = Number(obj.manualPwm);
  const brightness = Number(obj.brightness);
  const aiSamples = Number(obj.aiSamples);
  const aiClasses = Number(obj.aiClasses);
  const uptimeMs = Number(obj.uptimeMs);

  if (
    isNaN(adc) || adc < 0 || adc > 4095 ||
    isNaN(darkness) || darkness < 0 || darkness > 100 ||
    isNaN(temperature) ||
    isNaN(humidity) || humidity < 0 || humidity > 100 ||
    isNaN(pwmCurrent) || pwmCurrent < 0 || pwmCurrent > 255 ||
    isNaN(pwmTarget) || pwmTarget < 0 || pwmTarget > 255 ||
    isNaN(manualPwm) || manualPwm < 0 || manualPwm > 255 ||
    isNaN(brightness) || brightness < 0 || brightness > 100 ||
    isNaN(aiSamples) || aiSamples < 0 ||
    isNaN(aiClasses) || aiClasses < 0 ||
    isNaN(uptimeMs) || uptimeMs < 0
  ) {
    return null;
  }

  // Validate booleans
  const motion = Boolean(obj.motion);
  const presence = Boolean(obj.presence);

  // Compute desk lamp PWM (~70% of ceiling light PWM in firmware)
  const deskLampPwm = Math.round(pwmCurrent * 0.7);

  return {
    deviceId: String(obj.deviceId).trim(),
    mode: obj.mode as ControlMode,
    adc: Math.round(adc),
    darkness: Math.round(darkness),
    motion,
    presence,
    temperature: Math.round(temperature * 10) / 10,
    humidity: Math.round(humidity * 10) / 10,
    pwmCurrent: Math.round(pwmCurrent),
    pwmTarget: Math.round(pwmTarget),
    manualPwm: Math.round(manualPwm),
    brightness: Math.round(brightness),
    aiSamples: Math.round(aiSamples),
    aiClasses: Math.round(aiClasses),
    uptimeMs: Math.round(uptimeMs),
    deskLampPwm,
    receivedAt: Date.now(),
    isRetained,
  };
}

/**
 * Calculates current connection status based on 5 strict states:
 * 1. Chưa kết nối máy chủ (serverConnected === false)
 * 2. Đang kết nối broker / Đã kết nối broker, đang chờ ESP32
 * 3. ESP32 ngoại tuyến (availability === 'offline')
 * 4. ESP32 trực tuyến (availability === 'online' && telemetry <= 10s)
 * 5. Mất dữ liệu từ ESP32 (availability === 'online' && telemetry > 10s)
 */
export function calculateConnectionState(
  serverConnected: boolean,
  mqttConnected: boolean,
  availability: AvailabilityStatus,
  lastTelemetryTime?: number,
  now: number = Date.now(),
  telemetryTimeoutMs: number = 10000
): ConnectionStatus {
  if (!serverConnected) {
    return 'disconnected_server';
  }
  if (!mqttConnected) {
    return 'connecting_broker';
  }
  if (availability === 'offline') {
    return 'offline';
  }
  if (!lastTelemetryTime) {
    return 'waiting_esp32';
  }
  const elapsed = now - lastTelemetryTime;
  if (availability === 'online') {
    if (elapsed <= telemetryTimeoutMs) {
      return 'online';
    }
    return 'stale_data';
  }
  return 'waiting_esp32';
}

/**
 * Formats uptime in milliseconds to a human-readable Vietnamese string.
 */
export function formatUptime(uptimeMs: number): string {
  if (!uptimeMs || uptimeMs < 0) return '0 giây';
  const totalSeconds = Math.floor(uptimeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} giờ`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes} phút`);
  parts.push(`${seconds} giây`);
  return parts.join(' ');
}
