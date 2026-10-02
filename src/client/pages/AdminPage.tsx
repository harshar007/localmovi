import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  HardDrive, 
  Activity, 
  Radio, 
  Users, 
  FolderPlus, 
  Trash2, 
  RefreshCw, 
  Power, 
  Terminal, 
  QrCode, 
  Check, 
  Folder, 
  Server, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Sparkles,
  Smartphone,
  Laptop,
  Tv,
  Monitor
} from 'lucide-react';
import { api } from '../api/apiClient';
import { SystemStats, LibraryFolderItem, ServerLogEntry } from '../../shared/types';
import { useSocket } from '../context/SocketContext';
import { QRCodeModal } from '../components/QRCodeModal';

export const AdminPage: React.FC = () => {
  const { scanProgress, recentLogs } = useSocket();

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [folders, setFolders] = useState<LibraryFolderItem[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [newFolderPath, setNewFolderPath] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [loading, setLoading] = useState(true);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      const [sysStats, folderList, deviceList] = await Promise.all([
        api.getStats().catch(() => null),
        api.getFolders().catch(() => []),
        api.getDevices().catch(() => []),
      ]);
      if (sysStats) setStats(sysStats);
      setFolders(folderList);
      setDevices(deviceList);
    } catch (err) {
      console.error('Failed to load stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleScanAll = async () => {
    try {
      await api.scanAllFolders();
      setStatusToast('Library scanning started');
      setTimeout(() => setStatusToast(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1000) {
      return `${(gb / 1024).toFixed(1)} TB`;
    }
    return `${gb.toFixed(1)} GB`;
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return '0m';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const getDeviceIcon = (type: string) => {
    if (type === 'mobile') return Smartphone;
    if (type === 'tablet') return Smartphone;
    if (type === 'host') return Tv;
    return Monitor;
  };

  const filteredLogs = recentLogs.filter((l) => {
    if (logFilter === 'all') return true;
    return l.level === logFilter;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-fade-in text-[#E3E3E3]">
      {/* Toast */}
      {statusToast && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-2xl bg-emerald-600 text-white text-xs font-semibold shadow-lg animate-fade-in">
          {statusToast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Server className="w-7 h-7 text-[#A8C7FA]" />
            Server & Device Console
          </h1>
          <p className="text-xs sm:text-sm text-[#A0A0A0] mt-0.5">
            Connected devices, network status, hardware performance & system logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleScanAll}
            className="m3-btn-secondary py-2 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#A8C7FA]" />
            <span>Rescan All Folders</span>
          </button>

          <button
            onClick={() => setShowQrModal(true)}
            className="m3-btn-primary py-2 text-xs"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Connect QR</span>
          </button>
        </div>
      </div>

      {/* System Metrics Cards (Google Developer Style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1E1F20] rounded-3xl p-5 border border-[#3C4043]/50 shadow-elevation-1 space-y-3">
          <div className="flex items-center justify-between text-xs text-[#A0A0A0]">
            <span className="font-semibold flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#A8C7FA]" />
              CPU Load
            </span>
            <span className="font-mono text-white font-bold">
              {stats?.cpu.usagePercent || 0}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#28292A] overflow-hidden">
            <div className="h-full bg-[#A8C7FA] rounded-full" style={{ width: `${stats?.cpu.usagePercent || 0}%` }} />
          </div>
          <span className="text-[11px] text-[#A0A0A0] block truncate">
            {stats?.cpu.model || 'System CPU'}
          </span>
        </div>

        <div className="bg-[#1E1F20] rounded-3xl p-5 border border-[#3C4043]/50 shadow-elevation-1 space-y-3">
          <div className="flex items-center justify-between text-xs text-[#A0A0A0]">
            <span className="font-semibold flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[#C2E7FF]" />
              Memory
            </span>
            <span className="font-mono text-white font-bold">
              {stats?.memory.usagePercent || 0}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#28292A] overflow-hidden">
            <div className="h-full bg-[#C2E7FF] rounded-full" style={{ width: `${stats?.memory.usagePercent || 0}%` }} />
          </div>
          <span className="text-[11px] text-[#A0A0A0] block font-mono">
            {formatBytes(stats?.memory.usedBytes || 0)} / {formatBytes(stats?.memory.totalBytes || 0)}
          </span>
        </div>

        <div className="bg-[#1E1F20] rounded-3xl p-5 border border-[#3C4043]/50 shadow-elevation-1 space-y-3">
          <div className="flex items-center justify-between text-xs text-[#A0A0A0]">
            <span className="font-semibold flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              Library Storage
            </span>
            <span className="font-mono text-white font-bold">
              {stats?.server.libraryTotalVideos || 0} items
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#28292A] overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `75%` }} />
          </div>
          <span className="text-[11px] text-[#A0A0A0] block font-mono">
            {formatBytes(stats?.server.libraryTotalSize || 0)} total
          </span>
        </div>

        <div className="bg-[#1E1F20] rounded-3xl p-5 border border-[#3C4043]/50 shadow-elevation-1 space-y-3">
          <div className="flex items-center justify-between text-xs text-[#A0A0A0]">
            <span className="font-semibold flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-amber-400" />
              Server Uptime
            </span>
            <span className="font-mono text-emerald-400 font-bold">
              {formatUptime(stats?.server.uptime || 0)}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#28292A] overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full w-full" />
          </div>
          <span className="text-[11px] text-[#A0A0A0] block font-mono">
            Active Port: {stats?.network.port || 3000}
          </span>
        </div>
      </div>

      {/* Connected / Trusted Devices Section */}
      <div className="bg-[#1E1F20] rounded-3xl p-6 border border-[#3C4043]/50 shadow-elevation-1 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#A8C7FA]" />
            Connected Devices on LAN ({devices.length})
          </h3>
          <span className="text-xs text-[#A0A0A0]">Trusted LAN Viewers</span>
        </div>

        {devices.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#28292A] border border-dashed border-[#3C4043] text-center text-xs text-[#A0A0A0]">
            No other devices connected currently. Scan the QR code with your phone to connect!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {devices.map((d) => {
              const Icon = getDeviceIcon(d.deviceType);
              return (
                <div
                  key={d.id}
                  className="p-4 rounded-2xl bg-[#28292A] border border-[#3C4043]/50 space-y-2 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#004A77] text-[#C2E7FF] flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white line-clamp-1">{d.name}</h4>
                        <span className="text-[10px] text-[#A0A0A0] capitalize font-medium">{d.deviceType} {d.isHost ? '(Host PC)' : ''}</span>
                      </div>
                    </div>

                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Ready
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-[#A0A0A0] pt-1 border-t border-[#3C4043]/30 flex items-center justify-between">
                    <span>IP: {d.ipAddress?.replace('::ffff:', '') || 'Local'}</span>
                    <span>{new Date(d.lastSeenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Server Logs (Console Viewer) */}
      <div className="bg-[#1E1F20] rounded-3xl p-6 border border-[#3C4043]/50 shadow-elevation-1 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[#A8C7FA]" />
            Live Server Telemetry & Logs
          </h3>

          <div className="flex items-center gap-1.5">
            {(['all', 'info', 'warn', 'error'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLogFilter(lvl)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                  logFilter === lvl
                    ? 'bg-[#A8C7FA] text-[#062E6F]'
                    : 'bg-[#28292A] text-[#A0A0A0] hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#131314] border border-[#3C4043]/60 font-mono text-xs text-[#A0A0A0] max-h-64 overflow-y-auto space-y-1">
          {filteredLogs.length === 0 ? (
            <div className="text-slate-600 text-center py-4">No matching log entries.</div>
          ) : (
            filteredLogs.slice(0, 50).map((l) => (
              <div key={l.id} className="flex items-start gap-2.5">
                <span className="text-slate-600 shrink-0">
                  {new Date(l.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-[#A8C7FA] shrink-0 font-semibold">[{l.category}]</span>
                <span className={l.level === 'error' ? 'text-rose-400 font-semibold' : l.level === 'warn' ? 'text-amber-400' : 'text-slate-300'}>
                  {l.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <QRCodeModal
          initialTab="admin"
          onClose={() => setShowQrModal(false)}
        />
      )}
    </div>
  );
};
