import React, { useState, useEffect } from 'react';
import { ControlMode, TelemetryData } from '../types/index.js';
import { percentToPwm, pwmToPercent } from '../utils/formatters.js';
import {
  Sliders,
  Sparkles,
  Cpu,
  SunMedium,
  Lamp,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface LightingControlCardProps {
  telemetry?: TelemetryData;
  isControlDisabled: boolean;
  disabledReason?: string;
  onSetMode: (mode: ControlMode) => Promise<void>;
  onSetBrightness: (brightness: number) => Promise<void>;
}

export const LightingControlCard: React.FC<LightingControlCardProps> = ({
  telemetry,
  isControlDisabled,
  disabledReason,
  onSetMode,
  onSetBrightness,
}) => {
  const currentMode = telemetry?.mode || 'AUTO';
  const currentPwm = telemetry?.pwmCurrent ?? 0;
  const currentPercent = telemetry?.brightness ?? pwmToPercent(currentPwm);
  const deskLampPwm = telemetry?.deskLampPwm ?? Math.round(currentPwm * 0.7);
  const deskLampPercent = pwmToPercent(deskLampPwm);

  const [sliderValue, setSliderValue] = useState<number>(currentPercent);
  const [isChangingMode, setIsChangingMode] = useState<boolean>(false);
  const [isChangingBrightness, setIsChangingBrightness] = useState<boolean>(false);
  const [pendingMode, setPendingMode] = useState<ControlMode | null>(null);

  // Sync slider when incoming telemetry updates
  useEffect(() => {
    if (!isChangingBrightness && telemetry) {
      setSliderValue(telemetry.brightness);
    }
  }, [telemetry?.brightness, isChangingBrightness, telemetry]);

  // Clear pending mode if telemetry matches
  useEffect(() => {
    if (pendingMode && telemetry?.mode === pendingMode) {
      setPendingMode(null);
      setIsChangingMode(false);
    }
  }, [telemetry?.mode, pendingMode]);

  const handleModeClick = async (mode: ControlMode) => {
    if (isControlDisabled || isChangingMode || currentMode === mode) return;
    try {
      setIsChangingMode(true);
      setPendingMode(mode);
      await onSetMode(mode);
    } catch {
      setIsChangingMode(false);
      setPendingMode(null);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderValue(Number(e.target.value));
  };

  const handleSliderCommit = async () => {
    if (isControlDisabled || isChangingBrightness || currentMode !== 'MANUAL') return;
    try {
      setIsChangingBrightness(true);
      await onSetBrightness(sliderValue);
    } finally {
      setIsChangingBrightness(false);
    }
  };

  const handlePresetClick = async (presetPercent: number) => {
    if (isControlDisabled || isChangingBrightness || currentMode !== 'MANUAL') return;
    try {
      setSliderValue(presetPercent);
      setIsChangingBrightness(true);
      await onSetBrightness(presetPercent);
    } finally {
      setIsChangingBrightness(false);
    }
  };

  const isManual = currentMode === 'MANUAL';
  const targetPwmForSlider = percentToPwm(sliderValue);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm transition-colors relative overflow-hidden">
      {/* Disabled Overlay */}
      {isControlDisabled && (
        <div className="absolute inset-0 z-20 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center p-4 rounded-2xl transition-all">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg max-w-sm text-center">
            <Lock className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <div className="text-sm font-bold text-slate-900 dark:text-white">Bảng điều khiển đang khóa</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {disabledReason || 'Không thể gửi lệnh khi mất kết nối hoặc mất dữ liệu từ ESP32.'}
            </p>
          </div>
        </div>
      )}

      {/* Card Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-500" />
            Điều khiển chiếu sáng
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Lựa chọn chế độ làm việc và điều chỉnh độ sáng đèn trần & bàn
          </p>
        </div>

        {/* Command Sending Indicator */}
        {(isChangingMode || isChangingBrightness) && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Đang gửi lệnh tới ESP32...</span>
          </div>
        )}
      </div>

      {/* Mode Selection Tabs */}
      <div className="mb-6">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
          Chế độ hoạt động
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* AUTO button */}
          <button
            type="button"
            disabled={isControlDisabled || isChangingMode}
            onClick={() => handleModeClick('AUTO')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
              currentMode === 'AUTO'
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500/50 shadow-sm ring-2 ring-blue-500/20'
                : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <SunMedium className="w-4 h-4 text-blue-500" />
                Tự động (AUTO)
              </span>
              {currentMode === 'AUTO' && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Tự bật/tắt theo hiện diện PIR và điều chỉnh PWM theo cảm biến ánh sáng LDR.
            </p>
          </button>

          {/* MANUAL button */}
          <button
            type="button"
            disabled={isControlDisabled || isChangingMode}
            onClick={() => handleModeClick('MANUAL')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
              currentMode === 'MANUAL'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500/50 shadow-sm ring-2 ring-amber-500/20'
                : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-amber-500" />
                Thủ công (MANUAL)
              </span>
              {currentMode === 'MANUAL' && <CheckCircle2 className="w-4 h-4 text-amber-500" />}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Cho phép bạn tùy chỉnh độ sáng tùy ý qua thanh trượt và các nút thiết lập nhanh.
            </p>
          </button>

          {/* AI button */}
          <button
            type="button"
            disabled={isControlDisabled || isChangingMode}
            onClick={() => handleModeClick('AI')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
              currentMode === 'AI'
                ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500/50 shadow-sm ring-2 ring-purple-500/20'
                : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-500" />
                Trí tuệ nhân tạo (AI)
              </span>
              {currentMode === 'AI' && <CheckCircle2 className="w-4 h-4 text-purple-500" />}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Dự đoán độ sáng thông minh dựa trên thói quen đã học và môi trường thời gian thực.
            </p>
          </button>
        </div>
      </div>

      {/* Brightness Section */}
      <div className={`p-4 rounded-xl border transition-all ${
        isManual
          ? 'bg-slate-50/80 dark:bg-slate-800/50 border-amber-500/30'
          : 'bg-slate-50/40 dark:bg-slate-850/40 border-slate-200 dark:border-slate-800 opacity-75'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Độ sáng đèn trần</span>
              {!isManual && (
                <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  (Chỉ điều chỉnh khi ở MANUAL)
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Giá trị PWM: <span className="font-mono font-bold text-slate-900 dark:text-white">{targetPwmForSlider} / 255</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
              {sliderValue}%
            </span>
          </div>
        </div>

        {/* Range Slider */}
        <div className="mb-4">
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={sliderValue}
            disabled={!isManual || isControlDisabled || isChangingBrightness}
            onChange={handleSliderChange}
            onMouseUp={handleSliderCommit}
            onTouchEnd={handleSliderCommit}
            className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
          />
        </div>

        {/* Quick Preset Buttons */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {[
            { label: '0%', text: 'Tắt', val: 0 },
            { label: '25%', text: 'Dịu', val: 25 },
            { label: '50%', text: 'Vừa', val: 50 },
            { label: '75%', text: 'Sáng', val: 75 },
            { label: '100%', text: 'Tối đa', val: 100 },
          ].map((preset) => (
            <button
              key={preset.val}
              type="button"
              disabled={!isManual || isControlDisabled || isChangingBrightness}
              onClick={() => handlePresetClick(preset.val)}
              className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                sliderValue === preset.val && isManual
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-bold scale-[1.02]'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              <div>{preset.label}</div>
              <div className="text-[10px] opacity-75 font-normal">{preset.text}</div>
            </button>
          ))}
        </div>

        {/* Desk Lamp Auto-Ratio Notice */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Lamp className="w-4 h-4 text-amber-500 shrink-0" />
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Đèn bàn (Tỷ lệ 70% tự động):</span>
              <span className="text-slate-500 dark:text-slate-400 ml-1.5">
                Firmware tự động điều chỉnh đèn bàn theo ~70% đèn trần.
              </span>
            </div>
          </div>
          <div className="font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0">
            {deskLampPwm} PWM ({deskLampPercent}%)
          </div>
        </div>
      </div>
    </div>
  );
};
