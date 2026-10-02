import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Film, 
  Smartphone, 
  Users, 
  Heart,
  Settings,
  HardDrive,
  FolderOpen,
  Monitor,
  Sparkles,
  QrCode
} from 'lucide-react';
import { api } from '../api/apiClient';
import { SystemStats } from '../../shared/types';
import { useSocket } from '../context/SocketContext';

export const Sidebar: React.FC = () => {
  const { isConnected, hostState } = useSocket();
  const [stats, setStats] = useState<SystemStats | null>(null);

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {});
  }, []);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1000) {
      return `${(gb / 1024).toFixed(1)} TB`;
    }
    return `${gb.toFixed(1)} GB`;
  };

  const mainNav = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/library', label: 'Library', icon: Film },
    { to: '/rooms', label: 'Watch Together', icon: Users },
  ];

  const devicesNav = [
    { to: '/remote', label: 'Remote Control', icon: Smartphone, badge: hostState?.media ? 'Active' : undefined },
    { to: '/admin', label: 'Connected Devices', icon: Monitor },
  ];

  return (
    <>
      {/* Desktop Left Rail / Navigation (Google M3 Style) */}
      <aside className="hidden md:flex flex-col w-64 bg-[#1E1F20] border-r border-[#3C4043]/40 p-4 shrink-0 min-h-[calc(100vh-61px)] justify-between">
        <div className="space-y-6">
          {/* Main Navigation */}
          <div className="space-y-1">
            <p className="px-3.5 text-[11px] font-bold tracking-wider text-[#A0A0A0] uppercase mb-2">
              Menu
            </p>
            {mainNav.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3.5 px-4 py-2.5 rounded-full text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#004A77] text-[#C2E7FF] font-bold'
                        : 'text-[#E3E3E3] hover:text-white hover:bg-[#28292A]'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </div>

          {/* Devices & Playback Targets */}
          <div className="space-y-1">
            <p className="px-3.5 text-[11px] font-bold tracking-wider text-[#A0A0A0] uppercase mb-2">
              Devices
            </p>
            {devicesNav.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-4 py-2.5 rounded-full text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#004A77] text-[#C2E7FF] font-bold'
                        : 'text-[#E3E3E3] hover:text-white hover:bg-[#28292A]'
                    }`
                  }
                >
                  <div className="flex items-center gap-3.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{link.label}</span>
                  </div>
                  {link.badge && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Settings Section */}
          <div className="space-y-1">
            <p className="px-3.5 text-[11px] font-bold tracking-wider text-[#A0A0A0] uppercase mb-2">
              System
            </p>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-2.5 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#004A77] text-[#C2E7FF] font-bold'
                    : 'text-[#E3E3E3] hover:text-white hover:bg-[#28292A]'
                }`
              }
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Settings</span>
            </NavLink>
          </div>
        </div>

        {/* Bottom Library & LAN Status Card */}
        <div className="pt-4 border-t border-[#3C4043]/30 space-y-3">
          <div className="bg-[#28292A] rounded-2xl p-3.5 space-y-2 border border-[#3C4043]/40">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#A0A0A0] flex items-center gap-1.5 font-medium">
                <FolderOpen className="w-3.5 h-3.5 text-[#A8C7FA]" />
                Library
              </span>
              <span className="text-white font-semibold font-mono">
                {stats?.server.libraryTotalVideos || 0} movies
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#A0A0A0] flex items-center gap-1.5 font-medium">
                <HardDrive className="w-3.5 h-3.5 text-[#C2E7FF]" />
                Storage
              </span>
              <span className="text-white font-semibold font-mono">
                {formatBytes(stats?.server.libraryTotalSize || 0)}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (Material 3 Bottom Nav) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1E1F20]/95 backdrop-blur-xl border-t border-[#3C4043]/50 px-2 py-1.5 flex items-center justify-around">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-3 rounded-2xl text-[10px] font-medium transition-colors ${
              isActive ? 'text-[#A8C7FA]' : 'text-[#A0A0A0]'
            }`
          }
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/library"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-3 rounded-2xl text-[10px] font-medium transition-colors ${
              isActive ? 'text-[#A8C7FA]' : 'text-[#A0A0A0]'
            }`
          }
        >
          <Film className="w-5 h-5" />
          <span>Library</span>
        </NavLink>

        <NavLink
          to="/remote"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-3 rounded-2xl text-[10px] font-medium transition-colors relative ${
              isActive ? 'text-[#A8C7FA]' : 'text-[#A0A0A0]'
            }`
          }
        >
          <Smartphone className="w-5 h-5" />
          <span>Remote</span>
          {hostState?.media && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          )}
        </NavLink>

        <NavLink
          to="/rooms"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-3 rounded-2xl text-[10px] font-medium transition-colors ${
              isActive ? 'text-[#A8C7FA]' : 'text-[#A0A0A0]'
            }`
          }
        >
          <Users className="w-5 h-5" />
          <span>Party</span>
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-3 rounded-2xl text-[10px] font-medium transition-colors ${
              isActive ? 'text-[#A8C7FA]' : 'text-[#A0A0A0]'
            }`
          }
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </NavLink>
      </nav>
    </>
  );
};
