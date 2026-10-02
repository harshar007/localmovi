import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Tv, 
  QrCode, 
  Search, 
  Monitor, 
  Smartphone, 
  Radio, 
  Sliders, 
  LogOut, 
  User, 
  FolderPlus,
  RefreshCw,
  Play
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/apiClient';
import { QRCodeModal } from './QRCodeModal';

export const Navbar: React.FC<{ onSearch?: (query: string) => void }> = ({ onSearch }) => {
  const navigate = useNavigate();
  const { isConnected, hostState, scanProgress, isHost } = useSocket();
  const { user, logout } = useAuth();

  const [lanUrl, setLanUrl] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    api.getQrCode().then((res) => {
      setLanUrl(res.lanUrl);
      setQrCode(res.qrCode);
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
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-border/50 px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4 transition-all">
        {/* Left: Logo & Branding */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-glow-primary group-hover:scale-105 transition-transform">
              <Tv className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-primary-light bg-clip-text text-transparent">
                LocalStream
              </span>
              <span className="hidden sm:inline-block ml-1.5 px-1.5 py-0.5 text-[10px] font-semibold bg-primary/20 text-primary-light border border-primary/30 rounded-md">
                LAN
              </span>
            </div>
          </Link>

          {/* LAN URL Pill */}
          {lanUrl && (
            <button
              onClick={() => setShowQrModal(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary border border-border text-xs text-slate-300 hover:text-white transition-colors"
              title="Click to view QR Code & LAN connection details"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="font-mono text-emerald-400 font-medium">{lanUrl}</span>
              <QrCode className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>
          )}
        </div>

        {/* Center: Live Search */}
        <div className="flex-1 max-w-md hidden sm:block">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search movies, episodes, videos..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-card/70 border border-border/80 focus:border-primary/80 focus:ring-1 focus:ring-primary rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none transition-all"
            />
          </form>
        </div>

        {/* Right: Status, Controls, User */}
        <div className="flex items-center gap-3">
          {/* Scan Progress Indicator */}
          {scanProgress && scanProgress.status !== 'completed' && (
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-primary/20 border border-primary/30 rounded-lg text-xs text-primary-light">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Scanning ({scanProgress.percent}%)</span>
            </div>
          )}

          {/* Host PC State Pill */}
          {hostState && hostState.media && (
            <Link
              to="/remote"
              className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-card border border-border hover:border-primary/50 text-xs text-slate-300 transition-colors"
            >
              <Monitor className="w-3.5 h-3.5 text-primary-light" />
              <span className="max-w-[130px] truncate text-slate-200 font-medium">
                {hostState.media.title}
              </span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </Link>
          )}

          {/* QR Code Button for Mobile view */}
          <button
            onClick={() => setShowQrModal(true)}
            className="p-2 rounded-xl bg-card hover:bg-card-hover border border-border text-slate-300 hover:text-white transition-colors"
            title="Scan QR Code to open on mobile"
          >
            <QrCode className="w-4 h-4" />
          </button>

          {/* Quick Remote Button */}
          <Link
            to="/remote"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-glow-primary transition-all"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Remote</span>
          </Link>

          {/* User Auth Menu */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-border/50">
              <span className="text-xs text-slate-400 font-medium hidden xl:inline">
                {user.username}
              </span>
              <button
                onClick={logout}
                className="p-2 rounded-xl hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="p-2 rounded-xl hover:bg-card border border-transparent hover:border-border text-slate-400 hover:text-white transition-colors"
              title="Admin Login"
            >
              <User className="w-4 h-4" />
            </Link>
          )}
        </div>
      </header>

      {/* QR Code Modal */}
      {showQrModal && (
        <QRCodeModal
          lanUrl={lanUrl}
          qrCode={qrCode}
          onClose={() => setShowQrModal(false)}
        />
      )}
    </>
  );
};
