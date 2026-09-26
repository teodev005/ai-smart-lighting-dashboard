export {
  percentToPwm,
  pwmToPercent,
  validatePairingCode,
  validateDeviceId,
  calculateConnectionState,
  formatUptime,
} from '../../../shared/utils/converters.js';

export function formatRelativeTime(timestampMs?: number, nowMs: number = Date.now()): string {
  if (!timestampMs) return 'Chưa có dữ liệu';
  const diffSec = Math.max(0, Math.floor((nowMs - timestampMs) / 1000));
  if (diffSec < 2) return 'Vừa xong';
  if (diffSec < 60) return `${diffSec} giây trước`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  return `${diffHour} giờ trước`;
}

export function formatTimeShort(timestampMs: number): string {
  const d = new Date(timestampMs);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
