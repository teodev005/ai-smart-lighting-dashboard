import mqtt, { MqttClient, IConnackPacket, IPublishPacket } from 'mqtt';
import { DeviceStorage } from '../database/storage.js';
import { WebSocketManager } from '../websocket/ws-manager.js';
import {
  Device,
  ControlMode,
  FanMode,
  AvailabilityStatus,
  PairingPayload
} from '../../../shared/types/index.js';
import {
  parseTelemetry,
  validateDeviceId,
  validatePairingCode,
  percentToPwm
} from '../../../shared/utils/converters.js';

interface ActivePairingSession {
  code: string;
  topic: string;
  timer: NodeJS.Timeout;
  resolve: (device: Device) => void;
  reject: (reason: Error) => void;
}

export class MqttManager {
  private client: MqttClient | null = null;
  private isConnected: boolean = false;
  private brokerUrl: string;
  private storage: DeviceStorage;
  private wsManager: WebSocketManager;
  private activePairings: Map<string, ActivePairingSession> = new Map();
  private timeoutCheckTimer: NodeJS.Timeout | null = null;
  private readonly telemetryTimeoutMs: number = 10000;

  constructor(storage: DeviceStorage, wsManager: WebSocketManager) {
    this.storage = storage;
    this.wsManager = wsManager;
    this.brokerUrl = process.env.MQTT_BROKER || 'mqtt://broker.emqx.io:1883';
    this.telemetryTimeoutMs = Number(process.env.TELEMETRY_TIMEOUT_MS) || 10000;
  }

  public init() {
    console.log(`[MQTT] Đang kết nối tới broker: ${this.brokerUrl}`);

    const clientId = `smart-lighting-web-backend-${Math.random().toString(16).substring(2, 10)}`;

    this.client = mqtt.connect(this.brokerUrl, {
      clientId,
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: 3000,
      keepalive: 30,
    });

    this.client.on('connect', (packet: IConnackPacket) => {
      this.isConnected = true;
      console.log(`[MQTT] Đã kết nối thành công tới broker: ${this.brokerUrl}`);
      this.wsManager.broadcast({
        type: 'mqtt-status',
        payload: {
          connected: true,
          broker: this.brokerUrl,
        },
      });

      // Subscribe to all currently saved devices
      this.subscribeAllStoredDevices();
    });

    this.client.on('reconnect', () => {
      console.log('[MQTT] Đang thử kết nối lại tới broker...');
      this.wsManager.broadcast({
        type: 'mqtt-status',
        payload: {
          connected: false,
          broker: this.brokerUrl,
          error: 'Đang kết nối lại tới broker MQTT...',
        },
      });
    });

    this.client.on('offline', () => {
      this.isConnected = false;
      console.warn('[MQTT] Mất kết nối tới broker MQTT (offline)');
      this.wsManager.broadcast({
        type: 'mqtt-status',
        payload: {
          connected: false,
          broker: this.brokerUrl,
          error: 'Mất kết nối tới broker MQTT',
        },
      });
    });

    this.client.on('error', (err) => {
      console.error('[MQTT] Lỗi kết nối MQTT:', err.message);
      this.wsManager.broadcast({
        type: 'mqtt-status',
        payload: {
          connected: this.isConnected,
          broker: this.brokerUrl,
          error: err.message,
        },
      });
    });

    this.client.on('message', (topic: string, message: Buffer, packet: IPublishPacket) => {
      this.handleIncomingMessage(topic, message, packet);
    });

    // Start background telemetry timeout watchdog (checks every 1 second)
    this.startWatchdog();
  }

  private startWatchdog() {
    if (this.timeoutCheckTimer) {
      clearInterval(this.timeoutCheckTimer);
    }

    this.timeoutCheckTimer = setInterval(() => {
      const now = Date.now();
      const devices = this.storage.getAll();

      for (const dev of devices) {
        // If device was online, but telemetry is older than telemetryTimeoutMs
        if (dev.availability === 'online' && dev.lastTelemetryTime) {
          const elapsed = now - dev.lastTelemetryTime;
          if (elapsed > this.telemetryTimeoutMs) {
            this.wsManager.broadcast({
              type: 'device-timeout',
              payload: {
                deviceId: dev.deviceId,
                reason: `Không nhận được telemetry mới trong ${Math.round(elapsed / 1000)} giây`,
                lastSeenMs: elapsed,
              },
            });
          }
        }
      }
    }, 1000);
  }

  private subscribeAllStoredDevices() {
    if (!this.client || !this.isConnected) return;
    const devices = this.storage.getAll();
    for (const dev of devices) {
      this.subscribeDeviceTopics(dev.deviceId);
    }
  }

  public subscribeDeviceTopics(deviceId: string) {
    if (!this.client || !this.isConnected) return;
    const availTopic = `ai-smart-lighting/${deviceId}/availability`;
    const teleTopic = `ai-smart-lighting/${deviceId}/telemetry`;

    this.client.subscribe([availTopic, teleTopic], { qos: 1 }, (err) => {
      if (err) {
        console.error(`[MQTT] Lỗi subscribe thiết bị ${deviceId}:`, err.message);
      } else {
        console.log(`[MQTT] Đã subscribe: ${availTopic} & ${teleTopic}`);
      }
    });
  }

  public unsubscribeDeviceTopics(deviceId: string) {
    if (!this.client) return;
    const availTopic = `ai-smart-lighting/${deviceId}/availability`;
    const teleTopic = `ai-smart-lighting/${deviceId}/telemetry`;
    this.client.unsubscribe([availTopic, teleTopic]);
    console.log(`[MQTT] Đã unsubscribe thiết bị ${deviceId}`);
  }

  private handleIncomingMessage(topic: string, message: Buffer, packet: IPublishPacket) {
    const payloadStr = message.toString('utf-8');

    // 1. Check if topic is pairing topic: ai-smart-lighting/pair/<code>
    if (topic.startsWith('ai-smart-lighting/pair/')) {
      const parts = topic.split('/');
      if (parts.length === 3 && parts[1] === 'pair') {
        const code = parts[2];
        this.handlePairingMessage(code, payloadStr);
        return;
      }
    }

    // 2. Check if topic is device topic: ai-smart-lighting/<deviceId>/...
    if (topic.startsWith('ai-smart-lighting/')) {
      const parts = topic.split('/');
      if (parts.length === 3) {
        const deviceId = parts[1];
        const subTopic = parts[2];

        if (subTopic === 'availability') {
          this.handleAvailabilityMessage(deviceId, payloadStr);
        } else if (subTopic === 'telemetry') {
          this.handleTelemetryMessage(deviceId, payloadStr, packet.retain ?? false);
        }
      }
    }
  }

  private handleAvailabilityMessage(deviceId: string, payload: string) {
    const raw = payload.trim().toLowerCase();
    const status: AvailabilityStatus = raw === 'online' ? 'online' : 'offline';
    const now = Date.now();

    this.storage.updateRuntime(deviceId, (d) => {
      d.availability = status;
      d.lastAvailabilityTime = now;
      if (status === 'offline') {
        // If device went offline, reset lastTelemetryTime to ensure stale/offline logic is accurate
        d.lastTelemetryTime = undefined;
      }
    });

    console.log(`[MQTT] Trạng thái thiết bị [${deviceId}]: ${status}`);

    this.wsManager.broadcast({
      type: 'device-availability',
      payload: {
        deviceId,
        availability: status,
        timestamp: now,
      },
    });
  }

  private handleTelemetryMessage(deviceId: string, payload: string, isRetained: boolean) {
    const telemetry = parseTelemetry(payload, isRetained);
    if (!telemetry) {
      console.warn(`[MQTT] Bỏ qua payload telemetry không hợp lệ từ thiết bị [${deviceId}]`);
      return;
    }

    if (telemetry.deviceId !== deviceId) {
      console.warn(`[MQTT] Mismatch deviceId trong telemetry: nhận ${telemetry.deviceId} trên topic của ${deviceId}`);
      return;
    }

    const now = Date.now();

    // Critical rule: "Không được xem retained telemetry cũ là dữ liệu realtime mới"
    // If it's a retained message, we can store it as fallback data, but DO NOT update lastTelemetryTime
    // to current timestamp so it does not falsely count as a fresh live reading!
    this.storage.updateRuntime(deviceId, (d) => {
      d.lastTelemetry = telemetry;
      if (!isRetained) {
        d.lastTelemetryTime = now;
        d.availability = 'online'; // Received fresh live packet proves online
      }
    });

    // Broadcast to websocket
    this.wsManager.broadcast({
      type: 'device-telemetry',
      payload: {
        deviceId,
        telemetry,
      },
    });
  }

  private handlePairingMessage(code: string, payloadStr: string) {
    const session = this.activePairings.get(code);
    if (!session) return;

    try {
      const data: PairingPayload = JSON.parse(payloadStr);

      // Validate payload:
      // v === 1, deviceId regex [A-Za-z0-9_-]{3,48}, broker valid string, port 1-65535
      if (data.v !== 1) {
        console.warn(`[MQTT Pairing] Phiên bản ghép nối không hợp lệ: v=${data.v}`);
        return;
      }
      if (!validateDeviceId(data.deviceId)) {
        console.warn(`[MQTT Pairing] Device ID không hợp lệ: ${data.deviceId}`);
        return;
      }
      if (!data.broker || typeof data.broker !== 'string') {
        console.warn(`[MQTT Pairing] Broker không hợp lệ: ${data.broker}`);
        return;
      }
      const port = Number(data.port);
      if (isNaN(port) || port < 1 || port > 65535) {
        console.warn(`[MQTT Pairing] Cổng broker không hợp lệ: ${data.port}`);
        return;
      }

      console.log(`[MQTT Pairing] Nhận thông tin ghép nối hợp lệ từ ESP32: ${data.deviceId}`);

      // Publish ACK to ai-smart-lighting/pair/<code>/ack
      const ackTopic = `ai-smart-lighting/pair/${code}/ack`;
      this.client?.publish(
        ackTopic,
        'web',
        { qos: 1, retain: false },
        (err) => {
          if (err) {
            console.error(`[MQTT Pairing] Lỗi gửi ACK ghép nối:`, err.message);
          } else {
            console.log(`[MQTT Pairing] Đã gửi ACK tới ${ackTopic} (payload: "web")`);
          }
        }
      );

      // Save device
      const newDevice: Device = {
        deviceId: data.deviceId,
        broker: data.broker,
        port: port,
        wss: data.wss,
        pairedAt: Date.now(),
        name: `Đèn thông minh ${data.deviceId.slice(-4).toUpperCase()}`,
        availability: 'online',
        lastAvailabilityTime: Date.now(),
      };

      this.storage.save(newDevice);

      // Subscribe to device topics
      this.subscribeDeviceTopics(newDevice.deviceId);

      // Broadcast devices list update
      this.wsManager.broadcast({
        type: 'devices-list',
        payload: {
          devices: this.storage.getAll(),
          activeDeviceId: newDevice.deviceId,
        },
      });

      this.wsManager.broadcast({
        type: 'pairing-status',
        payload: {
          code,
          status: 'success',
          message: `Ghép nối thành công thiết bị ${newDevice.deviceId}!`,
          device: newDevice,
        },
      });

      // Cleanup session
      clearTimeout(session.timer);
      this.activePairings.delete(code);
      this.client?.unsubscribe(session.topic);

      session.resolve(newDevice);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[MQTT Pairing] Lỗi xử lý payload ghép nối:', errorMsg);
    }
  }

  /**
   * Initiates device pairing with 6-digit code with 15s timeout
   */
  public async pairDevice(code: string, timeoutMs: number = 15000): Promise<Device> {
    const codeValidation = validatePairingCode(code);
    if (!codeValidation.valid) {
      throw new Error(codeValidation.error || 'Mã ghép nối không hợp lệ');
    }

    if (!this.isConnected || !this.client) {
      throw new Error('Máy chủ chưa kết nối tới broker MQTT. Vui lòng thử lại sau giây lát.');
    }

    // Cancel any existing session for this code
    const existing = this.activePairings.get(code);
    if (existing) {
      clearTimeout(existing.timer);
      this.client.unsubscribe(existing.topic);
      this.activePairings.delete(code);
    }

    const pairTopic = `ai-smart-lighting/pair/${code}`;

    return new Promise<Device>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.client?.unsubscribe(pairTopic);
        this.activePairings.delete(code);
        this.wsManager.broadcast({
          type: 'pairing-status',
          payload: {
            code,
            status: 'timeout',
            message: 'Hết thời gian chờ (15 giây). Không nhận được phản hồi từ ESP32.',
          },
        });
        reject(new Error('Hết thời gian chờ (15 giây). Không nhận được tín hiệu ghép nối từ ESP32.'));
      }, timeoutMs);

      this.activePairings.set(code, {
        code,
        topic: pairTopic,
        timer,
        resolve,
        reject,
      });

      this.client?.subscribe(pairTopic, { qos: 1 }, (err) => {
        if (err) {
          clearTimeout(timer);
          this.activePairings.delete(code);
          reject(new Error(`Lỗi subscribe topic ghép nối: ${err.message}`));
        } else {
          console.log(`[MQTT Pairing] Đang lắng nghe trên ${pairTopic} trong 15s...`);
          this.wsManager.broadcast({
            type: 'pairing-status',
            payload: {
              code,
              status: 'listening',
              message: 'Đang chờ ESP32 phát tín hiệu ghép nối...',
            },
          });
        }
      });
    });
  }

  /**
   * Sends mode command to ESP32: ai-smart-lighting/<deviceId>/cmd/mode
   */
  public async sendMode(deviceId: string, mode: ControlMode): Promise<void> {
    if (!this.isConnected || !this.client) {
      throw new Error('Máy chủ chưa kết nối tới broker MQTT.');
    }
    const validModes: ControlMode[] = ['AUTO', 'MANUAL', 'AI'];
    if (!validModes.includes(mode)) {
      throw new Error(`Chế độ '${mode}' không hợp lệ. Phải là AUTO, MANUAL hoặc AI.`);
    }

    const topic = `ai-smart-lighting/${deviceId}/cmd/mode`;

    return new Promise<void>((resolve, reject) => {
      this.client?.publish(topic, mode, { qos: 1 }, (err) => {
        if (err) {
          this.wsManager.broadcast({
            type: 'command-result',
            payload: {
              deviceId,
              command: 'mode',
              success: false,
              message: `Gửi lệnh đổi chế độ thất bại: ${err.message}`,
              value: mode,
            },
          });
          reject(err);
        } else {
          this.wsManager.broadcast({
            type: 'command-result',
            payload: {
              deviceId,
              command: 'mode',
              success: true,
              message: `Đã gửi lệnh đổi chế độ sang ${mode}`,
              value: mode,
            },
          });
          resolve();
        }
      });
    });
  }

  /**
   * Sends brightness command: ai-smart-lighting/<deviceId>/cmd/brightness
   * Payload: integer 0 - 255
   */
  public async sendBrightness(deviceId: string, brightnessPercentOrPwm: number, isPwm: boolean = false): Promise<{ pwm: number; percent: number }> {
    if (!this.isConnected || !this.client) {
      throw new Error('Máy chủ chưa kết nối tới broker MQTT.');
    }

    const dev = this.storage.get(deviceId);
    if (!dev) {
      throw new Error(`Không tìm thấy thiết bị ${deviceId}`);
    }

    const pwm = isPwm ? Math.max(0, Math.min(255, Math.round(brightnessPercentOrPwm))) : percentToPwm(brightnessPercentOrPwm);
    const percent = Math.round((pwm / 255) * 100);

    const topic = `ai-smart-lighting/${deviceId}/cmd/brightness`;

    return new Promise((resolve, reject) => {
      this.client?.publish(topic, String(pwm), { qos: 1 }, (err) => {
        if (err) {
          this.wsManager.broadcast({
            type: 'command-result',
            payload: {
              deviceId,
              command: 'brightness',
              success: false,
              message: `Gửi lệnh chỉnh độ sáng thất bại: ${err.message}`,
              value: pwm,
            },
          });
          reject(err);
        } else {
          this.wsManager.broadcast({
            type: 'command-result',
            payload: {
              deviceId,
              command: 'brightness',
              success: true,
              message: `Đã gửi lệnh độ sáng: ${percent}% (PWM ${pwm})`,
              value: pwm,
            },
          });
          resolve({ pwm, percent });
        }
      });
    });
  }

  public async sendFanMode(deviceId: string, mode: FanMode): Promise<void> {
    if (!this.isConnected || !this.client) throw new Error('Máy chủ chưa kết nối tới broker MQTT.');
    if (!['OFF', 'MANUAL', 'AUTO'].includes(mode)) throw new Error('Chế độ quạt không hợp lệ.');
    const topic = `ai-smart-lighting/${deviceId}/cmd/fan/mode`;
    return new Promise<void>((resolve, reject) => {
      this.client?.publish(topic, mode, { qos: 1 }, (err) => {
        this.wsManager.broadcast({ type: 'command-result', payload: {
          deviceId, command: 'fan-mode', success: !err,
          message: err ? `Gửi chế độ quạt thất bại: ${err.message}` : `Đã chuyển quạt sang ${mode}`, value: mode,
        }});
        if (err) reject(err); else resolve();
      });
    });
  }

  public async sendFanSpeed(deviceId: string, speed: number): Promise<void> {
    if (!this.isConnected || !this.client) throw new Error('Máy chủ chưa kết nối tới broker MQTT.');
    const percent = Math.max(0, Math.min(100, Math.round(speed)));
    const topic = `ai-smart-lighting/${deviceId}/cmd/fan/speed`;
    return new Promise<void>((resolve, reject) => {
      this.client?.publish(topic, String(percent), { qos: 1 }, (err) => {
        this.wsManager.broadcast({ type: 'command-result', payload: {
          deviceId, command: 'fan-speed', success: !err,
          message: err ? `Gửi tốc độ quạt thất bại: ${err.message}` : `Đã đặt tốc độ quạt ${percent}%`, value: percent,
        }});
        if (err) reject(err); else resolve();
      });
    });
  }

  /**
   * Sends AI reset command: ai-smart-lighting/<deviceId>/cmd/ai/reset
   * Payload: "RESET"
   */
  public async sendAiReset(deviceId: string): Promise<void> {
    if (!this.isConnected || !this.client) {
      throw new Error('Máy chủ chưa kết nối tới broker MQTT.');
    }
    const topic = `ai-smart-lighting/${deviceId}/cmd/ai/reset`;

    return new Promise<void>((resolve, reject) => {
      this.client?.publish(topic, 'RESET', { qos: 1 }, (err) => {
        if (err) {
          this.wsManager.broadcast({
            type: 'command-result',
            payload: {
              deviceId,
              command: 'ai-reset',
              success: false,
              message: `Gửi lệnh reset dữ liệu AI thất bại: ${err.message}`,
            },
          });
          reject(err);
        } else {
          this.wsManager.broadcast({
            type: 'command-result',
            payload: {
              deviceId,
              command: 'ai-reset',
              success: true,
              message: 'Đã gửi lệnh khôi phục dữ liệu AI mặc định',
            },
          });
          resolve();
        }
      });
    });
  }

  public getMqttStatus(): { connected: boolean; broker: string } {
    return {
      connected: this.isConnected,
      broker: this.brokerUrl,
    };
  }

  public destroy() {
    if (this.timeoutCheckTimer) {
      clearInterval(this.timeoutCheckTimer);
    }
    for (const [, session] of this.activePairings) {
      clearTimeout(session.timer);
    }
    this.activePairings.clear();
    this.client?.end(true);
  }
}
