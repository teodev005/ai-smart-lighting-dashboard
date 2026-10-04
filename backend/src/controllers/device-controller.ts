import { Request, Response } from 'express';
import { DeviceStorage } from '../database/storage.js';
import { MqttManager } from '../mqtt/mqtt-manager.js';
import { WebSocketManager } from '../websocket/ws-manager.js';
import { validatePairingCode } from '../../../shared/utils/converters.js';
import { ControlMode, FanMode } from '../../../shared/types/index.js';

export class DeviceController {
  constructor(
    private storage: DeviceStorage,
    private mqttManager: MqttManager,
    private wsManager: WebSocketManager
  ) {}

  public getDevices = (req: Request, res: Response): void => {
    try {
      const devices = this.storage.getAll();
      const mqttStatus = this.mqttManager.getMqttStatus();
      res.json({
        success: true,
        devices,
        mqtt: mqttStatus,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  };

  public getDevice = (req: Request, res: Response): void => {
    try {
      const { deviceId } = req.params;
      const device = this.storage.get(deviceId);
      if (!device) {
        res.status(404).json({ success: false, error: `Không tìm thấy thiết bị: ${deviceId}` });
        return;
      }
      res.json({ success: true, device });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  };

  public pair = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.body;
      const codeValidation = validatePairingCode(code);
      if (!codeValidation.valid) {
        res.status(400).json({ success: false, error: codeValidation.error });
        return;
      }

      const cleanCode = String(code).trim();
      console.log(`[API] Bắt đầu ghép nối với mã: ${cleanCode}`);

      const device = await this.mqttManager.pairDevice(cleanCode);
      res.status(200).json({
        success: true,
        message: `Ghép nối thành công thiết bị ${device.deviceId}`,
        device,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Hết thời gian chờ')) {
        res.status(408).json({ success: false, error: msg });
      } else if (msg.includes('chưa kết nối tới broker')) {
        res.status(503).json({ success: false, error: msg });
      } else {
        res.status(400).json({ success: false, error: msg });
      }
    }
  };

  public deleteDevice = (req: Request, res: Response): void => {
    try {
      const { deviceId } = req.params;
      const dev = this.storage.get(deviceId);
      if (!dev) {
        res.status(404).json({ success: false, error: `Thiết bị ${deviceId} không tồn tại trong hệ thống` });
        return;
      }

      this.mqttManager.unsubscribeDeviceTopics(deviceId);
      this.storage.remove(deviceId);

      // Notify clients
      this.wsManager.broadcast({
        type: 'devices-list',
        payload: {
          devices: this.storage.getAll(),
          activeDeviceId: null,
        },
      });

      console.log(`[API] Đã xóa và quên thiết bị: ${deviceId}`);
      res.json({ success: true, message: `Đã quên thiết bị ${deviceId}` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  };

  public setMode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { deviceId } = req.params;
      const { mode } = req.body;

      if (!mode || !['AUTO', 'MANUAL', 'AI'].includes(mode)) {
        res.status(400).json({
          success: false,
          error: 'Chế độ không hợp lệ. Chỉ chấp nhận AUTO, MANUAL hoặc AI.',
        });
        return;
      }

      const dev = this.storage.get(deviceId);
      if (!dev) {
        res.status(404).json({ success: false, error: `Không tìm thấy thiết bị ${deviceId}` });
        return;
      }

      await this.mqttManager.sendMode(deviceId, mode as ControlMode);
      res.json({
        success: true,
        message: `Đã gửi lệnh đổi sang chế độ ${mode} tới thiết bị`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  };

  public setBrightness = async (req: Request, res: Response): Promise<void> => {
    try {
      const { deviceId } = req.params;
      const { brightness, isPwm } = req.body;

      if (brightness === undefined || brightness === null || isNaN(Number(brightness))) {
        res.status(400).json({
          success: false,
          error: 'Độ sáng phải là số hợp lệ.',
        });
        return;
      }

      const dev = this.storage.get(deviceId);
      if (!dev) {
        res.status(404).json({ success: false, error: `Không tìm thấy thiết bị ${deviceId}` });
        return;
      }

      const numVal = Number(brightness);
      if (isPwm && (numVal < 0 || numVal > 255)) {
        res.status(400).json({ success: false, error: 'Giá trị PWM phải từ 0 đến 255.' });
        return;
      }
      if (!isPwm && (numVal < 0 || numVal > 100)) {
        res.status(400).json({ success: false, error: 'Độ sáng phần trăm phải từ 0% đến 100%.' });
        return;
      }

      const result = await this.mqttManager.sendBrightness(deviceId, numVal, Boolean(isPwm));
      res.json({
        success: true,
        message: `Đã gửi lệnh chỉnh độ sáng: ${result.percent}% (PWM ${result.pwm})`,
        ...result,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  };

  public resetAi = async (req: Request, res: Response): Promise<void> => {
    try {
      const { deviceId } = req.params;
      const dev = this.storage.get(deviceId);
      if (!dev) {
        res.status(404).json({ success: false, error: `Không tìm thấy thiết bị ${deviceId}` });
        return;
      }

      await this.mqttManager.sendAiReset(deviceId);
      res.json({
        success: true,
        message: 'Đã gửi lệnh khôi phục dữ liệu AI mặc định tới thiết bị',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  };

  public setFanMode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { deviceId } = req.params;
      const { mode } = req.body;
      if (!['OFF', 'MANUAL', 'AUTO'].includes(mode) || !this.storage.get(deviceId)) {
        res.status(400).json({ success: false, error: 'Thiết bị hoặc chế độ quạt không hợp lệ.' });
        return;
      }
      await this.mqttManager.sendFanMode(deviceId, mode as FanMode);
      res.json({ success: true, message: `Đã chuyển quạt sang ${mode}` });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  };

  public setFanSpeed = async (req: Request, res: Response): Promise<void> => {
    try {
      const { deviceId } = req.params;
      const speed = Number(req.body.speed);
      if (!this.storage.get(deviceId) || !Number.isFinite(speed) || speed < 0 || speed > 100) {
        res.status(400).json({ success: false, error: 'Thiết bị hoặc tốc độ quạt không hợp lệ (0-100%).' });
        return;
      }
      await this.mqttManager.sendFanSpeed(deviceId, speed);
      res.json({ success: true, message: `Đã đặt tốc độ quạt ${Math.round(speed)}%` });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  };
}
