import React from 'react';
import { ChartDataPoint } from '../types/index.js';

interface TelemetryChartsProps {
  history: ChartDataPoint[];
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({ history }) => {
  // If history has fewer than 2 points, generate a baseline with the current point or empty baseline
  const dataPoints = history.length >= 2 ? history : [
    { timeStr: '00:00:00', timestamp: 0, darkness: 100, brightness: 0, temperature: 28.6, humidity: 78, pwmCurrent: 0 },
    { timeStr: '00:00:02', timestamp: 1, darkness: 100, brightness: 0, temperature: 28.6, humidity: 78, pwmCurrent: 0 },
  ];

  const width = 1000;
  const height = 240;
  const padX = 20;
  const padY = 30;
  const graphW = width - padX * 2;
  const graphH = height - padY * 2;

  // Generate SVG polyline points
  const pointsDarkness = dataPoints.map((pt, i) => {
    const x = padX + (i / (dataPoints.length - 1)) * graphW;
    const y = padY + graphH - (Math.min(100, Math.max(0, pt.darkness)) / 100) * graphH;
    return `${x},${y}`;
  }).join(' ');

  const pointsBrightness = dataPoints.map((pt, i) => {
    const x = padX + (i / (dataPoints.length - 1)) * graphW;
    const y = padY + graphH - (Math.min(100, Math.max(0, pt.brightness)) / 100) * graphH;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-[#0e1523] border border-[#182335] rounded-2xl p-6 sm:p-7 shadow-lg transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="text-[11px] font-mono tracking-widest text-amber-500 font-semibold uppercase mb-1">
            — ĐỒ THỊ BIẾN THIÊN THỜI GIAN THỰC
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Tương quan Độ tối (LDR) và Cường độ LED (PWM)
          </h3>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="text-slate-300 font-medium">Độ tối LDR</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-slate-300 font-medium">Đèn trần PWM</span>
          </div>
        </div>
      </div>

      {/* Waveform Chart Box */}
      <div className="w-full bg-[#080d17] border border-[#151f31] rounded-xl p-4 sm:p-5 relative overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Subtle horizontal grid guide lines */}
          <line
            x1={padX}
            y1={padY}
            x2={width - padX}
            y2={padY}
            stroke="#162235"
            strokeWidth="1.5"
          />
          <line
            x1={padX}
            y1={padY + graphH / 2}
            x2={width - padX}
            y2={padY + graphH / 2}
            stroke="#121b2a"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <line
            x1={padX}
            y1={padY + graphH}
            x2={width - padX}
            y2={padY + graphH}
            stroke="#162235"
            strokeWidth="1.5"
          />

          {/* Cyan line for LDR Darkness */}
          <polyline
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pointsDarkness}
          />

          {/* Amber line for Ceiling Light PWM */}
          <polyline
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pointsBrightness}
          />
        </svg>

        {/* Bottom Axis Labels */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mt-3 pt-2 border-t border-[#121b2a]">
          <span>0%</span>
          <span>{Math.max(60, dataPoints.length)} mẫu gần nhất (2s/mẫu)</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
};
