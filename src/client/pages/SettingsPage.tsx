import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  Check, 
  Shield, 
  Server, 
  Film, 
  HardDrive, 
  FolderPlus, 
  Folder, 
  Trash2, 
  RefreshCw, 
  ChevronDown, 
  ChevronRight,
  QrCode,
  Copy,
  Smartphone,
  Terminal,
  Power
} from 'lucide-react';
import { api } from '../api/apiClient';
import { LibraryFolderItem, ServerLogEntry } from '../../shared/types';
import { useSocket } from '../context/SocketContext';
import { QRCodeModal } from '../components/QRCodeModal';

export const SettingsPage: React.FC = () => {
  const { deviceName, recentLogs, scanProgress } = useSocket();

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [folders, setFolders] = useState<LibraryFolderItem[]>([]);
  const [newFolderPath, setNewFolderPath] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lanInfo, setLanInfo] = useState<{ lanUrl: string; qrCode: string }>({ lanUrl: '', qrCode: '' });
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const loadData = async () => {
    try {
      const [s, f, qr] = await Promise.all([
        api.getSettings().catch(() => ({})),
        api.getFolders().catch(() => []),
        api.getQrCode().catch(() => ({ lanUrl: '', qrCode: '' })),
      ]);
      setSettings(s);
      setFolders(f);
      setLanInfo(qr);
    } catch {}
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddFolder = async () => {
    if (!newFolderPath.trim()) return;
    try {
      await api.addFolder({ folderPath: newFolderPath.trim() });
      setNewFolderPath('');
      await loadData();
      await api.scanAllFolders().catch(() => {});
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemoveFolder = async (id: string) => {
    try {
      await api.removeFolder(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleScanLibrary = async () => {
    setIsScanning(true);
    try {
      await api.scanAllFolders();
      setTimeout(() => setIsScanning(false), 2000);
    } catch {
      setIsScanning(false);
    }
  };

  const handleCopyLink = () => {
    if (lanInfo.lanUrl) {
      navigator.clipboard.writeText(lanInfo.lanUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const updateKey = (key: string, val: string) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-fade-in text-[#E3E3E3]">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-[#A8C7FA]" />
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-[#A0A0A0]">
          Manage your movie folders, streaming preferences, and local network settings.
        </p>
      </div>

      {/* SECTION 1: Local Network Connection Card */}
      <div className="bg-[#1E1F20] rounded-3xl p-6 border border-[#3C4043]/50 shadow-elevation-1 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#004A77] text-[#C2E7FF] flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Local Network Connection</h3>
              <p className="text-xs text-[#A0A0A0]">Reachable by any phone, tablet, or TV on your Wi-Fi</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-400">Online</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-[#28292A] border border-[#3C4043]/40">
          <div className="space-y-0.5 text-center sm:text-left">
            <span className="text-[10px] text-[#A0A0A0] uppercase font-bold tracking-wider">Browser Access URL</span>
            <p className="text-sm font-mono font-bold text-[#A8C7FA]">
              {lanInfo.lanUrl || 'http://192.168.1.37:3000'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="m3-btn-secondary py-2 text-xs"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
            </button>

            <button
              onClick={() => setShowQrModal(true)}
              className="m3-btn-primary py-2 text-xs"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Show QR</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: Media Folders Management */}
      <div className="bg-[#1E1F20] rounded-3xl p-6 border border-[#3C4043]/50 shadow-elevation-1 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#004A77] text-[#C2E7FF] flex items-center justify-center">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Movie & Video Folders</h3>
              <p className="text-xs text-[#A0A0A0]">Folders scanned by LocalMovi on your host machine</p>
            </div>
          </div>

          <button
            onClick={handleScanLibrary}
            disabled={isScanning}
            className="m3-btn-secondary py-2 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#A8C7FA] ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning...' : 'Scan Now'}</span>
          </button>
        </div>

        {/* Folder List */}
        <div className="space-y-2">
          {folders.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#28292A] border border-dashed border-[#3C4043] text-center text-xs text-[#A0A0A0]">
              No media folders indexed yet. Add a folder below.
            </div>
          ) : (
            folders.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#28292A] border border-[#3C4043]/50 text-xs text-white"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Folder className="w-4 h-4 text-[#A8C7FA] shrink-0" />
                  <span className="font-mono text-xs truncate">{f.folderPath}</span>
                  <span className="hidden sm:inline text-[11px] text-[#A0A0A0]">• {f.mediaCount || 0} movies</span>
                </div>
                <button
                  onClick={() => handleRemoveFolder(f.id)}
                  className="p-1.5 rounded-xl hover:bg-rose-500/20 text-[#A0A0A0] hover:text-rose-400 transition-colors"
                  title="Remove folder"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add Folder Input */}
        <div className="flex gap-2 pt-2">
          <input
            type="text"
            placeholder="e.g. /media/videos or C:\Users\Videos"
            value={newFolderPath}
            onChange={(e) => setNewFolderPath(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-[#28292A] border border-[#3C4043] focus:border-[#A8C7FA] text-xs text-white placeholder-[#A0A0A0] focus:outline-none font-mono"
          />
          <button
            onClick={handleAddFolder}
            disabled={!newFolderPath.trim()}
            className="m3-btn-primary px-5 py-2.5 disabled:opacity-50"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Add Folder</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: Normal Playback Preferences */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="bg-[#1E1F20] rounded-3xl p-6 border border-[#3C4043]/50 shadow-elevation-1 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2.5">
            <Film className="w-5 h-5 text-[#A8C7FA]" />
            Playback Preferences
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#E3E3E3]">Server Display Name</label>
              <input
                type="text"
                value={settings['server_name'] || 'LocalMovi Cinema'}
                onChange={(e) => updateKey('server_name', e.target.value)}
                className="w-full px-4 py-2 rounded-2xl bg-[#28292A] border border-[#3C4043] text-xs text-white focus:outline-none focus:border-[#A8C7FA]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#E3E3E3]">Default Transcode Quality</label>
              <select
                value={settings['transcode_quality'] || 'original'}
                onChange={(e) => updateKey('transcode_quality', e.target.value)}
                className="w-full px-4 py-2 rounded-2xl bg-[#28292A] border border-[#3C4043] text-xs text-white focus:outline-none focus:border-[#A8C7FA]"
              >
                <option value="original">Direct Stream (Original Quality - 0% CPU)</option>
                <option value="1080p">1080p Full HD</option>
                <option value="720p">720p HD (Low CPU)</option>
                <option value="480p">480p Mobile</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="m3-btn-primary"
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{saved ? 'Saved!' : 'Save Preferences'}</span>
            </button>
          </div>
        </div>

        {/* SECTION 4: ADVANCED SETTINGS (Collapsible) */}
        <div className="bg-[#1E1F20] rounded-3xl border border-[#3C4043]/50 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full p-6 flex items-center justify-between text-left hover:bg-[#28292A]/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#28292A] text-[#A8C7FA] flex items-center justify-center">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Advanced Developer Settings</h3>
                <p className="text-xs text-[#A0A0A0]">Port binding, network interfaces, FFmpeg params & server logs</p>
              </div>
            </div>

            {showAdvanced ? <ChevronDown className="w-5 h-5 text-[#A0A0A0]" /> : <ChevronRight className="w-5 h-5 text-[#A0A0A0]" />}
          </button>

          {showAdvanced && (
            <div className="p-6 pt-0 space-y-6 border-t border-[#3C4043]/40 animate-fade-in">
              {/* Port Config */}
              <div className="space-y-1.5 pt-4">
                <label className="text-xs font-semibold text-[#E3E3E3]">Server HTTP Port</label>
                <input
                  type="number"
                  value={settings['port'] || '3000'}
                  onChange={(e) => updateKey('port', e.target.value)}
                  className="w-full max-w-xs px-4 py-2 rounded-2xl bg-[#28292A] border border-[#3C4043] font-mono text-xs text-white"
                />
                <p className="text-[11px] text-[#A0A0A0]">Default is 3000. Changes apply on restart.</p>
              </div>

              {/* Server Live Logs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#A0A0A0]">Live Server Logs</span>
                  <span className="text-[11px] font-mono text-[#A0A0A0]">{recentLogs.length} events recorded</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#131314] border border-[#3C4043]/60 font-mono text-[11px] text-[#A0A0A0] max-h-48 overflow-y-auto space-y-1">
                  {recentLogs.length === 0 ? (
                    <div className="text-slate-600">No log entries yet.</div>
                  ) : (
                    recentLogs.slice(0, 30).map((log) => (
                      <div key={log.id} className="flex items-start gap-2">
                        <span className="text-slate-500 shrink-0">[{log.category}]</span>
                        <span className={log.level === 'error' ? 'text-rose-400' : log.level === 'warn' ? 'text-amber-400' : 'text-slate-300'}>
                          {log.message}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </form>

      {/* QR Code Modal */}
      {showQrModal && (
        <QRCodeModal
          initialTab="viewer"
          onClose={() => setShowQrModal(false)}
        />
      )}
    </div>
  );
};
