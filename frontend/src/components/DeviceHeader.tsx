import React, { useState } from 'react';
import { Device, TelemetryData } from '../types/index.js';
import { formatUptime, formatRelativeTime } from '../utils/formatters.js';
import { Cpu, Copy, Check, Clock, Radio, Timer } from 'lucide-react';

interface DeviceHeaderProps {
  device: Device;
  telemetry?: TelemetryData;
  nowMs: number;
}

export const DeviceHeader: React.FC<DeviceHeaderProps> = ({ device, telemetry, nowMs }) => {
  const [copied, setCopied] = useState(false);

  const copyDeviceId = () => {
    navigator.clipboard?.writeText(device.deviceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const uptimeStr = telemetry?.uptimeMs ? formatUptime(telemetry.uptimeMs) : 'Chưa có thông tin';
  const relativeTime = formatRelativeTime(device.lastTelemetryTime, nowMs);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Device ID and Identity */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {device.name || 'Đèn ESP32'}
            </h2>

            {/* Mode Tag */}
            {telemetry && (
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                  telemetry.mode === 'AUTO'
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                    : telemetry.mode === 'MANUAL'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                }`}
              >
                Chế độ {telemetry.mode}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2 text-xs font-mono text-slate-500 dark:text-slate-400 flex-wrap">
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5" />
              ID: {device.deviceId}
            </span>
            <button
              onClick={copyDeviceId}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 rounded transition-colors"
              title="Sao chép Device ID"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <span>·</span>
            <span className="flex items-center gap-1" title="Broker TCP">
              <Radio className="w-3.5 h-3.5" />
              {device.broker}:{device.port}
            </span>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 self-start md:self-auto">
          {/* Uptime */}
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-amber-500" />
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Thời gian chạy</div>
              <div className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">{uptimeStr}</div>
            </div>
          </div>

          <div className="w-px h-7 bg-slate-200 dark:bg-slate-700" />

          {/* Last telemetry timestamp */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Cập nhật cuối</div>
              <div className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">{relativeTime}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
