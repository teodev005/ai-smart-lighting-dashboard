import React, { useState, useEffect, useRef } from 'react';
import { ControlMode, TelemetryData } from '../types/index.js';
import { Loader2, Lock } from 'lucide-react';

interface TactileControlsCardProps {
  telemetry?: TelemetryData;
  isControlDisabled: boolean;
  disabledReason?: string;
  onSetMode: (mode: ControlMode) => Promise<void>;
  onSetBrightness: (brightness: number) => Promise<void>;
  onResetAi: () => void;
}

export const TactileControlsCard: React.FC<TactileControlsCardProps> = ({
  telemetry,
  isControlDisabled,
  disabledReason,
  onSetMode,
  onSetBrightness,
  onResetAi,
}) => {
  const currentMode = telemetry?.mode ?? 'AUTO';
  const currentBrightness = telemetry?.brightness ?? 0;
  const aiClasses = telemetry?.aiClasses ?? 5;

  const [sliderVal, setSliderVal] = useState<number>(currentBrightness);
  const [isSendingMode, setIsSendingMode] = useState<boolean>(false);
  const [isSendingBrightness, setIsSendingBrightness] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Tracks the timestamp until which user-set brightness is strictly locked
  const userInteractedUntilRef = useRef<number>(0);
  const pendingBrightnessRef = useRef<number | null>(null);
  const prevModeRef = useRef<ControlMode>(currentMode);
  const lastCommittedRef = useRef<{ value: number; time: number }>({ value: -1, time: 0 });

  // Sync slider when mode changes (e.g., from AUTO/AI to MANUAL or vice versa)
  useEffect(() => {
    if (prevModeRef.current !== currentMode) {
      prevModeRef.current = currentMode;
      userInteractedUntilRef.current = 0;
      pendingBrightnessRef.current = null;
      if (telemetry) {
        setSliderVal(telemetry.brightness);
      }
    }
  }, [currentMode, telemetry]);

  // Sync slider from telemetry in AUTO/AI mode, or in MANUAL when user is idle
  useEffect(() => {
    if (!telemetry) return;
    if (isDragging) return; // User is actively holding the thumb

    const now = Date.now();
    const isUserLocked = now < userInteractedUntilRef.current;

    if (currentMode === 'MANUAL') {
      if (isUserLocked) {
        // If ESP32 caught up to the user's target, release the lock
        if (pendingBrightnessRef.current !== null && telemetry.brightness === pendingBrightnessRef.current) {
          pendingBrightnessRef.current = null;
          userInteractedUntilRef.current = 0;
        }
        // Do NOT change sliderVal while locked to prevent rubber-banding
        return;
      }
      // If idle and not locked, keep in sync with telemetry
      setSliderVal(telemetry.brightness);
    } else {
      // In AUTO or AI mode, slider mirrors current brightness
      setSliderVal(telemetry.brightness);
    }
  }, [telemetry?.brightness, currentMode, isDragging]);

  const handleModeChange = async (mode: ControlMode) => {
    if (isControlDisabled || isSendingMode || currentMode === mode) return;
    try {
      setIsSendingMode(true);
      await onSetMode(mode);
    } finally {
      setIsSendingMode(false);
    }
  };

  const handleSliderInput = (val: number) => {
    setSliderVal(val);
    pendingBrightnessRef.current = val;
    userInteractedUntilRef.current = Date.now() + 8000; // 8s optimistic lock
  };

  const handleCommitBrightness = async (val?: number) => {
    const target = val !== undefined ? val : sliderVal;
    if (isControlDisabled || currentMode !== 'MANUAL' || isSendingBrightness) return;

    const now = Date.now();
    // Strictly guard against duplicate commits within 700ms (preventing duplicate events & double notifications)
    if (lastCommittedRef.current.value === target && now - lastCommittedRef.current.time < 700) {
      return;
    }
    lastCommittedRef.current = { value: target, time: now };

    setIsDragging(false);
    setSliderVal(target);
    pendingBrightnessRef.current = target;
    userInteractedUntilRef.current = now + 8000;

    try {
      setIsSendingBrightness(true);
      await onSetBrightness(target);
    } finally {
      setIsSendingBrightness(false);
    }
  };

  const isManual = currentMode === 'MANUAL';

  return (
    <div className="bg-[#0e1523]/90 backdrop-blur-md border border-[#182335] rounded-2xl p-6 sm:p-7 shadow-xl flex flex-col justify-between relative overflow-hidden">
      {/* Disabled Overlay */}
      {isControlDisabled && (
        <div className="absolute inset-0 z-20 bg-[#070c14]/80 backdrop-blur-[2px] flex items-center justify-center p-4 rounded-2xl">
          <div className="bg-[#0e1523] border border-amber-500/30 p-4 rounded-xl shadow-xl max-w-sm text-center">
            <Lock className="w-5 h-5 text-amber-500 mx-auto mb-2" />
            <div className="text-sm font-bold text-white">Bảng điều khiển đang khóa</div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {disabledReason || 'Không thể gửi lệnh khi mất kết nối hoặc mất dữ liệu từ ESP32.'}
            </p>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] font-mono tracking-widest text-amber-500 font-semibold uppercase">
            — ĐIỀU KHIỂN & ĐIỀU PHỐI ĐỘ SÁNG
          </div>
          {(isSendingMode || isSendingBrightness) && (
            <div className="flex items-center gap-1.5 text-xs font-mono text-amber-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Đang gửi lệnh...</span>
            </div>
          )}
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Chế độ & Điều phối quang học
        </h2>
      </div>

      {/* 3 Segmented Mode Buttons */}
      <div className="my-5 p-1 bg-[#090e18] border border-[#182335] rounded-xl grid grid-cols-3 gap-1">
        <button
          type="button"
          disabled={isControlDisabled || isSendingMode}
          onClick={() => handleModeChange('AUTO')}
          className={`py-2.5 px-3 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
            currentMode === 'AUTO'
              ? 'bg-[#101b2b] border border-cyan-500/50 text-cyan-400 shadow-sm'
              : 'text-slate-400 hover:text-white border border-transparent'
          }`}
        >
          AUTO
        </button>

        <button
          type="button"
          disabled={isControlDisabled || isSendingMode}
          onClick={() => handleModeChange('MANUAL')}
          className={`py-2.5 px-3 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
            currentMode === 'MANUAL'
              ? 'bg-[#1a1710] border border-amber-500 text-amber-400 shadow-sm'
              : 'text-slate-400 hover:text-white border border-transparent'
          }`}
        >
          MANUAL
        </button>

        <button
          type="button"
          disabled={isControlDisabled || isSendingMode}
          onClick={() => handleModeChange('AI')}
          className={`py-2.5 px-3 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
            currentMode === 'AI'
              ? 'bg-[#1b1429] border border-purple-500/50 text-purple-400 shadow-sm'
              : 'text-slate-400 hover:text-white border border-transparent'
          }`}
        >
          AI k-NN
        </button>
      </div>

      {/* Manual Brightness Control */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="text-slate-300 font-semibold tracking-wide">
            Độ sáng thủ công
          </span>
          <span className="font-mono font-black text-amber-400 text-sm">
            {sliderVal}%
          </span>
        </div>

        {/* Range Slider with robust event handling */}
        <div className="mb-4">
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={sliderVal}
            disabled={!isManual || isControlDisabled}
            onPointerDown={() => setIsDragging(true)}
            onInput={(e) => handleSliderInput(Number((e.target as HTMLInputElement).value))}
            onChange={(e) => handleSliderInput(Number((e.target as HTMLInputElement).value))}
            onPointerUp={() => handleCommitBrightness()}
            onKeyUp={(e) => {
              if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
                handleCommitBrightness();
              }
            }}
            className="tech-slider cursor-pointer"
          />
        </div>

        {/* 5 Preset Quick Buttons */}
        <div className="grid grid-cols-5 gap-2">
          {[0, 25, 50, 75, 100].map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={!isManual || isControlDisabled}
              onClick={() => handleCommitBrightness(preset)}
              className={`py-1.5 px-2 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                sliderVal === preset && isManual
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-[#090e18] border border-[#182335] text-slate-300 hover:bg-[#121927] hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              {preset}%
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Status & Reset Button */}
      <div className="pt-4 border-t border-[#182335] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-[11px] text-slate-400 leading-snug">
          AI đã học {aiClasses}/5 lớp sáng: có thể học thêm từ chế độ MANUAL.
        </div>

        <button
          type="button"
          disabled={isControlDisabled}
          onClick={onResetAi}
          className="self-end sm:self-auto px-4 py-2 rounded-xl border border-rose-900/60 bg-[#160d15] text-rose-400 hover:bg-rose-950/60 hover:border-rose-700 active:scale-95 text-xs font-semibold tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
        >
          Khôi phục mẫu AI mặc định
        </button>
      </div>
    </div>
  );
};
