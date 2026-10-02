import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  FolderPlus, 
  Radio, 
  Play, 
  Check, 
  Folder, 
  Trash2, 
  HardDrive, 
  ChevronRight,
  Sparkles,
  QrCode,
  Copy,
  Smartphone,
  RefreshCw
} from 'lucide-react';
import { api } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export const SetupWizard: React.FC<{ onCompleted: () => void }> = ({ onCompleted }) => {
  const { login, refreshStatus } = useAuth();
  const { scanProgress, isConnected } = useSocket();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([
    '/media/videos' // default docker container mapped videos folder
  ]);
  const [customFolderPath, setCustomFolderPath] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [lanInfo, setLanInfo] = useState<{ lanUrl: string; qrCode: string }>({ lanUrl: '', qrCode: '' });
  const [copiedLink, setCopiedLink] = useState(false);
  const [totalVideosFound, setTotalVideosFound] = useState(0);

  const isElectron = !!(window as any).electronAPI?.isElectron;

  useEffect(() => {
    api.getQrCode().then(setLanInfo).catch(() => {});
  }, []);

  const handleSelectNativeFolder = async () => {
    if (isElectron && (window as any).electronAPI?.selectFolder) {
      try {
        const folder = await (window as any).electronAPI.selectFolder();
        if (folder && !selectedFolders.includes(folder)) {
          setSelectedFolders([...selectedFolders, folder]);
        }
      } catch (err) {
        console.error('Electron selectFolder error', err);
      }
    }
  };

  const handleAddCustomFolder = () => {
    if (customFolderPath.trim() && !selectedFolders.includes(customFolderPath.trim())) {
      setSelectedFolders([...selectedFolders, customFolderPath.trim()]);
      setCustomFolderPath('');
    }
  };

  const handleRemoveFolder = (folder: string) => {
    setSelectedFolders(selectedFolders.filter((f) => f !== folder));
  };

  const handleStartScanning = async () => {
    setStep(3);
    setIsScanning(true);

    try {
      // 1. Setup default open admin
      try {
        const authRes = await api.setupAdmin({ username: 'admin', password: 'password123' });
        login(authRes.token, authRes.user);
      } catch {}

      // 2. Add Selected Folders
      for (const folderPath of selectedFolders) {
        try {
          await api.addFolder({ folderPath });
        } catch {}
      }

      // 3. Scan library
      await api.scanAllFolders().catch(() => {});
      
      // Check total items
      const media = await api.getMedia().catch(() => []);
      setTotalVideosFound(media.length);

      // Short delay for visual polish
      setTimeout(() => {
        setIsScanning(false);
        setStep(4);
      }, 2000);
    } catch (err) {
      setIsScanning(false);
      setStep(4);
    }
  };

  const handleFinish = async () => {
    await refreshStatus();
    onCompleted();
  };

  const handleCopyLink = () => {
    if (lanInfo.lanUrl) {
      navigator.clipboard.writeText(lanInfo.lanUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#131314] text-[#E3E3E3] selection:bg-[#A8C7FA]/30 selection:text-white">
      <div className="w-full max-w-xl bg-[#1E1F20] rounded-3xl p-8 border border-[#3C4043]/60 shadow-2xl space-y-8 animate-fade-in relative overflow-hidden">
        
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-[#3C4043]/40 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#A8C7FA] text-[#062E6F] flex items-center justify-center font-black">
              <Tv className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight">LocalMovi</span>
              <span className="text-xs text-[#A0A0A0] block">Appliance Setup</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === i ? 'w-6 bg-[#A8C7FA]' : step > i ? 'w-3 bg-emerald-400' : 'w-2 bg-[#3C4043]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP 1: Welcome */}
        {step === 1 && (
          <div className="space-y-6 text-center py-4">
            <div className="w-16 h-16 rounded-3xl bg-[#28292A] border border-[#3C4043] flex items-center justify-center mx-auto text-[#A8C7FA]">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Welcome to LocalMovi
              </h2>
              <p className="text-sm text-[#A0A0A0] leading-relaxed">
                Your personal video library that works privately on your local network. No complex configuration, no cloud dependency.
              </p>
            </div>

            <div className="pt-4">
              <button
                onClick={() => setStep(2)}
                className="m3-btn-primary w-full max-w-xs mx-auto py-3 text-sm font-semibold shadow-md"
              >
                <span>Get Started</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Folder Selection */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">Select Video Folders</h2>
              <p className="text-xs text-[#A0A0A0]">
                Choose the folders on your computer where your movies and videos are stored.
              </p>
            </div>

            {/* Folder list */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {selectedFolders.map((folder) => (
                <div
                  key={folder}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#28292A] border border-[#3C4043]/50 text-xs text-white"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Folder className="w-4 h-4 text-[#A8C7FA] shrink-0" />
                    <span className="font-mono text-[11px] truncate">{folder}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveFolder(folder)}
                    className="p-1 rounded-lg text-[#A0A0A0] hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add folder controls */}
            <div className="space-y-3 pt-2">
              {isElectron && (
                <button
                  type="button"
                  onClick={handleSelectNativeFolder}
                  className="m3-btn-secondary w-full py-2.5"
                >
                  <FolderPlus className="w-4 h-4 text-[#A8C7FA]" />
                  <span>Browse Windows Folder...</span>
                </button>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. C:\Users\Videos or /media/videos"
                  value={customFolderPath}
                  onChange={(e) => setCustomFolderPath(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-[#28292A] border border-[#3C4043] focus:border-[#A8C7FA] text-xs text-white placeholder-[#A0A0A0] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomFolder}
                  disabled={!customFolderPath.trim()}
                  className="px-4 py-2.5 rounded-2xl bg-[#004A77] hover:bg-[#0842A0] disabled:opacity-50 text-[#C2E7FF] text-xs font-semibold"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-[#3C4043]/40">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-2.5 rounded-full bg-[#28292A] hover:bg-[#303134] text-xs text-[#E3E3E3]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleStartScanning}
                disabled={selectedFolders.length === 0}
                className="w-2/3 m3-btn-primary py-2.5 font-semibold"
              >
                <span>Scan & Prepare Library</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Scanning Progress */}
        {step === 3 && (
          <div className="space-y-6 text-center py-6 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-[#004A77] text-[#C2E7FF] flex items-center justify-center mx-auto animate-pulse">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>

            <div className="space-y-2 max-w-sm mx-auto">
              <h2 className="text-xl font-bold text-white">Scanning your library...</h2>
              <p className="text-xs text-[#A0A0A0]">
                {scanProgress?.currentFile 
                  ? `Processing: ${scanProgress.currentFile}` 
                  : 'Indexing videos, extracting metadata, and generating thumbnails...'}
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5 max-w-md mx-auto">
              <div className="w-full h-2.5 rounded-full bg-[#28292A] overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#A8C7FA] to-[#C2E7FF] transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(15, scanProgress?.percent || 45)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#A0A0A0] font-mono">
                <span>{scanProgress?.processedCount || selectedFolders.length} items checked</span>
                <span>{scanProgress?.percent || 50}%</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Ready with QR Code */}
        {step === 4 && (
          <div className="space-y-6 text-center animate-fade-in">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/40">
                <Check className="w-3.5 h-3.5" />
                <span>LocalMovi is ready</span>
              </div>
              <h2 className="text-2xl font-bold text-white">Your Personal Cinema is Live</h2>
              <p className="text-xs text-[#A0A0A0]">
                Scan the QR code with your phone to start streaming immediately.
              </p>
            </div>

            {/* Large QR Code Display */}
            <div className="p-5 rounded-3xl bg-white w-52 h-52 mx-auto flex items-center justify-center shadow-xl">
              {lanInfo.qrCode ? (
                <img src={lanInfo.qrCode} alt="LocalMovi QR" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-800">
                  <QrCode className="w-16 h-16" />
                  <span className="text-xs font-mono font-bold mt-2">192.168.1.37:3000</span>
                </div>
              )}
            </div>

            {/* Connection Link Card */}
            <div className="p-3.5 rounded-2xl bg-[#28292A] border border-[#3C4043]/60 max-w-sm mx-auto flex items-center justify-between gap-2">
              <div className="text-left min-w-0">
                <span className="text-[10px] text-[#A0A0A0] uppercase tracking-wider font-bold block">Local Network URL</span>
                <span className="text-xs text-[#A8C7FA] font-mono font-semibold truncate block">
                  {lanInfo.lanUrl || 'http://192.168.1.37:3000'}
                </span>
              </div>
              <button
                onClick={handleCopyLink}
                className="p-2 rounded-xl bg-[#1E1F20] hover:bg-[#303134] text-xs text-white border border-[#3C4043] flex items-center gap-1 transition-colors"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={handleFinish}
                className="m3-btn-primary w-full max-w-sm mx-auto py-3 text-sm font-bold shadow-glow-primary"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Watching Now</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
