import React from 'react';
import { ConnectionStatus } from '../types/index.js';
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Radio, ServerOff } from 'lucide-react';

interface StatusBannerProps {
  status: ConnectionStatus;
  lastTelemetryAgeSec?: number;
  brokerUrl?: string;
  errorMessage?: string;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  status,
  lastTelemetryAgeSec,
  brokerUrl,
  errorMessage,
}) => {
  if (status === 'online') {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 rounded-xl text-sm font-medium">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span>Thiết bị hoạt động (ESP32 trực tuyến)</span>
        </div>
        <span className="text-xs opacity-75 font-mono">
          Dữ liệu trực tiếp: {lastTelemetryAgeSec !== undefined ? `${lastTelemetryAgeSec}s` : 'Vừa xong'}
        </span>
      </div>
    );
  }

  if (status === 'stale_data') {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 rounded-xl text-sm">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-500 shrink-0 animate-pulse" />
          <div>
            <div className="font-semibold">Mất dữ liệu từ ESP32</div>
            <div className="text-xs opacity-85 mt-0.5">
              Đã quá 10 giây ({lastTelemetryAgeSec || 10}s) không nhận được telemetry mới từ thiết bị. Các nút điều khiển tạm thời bị khóa để đảm bảo an toàn.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'disconnected_server') {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 rounded-xl text-sm">
        <div className="flex items-center gap-3">
          <ServerOff className="w-5 h-5 text-rose-500 shrink-0" />
          <div>
            <div className="font-semibold">Chưa kết nối máy chủ</div>
            <div className="text-xs opacity-85 mt-0.5">
              Mất kết nối WebSocket tới backend Node.js. Đang thử kết nối lại tự động...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'connecting_broker') {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-sky-500/10 border border-sky-500/30 text-sky-800 dark:text-sky-300 rounded-xl text-sm">
        <div className="flex items-center gap-3">
          <Radio className="w-5 h-5 text-sky-500 shrink-0 animate-spin" />
          <div>
            <div className="font-semibold">Đang kết nối broker MQTT</div>
            <div className="text-xs opacity-85 mt-0.5">
              Máy chủ đang thiết lập kết nối tới broker TCP ({brokerUrl || 'broker.emqx.io:1883'})...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'waiting_esp32') {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-blue-500/10 border border-blue-500/30 text-blue-800 dark:text-blue-300 rounded-xl text-sm">
        <div className="flex items-center gap-3">
          <Radio className="w-5 h-5 text-blue-500 shrink-0 animate-pulse" />
          <div>
            <div className="font-semibold">Đã kết nối broker, đang chờ ESP32</div>
            <div className="text-xs opacity-85 mt-0.5">
              Đang lắng nghe topic availability và telemetry của thiết bị...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // offline
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-slate-500/10 border border-slate-500/20 text-slate-700 dark:text-slate-300 rounded-xl text-sm">
      <div className="flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-slate-400 shrink-0" />
        <div>
          <div className="font-semibold">ESP32 ngoại tuyến</div>
          <div className="text-xs opacity-85 mt-0.5">
            Thiết bị đã ngắt kết nối (nhận tín hiệu Last Will LWT offline). Vui lòng kiểm tra nguồn điện và kết nối Wi-Fi của ESP32.
          </div>
        </div>
      </div>
    </div>
  );
};
