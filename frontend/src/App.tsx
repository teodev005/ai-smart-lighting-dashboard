import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Device,
  TelemetryData,
  ControlMode,
  FanMode,
  ChartDataPoint,
  ToastMessage,
  WebSocketMessage,
  ConnectionStatus
} from './types/index.js';
import {
  fetchDevices,
  pairDevice,
  deleteDevice,
  setDeviceMode,
  setDeviceBrightness,
  resetDeviceAi,
  setDeviceFanMode,
  setDeviceFanSpeed
} from './services/api.js';
import { useWebSocket } from './hooks/useWebSocket.js';
import { calculateConnectionState, formatTimeShort } from './utils/formatters.js';

import { Navbar } from './components/Navbar.js';
import { ChamberTelemetryCard } from './components/ChamberTelemetryCard.js';
import { TactileControlsCard } from './components/TactileControlsCard.js';
import { MetricsGrid } from './components/MetricsGrid.js';
import { TelemetryCharts } from './components/TelemetryCharts.js';
import { OnboardingView } from './components/OnboardingView.js';
import { ConfirmationModal } from './components/ConfirmationModal.js';
import { SettingsModal } from './components/SettingsModal.js';
import { ToastContainer } from './components/ToastContainer.js';
import { ShapeGrid } from './components/ShapeGrid.js';
import { FanControlCard } from './components/FanControlCard.js';

export default function App() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [telemetryMap, setTelemetryMap] = useState<Record<string, TelemetryData>>({});
  const [historyMap, setHistoryMap] = useState<Record<string, ChartDataPoint[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [nowMs, setNowMs] = useState<number>(Date.now());

  // Authoritative manual brightness override to prevent in-flight stale telemetry from rubber-banding
  const manualOverrideRef = useRef<{
    deviceId: string;
    brightness: number;
    pwm: number;
    until: number;
  } | null>(null);

  // Branding Title & Subtitle
  const brandTitle = 'BẢNG ĐIỀU KHIỂN AI SMART LIGHTING';
  const brandSubtitle = 'HỆ THỐNG CHIẾU SÁNG THÔNG MINH';

  // UI Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState<boolean>(false);
  const [isForgetModalOpen, setIsForgetModalOpen] = useState<boolean>(false);
  const [isResetAiModalOpen, setIsResetAiModalOpen] = useState<boolean>(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const recentToastsRef = useRef<Map<string, number>>(new Map());

  const addToast = useCallback((type: ToastMessage['type'], title: string, message: string, duration = 4000) => {
    const key = `${type}:${title}:${message}`;
    const now = Date.now();
    const last = recentToastsRef.current.get(key) || 0;
    if (now - last < 1500) {
      // Suppress duplicate notification within 1.5 seconds
      return;
    }
    recentToastsRef.current.set(key, now);

    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-3), { id, type, title, message, duration }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Periodic 1s clock to update age and status dynamically
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper to ingest telemetry smoothly with in-flight stale packet masking
  const ingestTelemetry = useCallback((deviceId: string, telemetry: TelemetryData) => {
    let effectiveTelemetry = telemetry;
    const override = manualOverrideRef.current;
    if (override && override.deviceId === deviceId && Date.now() < override.until) {
      if (telemetry.brightness === override.brightness) {
        // Hardware caught up! Clear override
        manualOverrideRef.current = null;
      } else {
        // Mask stale in-flight telemetry
        effectiveTelemetry = {
          ...telemetry,
          brightness: override.brightness,
          pwmCurrent: override.pwm,
          pwmTarget: override.pwm,
          manualPwm: override.pwm,
          deskLampPwm: Math.round(override.pwm * 0.7),
        };
      }
    }

    setTelemetryMap((prev) => ({
      ...prev,
      [deviceId]: effectiveTelemetry,
    }));

    setDevices((prev) =>
      prev.map((d) =>
        d.deviceId === deviceId
          ? {
              ...d,
              availability: 'online',
              lastTelemetry: effectiveTelemetry,
              lastTelemetryTime: effectiveTelemetry.receivedAt || Date.now(),
            }
          : d
      )
    );

    setHistoryMap((prev) => {
      const existing = prev[deviceId] || [];
      const newPoint: ChartDataPoint = {
        timeStr: formatTimeShort(effectiveTelemetry.receivedAt || Date.now()),
        timestamp: effectiveTelemetry.receivedAt || Date.now(),
        darkness: effectiveTelemetry.darkness,
        brightness: effectiveTelemetry.brightness,
        temperature: effectiveTelemetry.temperature,
        humidity: effectiveTelemetry.humidity,
        pwmCurrent: effectiveTelemetry.pwmCurrent,
      };
      // Keep last 60 points
      return {
        ...prev,
        [deviceId]: [...existing, newPoint].slice(-60),
      };
    });
  }, []);

  // Handle incoming WebSocket messages
  const handleWsMessage = useCallback((msg: WebSocketMessage) => {
    if (msg.type === 'devices-list') {
      const devList = Array.isArray(msg?.payload?.devices) ? msg.payload.devices : [];
      if (devList.length > 0) {
        setDevices((prev) => {
          const prevList = Array.isArray(prev) ? prev : [];
          // preserve existing runtime telemetry if newer
          return devList.map((newDev) => {
            const old = prevList.find((o) => o.deviceId === newDev.deviceId);
            if (old?.lastTelemetryTime && (!newDev.lastTelemetryTime || old.lastTelemetryTime > newDev.lastTelemetryTime)) {
              return { ...newDev, lastTelemetryTime: old.lastTelemetryTime, lastTelemetry: old.lastTelemetry };
            }
            return newDev;
          });
        });
        setActiveDeviceId((prev) => {
          if (prev && devList.some((d) => d.deviceId === prev)) return prev;
          return devList.length > 0 ? devList[0].deviceId : null;
        });
      }
    } else if (msg.type === 'device-availability') {
      const { deviceId, availability } = msg.payload || {};
      if (!deviceId) return;
      setDevices((prev) =>
        (prev || []).map((d) =>
          d.deviceId === deviceId
            ? { ...d, availability, lastAvailabilityTime: msg.payload?.timestamp }
            : d
        )
      );
    } else if (msg.type === 'device-telemetry') {
      if (msg.payload?.deviceId && msg.payload?.telemetry) {
        ingestTelemetry(msg.payload.deviceId, msg.payload.telemetry);
      }
    } else if (msg.type === 'command-result') {
      const { command, success, message } = msg.payload || {};
      if (success) {
        addToast('success', 'Lệnh thành công', message || '');
      } else {
        addToast('error', 'Lỗi gửi lệnh', message || '');
      }
    }
  }, [ingestTelemetry, addToast]);

  const { isServerConnected, mqttStatus } = useWebSocket({
    onMessage: handleWsMessage,
  });

  // Initial load
  useEffect(() => {
    let isMounted = true;
    fetchDevices()
      .then((data) => {
        if (!isMounted) return;
        const deviceList = Array.isArray(data?.devices) ? data.devices : [];
        setDevices(deviceList);
        if (deviceList.length > 0) {
          setActiveDeviceId((prev) => prev || deviceList[0].deviceId);
          const initialMap: Record<string, TelemetryData> = {};
          for (const d of deviceList) {
            if (d.lastTelemetry) {
              initialMap[d.deviceId] = d.lastTelemetry;
            }
          }
          setTelemetryMap(initialMap);
        }
      })
      .catch((err) => {
        console.warn('Lỗi tải danh sách thiết bị:', err);
        if (isMounted) setDevices([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    const handleUrlChange = () => {
      fetchDevices()
        .then((data) => {
          if (!isMounted) return;
          const list = Array.isArray(data?.devices) ? data.devices : [];
          setDevices(list);
          if (list.length > 0) {
            setActiveDeviceId((prev) => (list.some((d) => d.deviceId === prev) ? prev : list[0].deviceId));
          }
        })
        .catch(() => {});
    };
    window.addEventListener('backend-url-changed', handleUrlChange);

    return () => {
      isMounted = false;
      window.removeEventListener('backend-url-changed', handleUrlChange);
    };
  }, []);

  // Dual-channel background sync every 2.5 seconds to guarantee zero visual stutter
  useEffect(() => {
    const pollTimer = setInterval(() => {
      fetchDevices()
        .then((data) => {
          if (!data?.devices || !Array.isArray(data.devices) || data.devices.length === 0) return;
          for (const d of data.devices) {
            if (d.lastTelemetry) {
              const override = manualOverrideRef.current;
              let effective = d.lastTelemetry;
              if (override && override.deviceId === d.deviceId && Date.now() < override.until) {
                if (d.lastTelemetry.brightness === override.brightness) {
                  manualOverrideRef.current = null;
                } else {
                  effective = {
                    ...d.lastTelemetry,
                    brightness: override.brightness,
                    pwmCurrent: override.pwm,
                    pwmTarget: override.pwm,
                    manualPwm: override.pwm,
                    deskLampPwm: Math.round(override.pwm * 0.7),
                  };
                }
              }

              setTelemetryMap((prev) => {
                const current = prev[d.deviceId];
                if (!current || (d.lastTelemetryTime && d.lastTelemetryTime > (current.receivedAt || 0))) {
                  return { ...prev, [d.deviceId]: effective };
                }
                return prev;
              });
            }
          }
        })
        .catch(() => {});
    }, 2500);

    return () => clearInterval(pollTimer);
  }, []);

  // Currently active device
  const activeDevice = useMemo(() => {
    return (devices || []).find((d) => d.deviceId === activeDeviceId);
  }, [devices, activeDeviceId]);

  // Current telemetry for active device
  const currentTelemetry = useMemo(() => {
    if (!activeDeviceId) return undefined;
    return telemetryMap[activeDeviceId] || activeDevice?.lastTelemetry;
  }, [activeDeviceId, telemetryMap, activeDevice]);

  // Current connection state
  const connectionState: ConnectionStatus = useMemo(() => {
    if (!activeDevice) return 'disconnected_server';
    const effectiveLastTelemetryTime = currentTelemetry?.receivedAt || activeDevice.lastTelemetryTime;
    return calculateConnectionState(
      isServerConnected,
      mqttStatus.connected,
      activeDevice.availability,
      effectiveLastTelemetryTime,
      nowMs,
      10000
    );
  }, [isServerConnected, mqttStatus.connected, activeDevice, currentTelemetry?.receivedAt, nowMs]);

  const lastTelemetryAgeSec = currentTelemetry?.receivedAt
    ? Math.max(0, Math.floor((nowMs - currentTelemetry.receivedAt) / 1000))
    : activeDevice?.lastTelemetryTime
    ? Math.max(0, Math.floor((nowMs - activeDevice.lastTelemetryTime) / 1000))
    : undefined;

  // Control lock check
  const isControlDisabled = useMemo(() => {
    if (!isServerConnected) return true;
    if (!mqttStatus.connected) return true;
    if (!activeDevice) return true;
    if (activeDevice.availability === 'offline') return true;
    const effectiveTime = currentTelemetry?.receivedAt || activeDevice.lastTelemetryTime;
    if (!effectiveTime) return true;
    if (nowMs - effectiveTime > 10000) return true;
    return false;
  }, [isServerConnected, mqttStatus.connected, activeDevice, currentTelemetry?.receivedAt, nowMs]);

  const controlDisabledReason = useMemo(() => {
    if (!isServerConnected) return 'Mất kết nối WebSocket tới máy chủ Node.js.';
    if (!mqttStatus.connected) return 'Máy chủ đang kết nối lại tới MQTT broker.';
    if (!activeDevice) return 'Chưa chọn thiết bị.';
    if (activeDevice.availability === 'offline') return 'Thiết bị ESP32 đang ngoại tuyến (Offline).';
    const effectiveTime = currentTelemetry?.receivedAt || activeDevice.lastTelemetryTime;
    if (!effectiveTime) return 'Đang chờ gói dữ liệu đầu tiên từ ESP32...';
    if (nowMs - effectiveTime > 10000) {
      return `Mất dữ liệu từ ESP32 (${lastTelemetryAgeSec}s > 10s).`;
    }
    return '';
  }, [isServerConnected, mqttStatus.connected, activeDevice, currentTelemetry?.receivedAt, nowMs, lastTelemetryAgeSec]);

  // Handlers
  const handlePair = async (code: string) => {
    const newDevice = await pairDevice(code);
    addToast('success', 'Ghép nối thành công!', `Đã kết nối với thiết bị ${newDevice.deviceId}`);
    setDevices((prev) => {
      const exists = prev.some((d) => d.deviceId === newDevice.deviceId);
      return exists ? prev : [...prev, newDevice];
    });
    setActiveDeviceId(newDevice.deviceId);
    setIsPairingModalOpen(false);
  };

  const handleForgetConfirm = async () => {
    if (!activeDeviceId) return;
    try {
      await deleteDevice(activeDeviceId);
      addToast('info', 'Đã quên thiết bị', `Đã xóa thiết bị ${activeDeviceId} khỏi hệ thống.`);
      const remaining = devices.filter((d) => d.deviceId !== activeDeviceId);
      setDevices(remaining);
      setActiveDeviceId(remaining.length > 0 ? remaining[0].deviceId : null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast('error', 'Lỗi khi quên thiết bị', msg);
    } finally {
      setIsForgetModalOpen(false);
    }
  };

  const handleResetAiConfirm = async () => {
    if (!activeDeviceId) return;
    try {
      await resetDeviceAi(activeDeviceId);
      addToast('info', 'Đã gửi lệnh', 'Đã gửi lệnh khôi phục dữ liệu AI mặc định.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast('error', 'Lỗi reset AI', msg);
    } finally {
      setIsResetAiModalOpen(false);
    }
  };

  const handleSetMode = async (mode: ControlMode) => {
    if (!activeDeviceId) return;
    setTelemetryMap((prev) => {
      const cur = prev[activeDeviceId];
      if (!cur) return prev;
      return { ...prev, [activeDeviceId]: { ...cur, mode } };
    });
    await setDeviceMode(activeDeviceId, mode);
  };

  const handleSetBrightness = async (brightness: number) => {
    if (!activeDeviceId) return;
    const clamped = Math.max(0, Math.min(100, Math.round(brightness)));
    const pwm = Math.round((clamped / 100) * 255);

    // Lock manual override for 8 seconds
    manualOverrideRef.current = {
      deviceId: activeDeviceId,
      brightness: clamped,
      pwm,
      until: Date.now() + 8000,
    };

    setTelemetryMap((prev) => {
      const cur = prev[activeDeviceId];
      if (!cur) return prev;
      return {
        ...prev,
        [activeDeviceId]: {
          ...cur,
          brightness: clamped,
          pwmCurrent: pwm,
          pwmTarget: pwm,
          manualPwm: pwm,
          deskLampPwm: Math.round(pwm * 0.7),
          receivedAt: Date.now(),
        },
      };
    });
    await setDeviceBrightness(activeDeviceId, clamped, false);
  };

  const handleSetFanMode = async (mode: FanMode) => {
    if (!activeDeviceId) return;
    setTelemetryMap((prev) => prev[activeDeviceId]
      ? { ...prev, [activeDeviceId]: { ...prev[activeDeviceId], fanMode: mode } } : prev);
    await setDeviceFanMode(activeDeviceId, mode);
  };

  const handleSetFanSpeed = async (speed: number) => {
    if (!activeDeviceId) return;
    const value = Math.max(0, Math.min(100, Math.round(speed)));
    setTelemetryMap((prev) => prev[activeDeviceId] ? {
      ...prev,
      [activeDeviceId]: {
        ...prev[activeDeviceId], fanMode: 'MANUAL', fanManualPercent: value,
        fanPercent: value, fanTargetPercent: value, fanPwm: Math.round(value * 2.55), receivedAt: Date.now(),
      },
    } : prev);
    await setDeviceFanSpeed(activeDeviceId, value);
  };

  // If loading initially
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070b12] text-slate-200">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-mono font-semibold tracking-wide">Đang khởi động AI Smart Lighting...</p>
        </div>
      </div>
    );
  }

  // If no devices exist at all -> Onboarding Screen
  const hasNoDevices = !Array.isArray(devices) || devices.length === 0;

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col font-sans transition-colors duration-200 selection:bg-amber-500/20 selection:text-amber-400 relative">
      {/* ReactBits Squares / ShapeGrid Animated Background */}
      <ShapeGrid
        squareSize={36}
        speed={0.5}
        direction="diagonal"
        borderColor="rgba(70, 60, 95, 0.35)"
        hoverFillColor="rgba(245, 158, 11, 0.25)"
      />

      {/* Main app foreground */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <Navbar
          devices={devices}
          activeDeviceId={activeDeviceId}
          connectionState={connectionState}
          lastTelemetryAgeSec={lastTelemetryAgeSec}
          onOpenSettings={() => setIsSettingsOpen(true)}
          brandTitle={brandTitle}
          brandSubtitle={brandSubtitle}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-7">
          {!isServerConnected && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-300">
              <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                <div className="text-xs">
                  <span className="font-bold text-amber-200">Chưa kết nối máy chủ Backend:</span> Ứng dụng chưa nhận được tín hiệu từ máy chủ Node.js/WebSocket. Nếu bạn đang chạy web trên Vercel, hãy vào Cài đặt để nhập URL backend đã triển khai.
                </div>
              </div>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-wide transition-all shrink-0 cursor-pointer shadow-md shadow-amber-500/10 active:scale-95"
              >
                Cấu hình URL
              </button>
            </div>
          )}

          {hasNoDevices ? (
            <OnboardingView
              onPair={handlePair}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          ) : activeDevice ? (
            <div className="space-y-6">
              {/* Top Row: Left Chamber Telemetry Card + Right Tactile Controls Card */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6">
                  <ChamberTelemetryCard telemetry={currentTelemetry} />
                </div>
                <div className="lg:col-span-6">
                  <TactileControlsCard
                    telemetry={currentTelemetry}
                    isControlDisabled={isControlDisabled}
                    disabledReason={controlDisabledReason}
                    onSetMode={handleSetMode}
                    onSetBrightness={handleSetBrightness}
                    onResetAi={() => setIsResetAiModalOpen(true)}
                  />
                </div>
              </div>

              <FanControlCard
                telemetry={currentTelemetry}
                disabled={isControlDisabled}
                disabledReason={controlDisabledReason}
                onSetMode={handleSetFanMode}
                onSetSpeed={handleSetFanSpeed}
              />

              {/* Middle Row: 4 Metric Cards */}
              <MetricsGrid telemetry={currentTelemetry} />

              {/* Bottom Row: Waveform Chart */}
              <TelemetryCharts history={historyMap[activeDevice.deviceId] || []} />
            </div>
          ) : null}
        </main>

        {/* Footer */}
        <footer className="border-t border-[#121a28]/80 py-4 text-center text-xs font-mono text-slate-400">
          <p>Giám sát cảm biến · Điều chỉnh độ sáng · Điều khiển thời gian thực</p>
        </footer>
      </div>

      {/* Modals & Dialogs */}
      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        devices={devices}
        activeDeviceId={activeDeviceId}
        onSelectDevice={(id) => {
          setActiveDeviceId(id);
          setIsSettingsOpen(false);
        }}
        onOpenPairing={() => {
          setIsSettingsOpen(false);
          setIsPairingModalOpen(true);
        }}
        onForgetDevice={() => {
          setIsSettingsOpen(false);
          setIsForgetModalOpen(true);
        }}
        isServerConnected={isServerConnected}
        mqttStatus={mqttStatus}
      />

      {/* Pairing Modal */}
      {isPairingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <OnboardingView
            isModal={true}
            onPair={handlePair}
            onCancel={() => setIsPairingModalOpen(false)}
            onOpenSettings={() => {
              setIsPairingModalOpen(false);
              setIsSettingsOpen(true);
            }}
          />
        </div>
      )}

      {/* Forget Device Confirmation Modal */}
      <ConfirmationModal
        isOpen={isForgetModalOpen}
        title="Quên thiết bị này?"
        message={`Bạn có chắc chắn muốn quên thiết bị ${activeDevice?.name || activeDeviceId}? \n\nThiết bị sẽ bị xóa khỏi cơ sở dữ liệu và dừng đồng bộ MQTT. Bạn sẽ cần ghép nối lại bằng mã 6 số nếu muốn kết nối lại sau này.`}
        confirmLabel="Quên thiết bị"
        cancelLabel="Hủy"
        isDestructive={true}
        onConfirm={handleForgetConfirm}
        onCancel={() => setIsForgetModalOpen(false)}
      />

      {/* Reset AI Confirmation Modal */}
      <ConfirmationModal
        isOpen={isResetAiModalOpen}
        title="Khôi phục dữ liệu AI mặc định?"
        message="Khôi phục bộ dữ liệu AI mặc định và xóa các mẫu đã cá nhân hóa?"
        confirmLabel="Khôi phục ngay"
        cancelLabel="Hủy"
        isDestructive={false}
        onConfirm={handleResetAiConfirm}
        onCancel={() => setIsResetAiModalOpen(false)}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
