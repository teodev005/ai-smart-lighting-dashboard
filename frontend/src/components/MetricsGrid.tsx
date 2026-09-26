import React from 'react';
import { TelemetryData } from '../types/index.js';
import { Sun, Thermometer, Droplets, Sparkles } from 'lucide-react';

interface MetricsGridProps {
  telemetry?: TelemetryData;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ telemetry }) => {
  const darkness = telemetry?.darkness ?? 100;
  const adc = telemetry?.adc ?? 4095;
  const temperature = telemetry?.temperature ?? 28.6;
  const humidity = telemetry?.humidity ?? 78;
  const aiClasses = telemetry?.aiClasses ?? 5;
  const aiSamples = telemetry?.aiSamples ?? 18;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {/* 1. ĐỘ TỐI QUANG HỌC */}
      <div className="bg-[#0e1523] border border-[#182335] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between transition-colors">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-mono tracking-widest uppercase text-slate-400 font-semibold">
            ĐỘ TỐI QUANG HỌC
          </span>
          <div className="w-8 h-8 rounded-lg bg-[#20180d] border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Sun className="w-4 h-4" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
              {darkness}
            </span>
            <span className="text-xl font-bold font-mono text-slate-400">%</span>
          </div>

          <div className="mt-2 text-xs font-mono text-slate-400">
            ADC LDR: {adc}
          </div>
        </div>
      </div>

      {/* 2. NHIỆT ĐỘ PHÒNG */}
      <div className="bg-[#0e1523] border border-[#182335] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between transition-colors">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-mono tracking-widest uppercase text-slate-400 font-semibold">
            NHIỆT ĐỘ PHÒNG
          </span>
          <div className="w-8 h-8 rounded-lg bg-[#241117] border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <Thermometer className="w-4 h-4" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
              {temperature}
            </span>
            <span className="text-xl font-bold font-mono text-slate-400">°C</span>
          </div>

          <div className="mt-2 text-xs font-mono text-slate-400">
            DHT22 · Giám sát liên tục
          </div>
        </div>
      </div>

      {/* 3. ĐỘ ẨM KHÔNG KHÍ */}
      <div className="bg-[#0e1523] border border-[#182335] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between transition-colors">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-mono tracking-widest uppercase text-slate-400 font-semibold">
            ĐỘ ẨM KHÔNG KHÍ
          </span>
          <div className="w-8 h-8 rounded-lg bg-[#0c1f2d] border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Droplets className="w-4 h-4" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
              {humidity}
            </span>
            <span className="text-xl font-bold font-mono text-slate-400">%</span>
          </div>

          <div className="mt-2 text-xs font-mono text-slate-400">
            DHT22 · Khí vi mô
          </div>
        </div>
      </div>

      {/* 4. TIẾN ĐỘ AI K-NN */}
      <div className="bg-[#0e1523] border border-[#182335] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between transition-colors">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-mono tracking-widest uppercase text-slate-400 font-semibold">
            TIẾN ĐỘ AI K-NN
          </span>
          <div className="w-8 h-8 rounded-lg bg-[#1c1228] border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
              {aiClasses}
            </span>
            <span className="text-lg font-bold font-mono text-slate-400">/ 5 lớp</span>
          </div>

          <div className="mt-2 text-xs font-mono text-slate-400">
            {aiSamples} mẫu trong NVS
          </div>
        </div>
      </div>
    </div>
  );
};
