import {
  ControlMode,
  Device,
  MqttStatusPayload,
} from '../types/index.js';

const API_BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Yêu cầu thất bại với mã lỗi ${res.status}`);
  }
  return data as T;
}

export async function fetchDevices(): Promise<{ devices: Device[]; mqtt: MqttStatusPayload }> {
  const res = await fetch(`${API_BASE}/devices`);
  return handleResponse<{ success: boolean; devices: Device[]; mqtt: MqttStatusPayload }>(res);
}

export async function fetchDevice(deviceId: string): Promise<Device> {
  const res = await fetch(`${API_BASE}/devices/${encodeURIComponent(deviceId)}`);
  const data = await handleResponse<{ success: boolean; device: Device }>(res);
  return data.device;
}

export async function pairDevice(code: string): Promise<Device> {
  const res = await fetch(`${API_BASE}/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: code.trim() }),
  });
  const data = await handleResponse<{ success: boolean; device: Device; message: string }>(res);
  return data.device;
}

export async function deleteDevice(deviceId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/devices/${encodeURIComponent(deviceId)}`, {
    method: 'DELETE',
  });
  await handleResponse<{ success: boolean; message: string }>(res);
}

export async function setDeviceMode(deviceId: string, mode: ControlMode): Promise<void> {
  const res = await fetch(`${API_BASE}/devices/${encodeURIComponent(deviceId)}/commands/mode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  });
  await handleResponse<{ success: boolean; message: string }>(res);
}

export async function setDeviceBrightness(
  deviceId: string,
  brightness: number,
  isPwm: boolean = false
): Promise<{ pwm: number; percent: number }> {
  const res = await fetch(`${API_BASE}/devices/${encodeURIComponent(deviceId)}/commands/brightness`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brightness, isPwm }),
  });
  return handleResponse<{ success: boolean; message: string; pwm: number; percent: number }>(res);
}

export async function resetDeviceAi(deviceId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/devices/${encodeURIComponent(deviceId)}/commands/ai/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  await handleResponse<{ success: boolean; message: string }>(res);
}
