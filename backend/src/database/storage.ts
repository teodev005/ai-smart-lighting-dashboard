import fs from 'fs';
import path from 'path';
import { Device } from '../../../shared/types/index.js';

export class DeviceStorage {
  private filePath: string;
  private devices: Map<string, Device> = new Map();

  constructor(customPath?: string) {
    this.filePath = customPath || process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data/devices.json');
    this.ensureDirectory();
    this.loadFromDisk();
  }

  private ensureDirectory() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const list: Device[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          this.devices.clear();
          for (const d of list) {
            this.devices.set(d.deviceId, {
              ...d,
              availability: 'unknown',
              lastAvailabilityTime: undefined,
              lastTelemetry: undefined,
              lastTelemetryTime: undefined
            });
          }
        }
      }
    } catch (err) {
      console.error('[DeviceStorage] Lỗi khi đọc dữ liệu thiết bị từ đĩa:', err);
    }
  }

  private saveToDisk() {
    try {
      this.ensureDirectory();
      const list = Array.from(this.devices.values()).map(d => ({
        deviceId: d.deviceId,
        broker: d.broker,
        port: d.port,
        wss: d.wss,
        pairedAt: d.pairedAt,
        name: d.name
      }));
      const tempPath = `${this.filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(list, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error('[DeviceStorage] Lỗi khi lưu dữ liệu thiết bị vào đĩa:', err);
    }
  }

  public getAll(): Device[] {
    return Array.from(this.devices.values());
  }

  public get(deviceId: string): Device | undefined {
    return this.devices.get(deviceId);
  }

  public save(device: Device): void {
    this.devices.set(device.deviceId, device);
    this.saveToDisk();
  }

  public updateRuntime(deviceId: string, updater: (d: Device) => void): Device | undefined {
    const d = this.devices.get(deviceId);
    if (d) {
      updater(d);
      return d;
    }
    return undefined;
  }

  public remove(deviceId: string): boolean {
    const exists = this.devices.delete(deviceId);
    if (exists) {
      this.saveToDisk();
    }
    return exists;
  }

  public count(): number {
    return this.devices.size;
  }
}
