import React from 'react';
import { TelemetryData } from '../types/index.js';
import { Lightbulb, Radar, Eye } from 'lucide-react';

interface ChamberTelemetryCardProps {
  telemetry?: TelemetryData;
}

export const ChamberTelemetryCard: React.FC<ChamberTelemetryCardProps> = ({ telemetry }) => {
  const brightness = telemetry?.brightness ?? 0;
  const pwmCurrent = telemetry?.pwmCurrent ?? 0;
  const pwmTarget = telemetry?.pwmTarget ?? 0;
  const deskLampPwm = telemetry?.deskLampPwm ?? Math.round(pwmCurrent * 0.7);
  const deskLampPercent = Math.round((deskLampPwm / 255) * 100);
  const mode = telemetry?.mode ?? 'AUTO';
  const pirActive = Boolean(telemetry?.presence || telemetry?.motion);

  // Compute glowing intensity for visual bulb based on brightness
  const glowOpacity = Math.max(0.2, brightness / 100);

  return (
    <div className="bg-[#0e1523] border border-[#182335] rounded-2xl p-6 sm:p-7 shadow-lg flex flex-col justify-between relative overflow-hidden">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] font-mono tracking-widest text-amber-500 font-semibold uppercase">
            — DỮ LIỆU ĐO LƯỜNG QUANG HỌC
          </div>
          <div className="px-3 py-1 rounded-lg bg-[#1a1710] border border-amber-500/30 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
            CHẾ ĐỘ: {mode}
          </div>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Quang thông & Mức phát sáng
        </h2>
      </div>

      {/* Middle Readout & Concentric Rings */}
      <div className="my-6 flex items-center justify-between gap-4">
        {/* Big percentage & PWM stats */}
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-6xl sm:text-7xl font-black font-mono tracking-tight text-white">
              {brightness}
            </span>
            <span className="text-3xl sm:text-4xl font-black font-mono text-amber-500">
              %
            </span>
          </div>

          <div className="mt-2 text-xs sm:text-sm font-medium text-slate-300">
            Độ sáng đèn trần (5 kHz PWM)
          </div>

          <div className="mt-1 font-mono text-xs text-slate-400 tracking-wide">
            PWM {pwmCurrent} / 255 · mục tiêu {pwmTarget}
          </div>
        </div>

        {/* Concentric Dashed Rings with Glowing Bulb */}
        <div className="relative flex items-center justify-center w-36 h-36 sm:w-44 sm:h-44 shrink-0">
          {/* Outer dashed ring */}
          <div className="absolute inset-0 rounded-full border border-dashed border-slate-700/60" />
          
          {/* Middle dashed ring */}
          <div className="absolute inset-4 rounded-full border border-dashed border-slate-700/40" />

          {/* Glowing central orb */}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300"
            style={{
              backgroundColor: '#1b1b1f',
              boxShadow: `0 0 ${brightness > 0 ? 25 + brightness * 0.35 : 10}px rgba(245, 158, 11, ${glowOpacity * 0.9})`,
              border: `1.5px solid rgba(245, 158, 11, ${Math.max(0.3, glowOpacity)})`,
            }}
          >
            <Lightbulb
              className="w-6 h-6 transition-all duration-300"
              style={{
                color: brightness > 0 ? '#f59e0b' : '#64748b',
                fill: brightness > 0 ? '#f59e0b' : 'transparent',
                filter: brightness > 0 ? `drop-shadow(0 0 6px #f59e0b)` : 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Sub-card: PIR + Desk Lamp */}
      <div className="bg-[#090e18] border border-[#152033] rounded-xl p-3.5 sm:p-4 flex items-center justify-between gap-4">
        {/* PIR detection status */}
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
              pirActive
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                : 'bg-[#121927] border-slate-800 text-slate-500'
            }`}
          >
            <Radar className="w-5 h-5" />
          </div>

          <div>
            <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <span>Phát hiện người:</span>
              <span className={pirActive ? 'text-emerald-400 font-extrabold' : 'text-slate-300'}>
                {pirActive ? 'Có' : 'Không'}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
              PIR OUT đang <span className={pirActive ? 'text-emerald-400 font-bold' : 'text-slate-400'}>{pirActive ? 'HIGH' : 'LOW'}</span>
            </div>
          </div>
        </div>

        {/* Desk lamp percentage (70%) */}
        <div className="text-right pl-3 border-l border-slate-800">
          <div className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            ĐÈN BÀN (70%)
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-cyan-400">
            {deskLampPercent}%
          </div>
        </div>
      </div>
    </div>
  );
};
