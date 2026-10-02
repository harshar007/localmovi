import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
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
  ShieldAlert,
  Server,
  Layers,
  AlertTriangle,
  CheckCircle2,
  X,
  Sparkles
} from 'lucide-react';
import { api } from '../api/apiClient';
import { SystemStats, LibraryFolderItem, ServerLogEntry } from '../../shared/types';
import { useSocket } from '../context/SocketContext';
import { QRCodeModal } from '../components/QRCodeModal';
import { FolderPickerModal } from '../components/FolderPickerModal';

export const AdminPage: React.FC = () => {
  const { scanProgress, recentLogs } = useSocket();

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [folders, setFolders] = useState<LibraryFolderItem[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [newFolderPath, setNewFolderPath] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [folderErrorMessage, setFolderErrorMessage] = useState<string | null>(null);
  const [folderSuccessMessage, setFolderSuccessMessage] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [loading, setLoading] = useState(true);

  const isElectron = !!(window as any).electronAPI?.isElectron;

  const loadAll = async () => {
    try {
      const [sysStats, folderList, deviceList] = await Promise.all([
        api.getStats(),
        api.getFolders(),
        api.getDevices(),
      ]);
      setStats(sysStats);
      setFolders(folderList);
      setDevices(deviceList);
    } catch (err) {
      console.error('Failed to load admin stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAddFolder = async (e?: React.FormEvent, customPath?: string, customName?: string) => {
    if (e) e.preventDefault();
    const pathToAdd = (customPath !== undefined ? customPath : newFolderPath).trim();
    const nameToAdd = (customName !== undefined ? customName : newFolderName).trim();
    
    if (!pathToAdd) return;
    setFolderErrorMessage(null);
    setFolderSuccessMessage(null);

    try {
      await api.addFolder({
        folderPath: pathToAdd,
        name: nameToAdd || undefined,
      });
      setNewFolderPath('');
      setNewFolderName('');
      setFolderSuccessMessage(`Folder "${pathToAdd}" added and scanning started!`);
      setTimeout(() => setFolderSuccessMessage(null), 5000);
      loadAll();
    } catch (err: any) {
      setFolderErrorMessage(err.message || 'Failed to add directory.');
    }
  };

  const handleRemoveFolder = async (id: string) => {
    setFolderErrorMessage(null);
    try {
      await api.removeFolder(id);
      setFolderSuccessMessage('Folder removed from library.');
      setTimeout(() => setFolderSuccessMessage(null), 3000);
      loadAll();
    } catch (err: any) {
      setFolderErrorMessage(err.message || 'Failed to remove folder');
    }
  };

  const handleScanFolder = async (id: string) => {
    setFolderErrorMessage(null);
    try {
      await api.scanFolder(id);
      setFolderSuccessMessage('Folder scan initiated.');
      setTimeout(() => setFolderSuccessMessage(null), 3000);
    } catch (err: any) {
      setFolderErrorMessage(err.message || 'Failed to scan folder');
    }
  };

  const handleShutdown = async () => {
    if (confirm('Shut down the LocalStream server?')) {
      try {
        await api.shutdown();
        setFolderSuccessMessage('Server shutdown command sent.');
      } catch {}
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1024) return `${(gb / 1024).toFixed(2)} TB`;
    return `${gb.toFixed(2)} GB`;
  };

  const filteredLogs = recentLogs.filter((l) =>
    logFilter === 'all' ? true : l.level === logFilter
  );

  return (
    <div className="space-y-8 pb-16 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <LayoutDashboard className="w-6 h-6 text-primary-light" />
            Host Admin Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry, network endpoints, library directories, and server orchestration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-secondary hover:bg-card border border-border text-xs font-semibold text-slate-200 hover:text-white transition-all"
          >
            <QrCode className="w-4 h-4 text-primary-light" />
            <span>LAN QR Code</span>
          </button>
          <button
            onClick={handleShutdown}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-semibold text-rose-300 hover:text-rose-200 transition-all"
          >
            <Power className="w-4 h-4" />
            <span>Shutdown</span>
          </button>
        </div>
      </div>

      {/* Real-time System Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU */}
        <div className="glass-panel rounded-3xl p-5 border border-border/50 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary-light" />
              CPU Load
            </span>
            <span className="text-xs font-mono font-bold text-white">
              {stats?.cpu.load.toFixed(1) || 0}%
            </span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
              style={{ width: `${Math.min(100, stats?.cpu.load || 0)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 truncate">
            {stats?.cpu.model || 'Host Processor'} ({stats?.cpu.cores || 1} Cores)
          </p>
        </div>

        {/* RAM */}
        <div className="glass-panel rounded-3xl p-5 border border-border/50 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-400" />
              Memory Usage
            </span>
            <span className="text-xs font-mono font-bold text-white">
              {stats?.memory.usedPercentage.toFixed(1) || 0}%
            </span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-500"
              style={{ width: `${Math.min(100, stats?.memory.usedPercentage || 0)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            {formatBytes(stats?.memory.used || 0)} / {formatBytes(stats?.memory.total || 0)}
          </p>
        </div>

        {/* Network & Active Streams */}
        <div className="glass-panel rounded-3xl p-5 border border-border/50 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              Active Streams
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {stats?.server.activeStreams || 0} active
            </span>
          </div>
          <div className="text-xl font-black text-white font-mono">
            {stats?.network.ip || '127.0.0.1'}:{stats?.network.port || 3000}
          </div>
          <p className="text-[11px] text-slate-500 truncate">
            LAN: http://{stats?.network.ip || '127.0.0.1'}:{stats?.network.port || 3000}
          </p>
        </div>

        {/* Library Info */}
        <div className="glass-panel rounded-3xl p-5 border border-border/50 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-400" />
              Media Vault
            </span>
            <span className="text-xs font-mono font-bold text-white">
              {stats?.server.libraryTotalVideos || 0} files
            </span>
          </div>
          <div className="text-xl font-black text-white font-mono">
            {formatBytes(stats?.server.libraryTotalSize || 0)}
          </div>
          <p className="text-[11px] text-slate-500">
            Server uptime: {Math.floor((stats?.server.uptime || 0) / 3600)}h {Math.floor(((stats?.server.uptime || 0) % 3600) / 60)}m
          </p>
        </div>
      </div>

      {/* Library Folder Management */}
      <div className="glass-panel rounded-3xl p-6 border border-border/50 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-primary-light" />
              Library Media Directories
            </h2>
            <p className="text-xs text-slate-400">
              Folders scanned recursively for video files. Original media files are never modified.
            </p>
          </div>

          <button
            onClick={() => api.scanAllFolders()}
            disabled={scanProgress?.status === 'scanning'}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card hover:bg-card-hover border border-border text-xs font-semibold text-slate-200 hover:text-white transition-all self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanProgress?.status === 'scanning' ? 'animate-spin' : ''}`} />
            <span>Rescan All Folders</span>
          </button>
        </div>

        {/* In-App Error Notification Banner */}
        {folderErrorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start justify-between gap-3 text-xs text-rose-300 animate-slide-up">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-rose-200 block">Directory Configuration Notice</span>
                <p className="text-rose-300 leading-relaxed">{folderErrorMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setFolderErrorMessage(null)}
              className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 hover:text-rose-200 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* In-App Success Notification Banner */}
        {folderSuccessMessage && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs text-emerald-300 animate-slide-up">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-semibold text-emerald-200">{folderSuccessMessage}</span>
            </div>
            <button
              onClick={() => setFolderSuccessMessage(null)}
              className="p-1 rounded-lg hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-200 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Quick Add Presets Bar */}
        <div className="space-y-2 bg-secondary/30 p-4 rounded-2xl border border-border/40">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary-light" />
            Quick Presets (Click to Add Directory)
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Presets for Docker / Linux and Windows */}
            {[
              { label: '/media', path: '/media' },
              { label: '/media/videos', path: '/media/videos' },
              { label: '/media/d_drive', path: '/media/d_drive' },
              { label: 'D:\\', path: 'D:\\' },
              { label: 'D:\\Movies', path: 'D:\\Movies' },
              { label: 'C:\\Videos', path: 'C:\\Videos' },
              { label: 'C:\\Users Videos', path: 'C:\\Users\\ajaysaagar developer\\Videos\\vedio' },
            ].map((preset) => (
              <button
                key={preset.path}
                type="button"
                onClick={() => handleAddFolder(undefined, preset.path, preset.label)}
                className="px-3 py-1.5 rounded-xl bg-secondary hover:bg-primary/20 border border-border hover:border-primary/40 text-xs font-mono text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Folder className="w-3.5 h-3.5 text-primary-light" />
                <span>+ {preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Add Folder Form */}
        <form onSubmit={handleAddFolder} className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => setShowPickerModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent text-white text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 shadow-glow-primary transition-all"
          >
            <HardDrive className="w-4 h-4" />
            <span>Browse Drives & Folders</span>
          </button>

          <input
            type="text"
            placeholder="Or type folder path (e.g. /media/videos or D:\Movies or C:\Videos)"
            value={newFolderPath}
            onChange={(e) => setNewFolderPath(e.target.value)}
            className="flex-1 px-4 py-2 text-xs font-mono bg-secondary/80 border border-border focus:border-primary rounded-xl text-white placeholder-slate-500 focus:outline-none"
          />

          <input
            type="text"
            placeholder="Label (Optional)"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="w-full sm:w-40 px-3 py-2 text-xs bg-secondary/80 border border-border focus:border-primary rounded-xl text-white placeholder-slate-500 focus:outline-none"
          />

          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-glow-primary transition-all shrink-0"
          >
            Add
          </button>
        </form>

        {/* Folders List */}
        <div className="space-y-2 pt-2">
          {folders.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-2xl text-xs text-slate-500">
              No folders configured yet. Choose a preset or browse directories above to start indexing.
            </div>
          ) : (
            folders.map((folder) => (
              <div
                key={folder.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-card border border-border/50 text-xs hover:border-border transition-colors"
              >
                <div className="flex items-center gap-3 truncate">
                  <Folder className="w-4 h-4 text-primary-light shrink-0" />
                  <div className="truncate">
                    <span className="font-semibold text-slate-200 block truncate">
                      {folder.name || folder.folderPath}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 block truncate">
                      {folder.folderPath}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="px-2 py-0.5 rounded-md bg-secondary text-slate-300 font-mono text-[11px]">
                    {folder.mediaCount || 0} videos
                  </span>
                  <button
                    onClick={() => handleScanFolder(folder.id)}
                    className="p-1.5 rounded-lg hover:bg-secondary text-slate-400 hover:text-white transition-colors"
                    title="Rescan Folder"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRemoveFolder(folder.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Remove Folder"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Connected Devices & Server Log Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connected Devices */}
        <div className="glass-panel rounded-3xl p-6 border border-border/50 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              Connected LAN Devices
            </h3>
            <span className="text-xs text-slate-400">{devices.length} registered</span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1 text-xs">
            {devices.length === 0 ? (
              <p className="text-slate-500 text-center py-6">No devices connected yet.</p>
            ) : (
              devices.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <div>
                      <span className="font-semibold text-slate-200 block">{d.name}</span>
                      <span className="font-mono text-[11px] text-slate-500">{d.ipAddress || 'LAN Device'}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Last active: {new Date(d.lastSeen).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Real-time Server Log Console */}
        <div className="glass-panel rounded-3xl p-6 border border-border/50 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary-light" />
              Live Server Log Stream
            </h3>

            <div className="flex items-center gap-1 bg-secondary rounded-xl p-1 text-[11px]">
              {(['all', 'info', 'warn', 'error'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setLogFilter(filter)}
                  className={`px-2.5 py-0.5 rounded-lg capitalize transition-colors ${
                    logFilter === filter
                      ? 'bg-primary text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-background/90 rounded-2xl p-4 border border-border/80 font-mono text-[11px] h-64 overflow-y-auto space-y-1.5 scrollbar-thin">
            {filteredLogs.length === 0 ? (
              <p className="text-slate-600 text-center py-10">Awaiting system events...</p>
            ) : (
              filteredLogs.map((log, index) => (
                <div key={index} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-600 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={`font-bold shrink-0 uppercase text-[10px] px-1 rounded ${
                      log.level === 'error'
                        ? 'bg-rose-500/20 text-rose-400'
                        : log.level === 'warn'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-primary/20 text-primary-light'
                    }`}
                  >
                    [{log.level}]
                  </span>
                  <span className="text-slate-400 shrink-0">[{log.category}]</span>
                  <span
                    className={`break-all ${
                      log.level === 'error'
                        ? 'text-rose-300'
                        : log.level === 'warn'
                        ? 'text-amber-300'
                        : 'text-slate-300'
                    }`}
                  >
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* LAN QR Code Modal */}
      <QRCodeModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        url={`http://${stats?.network.ip || '127.0.0.1'}:${stats?.network.port || 3000}`}
      />

      {/* Visual Directory Picker Modal */}
      <FolderPickerModal
        isOpen={showPickerModal}
        onClose={() => setShowPickerModal(false)}
        onSelectFolder={(selectedPath, selectedName) => {
          setNewFolderPath(selectedPath);
          if (selectedName && !newFolderName) {
            setNewFolderName(selectedName);
          }
          handleAddFolder(undefined, selectedPath, selectedName);
        }}
      />
    </div>
  );
};
