import React from 'react';
import { Device, ConnectionStatus, MqttStatusPayload } from '../types/index.js';
import { Settings } from 'lucide-react';
import { AiSmartLightingLogo } from './AiSmartLightingLogo.js';

interface NavbarProps {
  devices: Device[];
  activeDeviceId: string | null;
  connectionState: ConnectionStatus;
  lastTelemetryAgeSec?: number;
  onOpenSettings: () => void;
  brandTitle: string;
  brandSubtitle: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  devices,
  activeDeviceId,
  connectionState,
  lastTelemetryAgeSec,
  onOpenSettings,
  brandTitle,
  brandSubtitle,
}) => {
  // Status badge rendering matching the aesthetic
  const renderStatusBadge = () => {
    if (connectionState === 'online') {
      return (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0a2318] border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide transition-all duration-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Thiết bị hoạt động</span>
        </div>
      );
    }

    if (connectionState === 'stale_data') {
      return (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2a1c09] border border-amber-500/40 text-amber-400 text-xs font-semibold tracking-wide transition-all duration-300">
          <span className="h-2 w-2 rounded-full bg-amber-500"></span>
          <span>Mất dữ liệu ({lastTelemetryAgeSec || 10}s)</span>
        </div>
      );
    }

    if (connectionState === 'disconnected_server') {
      return (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2a0e14] border border-rose-500/40 text-rose-400 text-xs font-semibold tracking-wide transition-all duration-300">
          <span className="h-2 w-2 rounded-full bg-rose-500"></span>
          <span>Mất kết nối máy chủ</span>
        </div>
      );
    }

    if (connectionState === 'connecting_broker') {
      return (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0d2137] border border-sky-500/40 text-sky-400 text-xs font-semibold tracking-wide transition-all duration-300">
          <span className="h-2 w-2 rounded-full bg-sky-500 animate-ping"></span>
          <span>Đang kết nối Broker...</span>
        </div>
      );
    }

    if (connectionState === 'waiting_esp32') {
      return (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111f38] border border-blue-500/40 text-blue-400 text-xs font-semibold tracking-wide transition-all duration-300">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
          <span>Đang chờ ESP32...</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1e232d] border border-slate-700 text-slate-400 text-xs font-semibold tracking-wide transition-all duration-300">
        <span className="h-2 w-2 rounded-full bg-slate-500"></span>
        <span>ESP32 ngoại tuyến</span>
      </div>
    );
  };

  return (
    <header className="w-full border-b border-[#151d2c] bg-[#090e17]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Brand identity with uploaded logo */}
        <div className="flex items-center gap-3.5 group cursor-pointer" onClick={onOpenSettings} title="Cài đặt hệ thống">
          <div className="w-10 h-10 rounded-xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-center shadow-inner group-hover:border-cyan-500/40 transition-colors">
            <AiSmartLightingLogo variant="icon" size={28} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm sm:text-base tracking-wide text-white uppercase group-hover:text-cyan-200 transition-colors">
                {brandTitle || 'BẢNG ĐIỀU KHIỂN AI SMART LIGHTING'}
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] font-mono tracking-widest uppercase text-slate-400 font-medium group-hover:text-slate-300 transition-colors">
              {brandSubtitle || 'HỆ THỐNG CHIẾU SÁNG THÔNG MINH'}
            </div>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Status pill */}
          {renderStatusBadge()}

          {/* Settings button */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#121a28] border border-[#1e293b] hover:border-slate-700 text-slate-300 hover:text-white transition-all text-xs font-medium cursor-pointer shadow-sm active:scale-95"
            title="Cài đặt thiết bị & hệ thống"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Cài đặt</span>
          </button>
        </div>
      </div>
    </header>
  );
};
