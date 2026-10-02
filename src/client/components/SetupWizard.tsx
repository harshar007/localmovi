import React, { useState } from 'react';
import { 
  Tv, 
  FolderPlus, 
  ShieldCheck, 
  Radio, 
  Play, 
  Check, 
  Folder, 
  Trash2, 
  HardDrive, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { api } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';

export const SetupWizard: React.FC<{ onCompleted: () => void }> = ({ onCompleted }) => {
  const { login, refreshStatus } = useAuth();

  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [customFolderPath, setCustomFolderPath] = useState('');
  const [port, setPort] = useState('3000');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isElectron = !!(window as any).electronAPI?.isElectron;

  // Select folder via native Windows dialog if Electron
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

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage('Please enter a username');
      return;
    }
    if (password.length < 4) {
      setErrorMessage('Password must be at least 4 characters');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }
    setErrorMessage(null);
    setStep(2);
  };

  const handleFinishSetup = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      // 1. Create Admin
      const authRes = await api.setupAdmin({ username, password });
      login(authRes.token, authRes.user);

      // 2. Add Selected Folders
      for (const folderPath of selectedFolders) {
        try {
          await api.addFolder({ folderPath });
        } catch {}
      }

      // 3. Save Port Setting
      if (port && port !== '3000') {
        await api.updateSettings({ port });
      }

      // 4. Refresh status & trigger scan
      await api.scanAllFolders().catch(() => {});
      await refreshStatus();
      onCompleted();
    } catch (err: any) {
      setErrorMessage(err.message || 'Setup failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background selection:bg-primary selection:text-white">
      <div className="w-full max-w-xl glass-panel rounded-3xl p-8 border border-border/60 shadow-2xl space-y-8 animate-fade-in relative overflow-hidden">
        {/* Glow Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-glow-primary mb-1">
            <Tv className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Welcome to LocalStream
          </h1>
          <p className="text-xs text-slate-400 max-w-sm">
            Self-hosted private LAN video streaming and host PC remote control.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between px-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s
                    ? 'bg-primary text-white shadow-glow-primary'
                    : step > s
                    ? 'bg-emerald-500 text-white'
                    : 'bg-secondary text-slate-400'
                }`}
              >
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${step === s ? 'text-white' : 'text-slate-500'}`}>
                {s === 1 ? 'Admin' : s === 2 ? 'Media Folders' : 'Finalize'}
              </span>
            </div>
          ))}
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
            {errorMessage}
          </div>
        )}

        {/* Step 1: Admin Account Creation */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Admin Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-secondary/80 border border-border focus:border-primary text-sm text-white focus:outline-none"
                placeholder="admin"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-secondary/80 border border-border focus:border-primary text-sm text-white focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-secondary/80 border border-border focus:border-primary text-sm text-white focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm shadow-glow-primary transition-all flex items-center justify-center gap-2 mt-4"
            >
              <span>Next: Media Folders</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Step 2: Add Video Directories */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1 text-center">
              <h3 className="text-sm font-bold text-white">Select Video Folders</h3>
              <p className="text-xs text-slate-400">
                Choose folders on your computer containing movies, series, or video files.
              </p>
            </div>

            {/* Native Folder Picker if Electron */}
            {isElectron && (
              <button
                type="button"
                onClick={handleSelectNativeFolder}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 hover:from-primary/30 hover:to-accent/30 border border-primary/40 text-primary-light font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Browse Windows Directory</span>
              </button>
            )}

            {/* Manual Path Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. D:\Movies or C:\Users\Videos"
                value={customFolderPath}
                onChange={(e) => setCustomFolderPath(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomFolder()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-secondary/80 border border-border focus:border-primary text-xs font-mono text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomFolder}
                className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-card border border-border text-xs font-semibold text-white transition-colors"
              >
                Add
              </button>
            </div>

            {/* Selected Folders List */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {selectedFolders.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-slate-500">
                  No folders selected yet. You can also add folders later in the dashboard.
                </div>
              ) : (
                selectedFolders.map((f) => (
                  <div
                    key={f}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Folder className="w-4 h-4 text-primary-light shrink-0" />
                      <span className="font-mono text-slate-200 truncate">{f}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFolder(f)}
                      className="p-1 text-slate-400 hover:text-rose-400 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-2.5 rounded-xl bg-secondary hover:bg-card text-slate-300 text-xs font-medium transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-2/3 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-glow-primary transition-all flex items-center justify-center gap-1.5"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Network & Launch */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-1 text-center">
              <h3 className="text-sm font-bold text-white">Network & Port Configuration</h3>
              <p className="text-xs text-slate-400">
                Configure your server port and start indexing media files.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Server Port</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-secondary/80 border border-border focus:border-primary text-sm font-mono text-white focus:outline-none"
              />
            </div>

            <div className="p-4 rounded-2xl glass-card border border-border/60 space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                LAN Streaming Enabled
              </div>
              <p className="text-slate-400">
                Once initialized, LocalStream indexes your videos with zero cloud requirements. Devices on your Wi-Fi can stream and remote control immediately.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-1/3 py-3 rounded-xl bg-secondary hover:bg-card text-slate-300 text-xs font-medium transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinishSetup}
                className="w-2/3 py-3 rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent text-white text-sm font-bold shadow-glow-primary transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Initializing...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Launch LocalStream</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
