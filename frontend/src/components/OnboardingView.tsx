import React, { useState, useEffect } from 'react';
import {
  Wifi,
  Radio,
  KeyRound,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  X
} from 'lucide-react';

interface OnboardingViewProps {
  onPair: (code: string) => Promise<void>;
  onCancel?: () => void;
  isModal?: boolean;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  onPair,
  onCancel,
  isModal = false,
}) => {
  const [code, setCode] = useState<string>('');
  const [isPairing, setIsPairing] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(15);
  const [error, setError] = useState<string | null>(null);

  // Handle countdown when pairing
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPairing && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
    } else if (isPairing && countdown === 0) {
      setIsPairing(false);
      setError('Hết thời gian chờ (15 giây). Không nhận được phản hồi từ ESP32.');
    }
    return () => clearTimeout(timer);
  }, [isPairing, countdown]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only accept numeric characters, max 6 digits
    const numeric = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(numeric);
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Vui lòng nhập đầy đủ 6 chữ số hiển thị trên màn hình OLED.');
      return;
    }

    try {
      setIsPairing(true);
      setCountdown(15);
      setError(null);
      await onPair(code);
    } catch (err: unknown) {
      setIsPairing(false);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  };

  const handleRetry = () => {
    setError(null);
    setCountdown(15);
  };

  const containerClasses = isModal
    ? 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative'
    : 'max-w-xl mx-auto my-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm transition-colors';

  return (
    <div className={containerClasses}>
      {isModal && onCancel && (
        <button
          onClick={onCancel}
          disabled={isPairing}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center mb-4 ring-8 ring-amber-500/5">
          <KeyRound className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Kết nối bộ điều khiển đèn
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Ghép nối thiết bị ESP32 AI Smart Lighting của bạn thông qua mã xác thực ngẫu nhiên hiển thị trên màn hình OLED.
        </p>
      </div>

      {/* Step Instructions */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 sm:p-5 mb-8 border border-slate-100 dark:border-slate-800/60">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Các bước kích hoạt ghép nối trên ESP32
        </div>
        <ol className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
          <li className="flex items-start gap-3">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-xs font-bold shrink-0 mt-0.5">
              1
            </span>
            <span>Đảm bảo bo mạch ESP32 đã kết nối Wi-Fi thành công.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-xs font-bold shrink-0 mt-0.5">
              2
            </span>
            <span>
              Giữ nút <strong>MODE</strong> trong ít nhất <strong>3 giây</strong> (hoặc nhấn nhanh 5 lần).
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-xs font-bold shrink-0 mt-0.5">
              3
            </span>
            <span>
              Màn hình OLED sẽ hiện mã 6 chữ số ngẫu nhiên. Nhập mã đó vào ô bên dưới:
            </span>
          </li>
        </ol>
      </div>

      {/* Pairing Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 text-center">
            Mã ghép nối (6 chữ số)
          </label>
          <div className="relative max-w-xs mx-auto">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoFocus
              placeholder="VD: 123456"
              value={code}
              disabled={isPairing}
              onChange={handleInputChange}
              className="w-full text-center tracking-[0.5em] text-3xl font-black font-mono py-3.5 px-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 focus:outline-none transition-all disabled:opacity-50"
            />
          </div>
        </div>

        {/* Pairing in progress with countdown */}
        {isPairing && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center animate-in fade-in">
            <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-300 font-semibold text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang tìm kiếm và xác thực với ESP32...</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-mono mt-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Thời gian còn lại: <strong>{countdown} giây</strong></span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              ESP32 đang phát thông tin ghép nối mỗi 2 giây tới máy chủ...
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-sm text-rose-800 dark:text-rose-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold">Ghép nối thất bại</div>
              <div className="text-xs opacity-90 mt-0.5 leading-relaxed">{error}</div>
              <button
                type="button"
                onClick={handleRetry}
                className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400 underline hover:no-underline cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isPairing || code.length !== 6}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-sm shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            {isPairing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xử lý ghép nối...</span>
              </>
            ) : (
              <>
                <span>Ghép thiết bị</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
