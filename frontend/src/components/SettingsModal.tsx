import React from 'react';
import { Device, MqttStatusPayload } from '../types/index.js';
import { Settings, X, Plus, Trash2, Cpu, Radio, Server, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: Device[];
  activeDeviceId: string | null;
  onSelectDevice: (id: string) => void;
  onOpenPairing: () => void;
  onForgetDevice: () => void;
  isServerConnected: boolean;
  mqttStatus: MqttStatusPayload;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  devices,
  activeDeviceId,
  onSelectDevice,
  onOpenPairing,
  onForgetDevice,
  isServerConnected,
  mqttStatus,
}) => {
  if (!isOpen) return null;

  const currentDevice = devices.find((d) => d.deviceId === activeDeviceId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-[#0e1523] border border-[#1b2537] rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative text-slate-200 my-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#151f31] border border-[#212f47] flex items-center justify-center text-amber-400">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white leading-tight">Cài đặt thiết bị & Hệ thống</h3>
            <p className="text-xs text-slate-400 mt-0.5">Quản lý kết nối ESP32 và broker MQTT</p>
          </div>
        </div>

        {/* Device Switcher / List */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
              Danh sách thiết bị đã lưu ({devices.length})
            </label>
            <button
              onClick={() => {
                onClose();
                onOpenPairing();
              }}
              className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm mới</span>
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {devices.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-4 bg-[#121927] rounded-xl border border-[#1b263b]">
                Chưa có thiết bị nào. Nhấn &quot;Thêm mới&quot; để ghép nối.
              </div>
            ) : (
              devices.map((device) => {
                const isSelected = device.deviceId === activeDeviceId;
                const isOnline = device.availability === 'online';

                return (
                  <div
                    key={device.deviceId}
                    onClick={() => onSelectDevice(device.deviceId)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#151f32] border-amber-500/50 shadow-sm'
                        : 'bg-[#121927] border-[#1b263b] hover:bg-[#162032] hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                        }`}
                      />
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{device.name}</span>
                          {isSelected && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold">
                              ĐANG CHỌN
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          ID: {device.deviceId} · {isOnline ? 'Online' : 'Offline'}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="text-amber-400">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Current Active Device Actions */}
        {currentDevice && (
          <div className="mb-6 p-4 rounded-xl bg-[#121927] border border-[#1e2a3f]">
            <div className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span>Thiết bị hiện tại: {currentDevice.name}</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Bạn có thể xóa hoặc hủy liên kết thiết bị này khỏi danh sách quản lý.
            </p>

            <button
              onClick={onForgetDevice}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-900/60 bg-rose-950/20 hover:bg-rose-950/50 text-rose-400 text-xs font-semibold tracking-wide transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Quên thiết bị ({currentDevice.deviceId})</span>
            </button>
          </div>
        )}

        {/* Infrastructure / MQTT Status */}
        <div className="mb-6 p-4 rounded-xl bg-[#0b101a] border border-[#182335] space-y-2.5">
          <div className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-400" />
            <span>Trạng thái kết nối</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-slate-500" />
              Máy chủ Node.js &amp; WebSocket:
            </span>
            <span
              className={`font-mono font-bold ${
                isServerConnected ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isServerConnected ? 'ĐÃ KẾT NỐI' : 'MẤT KẾT NỐI'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-slate-500" />
              MQTT Broker (EMQX):
            </span>
            <span
              className={`font-mono font-bold ${
                mqttStatus.connected ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {mqttStatus.connected ? 'ĐÃ KẾT NỐI' : 'ĐANG KẾT NỐI LẠI'}
            </span>
          </div>

          <div className="pt-2 border-t border-[#182335] text-[11px] font-mono text-slate-400 break-all">
            Broker URL: {mqttStatus.broker}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold tracking-wide transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
