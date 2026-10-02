import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Smartphone, Wifi, Radio, Play, Sparkles, Shield, Film, Settings } from 'lucide-react';
import QRCode from 'qrcode';

interface QRCodeModalProps {
  isOpen?: boolean;
  lanUrl?: string;
  qrCode?: string;
  targetUrl?: string;
  videoTitle?: string;
  defaultTab?: 'viewer' | 'admin';
  onClose: () => void;
  title?: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ 
  isOpen = true,
  lanUrl = '', 
  targetUrl,
  videoTitle,
  defaultTab = 'viewer',
  onClose,
  title
}) => {
  const [activeTab, setActiveTab] = useState<'viewer' | 'admin'>(videoTitle ? 'viewer' : defaultTab);
  const [copied, setCopied] = useState(false);
  const [viewerQr, setViewerQr] = useState<string>('');
  const [adminQr, setAdminQr] = useState<string>('');

  const baseOrigin = lanUrl || (window.location.origin.includes('localhost') 
    ? window.location.origin.replace('localhost', '192.168.1.37') 
    : window.location.origin);

  const viewerUrl = targetUrl || `${baseOrigin}/`;
  const adminUrl = `${baseOrigin}/admin`;

  const currentUrl = activeTab === 'viewer' ? viewerUrl : adminUrl;

  useEffect(() => {
    // Generate Viewer QR Code
    QRCode.toDataURL(viewerUrl, {
      width: 320,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    }).then(setViewerQr).catch(console.error);

    // Generate Admin QR Code
    QRCode.toDataURL(adminUrl, {
      width: 320,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    }).then(setAdminQr).catch(console.error);
  }, [viewerUrl, adminUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-md glass-panel rounded-3xl p-6 border border-border/80 shadow-2xl space-y-5 text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-card text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center mx-auto shadow-glow-primary">
            {activeTab === 'viewer' ? (
              <Film className="w-6 h-6 text-white" />
            ) : (
              <Shield className="w-6 h-6 text-white" />
            )}
          </div>
          <h3 className="text-base font-bold text-white">
            {videoTitle ? `Play "${videoTitle}"` : 'LAN Connect & Remote Access'}
          </h3>
          <p className="text-xs text-slate-400">
            Choose QR Code type to scan with phone or tablet
          </p>
        </div>

        {/* Dual Tab Switcher: Movie Viewer vs Admin Controller */}
        {!videoTitle && (
          <div className="flex rounded-2xl bg-secondary/80 p-1 border border-border text-xs font-semibold">
            <button
              onClick={() => setActiveTab('viewer')}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'viewer'
                  ? 'bg-primary text-white shadow-glow-primary'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>🎬 Movie Viewer QR</span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'admin'
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>⚙️ Admin Mode QR</span>
            </button>
          </div>
        )}

        {/* Mode Description Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold">
          {activeTab === 'viewer' ? (
            <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Direct Movie Streaming • Instant Play • No Login
            </span>
          ) : (
            <span className="text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              Admin Dashboard • Folder Management & Controls
            </span>
          )}
        </div>

        {/* QR Code Canvas */}
        <div className="p-3 bg-white rounded-2xl mx-auto w-60 h-60 flex items-center justify-center shadow-inner">
          {activeTab === 'viewer' ? (
            viewerQr ? (
              <img src={viewerQr} alt="Movie Viewer QR" className="w-full h-full object-contain" />
            ) : (
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )
          ) : (
            adminQr ? (
              <img src={adminQr} alt="Admin QR" className="w-full h-full object-contain" />
            ) : (
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            )
          )}
        </div>

        {/* URL Box with 1-Click Copy */}
        <div className="flex items-center gap-2 p-2 rounded-xl bg-secondary/80 border border-border">
          <Radio className="w-4 h-4 text-emerald-400 shrink-0 ml-1 animate-pulse" />
          <span className="font-mono text-xs text-emerald-400 flex-1 truncate text-left font-semibold">
            {currentUrl}
          </span>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-card hover:bg-primary text-slate-300 hover:text-white transition-colors"
            title="Copy URL"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <Wifi className="w-3.5 h-3.5 text-primary-light" />
          <span>Local Wi-Fi Network • No Internet or Passwords Needed</span>
        </div>
      </div>
    </div>
  );
};
