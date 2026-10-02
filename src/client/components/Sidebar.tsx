import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Film, 
  Smartphone, 
  Users, 
  LayoutDashboard, 
  Settings,
  HardDrive,
  FolderOpen
} from 'lucide-react';
import { api } from '../api/apiClient';
import { SystemStats } from '../../shared/types';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
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

  const navLinks = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/library', label: 'Media Library', icon: Film },
    { to: '/remote', label: 'Host Remote', icon: Smartphone },
    { to: '/rooms', label: 'Watch Party', icon: Users },
    ...(user?.role === 'admin' || !user ? [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/settings', label: 'Settings', icon: Settings },
    ] : []),
  ];

  return (
    <>
      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-border/50 p-4 shrink-0 min-h-[calc(100vh-61px)]">
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-500 uppercase mb-2">
            Navigation
          </p>
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-glow-primary'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-card-hover'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Library Info Card */}
        {stats && (
          <div className="mt-auto pt-4 border-t border-border/40">
            <div className="glass-card rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <FolderOpen className="w-3.5 h-3.5 text-primary-light" />
                  Library Media
                </span>
                <span className="text-slate-200 font-semibold">
                  {stats.server.libraryTotalVideos} videos
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <HardDrive className="w-3.5 h-3.5 text-accent" />
                  Indexed Size
                </span>
                <span className="text-slate-200 font-semibold font-mono">
                  {formatBytes(stats.server.libraryTotalSize)}
                </span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-border/60 py-2 px-3 flex items-center justify-around">
        {navLinks.slice(0, 5).map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
                  isActive ? 'text-primary-light font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
};
