import {
  ControlMode,
  Device,
  MqttStatusPayload,
} from '../types/index.js';

export const BACKEND_URL_KEY = 'ai_smart_lighting_backend_url';

export function getBackendBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(BACKEND_URL_KEY);
    if (saved) return saved.trim().replace(/\/+$/, '');
  }
  const envUrl = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  return envUrl;
}

export function setBackendBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    const cleaned = url.trim().replace(/\/+$/, '');
    if (cleaned) {
      localStorage.setItem(BACKEND_URL_KEY, cleaned);
    } else {
      localStorage.removeItem(BACKEND_URL_KEY);
    }
    window.dispatchEvent(new Event('backend-url-changed'));
  }
}

export function getApiBaseUrl(): string {
  const base = getBackendBaseUrl();
  return base ? `${base}/api` : '/api';
}

async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      `Máy chủ không trả về JSON (Mã trạng thái: ${res.status}, Kiểu nội dung: ${contentType || 'không rõ'}). Backend có thể chưa chạy hoặc URL máy chủ chưa chính xác.`
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Yêu cầu thất bại với mã lỗi ${res.status}`);
  }
  return data as T;
}

export async function fetchDevices(): Promise<{ devices: Device[]; mqtt: MqttStatusPayload }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/devices`);
    const data = await handleResponse<{ success: boolean; devices: Device[]; mqtt: MqttStatusPayload }>(res);
    return {
      devices: Array.isArray(data?.devices) ? data.devices : [],
      mqtt: data?.mqtt || { connected: false, broker: 'Chưa kết nối' },
    };
  } catch (err) {
    console.warn('Lỗi kết nối máy chủ API /api/devices:', err);
    return {
      devices: [],
      mqtt: { connected: false, broker: 'Mất kết nối máy chủ' },
    };
  }
}

export async function fetchDevice(deviceId: string): Promise<Device> {
  const res = await fetch(`${getApiBaseUrl()}/devices/${encodeURIComponent(deviceId)}`);
  const data = await handleResponse<{ success: boolean; device: Device }>(res);
  return data.device;
}

export async function pairDevice(code: string): Promise<Device> {
  const res = await fetch(`${getApiBaseUrl()}/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: code.trim() }),
  });
  const data = await handleResponse<{ success: boolean; device: Device; message: string }>(res);
  return data.device;
}

export async function deleteDevice(deviceId: string): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/devices/${encodeURIComponent(deviceId)}`, {
    method: 'DELETE',
  });
  await handleResponse<{ success: boolean; message: string }>(res);
}

export async function setDeviceMode(deviceId: string, mode: ControlMode): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/devices/${encodeURIComponent(deviceId)}/commands/mode`, {
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
  const res = await fetch(`${getApiBaseUrl()}/devices/${encodeURIComponent(deviceId)}/commands/brightness`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brightness, isPwm }),
  });
  return handleResponse<{ success: boolean; message: string; pwm: number; percent: number }>(res);
}

export async function resetDeviceAi(deviceId: string): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/devices/${encodeURIComponent(deviceId)}/commands/ai/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  await handleResponse<{ success: boolean; message: string }>(res);
}
