import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeviceController } from '../backend/src/controllers/device-controller.js';
import { DeviceStorage } from '../backend/src/database/storage.js';
import { MqttManager } from '../backend/src/mqtt/mqtt-manager.js';
import { WebSocketManager } from '../backend/src/websocket/ws-manager.js';
import { Device } from '../shared/types/index.js';
import fs from 'fs';
import path from 'path';

describe('DeviceController API & Commands', () => {
  let storage: DeviceStorage;
  let mqttManager: MqttManager;
  let wsManager: WebSocketManager;
  let controller: DeviceController;
  const testDbPath = path.resolve(process.cwd(), 'data/test_devices.json');

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    storage = new DeviceStorage(testDbPath);
    wsManager = new WebSocketManager();

    // Mock mqttManager
    mqttManager = {
      sendMode: vi.fn().mockResolvedValue(undefined),
      sendBrightness: vi.fn().mockImplementation((deviceId, val, isPwm) => {
        const pwm = isPwm ? val : Math.round((val / 100) * 255);
        const percent = Math.round((pwm / 255) * 100);
        return Promise.resolve({ pwm, percent });
      }),
      sendAiReset: vi.fn().mockResolvedValue(undefined),
      pairDevice: vi.fn(),
      getMqttStatus: vi.fn().mockReturnValue({ connected: true, broker: 'mqtt://broker.emqx.io:1883' }),
      unsubscribeDeviceTopics: vi.fn(),
    } as unknown as MqttManager;

    controller = new DeviceController(storage, mqttManager, wsManager);
  });

  it('rejects invalid pairing codes', async () => {
    let statusCode = 200;
    let jsonBody: any = null;
    const req: any = { body: { code: '123' } };
    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: any) => {
        jsonBody = data;
      },
    };

    await controller.pair(req, res);
    expect(statusCode).toBe(400);
    expect(jsonBody.success).toBe(false);
    expect(jsonBody.error).toContain('6 chữ số');
  });

  it('accepts mode command for AUTO, MANUAL, AI on valid device', async () => {
    const testDev: Device = {
      deviceId: 'esp32-1234abcd',
      broker: 'broker.emqx.io',
      port: 1883,
      pairedAt: Date.now(),
      availability: 'online',
    };
    storage.save(testDev);

    let statusCode = 200;
    let jsonBody: any = null;
    const req: any = {
      params: { deviceId: 'esp32-1234abcd' },
      body: { mode: 'MANUAL' },
    };
    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: any) => {
        jsonBody = data;
      },
    };

    await controller.setMode(req, res);
    expect(statusCode).toBe(200);
    expect(jsonBody.success).toBe(true);
    expect(mqttManager.sendMode).toHaveBeenCalledWith('esp32-1234abcd', 'MANUAL');
  });

  it('rejects invalid mode commands', async () => {
    const req: any = {
      params: { deviceId: 'esp32-1234abcd' },
      body: { mode: 'INVALID_MODE' },
    };
    let statusCode = 200;
    let jsonBody: any = null;
    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: any) => {
        jsonBody = data;
      },
    };

    await controller.setMode(req, res);
    expect(statusCode).toBe(400);
    expect(jsonBody.success).toBe(false);
  });

  it('processes brightness command with correct percentage to PWM conversion', async () => {
    const testDev: Device = {
      deviceId: 'esp32-1234abcd',
      broker: 'broker.emqx.io',
      port: 1883,
      pairedAt: Date.now(),
      availability: 'online',
    };
    storage.save(testDev);

    let statusCode = 200;
    let jsonBody: any = null;
    const req: any = {
      params: { deviceId: 'esp32-1234abcd' },
      body: { brightness: 50 },
    };
    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: any) => {
        jsonBody = data;
      },
    };

    await controller.setBrightness(req, res);
    expect(statusCode).toBe(200);
    expect(jsonBody.success).toBe(true);
    expect(jsonBody.pwm).toBe(128);
    expect(jsonBody.percent).toBe(50);
  });

  it('handles deleteDevice properly and unsubscribes', () => {
    const testDev: Device = {
      deviceId: 'esp32-forget-me',
      broker: 'broker.emqx.io',
      port: 1883,
      pairedAt: Date.now(),
      availability: 'online',
    };
    storage.save(testDev);
    expect(storage.get('esp32-forget-me')).toBeDefined();

    const req: any = { params: { deviceId: 'esp32-forget-me' } };
    let jsonBody: any = null;
    const res: any = {
      status: (code: number) => res,
      json: (data: any) => {
        jsonBody = data;
      },
    };

    controller.deleteDevice(req, res);
    expect(jsonBody.success).toBe(true);
    expect(storage.get('esp32-forget-me')).toBeUndefined();
    expect(mqttManager.unsubscribeDeviceTopics).toHaveBeenCalledWith('esp32-forget-me');
  });
});
