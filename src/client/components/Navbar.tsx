import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Tv, 
  QrCode, 
  Search, 
  Monitor, 
  Smartphone, 
  Radio, 
  Settings,
  Sparkles,
  Wifi,
  WifiOff,
  Film,
  UploadCloud
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { api } from '../api/apiClient';
import { QRCodeModal } from './QRCodeModal';
import { MobileVideoShareModal } from './MobileVideoShareModal';

export const Navbar: React.FC<{ onSearch?: (query: string) => void }> = ({ onSearch }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isConnected, hostState, scanProgress, isHost, deviceName } = useSocket();

  const [lanUrl, setLanUrl] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showPhoneShareModal, setShowPhoneShareModal] = useState(false);
  const [defaultQrTab, setDefaultQrTab] = useState<'viewer' | 'admin'>('viewer');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    api.getQrCode().then((res) => {
      setLanUrl(res.lanUrl);
    }).catch(() => {});
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/library?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (onSearch) onSearch(val);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#1E1F20]/90 backdrop-blur-xl border-b border-[#3C4043]/40 px-4 lg:px-8 py-3 flex items-center justify-between gap-4 transition-all">
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center font-black shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
              <img src="/logo.svg" alt="LocalStream Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold tracking-tight text-[#E3E3E3] group-hover:text-white transition-colors">
                LocalMovi
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold bg-[#004A77] text-[#C2E7FF] rounded-full">
                Appliance
              </span>
            </div>
          </Link>

          {/* Quick LAN Status Badge */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#28292A] border border-[#3C4043]/60 text-xs">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-[#A0A0A0] text-[11px] font-mono font-medium">
              {lanUrl ? lanUrl.replace(/^https?:\/\//, '') : '192.168.1.37:3000'}
            </span>
          </div>
        </div>

        {/* Center: Search Bar (Google Developer / Material 3 Style) */}
        <div className="flex-1 max-w-lg hidden sm:block">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-[#A0A0A0] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search movies, episodes, videos..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#28292A] hover:bg-[#303134] focus:bg-[#303134] border border-[#3C4043]/60 focus:border-[#A8C7FA] rounded-full text-[#E3E3E3] placeholder-[#A0A0A0] focus:outline-none transition-all"
            />
          </form>
        </div>

        {/* Right: Quick Actions & Connect Phone Button */}
        <div className="flex items-center gap-2">
          {/* Scanning indicator */}
          {scanProgress && scanProgress.status !== 'idle' && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#004A77] text-[#C2E7FF] text-xs font-medium animate-pulse">
              <div className="w-2 h-2 rounded-full bg-[#A8C7FA] animate-ping" />
              <span>Updating Library ({scanProgress.processedCount})</span>
            </div>
          )}

          {/* Upload Movie (Laptop / Phone) */}
          <button
            onClick={() => setShowPhoneShareModal(true)}
            className="px-3.5 py-1.5 rounded-full bg-[#A8C7FA] hover:bg-[#C2E7FF] text-[#062E6F] text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            title="Upload and share a video from laptop or phone"
          >
            <UploadCloud className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Upload Movie</span>
          </button>

          {/* Show QR / Connect Phone */}
          <button
            onClick={() => {
              setDefaultQrTab('viewer');
              setShowQrModal(true);
            }}
            className="p-2 sm:px-3.5 sm:py-1.5 rounded-full bg-[#28292A] hover:bg-[#303134] text-[#E3E3E3] text-xs font-semibold flex items-center gap-1.5 border border-[#3C4043]/50 transition-colors"
            title="Scan QR Code to connect phone or tablet"
          >
            <QrCode className="w-4 h-4 text-[#A8C7FA]" />
            <span className="hidden sm:inline">Connect Phone</span>
          </button>

          {/* Settings Shortcut */}
          <Link
            to="/settings"
            className="p-2 rounded-full bg-[#28292A] hover:bg-[#303134] text-[#A0A0A0] hover:text-[#E3E3E3] border border-[#3C4043]/50 transition-colors"
            title="Settings & Server"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* QR Code Modal */}
      {showQrModal && (
        <QRCodeModal
          initialTab={defaultQrTab}
          onClose={() => setShowQrModal(false)}
        />
      )}

      {/* Share Movie from Phone Modal */}
      {showPhoneShareModal && (
        <MobileVideoShareModal
          onClose={() => setShowPhoneShareModal(false)}
        />
      )}
    </>
  );
};
