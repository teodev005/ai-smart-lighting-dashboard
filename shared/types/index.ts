/**
 * Shared types between Backend and Frontend for AI Smart Lighting
 */

export type ControlMode = 'AUTO' | 'MANUAL' | 'AI';
export type FanMode = 'OFF' | 'MANUAL' | 'AUTO';

export type AvailabilityStatus = 'online' | 'offline' | 'unknown';

export type ConnectionStatus =
  | 'disconnected_server'    // Chưa kết nối máy chủ
  | 'connecting_broker'      // Đang kết nối broker MQTT
  | 'waiting_esp32'          // Đã kết nối broker, đang chờ ESP32
  | 'online'                 // ESP32 trực tuyến (online + telemetry <= 10s)
  | 'stale_data'             // Mất dữ liệu từ ESP32 (> 10s)
  | 'offline';               // ESP32 ngoại tuyến (LWT offline)

export interface TelemetryData {
  deviceId: string;
  mode: ControlMode;
  adc: number;          // 0 - 4095
  darkness: number;     // 0 - 100 (%)
  motion: boolean;      // PIR motion output
  presence: boolean;    // Presence inferred from motion in firmware
  temperature: number;  // °C
  humidity: number;     // %
  pwmCurrent: number;   // 0 - 255
  pwmTarget: number;    // 0 - 255
  manualPwm: number;    // 0 - 255
  brightness: number;   // 0 - 100 (%)
  aiSamples: number;    // Number of AI samples
  aiClasses: number;    // Number of AI classes (target: 5)
  fanMode: FanMode;
  fanPercent: number;
  fanTargetPercent: number;
  fanManualPercent: number;
  fanPwm: number;
  fanReason: string;
  dhtValid: boolean;
  uptimeMs: number;     // ESP32 uptime in ms
  deskLampPwm: number;  // Desk lamp PWM (~70% of ceiling light)
  receivedAt: number;   // Timestamp ms when backend processed
  isRetained?: boolean; // Whether the MQTT message had retained flag
}

export interface Device {
  deviceId: string;
  broker: string;
  port: number;
  wss?: string;
  pairedAt: number;
  name?: string;
  availability: AvailabilityStatus;
  lastAvailabilityTime?: number;
  lastTelemetry?: TelemetryData;
  lastTelemetryTime?: number;
}

export interface PairingPayload {
  v: number;
  deviceId: string;
  broker: string;
  port: number;
  wss?: string;
}

export interface PairingRequest {
  code: string;
}

export interface PairingResult {
  success: boolean;
  message: string;
  device?: Device;
  error?: string;
}

export interface ModeCommandRequest {
  mode: ControlMode;
}

export interface BrightnessCommandRequest {
  brightness: number; // 0 - 100 (%) or PWM 0 - 255
}

export interface FanModeCommandRequest { mode: FanMode; }
export interface FanSpeedCommandRequest { speed: number; }

export interface MqttStatusPayload {
  connected: boolean;
  broker: string;
  error?: string;
}

export interface CommandResultPayload {
  deviceId: string;
  command: 'mode' | 'brightness' | 'fan-mode' | 'fan-speed' | 'ai-reset';
  success: boolean;
  message: string;
  value?: unknown;
}

export type WebSocketMessage =
  | { type: 'mqtt-status'; payload: MqttStatusPayload }
  | { type: 'device-availability'; payload: { deviceId: string; availability: AvailabilityStatus; timestamp: number } }
  | { type: 'device-telemetry'; payload: { deviceId: string; telemetry: TelemetryData } }
  | { type: 'device-timeout'; payload: { deviceId: string; reason: string; lastSeenMs: number } }
  | { type: 'pairing-status'; payload: { code: string; status: 'listening' | 'success' | 'failed' | 'timeout'; message: string; device?: Device } }
  | { type: 'command-result'; payload: CommandResultPayload }
  | { type: 'devices-list'; payload: { devices: Device[]; activeDeviceId: string | null } };
