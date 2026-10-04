import React, { useEffect, useRef, useState } from 'react';
import { Fan, Lock, Thermometer, Waves } from 'lucide-react';
import { FanMode, TelemetryData } from '../types/index.js';

interface Props {
  telemetry?: TelemetryData;
  disabled: boolean;
  disabledReason?: string;
  onSetMode: (mode: FanMode) => Promise<void>;
  onSetSpeed: (speed: number) => Promise<void>;
}

export const FanControlCard: React.FC<Props> = ({ telemetry, disabled, disabledReason, onSetMode, onSetSpeed }) => {
  const mode = telemetry?.fanMode ?? 'AUTO';
  const actual = telemetry?.fanPercent ?? 0;
  const [speed, setSpeed] = useState(telemetry?.fanManualPercent ?? actual);
  const [dragging, setDragging] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!dragging) setSpeed(mode === 'MANUAL' ? telemetry?.fanManualPercent ?? actual : actual);
  }, [telemetry?.fanManualPercent, actual, mode, dragging]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const changeSpeed = (value: number) => {
    setSpeed(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSetSpeed(value), 100);
  };

  const spinning = actual > 0 && mode !== 'OFF';
  const duration = Math.max(0.16, 1.5 - actual * 0.013);
  const rotorStyle = { '--fan-duration': `${duration}s` } as React.CSSProperties;

  return (
    <section className="fan-control-card relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#0e1523]/90 p-6 shadow-xl backdrop-blur-md">
      {disabled && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-[#070c14]/80 p-4 backdrop-blur-[2px]">
          <div className="max-w-sm rounded-xl border border-amber-500/30 bg-[#0e1523] p-4 text-center">
            <Lock className="mx-auto mb-2 h-5 w-5 text-amber-500" />
            <div className="text-sm font-bold text-white">Điều khiển quạt đang khóa</div>
            <p className="mt-1 text-xs text-slate-400">{disabledReason}</p>
          </div>
        </div>
      )}

      <div className="grid items-center gap-7 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-cyan-400">— LUỒNG GIÓ NHIỆT</div>
          <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">Quạt thông minh</h2>
          <div className="fan-stage mt-5" aria-label={`Quạt đang chạy ${actual}%`}>
            <div className="fan-housing">
              <div className={`fan-rotor ${spinning ? 'is-spinning' : ''}`} style={rotorStyle}>
                {[0, 90, 180, 270].map((deg) => <span key={deg} className="fan-blade" style={{ transform: `rotate(${deg}deg)` }} />)}
                <span className="fan-hub"><Fan className="h-5 w-5" /></span>
              </div>
            </div>
            <div className="fan-shadow" />
          </div>
        </div>

        <div>
          <div className="flex items-end justify-between">
            <div><span className="text-5xl font-black tabular-nums text-cyan-300">{actual}</span><span className="ml-1 text-xl font-bold text-cyan-500">%</span></div>
            <span className={`rounded-lg border px-3 py-1.5 text-xs font-mono font-bold ${spinning ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 bg-slate-900 text-slate-400'}`}>{spinning ? 'ĐANG QUAY' : 'ĐANG DỪNG'}</span>
          </div>

          <div className="my-5 grid grid-cols-3 gap-1 rounded-xl border border-[#182335] bg-[#090e18] p-1">
            {(['OFF', 'MANUAL', 'AUTO'] as FanMode[]).map((item) => (
              <button key={item} type="button" disabled={disabled} onClick={() => onSetMode(item)}
                className={`rounded-lg border px-2 py-2.5 text-xs font-mono font-bold transition-all ${mode === item ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300' : 'border-transparent text-slate-400 hover:text-white'}`}>{item}</button>
            ))}
          </div>

          <div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold text-slate-300">Tốc độ thủ công</span><strong className="font-mono text-cyan-300">{speed}%</strong></div>
          <input className="tech-slider fan-slider" type="range" min="0" max="100" value={speed}
            disabled={disabled || mode !== 'MANUAL'} onPointerDown={() => setDragging(true)} onPointerUp={() => setDragging(false)}
            onInput={(e) => changeSpeed(Number((e.target as HTMLInputElement).value))} />

          <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"><Thermometer className="mb-2 h-4 w-4 text-rose-400" /><span className="text-slate-500">Nhiệt độ</span><strong className="mt-1 block text-base text-white">{Number.isFinite(telemetry?.temperature) ? telemetry!.temperature.toFixed(1) : '--'}°C</strong></div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"><Waves className="mb-2 h-4 w-4 text-sky-400" /><span className="text-slate-500">Độ ẩm</span><strong className="mt-1 block text-base text-white">{Number.isFinite(telemetry?.humidity) ? Math.round(telemetry!.humidity) : '--'}%</strong></div>
          </div>
          <p className="mt-3 text-[11px] font-mono text-slate-400">{telemetry?.fanReason || 'Đang chờ trạng thái quạt'} · PWM {telemetry?.fanPwm ?? '--'}/255 · DHT11 {telemetry?.dhtValid ? 'ổn định' : 'đang chờ'}</p>
        </div>
      </div>
    </section>
  );
};
